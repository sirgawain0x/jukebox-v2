"use client";

import { useAccount, useChainId } from "wagmi";
import { Card } from "../ui/Card";
import { useToast } from "../ui/ToastProvider";
import { useCreateWeeklyMarket, useGetNextMondayEST, useGetMarketCount } from "@/lib/contracts/automated-prediction-market-hooks";
import { isAutomatedPredictionMarketDeployed } from "@/lib/contracts/automated-prediction-market";
import { Button } from "../ui/Button";
import { useEffect } from "react";

export function CreateAutomatedMarket() {
  const { isConnected, address } = useAccount();
  const chainId = useChainId();
  const { showToast } = useToast();
  
  const isContractDeployed = isAutomatedPredictionMarketDeployed(chainId);
  const { createWeeklyMarket, isPending, isSuccess, isError, error } = useCreateWeeklyMarket();
  const { data: nextMondayEST } = useGetNextMondayEST();
  const { data: marketCount } = useGetMarketCount();

  // Show success/error toasts
  useEffect(() => {
    if (isSuccess) {
      showToast("Weekly market created successfully! 🎉");
    }
  }, [isSuccess, showToast]);

  useEffect(() => {
    if (isError && error) {
      showToast(`Error: ${error.message}`, "error");
    }
  }, [isError, error, showToast]);

  // Format timestamp to readable date
  const formatDate = (timestamp: bigint | undefined) => {
    if (!timestamp) return "Loading...";
    const date = new Date(Number(timestamp) * 1000);
    return date.toLocaleString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "America/New_York",
      timeZoneName: "short",
    });
  };

  if (!isContractDeployed) {
    return (
      <Card title="📅 Create Weekly Market">
        <div className="text-center py-4 text-(--app-foreground-muted)">
          <p>Automated prediction market contract not deployed on this network.</p>
          <p className="text-sm mt-2">Please switch to Base Sepolia or Base Mainnet.</p>
        </div>
      </Card>
    );
  }

  return (
    <Card title="📅 Create Weekly Market">
      <div className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm font-medium text-blue-900 mb-2">How it works:</p>
          <ul className="text-xs text-blue-800 space-y-1 list-disc list-inside">
            <li>Creates a new weekly prediction market automatically</li>
            <li>Market resolves on the next Monday at 5:00 AM UTC</li>
            <li>Users bet on which track will be #1 trending on Spinamp</li>
            <li>Winners split the pool (minus 10% protocol fee)</li>
            <li>Resolution happens automatically via Chainlink Functions</li>
          </ul>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span className="text-(--app-foreground-muted)">Current Markets:</span>
            <span className="font-medium">{marketCount?.toString() || "0"}</span>
          </div>
          
          {nextMondayEST && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-(--app-foreground-muted)">Next Resolution:</span>
              <span className="font-medium">{formatDate(nextMondayEST)}</span>
            </div>
          )}
        </div>

        {!isConnected ? (
          <div className="text-center py-4">
            <p className="text-sm text-(--app-foreground-muted) mb-3">
              Connect your wallet to create a market
            </p>
            <p className="text-xs text-(--app-foreground-muted)">
              Note: Only the contract owner can create markets
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <Button
              onClick={() => {
                try {
                  createWeeklyMarket();
                } catch (err) {
                  showToast(
                    err instanceof Error ? err.message : "Failed to create market",
                    "error"
                  );
                }
              }}
              disabled={isPending}
              className="w-full"
            >
              {isPending ? "Creating Market..." : "Create Weekly Market"}
            </Button>
            
            <p className="text-xs text-center text-(--app-foreground-muted)">
              This will create a new market that resolves on {nextMondayEST ? formatDate(nextMondayEST) : "the next Monday"}
            </p>
          </div>
        )}

        {isError && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">
              {error?.message || "Failed to create market. You may not be the contract owner."}
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}
