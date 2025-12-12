"use client";

import { useState } from "react";
import { useAccount, useChainId } from "wagmi";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "../ui/ToastProvider";
import { formatUSDC, parseUSDC } from "@/lib/usdc-utils";
import {
  useGetMarketCount,
  useGetMarket,
  useGetMarketBets,
  usePlaceBetAutomated,
  useClaimWinnings,
} from "@/lib/contracts/automated-prediction-market-hooks";
import { isAutomatedPredictionMarketDeployed } from "@/lib/contracts/automated-prediction-market";

interface MarketData {
  id: bigint;
  endTime: bigint;
  resolveTime: bigint;
  resolved: boolean;
  winningTrack: string;
  totalPool: bigint;
}

interface MarketItemProps {
  marketId: bigint;
  betAmount: string;
  trackTitle: string;
  isExpanded: boolean;
  onBetAmountChange: (value: string) => void;
  onTrackTitleChange: (value: string) => void;
  onExpand: () => void;
  onCollapse: () => void;
}

function MarketItem({
  marketId,
  betAmount,
  trackTitle,
  isExpanded,
  onBetAmountChange,
  onTrackTitleChange,
  onExpand,
  onCollapse,
}: MarketItemProps) {
  const { isConnected, address } = useAccount();
  const { showToast } = useToast();
  const { data: marketData, isLoading: isLoadingMarket } = useGetMarket(marketId);
  const { data: bets } = useGetMarketBets(marketId);
  const { placeBet, isApprovingPending, isBetPending, isWaitingForApprove } = usePlaceBetAutomated();
  const { claimWinnings, isPending: isClaimingPending } = useClaimWinnings();

  const marketIdStr = marketId.toString();

  const formatDate = (timestamp: bigint) => {
    const date = new Date(Number(timestamp) * 1000);
    return date.toLocaleString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "America/New_York",
    });
  };

  const getTimeRemaining = (endTime: bigint) => {
    const now = BigInt(Math.floor(Date.now() / 1000));
    const remaining = endTime > now ? endTime - now : 0n;
    const days = Number(remaining) / 86400;
    const hours = (Number(remaining) % 86400) / 3600;
    if (days >= 1) {
      return `${Math.floor(days)}d ${Math.floor(hours)}h`;
    }
    if (hours >= 1) {
      return `${Math.floor(hours)}h`;
    }
    return "Less than 1h";
  };

  if (isLoadingMarket) {
    return (
      <div className="border border-gray-200 rounded-lg p-4">
        <Skeleton className="h-6 w-3/4 mb-2" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    );
  }

  const market = marketData as MarketData | undefined;
  if (!market || market.id === 0n) {
    return null;
  }

  const isResolved = market.resolved;
  const isBettingOpen = !isResolved && market.endTime > BigInt(Math.floor(Date.now() / 1000));
  const betCount = bets?.length || 0;
  const isPlacingBet = isApprovingPending || isBetPending || isWaitingForApprove;

  const handlePlaceBet = async () => {
    if (!isConnected || !address) {
      showToast("Please connect your wallet", "error");
      return;
    }

    if (!betAmount || parseFloat(betAmount) <= 0) {
      showToast("Please enter a valid bet amount", "error");
      return;
    }

    if (!trackTitle || trackTitle.trim().length === 0) {
      showToast("Please enter a track title", "error");
      return;
    }

    try {
      const amount = parseUSDC(betAmount);
      await placeBet(marketId, trackTitle.trim(), amount);
      showToast(`Bet placed: ${betAmount} USDC on "${trackTitle}"`, "success");
      onBetAmountChange("");
      onTrackTitleChange("");
      onCollapse();
    } catch (error) {
      console.error("Failed to place bet:", error);
      showToast(
        error instanceof Error ? error.message : "Failed to place bet. Please try again.",
        "error"
      );
    }
  };

  const handleClaimWinnings = () => {
    if (!isConnected) {
      showToast("Please connect your wallet", "error");
      return;
    }

    try {
      claimWinnings(marketId);
      showToast("Claiming winnings...", "info");
    } catch (error) {
      console.error("Failed to claim winnings:", error);
      showToast(
        error instanceof Error ? error.message : "Failed to claim winnings. Please try again.",
        "error"
      );
    }
  };

  return (
    <div
      className={`border rounded-lg p-4 ${
        isResolved
          ? "bg-gray-50 border-gray-200"
          : "bg-[#f0f4ff] border-[#0052ff]/20"
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-[#111111]">
              Market #{marketIdStr}
            </h3>
            {isResolved ? (
              <span className="px-2 py-0.5 text-xs bg-gray-200 text-gray-700 rounded">
                Resolved
              </span>
            ) : isBettingOpen ? (
              <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded">
                Active
              </span>
            ) : (
              <span className="px-2 py-0.5 text-xs bg-yellow-100 text-yellow-700 rounded">
                Betting Closed
              </span>
            )}
          </div>
          <div className="text-sm text-(--app-foreground-muted) space-y-1">
            <p>End Time: {formatDate(market.endTime)}</p>
            <p>Resolution: {formatDate(market.resolveTime)}</p>
            {!isResolved && isBettingOpen && (
              <p className="text-blue-600 font-medium">
                {getTimeRemaining(market.endTime)} remaining
              </p>
            )}
          </div>
        </div>
        <div className="text-right">
          <p className="font-semibold text-[#0052ff] text-lg">
            {formatUSDC(market.totalPool)} USDC
          </p>
          <p className="text-xs text-(--app-foreground-muted)">
            {betCount} {betCount === 1 ? "bet" : "bets"}
          </p>
        </div>
      </div>

      {isResolved && market.winningTrack && (
        <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm font-medium text-blue-900 mb-1">🏆 Winning Track:</p>
          <p className="text-sm text-blue-800">{market.winningTrack}</p>
        </div>
      )}

      {isBettingOpen && (
        <div className="mt-3 space-y-3">
          {!isExpanded ? (
            <Button
              variant="outline"
              size="sm"
              onClick={onExpand}
              className="w-full"
            >
              Place Bet
            </Button>
          ) : (
            <div className="space-y-2">
              <div>
                <label className="block text-xs font-medium text-(--app-foreground-muted) mb-1">
                  Track Title *
                </label>
                <input
                  type="text"
                  placeholder="Enter track title"
                  value={trackTitle}
                  onChange={(e) => onTrackTitleChange(e.target.value)}
                  className="w-full px-3 py-2 border border-[rgba(0,0,0,0.1)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0052ff] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-(--app-foreground-muted) mb-1">
                  Bet Amount (USDC) *
                </label>
                <input
                  type="number"
                  placeholder="0.00"
                  value={betAmount}
                  onChange={(e) => onBetAmountChange(e.target.value)}
                  min="0"
                  step="0.01"
                  className="w-full px-3 py-2 border border-[rgba(0,0,0,0.1)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0052ff] text-sm"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handlePlaceBet}
                  disabled={!betAmount || !trackTitle || !isConnected || isPlacingBet}
                  className="flex-1"
                >
                  {isPlacingBet ? "Placing Bet..." : "Place Bet"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onBetAmountChange("");
                    onTrackTitleChange("");
                    onCollapse();
                  }}
                  disabled={isPlacingBet}
                >
                  Cancel
                </Button>
              </div>
              {!isConnected && (
                <p className="text-xs text-center text-(--app-foreground-muted)">
                  Connect wallet to place bet
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {isResolved && isConnected && (
        <div className="mt-3">
          <Button
            variant="primary"
            size="sm"
            onClick={handleClaimWinnings}
            disabled={isClaimingPending}
            className="w-full"
          >
            {isClaimingPending ? "Claiming..." : "Claim Winnings"}
          </Button>
        </div>
      )}
    </div>
  );
}

export function AutomatedMarkets() {
  const chainId = useChainId();
  const [betAmounts, setBetAmounts] = useState<Record<string, string>>({});
  const [trackTitles, setTrackTitles] = useState<Record<string, string>>({});
  const [expandedMarkets, setExpandedMarkets] = useState<Record<string, boolean>>({});

  const isContractDeployed = isAutomatedPredictionMarketDeployed(chainId);
  const { data: marketCount, isLoading: isLoadingCount } = useGetMarketCount();

  // Generate array of market IDs (1 to marketCount)
  const marketIds = marketCount && marketCount > 0n
    ? Array.from({ length: Number(marketCount) }, (_, i) => BigInt(i + 1))
    : [];

  if (!isContractDeployed) {
    return (
      <Card title="🤖 Automated Prediction Markets">
        <div className="text-center py-4 text-(--app-foreground-muted)">
          <p>Automated prediction market contract not deployed on this network.</p>
          <p className="text-sm mt-2">Please switch to Base Sepolia or Base Mainnet.</p>
        </div>
      </Card>
    );
  }

  if (isLoadingCount) {
    return (
      <Card title="🤖 Automated Prediction Markets">
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="border border-gray-200 rounded-lg p-4">
              <Skeleton className="h-6 w-3/4 mb-2" />
              <Skeleton className="h-4 w-1/2 mb-4" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </div>
      </Card>
    );
  }

  if (marketIds.length === 0) {
    return (
      <Card title="🤖 Automated Prediction Markets">
        <div className="text-center py-8 text-(--app-foreground-muted)">
          <p className="mb-2">No markets created yet</p>
          <p className="text-sm">Create a weekly market to get started!</p>
        </div>
      </Card>
    );
  }

  return (
    <Card title="🤖 Automated Prediction Markets">
      <div className="mb-6">
        <p className="text-sm text-(--app-foreground-muted) mb-2">
          Bet on which track will be #1 trending on Spinamp by the resolution time.
        </p>
        <p className="text-xs text-(--app-foreground-muted)">
          Markets resolve automatically on Monday 5:00 AM EST. Winners split the pool (minus 10% fee).
        </p>
      </div>

      <div className="space-y-4">
        {marketIds.map((marketId) => {
          const marketIdStr = marketId.toString();
          return (
            <MarketItem
              key={marketIdStr}
              marketId={marketId}
              betAmount={betAmounts[marketIdStr] || ""}
              trackTitle={trackTitles[marketIdStr] || ""}
              isExpanded={expandedMarkets[marketIdStr] || false}
              onBetAmountChange={(value) =>
                setBetAmounts((prev) => ({ ...prev, [marketIdStr]: value }))
              }
              onTrackTitleChange={(value) =>
                setTrackTitles((prev) => ({ ...prev, [marketIdStr]: value }))
              }
              onExpand={() =>
                setExpandedMarkets((prev) => ({ ...prev, [marketIdStr]: true }))
              }
              onCollapse={() =>
                setExpandedMarkets((prev) => ({ ...prev, [marketIdStr]: false }))
              }
            />
          );
        })}
      </div>
    </Card>
  );
}
