"use client";

import Image from "next/image";
import { useAccount } from "wagmi";
import { formatUSDC } from "@/lib/usdc-utils";
import { useMarketOdds } from "@/app/hooks/usePredictionMarket";
import type { PredictionMarket } from "@/types/prediction-market";
import { Card } from "../ui/Card";
import { useGetUserBets } from "@/lib/contracts/prediction-market-hooks";
import { isTrendingMetadataMissing } from "@/lib/prediction-market-utils";

interface MarketCardProps {
  market: PredictionMarket;
}

export function MarketCard({ market }: MarketCardProps) {
  const { address, isConnected } = useAccount();
  
  const { data: odds } = useMarketOdds(market);
  
  // Get user's current bets on this market (for display only)
  const { data: userBetsData } = useGetUserBets(
    market.marketIndex !== undefined ? BigInt(market.marketIndex) : undefined,
    address
  );
  
  // Viem returns contract data as arrays: [amountYes, amountNo, claimed]
  const userAmountYes = userBetsData && Array.isArray(userBetsData)
    ? (userBetsData[0] as bigint) || BigInt(0)
    : BigInt(0);
  const userAmountNo = userBetsData && Array.isArray(userBetsData)
    ? (userBetsData[1] as bigint) || BigInt(0)
    : BigInt(0);
  const hasExistingBets = userAmountYes > BigInt(0) || userAmountNo > BigInt(0);

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
            <h3 className="font-semibold text-lg text-[#111111] truncate">
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
        <div className="flex items-center justify-between py-2 px-3 bg-[#f0f4ff] rounded-lg">
          <div className="flex items-center gap-4">
            <span className="text-xs font-medium text-[#0052ff]">
              {totalPoolDisplay} USDC
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
            {/* Show user's existing bets if any */}
            {isConnected && hasExistingBets && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-1">
                <p className="text-xs font-semibold text-blue-800 mb-2">Your Current Bets:</p>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-blue-700">YES:</span>
                  <span className="font-medium text-blue-900">
                    {userAmountYes > BigInt(0) ? formatUSDC(userAmountYes) : "0"} USDC
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-blue-700">NO:</span>
                  <span className="font-medium text-blue-900">
                    {userAmountNo > BigInt(0) ? formatUSDC(userAmountNo) : "0"} USDC
                  </span>
                </div>
                <p className="text-[10px] text-blue-600 mt-2">
                  💡 Use the &quot;Place Your Bet&quot; section above to bet YES or NO on this market.
                </p>
              </div>
            )}
            {/* <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
              <p className="text-sm font-medium text-green-800">
                ✓ Betting is open - Use the "Place Your Bet" section above to bet
              </p>
            </div> */}
          </div>
        )}

        {market.status === "RESOLVED" && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
            <p className="text-sm font-medium text-green-800">
              Market Resolved: {market.totalPoolYes > market.totalPoolNo ? "YES" : "NO"} Won
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}

