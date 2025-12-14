"use client";

import { useAccount, useChainId } from "wagmi";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "../ui/ToastProvider";
import { formatUSDC } from "@/lib/usdc-utils";
import {
  useClaimWinnings,
} from "@/lib/contracts/automated-prediction-market-hooks";
import { useActiveMarkets } from "@/app/hooks/usePredictionMarket";
import { isAutomatedPredictionMarketDeployed } from "@/lib/contracts/automated-prediction-market";
import type { PredictionMarket } from "@/types/prediction-market";

interface MarketItemProps {
  market: PredictionMarket;
}

function MarketItem({
  market,
}: MarketItemProps) {
  const { isConnected } = useAccount();
  const { showToast } = useToast();
  const { claimWinnings, isPending: isClaimingPending } = useClaimWinnings();

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
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

  const getTimeRemaining = (endTime: number) => {
    const now = Math.floor(Date.now() / 1000);
    const remaining = endTime > now ? endTime - now : 0;
    const days = remaining / 86400;
    const hours = (remaining % 86400) / 3600;
    if (days >= 1) {
      return `${Math.floor(days)}d ${Math.floor(hours)}h`;
    }
    if (hours >= 1) {
      return `${Math.floor(hours)}h`;
    }
    return "Less than 1h";
  };

  const isResolved = market.status === "RESOLVED";
  const isBettingOpen = market.status === "ACTIVE" && market.endTime > Math.floor(Date.now() / 1000);

  // Use the bet count from the API data
  const betCount = market.totalBets;

  // Calculate total pool from the API data
  const totalPool = market.totalPoolYes + market.totalPoolNo;

  const handleClaimWinnings = () => {
    if (!isConnected) {
      showToast({ message: "Please connect your wallet", type: "error" });
      return;
    }

    try {
      // Market ID is the numeric ID from the contract
      const numericId = BigInt(market.marketIndex || market.id.replace("market-", ""));
      claimWinnings(numericId);
      showToast({ message: "Claiming winnings...", type: "info" });
    } catch (error) {
      console.error("Failed to claim winnings:", error);
      showToast({
        message: error instanceof Error ? error.message : "Failed to claim winnings. Please try again.",
        type: "error"
      });
    }
  };

  return (
    <div
      className={`border rounded-lg p-4 ${isResolved
          ? "bg-gray-50 border-gray-200"
          : "bg-[#f0f4ff] border-[#0052ff]/20"
        }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-[#111111]">
              Market #{market.marketIndex || market.id.replace("market-", "")}
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
            {/* Resolve time isn't strictly in the PredictionMarket type but endTime + 1h is approx */}
            {!isResolved && isBettingOpen && (
              <p className="text-blue-600 font-medium">
                {getTimeRemaining(market.endTime)} remaining
              </p>
            )}
          </div>
        </div>
        <div className="text-right">
          <p className="font-semibold text-[#0052ff] text-lg">
            {formatUSDC(totalPool)} USDC
          </p>
          <p className="text-xs text-(--app-foreground-muted)">
            {betCount} {betCount === 1 ? "bet" : "bets"}
          </p>
        </div>
      </div>

      {isResolved && market.songTitle && (
        <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm font-medium text-blue-900 mb-1">🏆 Winning Track:</p>
          <p className="text-sm text-blue-800">{market.songTitle}</p>
        </div>
      )}

      {isBettingOpen && (
        <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-800 text-center">
            ✅ Betting is open! Use the betting form above to place your bet.
          </p>
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
  const isContractDeployed = isAutomatedPredictionMarketDeployed(chainId);

  // Use API hook instead of contract hook
  // This provides richer data including bet counts and song metadata
  const { data: markets, isLoading } = useActiveMarkets();

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

  if (isLoading) {
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

  if (!markets || markets.length === 0) {
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
        {markets.map((market) => (
          <MarketItem
            key={market.id}
            market={market}
          />
        ))}
      </div>
    </Card>
  );
}
