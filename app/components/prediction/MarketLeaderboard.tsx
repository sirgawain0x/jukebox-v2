"use client";

import { useActiveMarkets } from "@/app/hooks/usePredictionMarket";
import { formatUSDC } from "@/lib/usdc-utils";
import { Card } from "../ui/Card";
import { Skeleton } from "@/components/ui/skeleton";

export function MarketLeaderboard() {
  const { data: markets, isLoading } = useActiveMarkets();

  if (isLoading) {
    return (
      <Card title="🏆 Leaderboard">
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </Card>
    );
  }

  if (!markets || markets.length === 0) {
    return (
      <Card title="🏆 Leaderboard">
        <div className="text-center py-8 text-[var(--app-foreground-muted)]">
          <p>No markets available yet</p>
        </div>
      </Card>
    );
  }

  // Calculate leaderboard data
  // Sort markets by highest USDC amount (totalPoolYes + totalPoolNo)
  const sortedMarkets = [...markets]
    .sort((a, b) => {
      const totalA = Number(a.totalPoolYes + a.totalPoolNo);
      const totalB = Number(b.totalPoolYes + b.totalPoolNo);
      return totalB - totalA; // Descending order (highest first)
    })
    .slice(0, 10);

  return (
    <Card title="🏆 Top Markets">
      <div className="space-y-3">
        {sortedMarkets.map((market, index) => {
          const totalPool = market.totalPoolYes + market.totalPoolNo;

          // Check if it's a generic active market (Unknown Track)
          const isGenericMarket = market.songTitle === "Unknown Track";
          const displayTitle = isGenericMarket
            ? `Weekly Market #${market.marketIndex || market.id.replace("market-", "")}`
            : market.songTitle;

          return (
            <div
              key={market.id}
              className="flex items-center justify-between p-3 bg-[#f9fafb] rounded-lg border border-gray-200"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#0052ff] to-[#7c3aed] flex items-center justify-center text-white font-bold text-sm">
                  {index + 1}
                </div>
                <div>
                  <p className="font-medium text-[#111111] truncate max-w-[200px]">
                    {displayTitle}
                  </p>
                  {!isGenericMarket && (
                    <p className="text-xs text-[var(--app-foreground-muted)] truncate max-w-[200px]">
                      {market.songArtist}
                    </p>
                  )}
                  {isGenericMarket && (
                    <p className="text-xs text-[var(--app-foreground-muted)] truncate max-w-[200px]">
                      Ends {new Date(market.endTime * 1000).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold text-[#0052ff]">
                  {formatUSDC(totalPool)} USDC
                </p>
                <p className="text-xs text-[var(--app-foreground-muted)]">
                  {market.totalBets} bets
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

