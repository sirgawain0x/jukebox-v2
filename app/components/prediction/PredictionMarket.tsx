"use client";

import { useActiveMarkets } from "@/app/hooks/usePredictionMarket";
import { MarketCard } from "./MarketCard";
import { Card } from "../ui/Card";
import { Skeleton } from "@/components/ui/skeleton";

export function PredictionMarket() {
  const { data: markets, isLoading, error } = useActiveMarkets();

  if (isLoading) {
    return (
      <Card title="🎯 Prediction Markets">
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="w-12 h-12 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card title="🎯 Prediction Markets">
        <div className="text-red-500">
          Failed to load markets. Please try again later.
        </div>
      </Card>
    );
  }

  if (!markets || markets.length === 0) {
    return (
      <Card title="🎯 Prediction Markets">
        <div className="text-center py-8 text-(--app-foreground-muted)">
          <p className="mb-2">No active markets</p>
          <p className="text-sm">Check back soon for new prediction markets!</p>
        </div>
      </Card>
    );
  }

  // Maintain deterministic ordering when marketIndex is available
  const sortedMarkets = [...markets].sort((a, b) => {
    // If both have marketIndex, sort by that
    if (a.marketIndex !== undefined && b.marketIndex !== undefined) {
      return a.marketIndex - b.marketIndex;
    }
    // Otherwise maintain original order (trending songs are already ranked)
    return 0;
  });

  return (
    <Card title="🎯 Weekly Prediction Markets">
      <div className="mb-6">
        <p className="text-sm text-(--app-foreground-muted) mb-2">
          Bet USDC on which songs will become the hottest on-chain music this week.
        </p>
        <p className="text-xs text-(--app-foreground-muted)">
          Rankings update weekly. Predict correctly and win your share of the pool!
        </p>
      </div>

      {/* Rankings Header */}
      <div className="space-y-3">
        {sortedMarkets.map((market) => (
          <MarketCard
            key={market.id}
            market={market}
          />
        ))}
      </div>

      {sortedMarkets.length === 0 && (
        <div className="text-center py-12">
          <p className="text-(--app-foreground-muted) mb-2">No active markets</p>
          <p className="text-xs text-(--app-foreground-muted)">
            Markets are created weekly based on trending songs
          </p>
        </div>
      )}
    </Card>
  );
}

