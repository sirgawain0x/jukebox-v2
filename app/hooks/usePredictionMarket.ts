"use client";

import { useQuery } from "@tanstack/react-query";
// Removed: useMutation, useQueryClient - no longer used after removing old contract hooks
import { useAccount } from "wagmi";
import { Address } from "viem";
import type {
  PredictionMarket,
  MarketBet,
  MarketBetWithPreview,
  MarketPreview,
} from "@/types/prediction-market";
// Removed: MarketSide - no longer used after removing old contract hooks
// Removed: Old contract hooks - using AutomatedPredictionMarket hooks instead
// Note: API-based hooks (useActiveMarkets, etc.) still work via API routes
// Removed: parseUSDC - no longer used after removing old contract hooks
import {
  deserializePredictionMarkets,
  deserializePredictionMarket,
  deserializeMarketBets,
  deserializeMarketBet,
} from "@/lib/bigint-serialization";
import {
  cacheActiveMarkets,
  getCachedActiveMarkets,
  cacheMarket,
  getCachedMarket,
  cacheMarketBets,
  getCachedMarketBets,
  cacheUserBets,
  getCachedUserBets,
  calculateOdds,
} from "@/lib/prediction-cache";

/**
 * Fetch active markets from API
 */
async function fetchActiveMarkets(forceRefresh = false): Promise<PredictionMarket[]> {
  // Don't use local cache if forcing refresh - let the API handle it
  const cached = forceRefresh ? null : await getCachedActiveMarkets();
  if (cached) return cached;

  const url = forceRefresh 
    ? "/api/prediction/markets?refresh=true"
    : "/api/prediction/markets";
  
  const response = await fetch(url, { 
    cache: forceRefresh ? "no-store" : "default" 
  });
  
  if (!response.ok) {
    throw new Error("Failed to fetch active markets");
  }

  // API returns BigInt values as strings, convert back to BigInt
  const marketsData = await response.json();
  const markets = deserializePredictionMarkets(marketsData);
  
  // Only cache if we successfully fetched (API already caches server-side)
  if (markets.length > 0 || !forceRefresh) {
    await cacheActiveMarkets(markets);
  }
  
  return markets;
}

/**
 * Fetch market by ID
 */
async function fetchMarket(marketId: string): Promise<PredictionMarket> {
  const cached = await getCachedMarket(marketId);
  if (cached) return cached;

  const response = await fetch(`/api/prediction/markets/${marketId}`);
  if (!response.ok) {
    throw new Error("Failed to fetch market");
  }

  // API returns BigInt values as strings, convert back to BigInt
  const marketData = await response.json();
  const market = deserializePredictionMarket(marketData);
  await cacheMarket(market);
  return market;
}

/**
 * Fetch bets for a market
 */
async function fetchMarketBets(marketId: string): Promise<MarketBet[]> {
  const cached = await getCachedMarketBets(marketId);
  if (cached) return cached;

  const response = await fetch(`/api/prediction/markets/${marketId}/bets`);
  if (!response.ok) {
    throw new Error("Failed to fetch market bets");
  }

  // API returns BigInt values as strings, convert back to BigInt
  const betsData = await response.json();
  const bets = deserializeMarketBets(betsData);
  await cacheMarketBets(marketId, bets);
  return bets;
}

/**
 * Fetch user's bets and bet count
 */
async function fetchUserBets(address: Address): Promise<{ bets: MarketBetWithPreview[]; betCount: number }> {
  const cached = await getCachedUserBets(address);
  
  const response = await fetch(`/api/prediction/users/${address}/bets`);
  if (!response.ok) {
    throw new Error("Failed to fetch user bets");
  }

  // API returns BigInt values as strings, convert back to BigInt
  const data = await response.json();
  const rawBets: Array<unknown> = data.bets || data;
  const bets = (rawBets as Array<Record<string, unknown>>).reduce<MarketBetWithPreview[]>(
    (accumulator, bet) => {
      if (!isSerializedMarketBet(bet)) {
        console.warn("Skipping invalid bet payload", bet);
        return accumulator;
      }

      const { market, ...serializedBet } = bet;
      const baseBet = deserializeMarketBet(serializedBet);
      const preview = isSerializedMarketPreview(market);

      accumulator.push({
        ...baseBet,
        market: preview ?? null,
      });

      return accumulator;
    },
    []
  );
  const betCount = data.betCount ?? bets.length;
  
  // Cache the bets
  if (!cached) {
    await cacheUserBets(address, bets);
  }
  
  return { bets, betCount };
}

function isSerializedMarketBet(value: unknown): value is SerializedMarketBet {
  if (!value || typeof value !== "object") return false;

  const record = value as Record<string, unknown>;

  if (typeof record.id !== "string") return false;
  if (typeof record.marketId !== "string") return false;
  if (typeof record.userAddress !== "string") return false;
  if (record.side !== "YES" && record.side !== "NO") return false;
  if (typeof record.timestamp !== "number") return false;
  if (typeof record.claimed !== "boolean") return false;
  if (typeof record.amount !== "string" && typeof record.amount !== "bigint") return false;
  if ("txHash" in record && record.txHash !== undefined && typeof record.txHash !== "string") return false;
  return true;
}

function isSerializedMarketPreview(value: unknown): MarketPreview | null {
  if (!value || typeof value !== "object") return null;

  const record = value as Record<string, unknown>;

  if (typeof record.id !== "string") return null;
  if (typeof record.songTitle !== "string") return null;
  if (typeof record.songArtist !== "string") return null;
  if (typeof record.endTime !== "number") return null;
  if (record.status !== "ACTIVE" && record.status !== "RESOLVED" && record.status !== "CANCELLED") return null;
  if ("songCover" in record && record.songCover !== undefined && typeof record.songCover !== "string") return null;

  return {
    id: record.id,
    songTitle: record.songTitle,
    songArtist: record.songArtist,
    songCover: record.songCover as string | undefined,
    endTime: record.endTime,
    status: record.status as MarketPreview["status"],
  };
}

interface SerializedMarketBet extends Omit<MarketBet, "amount"> {
  amount: string | bigint;
  market?: unknown;
}

/**
 * Hook to fetch active markets
 */
export function useActiveMarkets() {
  return useQuery({
    queryKey: ["prediction-markets", "active"],
    queryFn: () => fetchActiveMarkets(false),
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 5000, // Consider stale after 5 seconds
    refetchOnMount: true, // Always refetch when component mounts
    refetchOnWindowFocus: true, // Refetch when window regains focus
  });
}

/**
 * Hook to fetch a specific market
 */
export function useMarket(marketId: string) {
  return useQuery({
    queryKey: ["prediction-markets", marketId],
    queryFn: () => fetchMarket(marketId),
    enabled: !!marketId,
  });
}

/**
 * Hook to fetch bets for a market
 */
export function useMarketBets(marketId: string) {
  return useQuery({
    queryKey: ["prediction-bets", marketId],
    queryFn: () => fetchMarketBets(marketId),
    enabled: !!marketId,
    refetchInterval: 30000,
  });
}

/**
 * Hook to fetch user's bets
 */
export function useUserBets() {
  const { address } = useAccount();

  return useQuery({
    queryKey: ["prediction-user-bets", address],
    queryFn: () => (address ? fetchUserBets(address) : Promise.resolve({ bets: [], betCount: 0 })),
    enabled: !!address,
  });
}

/**
 * Hook to place a bet
 * @deprecated Use AutomatedPredictionMarket hooks directly instead
 * This hook is kept for backward compatibility but will be removed in a future version
 */
export function usePlaceBet() {
  // This hook is no longer functional as the old contract has been removed
  // Use AutomatedPredictionMarket hooks directly instead
  throw new Error("usePlaceBet from old contract is no longer available. Use AutomatedPredictionMarket hooks instead.");
}

/**
 * Hook to claim winnings
 * @deprecated Use AutomatedPredictionMarket hooks directly instead
 * This hook is kept for backward compatibility but will be removed in a future version
 */
export function useClaimWinnings() {
  // This hook is no longer functional as the old contract has been removed
  // Use AutomatedPredictionMarket hooks directly instead
  throw new Error("useClaimWinnings from old contract is no longer available. Use AutomatedPredictionMarket hooks instead.");
}

/**
 * Hook to get market odds
 */
export function useMarketOdds(market: PredictionMarket | null) {
  return useQuery({
    queryKey: ["prediction-odds", market?.id],
    queryFn: () => {
      if (!market) return null;
      return calculateOdds(market.totalPoolYes, market.totalPoolNo);
    },
    enabled: !!market,
  });
}

