import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http } from "viem";
import { base } from "viem/chains";
import {
  calculateScoresForSongs,
  getWinner,
} from "@/lib/prediction-metrics";
import { getAutomatedPredictionMarketAddress, automatedPredictionMarketABI } from "@/lib/contracts/automated-prediction-market";
import { invalidateMarketCache } from "@/lib/prediction-cache";
import type { Song } from "@/types/music";

const PRIVATE_KEY = process.env.PRIVATE_KEY;
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || "https://base-mainnet.infura.io";

export async function POST(request: NextRequest) {
  try {
    // Only allow POST requests
    if (request.method !== "POST") {
      return NextResponse.json(
        { error: "Method not allowed" },
        { status: 405 }
      );
    }

    // In production, add authentication here to ensure only authorized resolvers can call this

    const body = await request.json();
    const { marketIds, songs, startTime, endTime } = body;

    if (!marketIds || !Array.isArray(marketIds) || marketIds.length === 0) {
      return NextResponse.json(
        { error: "Invalid marketIds" },
        { status: 400 }
      );
    }

    if (!songs || !Array.isArray(songs) || songs.length === 0) {
      return NextResponse.json({ error: "Invalid songs" }, { status: 400 });
    }

    // Calculate scores for all songs
    const scores = await calculateScoresForSongs(
      songs as Song[],
      startTime,
      endTime
    );

    // Get the winner (top-ranked song)
    const winnerSongId = getWinner(scores);
    if (!winnerSongId) {
      return NextResponse.json(
        { error: "Could not determine winner" },
        { status: 500 }
      );
    }

    // Find which market corresponds to the winner
    // For now, we'll resolve all markets based on the winner
    // In a real implementation, you'd match market songIds to the winner

    // Create public client for contract interaction
    const publicClient = createPublicClient({
      chain: base,
      transport: http(RPC_URL),
    });

    // Get contract address with error handling (like markets route)
    let contractAddress: string | null = null;
    try {
      contractAddress = getAutomatedPredictionMarketAddress(base.id);
    } catch {
      console.warn("Automated prediction market contract not deployed");
      return NextResponse.json(
        { error: "Automated prediction market contract not deployed on this chain" },
        { status: 400 }
      );
    }

    const results = [];

    // Resolve each market
    // Note: AutomatedPredictionMarket markets are auto-resolved via Chainlink Functions
    // This endpoint may not be needed, but we'll keep it for compatibility
    for (const marketId of marketIds) {
      try {
        // Read market data from AutomatedPredictionMarket contract
        const marketData = await publicClient.readContract({
          address: contractAddress as `0x${string}`,
          abi: automatedPredictionMarketABI,
          functionName: "markets",
          args: [BigInt(marketId)],
        });

        // AutomatedPredictionMarket Market struct: id, endTime, resolveTime, resolved, winningTrack, totalPool
        const winningTrack = String(marketData[4] as string); // winningTrack
        const _isResolved = marketData[3] as boolean; // resolved (unused but kept for potential future use)
        
        // Check if this market's winning track matches the winner
        // Note: winnerSongId should be a track title, not a song ID
        const isWinner = winningTrack.toLowerCase() === winnerSongId.toLowerCase();

        // If we have a private key, we can resolve the market
        // Otherwise, return the resolution data for manual resolution
        if (PRIVATE_KEY) {
          // In production, you'd use a wallet with the private key to resolve
          // For now, we'll just return the resolution data
          results.push({
            marketId,
            winner: isWinner,
            winnerSongId,
            resolved: false, // Would be true if we actually resolved
          });
        } else {
          results.push({
            marketId,
            winner: isWinner,
            winnerSongId,
            resolved: false,
            message: "No private key configured. Manual resolution required.",
          });
        }

        // Invalidate cache
        await invalidateMarketCache(marketId.toString());
      } catch (error) {
        console.error(`Error resolving market ${marketId}:`, error);
        results.push({
          marketId,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return NextResponse.json({
      success: true,
      winnerSongId,
      results,
      scores: scores.map((s) => ({
        songId: s.songId,
        score: s.score,
        rank: scores.indexOf(s) + 1,
      })),
    });
  } catch (error) {
    console.error("Market resolution error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

