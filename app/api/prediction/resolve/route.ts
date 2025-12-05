import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http } from "viem";
import { base } from "viem/chains";
import {
  calculateScoresForSongs,
  getWinner,
} from "@/lib/prediction-metrics";
import { getPredictionMarketAddress, predictionMarketABI } from "@/lib/contracts/prediction-market";
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
      contractAddress = getPredictionMarketAddress(base.id);
    } catch {
      console.warn("Prediction market contract not deployed");
      return NextResponse.json(
        { error: "Prediction market contract not deployed on this chain" },
        { status: 400 }
      );
    }

    const results = [];

    // Resolve each market
    for (const marketId of marketIds) {
      try {
        // Determine if YES or NO won based on whether this market's song is the winner
        const marketData = await publicClient.readContract({
          address: contractAddress as `0x${string}`, // Use the validated address
          abi: predictionMarketABI,
          functionName: "markets",
          args: [BigInt(marketId)],
        });

        // Check if this market's song is the winner
        // Convert both to strings for comparison to handle type mismatches
        // marketData[0] is songId (string from contract), winnerSongId is also string
        const marketSongId = String(marketData[0]);
        const isWinner = marketSongId === winnerSongId;
        const winner = isWinner; // true = YES won, false = NO won

        // If we have a private key, we can resolve the market
        // Otherwise, return the resolution data for manual resolution
        if (PRIVATE_KEY) {
          // In production, you'd use a wallet with the private key to resolve
          // For now, we'll just return the resolution data
          results.push({
            marketId,
            winner,
            winnerSongId,
            resolved: false, // Would be true if we actually resolved
          });
        } else {
          results.push({
            marketId,
            winner,
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

