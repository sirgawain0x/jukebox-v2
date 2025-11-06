import { NextRequest, NextResponse } from "next/server";
import { getCachedMarket, cacheMarket } from "@/lib/prediction-cache";
import { serializePredictionMarket } from "@/lib/bigint-serialization";
import type { PredictionMarket } from "@/types/prediction-market";

// Mock function - in production, this would fetch from contract/subgraph
async function fetchMarketFromContract(marketId: string): Promise<PredictionMarket | null> {
  // This would query the smart contract or subgraph
  return null;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ marketId: string }> }
) {
  try {
    const { marketId } = await params;

    // Try to get from cache first
    const cached = await getCachedMarket(marketId);
    if (cached) {
      // Serialize BigInt values to strings for JSON response
      const serialized = serializePredictionMarket(cached);
      return NextResponse.json(serialized);
    }

    // Fetch from contract/subgraph
    const market = await fetchMarketFromContract(marketId);

    if (!market) {
      return NextResponse.json(
        { error: "Market not found" },
        { status: 404 }
      );
    }

    // Cache the result
    await cacheMarket(market);

    // Serialize BigInt values to strings for JSON response
    const serialized = serializePredictionMarket(market);
    return NextResponse.json(serialized);
  } catch (error) {
    console.error("Error fetching market:", error);
    return NextResponse.json(
      { error: "Failed to fetch market" },
      { status: 500 }
    );
  }
}

