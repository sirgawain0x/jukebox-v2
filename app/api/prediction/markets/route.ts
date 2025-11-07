import { NextRequest, NextResponse } from "next/server";
import { cacheActiveMarkets, getCachedActiveMarkets } from "@/lib/prediction-cache";
import { serializePredictionMarkets } from "@/lib/bigint-serialization";
import { fetchActiveMarketsFromChain } from "@/lib/server/prediction-market-data";

export async function GET(_request: NextRequest) {
  try {
    const activeMarkets = await fetchActiveMarketsFromChain();

    await cacheActiveMarkets(activeMarkets);

    const serialized = serializePredictionMarkets(activeMarkets);
    return NextResponse.json(serialized);
  } catch (error) {
    console.error("Error fetching markets", error);

    const cached = await getCachedActiveMarkets();
    if (cached?.length) {
      const serialized = serializePredictionMarkets(cached);
      return NextResponse.json(serialized);
    }

    return NextResponse.json(
      { error: "Failed to fetch markets" },
      { status: 500 }
    );
  }
}

