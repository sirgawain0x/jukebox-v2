import { NextRequest, NextResponse } from "next/server";
import { cacheActiveMarkets, getCachedActiveMarkets, invalidateActiveMarketsCache } from "@/lib/prediction-cache";
import { serializePredictionMarkets } from "@/lib/bigint-serialization";
import { fetchActiveMarketsFromChain } from "@/lib/server/prediction-market-data";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const forceRefresh = searchParams.get("refresh") === "true";

    // If force refresh, clear cache first
    if (forceRefresh) {
      try {
        await invalidateActiveMarketsCache();
      } catch (error) {
        console.error("Failed to invalidate cache:", error);
        // Continue anyway - we'll fetch fresh data
      }
    }

    // Always fetch from chain to get latest data
    const activeMarkets = await fetchActiveMarketsFromChain();

    // Update cache with fresh data
    await cacheActiveMarkets(activeMarkets);

    const serialized = serializePredictionMarkets(activeMarkets);
    return NextResponse.json(serialized);
  } catch (error) {
    console.error("Error fetching markets", error);

    // Fall back to cached data if available (only if not forcing refresh)
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

