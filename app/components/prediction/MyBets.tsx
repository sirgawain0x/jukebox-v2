"use client";

import Image from "next/image";
import { useAccount } from "wagmi";
import { formatUSDC } from "@/lib/usdc-utils";
import { useUserBets } from "@/app/hooks/usePredictionMarket";
import { Card } from "../ui/Card";
import { USDCIcon } from "../ui/USDCIcon";
import { Skeleton } from "@/components/ui/skeleton";

export function MyBets() {
  const { isConnected, address: _address } = useAccount();
  const { data: betsData, isLoading } = useUserBets();

  const bets = betsData?.bets || [];
  const betCount = betsData?.betCount ?? bets.length;



  const renderBetCard = (
    bet: (typeof bets)[number],
    variant: "active" | "resolved"
  ) => {
    const market = bet.market;
    const title = market?.songTitle ?? `Market ${bet.marketId}`;
    const artist = market?.songArtist ?? "Unknown Artist";
    const cover = market?.songCover;
    const endLabel = market
      ? new Date(market.endTime * 1000).toLocaleString()
      : new Date(bet.timestamp * 1000).toLocaleString();

    return (
      <div
        key={bet.id}
        className={
          variant === "active"
            ? "bg-[#f0f4ff] dark:bg-blue-900/10 rounded-lg p-4 border border-[#0052ff]/20 dark:border-blue-500/20"
            : "bg-gray-50 dark:bg-white/5 rounded-lg p-4 border border-gray-200 dark:border-white/10"
        }
      >
        <div className="flex items-start gap-3 mb-3">
          {cover ? (
            <Image
              src={cover}
              alt={title}
              width={56}
              height={56}
              className="h-14 w-14 rounded-lg object-cover"
              unoptimized
            />
          ) : (
            <div className="h-14 w-14 rounded-lg bg-[#dbe4ff] dark:bg-blue-900/40 flex items-center justify-center text-sm font-semibold text-[#0052ff] dark:text-blue-300">
              {title.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-medium text-[#111111] dark:text-white truncate">{title}</p>
            <p className="text-sm text-[var(--app-foreground-muted)] truncate">{artist}</p>
            <p className="text-xs text-[var(--app-foreground-muted)] mt-1">Placed on {new Date(bet.timestamp * 1000).toLocaleDateString()}</p>
            {market && (
              <p className="text-xs text-[var(--app-foreground-muted)]">Ends {endLabel}</p>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="text-left">
            <p className={`${variant === "active" ? "text-sm text-[#0052ff] dark:text-blue-400 font-semibold" : "text-sm text-gray-600 dark:text-gray-400 font-semibold"} flex items-center`}>
              {formatUSDC(bet.amount)} USDC
              <USDCIcon className="ml-1" size={14} />
            </p>
          </div>
          <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${bet.side === "YES"
              ? variant === "active"
                ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                : "bg-green-200 text-green-900 dark:bg-green-900/20 dark:text-green-400"
              : variant === "active"
                ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                : "bg-red-200 text-red-900 dark:bg-red-900/20 dark:text-red-400"
              }`}
          >
            {variant === "resolved" ? `${bet.side} - Claimed` : bet.side}
          </span>
        </div>
      </div>
    );
  };

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
          <p>You haven&apos;t placed any bets yet</p>
          <p className="text-sm mt-2">Start predicting to win USDC!</p>
        </div>
      </Card>
    );
  }

  // Separate active and resolved bets
  const activeBets = bets.filter((bet) => !bet.claimed);
  const resolvedBets = bets.filter((bet) => bet.claimed);

  const _handleClaim = async (_marketId: string) => {
    // Claim functionality would be implemented here
    // Currently disabled as claimWinningsAsync is not available in this component
  };

  return (
    <Card title="🎲 My Bets">
      <div className="space-y-6">
        {/* Active Bets */}
        {activeBets.length > 0 && (
          <div>
            <h3 className="font-medium text-[#111111] dark:text-white mb-3">
              Active Bets ({activeBets.length})
            </h3>
            <div className="space-y-3">
              {activeBets.map((bet) => renderBetCard(bet, "active"))}
            </div>
          </div>
        )}

        {/* Resolved Bets */}
        {resolvedBets.length > 0 && (
          <div>
            <h3 className="font-medium text-[#111111] dark:text-white mb-3">
              Resolved Bets ({resolvedBets.length})
            </h3>
            <div className="space-y-3">
              {resolvedBets.map((bet) => renderBetCard(bet, "resolved"))}
            </div>
          </div>
        )}

        {/* Summary Stats */}
        <div className="bg-[#f9fafb] dark:bg-white/5 rounded-lg p-4 border border-gray-200 dark:border-white/10">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-[var(--app-foreground-muted)] mb-1">
                Total Bets
              </p>
              <p className="text-lg font-semibold text-[#111111] dark:text-white">
                {betCount}
              </p>
            </div>
            <div>
              <p className="text-xs text-[var(--app-foreground-muted)] mb-1">
                Total Wagered
              </p>
              <p className="text-lg font-semibold text-[#111111] dark:text-white">
                {formatUSDC(
                  bets.reduce((sum, bet) => sum + bet.amount, BigInt(0))
                )}{" "}
                USDC
                <USDCIcon className="ml-1 inline-flex" size={16} />
              </p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

