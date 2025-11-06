"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAccount, useChainId } from "wagmi";
import { Address } from "viem";
import type {
  PredictionMarket,
  MarketBet,
  MarketSide,
} from "@/types/prediction-market";
import {
  useGetMarket,
  useGetUserBets,
  useGetMarketCount,
  usePlaceBet as usePlaceBetContract,
  useClaimWinnings as useClaimWinningsContract,
  useResolveMarket as useResolveMarketContract,
} from "@/lib/contracts/prediction-market-hooks";
import { formatUSDC, parseUSDC } from "@/lib/usdc-utils";
import {
  deserializePredictionMarkets,
  deserializePredictionMarket,
  deserializeMarketBets,
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
  cacheMarketOdds,
} from "@/lib/prediction-cache";

/**
 * Fetch active markets from API
 */
async function fetchActiveMarkets(): Promise<PredictionMarket[]> {
  const cached = await getCachedActiveMarkets();
  if (cached) return cached;

  const response = await fetch("/api/prediction/markets");
  if (!response.ok) {
    throw new Error("Failed to fetch active markets");
  }

  // API returns BigInt values as strings, convert back to BigInt
  const marketsData = await response.json();
  const markets = deserializePredictionMarkets(marketsData);
  await cacheActiveMarkets(markets);
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
async function fetchUserBets(address: Address): Promise<{ bets: MarketBet[]; betCount: number }> {
  const cached = await getCachedUserBets(address);
  
  const response = await fetch(`/api/prediction/users/${address}/bets`);
  if (!response.ok) {
    throw new Error("Failed to fetch user bets");
  }

  // API returns BigInt values as strings, convert back to BigInt
  const data = await response.json();
  const bets = deserializeMarketBets(data.bets || data);
  const betCount = data.betCount ?? bets.length;
  
  // Cache the bets
  if (!cached) {
    await cacheUserBets(address, bets);
  }
  
  return { bets, betCount };
}

/**
 * Hook to fetch active markets
 */
export function useActiveMarkets() {
  return useQuery({
    queryKey: ["prediction-markets", "active"],
    queryFn: fetchActiveMarkets,
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 5000, // Consider stale after 5 seconds
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
 */
export function usePlaceBet() {
  const queryClient = useQueryClient();
  const { address } = useAccount();
  const chainId = useChainId();
  const { placeBet: placeBetContract, ...rest } = usePlaceBetContract();

  const placeBet = useMutation({
    mutationFn: async ({
      marketId,
      amount,
      side,
    }: {
      marketId: bigint;
      amount: string; // USDC amount as string
      side: MarketSide;
    }) => {
      if (!address) throw new Error("Wallet not connected");

      const amountWei = parseUSDC(amount);
      const sideBool = side === "YES";

      // Place bet via contract
      await placeBetContract(marketId, amountWei, sideBool, address);

      // Invalidate queries to refetch
      queryClient.invalidateQueries({ queryKey: ["prediction-markets"] });
      queryClient.invalidateQueries({ queryKey: ["prediction-bets"] });
      queryClient.invalidateQueries({ queryKey: ["prediction-user-bets"] });
    },
  });

  return {
    placeBet: placeBet.mutate,
    placeBetAsync: placeBet.mutateAsync,
    ...placeBet,
    ...rest,
  };
}

/**
 * Hook to claim winnings
 */
export function useClaimWinnings() {
  const queryClient = useQueryClient();
  const { claimWinnings: claimWinningsContract, ...rest } =
    useClaimWinningsContract();

  const claim = useMutation({
    mutationFn: async (marketId: bigint) => {
      await claimWinningsContract(marketId);

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ["prediction-user-bets"] });
      queryClient.invalidateQueries({ queryKey: ["prediction-markets"] });
    },
  });

  return {
    claimWinnings: claim.mutate,
    claimWinningsAsync: claim.mutateAsync,
    ...claim,
    ...rest,
  };
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

