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
        <div className="text-center py-8 text-[var(--app-foreground-muted)]">
          <p className="mb-2">No active markets</p>
          <p className="text-sm">Check back soon for new prediction markets!</p>
        </div>
      </Card>
    );
  }

  // Sort markets by rank (ascending order: 1, 2, 3...)
  // Markets are already ranked by their position in the trending list
  // If marketIndex is set, use it; otherwise maintain array order
  const sortedMarkets = [...markets].sort((a, b) => {
    // If both have marketIndex, sort by that
    if (a.marketIndex !== undefined && b.marketIndex !== undefined) {
      return a.marketIndex - b.marketIndex;
    }
    // Otherwise maintain original order (trending songs are already ranked)
    return 0;
  });

  return (
    <Card title="🎯 Weekly Trending Charts">
      <div className="mb-6">
        <p className="text-sm text-[var(--app-foreground-muted)] mb-2">
          Bet USDC on which songs will become the hottest on-chain music this week.
        </p>
        <p className="text-xs text-[var(--app-foreground-muted)]">
          Rankings update weekly. Predict correctly and win your share of the pool!
        </p>
      </div>

      {/* Rankings Header */}
      <div className="mb-4 pb-3 border-b border-[rgba(0,0,0,0.1)]">
        <div className="flex items-center justify-between text-xs font-semibold text-[var(--app-foreground-muted)] uppercase tracking-wide">
          <span className="w-14">Rank</span>
          <span className="flex-1">Song</span>
          <span className="w-24 text-right">Pool</span>
          <span className="w-32 text-right">Odds</span>
        </div>
      </div>

      <div className="space-y-3">
        {sortedMarkets.map((market, index) => (
          <MarketCard
            key={market.id}
            market={market}
            rank={market.marketIndex !== undefined ? market.marketIndex + 1 : index + 1}
          />
        ))}
      </div>

      {sortedMarkets.length === 0 && (
        <div className="text-center py-12">
          <p className="text-[var(--app-foreground-muted)] mb-2">No active markets</p>
          <p className="text-xs text-[var(--app-foreground-muted)]">
            Markets are created weekly based on trending songs
          </p>
        </div>
      )}
    </Card>
  );
}

