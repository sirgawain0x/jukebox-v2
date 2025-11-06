import { NextRequest, NextResponse } from "next/server";
import { getCachedMarketBets, cacheMarketBets } from "@/lib/prediction-cache";
import { serializeMarketBets } from "@/lib/bigint-serialization";
import type { MarketBet } from "@/types/prediction-market";
import { createPublicClient, http } from "viem";
import { base } from "viem/chains";
import { getPredictionMarketAddress } from "@/lib/contracts/prediction-market";

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || "https://base-mainnet.infura.io";

async function fetchBetsFromContract(_marketId: string): Promise<MarketBet[]> {
  try {
    // Wrap getPredictionMarketAddress in try-catch (like markets route does)
    let contractAddress: string | null = null;
    try {
      contractAddress = getPredictionMarketAddress(base.id);
    } catch {
      console.warn("Prediction market contract not deployed");
      return [];
    }

    // TODO: Fetch bets from contract events or subgraph
    // For now, return empty array as this requires event parsing
    // In production, you'd query BetPlaced events for this market
    return [];
  } catch (error) {
    console.error("Error fetching bets from contract:", error);
    return [];
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ marketId: string }> }
) {
  try {
    const { marketId } = await params;

    // Try to get from cache first
    const cached = await getCachedMarketBets(marketId);
    if (cached) {
      // Serialize BigInt values to strings for JSON response
      const serialized = serializeMarketBets(cached);
      return NextResponse.json(serialized);
    }

    // Fetch from contract/subgraph
    const bets = await fetchBetsFromContract(marketId);

    // Cache the results
    await cacheMarketBets(marketId, bets);

    // Serialize BigInt values to strings for JSON response
    const serialized = serializeMarketBets(bets);
    return NextResponse.json(serialized);
  } catch (error) {
    console.error("Error fetching market bets:", error);
    return NextResponse.json(
      { error: "Failed to fetch market bets" },
      { status: 500 }
    );
  }
}

