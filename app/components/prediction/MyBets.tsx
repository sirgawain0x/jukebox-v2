"use client";

import { useAccount } from "wagmi";
import { formatUSDC } from "@/lib/usdc-utils";
import { useUserBets, useClaimWinnings } from "@/app/hooks/usePredictionMarket";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Icon } from "../ui/Icon";
import { Skeleton } from "@/components/ui/skeleton";
import { Transaction, TransactionButton } from "@coinbase/onchainkit/transaction";
// Import removed - not used in this component
import { useChainId } from "wagmi";
import { useToast } from "../ui/ToastProvider";

export function MyBets() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { showToast } = useToast();
  const { data: betsData, isLoading } = useUserBets();
  const { claimWinningsAsync } = useClaimWinnings();
  
  const bets = betsData?.bets || [];
  const betCount = betsData?.betCount ?? bets.length;

  if (!isConnected) {
    return (
      <Card title="🎲 My Bets">
        <div className="text-center py-8 text-[var(--app-foreground-muted)]">
          <p>Connect your wallet to view your bets</p>
        </div>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card title="🎲 My Bets">
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </Card>
    );
  }

  if (!bets || bets.length === 0) {
    return (
      <Card title="🎲 My Bets">
        <div className="text-center py-8 text-[var(--app-foreground-muted)]">
          <p>You haven't placed any bets yet</p>
          <p className="text-sm mt-2">Start predicting to win USDC!</p>
        </div>
      </Card>
    );
  }

  // Separate active and resolved bets
  const activeBets = bets.filter((bet) => !bet.claimed);
  const resolvedBets = bets.filter((bet) => bet.claimed);

  const handleClaim = async (marketId: string) => {
    try {
      const marketIndex = parseInt(marketId);
      await claimWinningsAsync(BigInt(marketIndex));
      showToast("Winnings claimed successfully!");
    } catch (error) {
      console.error("Failed to claim winnings:", error);
      showToast("Failed to claim winnings. Please try again.");
    }
  };

  return (
    <Card title="🎲 My Bets">
      <div className="space-y-6">
        {/* Active Bets */}
        {activeBets.length > 0 && (
          <div>
            <h3 className="font-medium text-[#111111] mb-3">
              Active Bets ({activeBets.length})
            </h3>
            <div className="space-y-3">
              {activeBets.map((bet) => (
                <div
                  key={bet.id}
                  className="bg-[#f0f4ff] rounded-lg p-4 border border-[#0052ff]/20"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-medium text-[#111111]">
                        Market #{bet.marketId}
                      </p>
                      <p className="text-sm text-[var(--app-foreground-muted)]">
                        {new Date(bet.timestamp * 1000).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-[#0052ff]">
                        {formatUSDC(bet.amount)} USDC
                      </p>
                      <span
                        className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                          bet.side === "YES"
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {bet.side}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Resolved Bets */}
        {resolvedBets.length > 0 && (
          <div>
            <h3 className="font-medium text-[#111111] mb-3">
              Resolved Bets ({resolvedBets.length})
            </h3>
            <div className="space-y-3">
              {resolvedBets.map((bet) => (
                <div
                  key={bet.id}
                  className="bg-gray-50 rounded-lg p-4 border border-gray-200"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-[#111111]">
                        Market #{bet.marketId}
                      </p>
                      <p className="text-sm text-[var(--app-foreground-muted)]">
                        {new Date(bet.timestamp * 1000).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-600">
                        {formatUSDC(bet.amount)} USDC
                      </p>
                      <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-gray-200 text-gray-700">
                        {bet.side} - Claimed
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Summary Stats */}
        <div className="bg-[#f9fafb] rounded-lg p-4 border border-gray-200">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-[var(--app-foreground-muted)] mb-1">
                Total Bets
              </p>
              <p className="text-lg font-semibold text-[#111111]">
                {betCount}
              </p>
            </div>
            <div>
              <p className="text-xs text-[var(--app-foreground-muted)] mb-1">
                Total Wagered
              </p>
              <p className="text-lg font-semibold text-[#111111]">
                {formatUSDC(
                  bets.reduce((sum, bet) => sum + bet.amount, BigInt(0))
                )}{" "}
                USDC
              </p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

