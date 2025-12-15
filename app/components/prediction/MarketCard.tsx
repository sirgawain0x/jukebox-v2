"use client";

import Image from "next/image";
// Removed: useAccount - not currently used but may be needed for future bet display
import { formatUSDC } from "@/lib/usdc-utils";
import { useMarketOdds } from "@/app/hooks/usePredictionMarket";
import type { PredictionMarket } from "@/types/prediction-market";
import { Card } from "../ui/Card";
import { USDCIcon } from "../ui/USDCIcon";
// Removed: useGetUserBets from old contract - user bets now fetched via API
import { isTrendingMetadataMissing } from "@/lib/prediction-market-utils";

interface MarketCardProps {
  market: PredictionMarket;
}

export function MarketCard({ market }: MarketCardProps) {
  // Removed: address and isConnected - not currently used but may be needed for future bet display
  // const { address, isConnected } = useAccount();

  const { data: odds } = useMarketOdds(market);

  // User bets are now fetched via API routes, not directly from contract
  // This keeps the component simpler and works with both old and new contracts
  // Removed: hasExistingBets - not currently used but may be needed for future bet display

  const totalPool = market.totalPoolYes + market.totalPoolNo;
  const totalPoolDisplay = formatUSDC(totalPool);
  const timeRemaining = Math.max(0, market.endTime - Math.floor(Date.now() / 1000));
  const daysRemaining = Math.floor(timeRemaining / 86400);
  const hoursRemaining = Math.floor((timeRemaining % 86400) / 3600);

  const hasTrendingMetadataFallback = isTrendingMetadataMissing(market);

  const displayTitle = hasTrendingMetadataFallback ? "Song No Longer Trending" : market.songTitle;

  const displayArtist = hasTrendingMetadataFallback
    ? "Artist metadata unavailable"
    : market.songArtist;

  const fallbackNotice =
    "This song isn't doing so hot anymore and has fallen off the trending chart.";

  // Get rank badge color based on position
  return (
    <Card className="hover:shadow-xl transition-all border border-(--app-card-border)">
      <div className="space-y-4">
        {/* Rank and Song Info */}
        <div className="flex items-start gap-4">
          {market.songCover && (
            <Image
              src={market.songCover}
              alt={market.songTitle}
              width={64}
              height={64}
              className="w-16 h-16 rounded-lg object-cover shrink-0"
              unoptimized
            />
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg text-[#111111] dark:text-white truncate">
              {displayTitle}
            </h3>
            <p className="text-sm text-(--app-foreground-muted) truncate">
              {displayArtist}
            </p>
            {hasTrendingMetadataFallback && (
              <div className="mt-2 rounded-lg border border-red-200 bg-red-50 p-3">
                <p className="text-xs font-semibold text-red-700">
                  Getting Cold 🧊
                </p>
                <p className="text-xs text-red-600">
                  {fallbackNotice}
                </p>
                <p className="mt-1 text-[10px] text-red-500 overflow-auto whitespace-nowrap">
                  Song ID: {market.songId}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Pool Info - Compact */}
        <div className="flex items-center justify-between py-2 px-3 bg-[#f0f4ff] dark:bg-blue-900/20 rounded-lg">
          <div className="flex items-center gap-4">
            <span className="text-xs font-medium text-[#0052ff] dark:text-blue-400 flex items-center">
              {totalPoolDisplay} USDC
              <USDCIcon className="ml-1" size={12} />
            </span>
            {odds && (
              <>
                <span className="text-xs font-medium text-green-600">
                  YES {odds.yesOdds.toFixed(1)}%
                </span>
                <span className="text-xs font-medium text-red-600">
                  NO {odds.noOdds.toFixed(1)}%
                </span>
              </>
            )}
          </div>
          <span className="text-xs text-(--app-foreground-muted)">
            {daysRemaining}d {hoursRemaining}h left
          </span>
        </div>

        {/* Market Status Info */}
        {market.status === "ACTIVE" && (
          <div className="space-y-2">
            {/* User bets display removed - can be re-added later via API if needed */}
            {/* <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
              <p className="text-sm font-medium text-green-800">
                ✓ Betting is open - Use the "PREDICTION" section above to bet
              </p>
            </div> */}
          </div>
        )}

        {market.status === "RESOLVED" && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 text-center">
            <p className="text-sm font-medium text-green-800 dark:text-green-300">
              Market Resolved: {market.totalPoolYes > market.totalPoolNo ? "YES" : "NO"} Won
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}

