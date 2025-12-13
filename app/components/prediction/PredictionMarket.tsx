"use client";

import { useActiveMarkets } from "@/app/hooks/usePredictionMarket";
import { MarketCard } from "./MarketCard";
import { Card } from "../ui/Card";
import { Skeleton } from "@/components/ui/skeleton";
import { isTrendingMetadataMissing } from "@/lib/prediction-market-utils";

export function PredictionMarket() {
  const { data: markets, isLoading, error } = useActiveMarkets();

  if (isLoading) {
    return (
      <Card title="🎯 Trending Prediction Markets">
        <div className="mb-6">
          <p className="text-sm text-(--app-foreground-muted) mb-2">
            Active markets created by users predicting which songs will reach #1 in the weekly trending charts.
          </p>
          <p className="text-xs text-(--app-foreground-muted)">
            Bet YES or NO on each prediction. Winners split the pool (minus platform fee).
          </p>
        </div>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="border border-(--app-card-border)">
              <div className="space-y-4">
                {/* Song Info Skeleton */}
                <div className="flex items-start gap-4">
                  <Skeleton className="w-16 h-16 rounded-lg shrink-0" />
                  <div className="flex-1 min-w-0 space-y-2">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                </div>
                
                {/* Pool Info Skeleton */}
                <div className="flex items-center justify-between py-2 px-3 bg-[#f0f4ff] rounded-lg">
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                  <Skeleton className="h-4 w-24" />
                </div>
                
                {/* Market Status Skeleton */}
                <Skeleton className="h-12 w-full rounded-lg" />
              </div>
            </Card>
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

  const filteredMarkets = markets.filter((market) => !isTrendingMetadataMissing(market));

  if (filteredMarkets.length === 0) {
    return (
      <Card title="🎯 Prediction Markets">
        <div className="text-center py-8 text-(--app-foreground-muted)">
          <p className="mb-2">No active markets</p>
          <p className="text-sm">Check back soon for new prediction markets!</p>
        </div>
      </Card>
    );
  }

  // Sort markets by total pool size (USDC) first, then by number of bets
  const sortedMarkets = [...filteredMarkets].sort((a, b) => {
    // Calculate total pool for each market
    const totalPoolA = a.totalPoolYes + a.totalPoolNo;
    const totalPoolB = b.totalPoolYes + b.totalPoolNo;
    
    // First sort by total pool size (descending - highest first)
    const poolDiff = Number(totalPoolB) - Number(totalPoolA);
    if (poolDiff !== 0) {
      return poolDiff;
    }
    
    // If pools are equal, sort by number of bets (descending - most bets first)
    const betsDiff = (b.totalBets || 0) - (a.totalBets || 0);
    if (betsDiff !== 0) {
      return betsDiff;
    }
    
    // If pools and bets are equal, maintain creation order (newest first)
    return (b.marketIndex ?? 0) - (a.marketIndex ?? 0);
  });

  return (
    <Card title="🎯 Trending Prediction Markets">
      <div className="mb-6">
        <p className="text-sm text-(--app-foreground-muted) mb-2">
          Active markets created by users predicting which songs will reach #1 in the weekly trending charts.
        </p>
        <p className="text-xs text-(--app-foreground-muted)">
          Bet YES or NO on each prediction. Winners split the pool (minus platform fee).
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

