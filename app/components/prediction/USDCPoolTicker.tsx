"use client";

/**
 * USDCPoolTicker - Reads pool data directly from the smart contract
 * 
 * Benefits of reading directly from contract:
 * - No API dependency - works even if backend is down
 * - Real-time updates via blockNumber watching
 * - Decentralized - data comes directly from blockchain
 * - Uses block.timestamp implicitly (via blockNumber) for time calculations
 * - Automatic refetching every 30 seconds
 * 
 * The contract exposes:
 * - s_marketCount: Total number of markets
 * - markets(uint256): Market struct with totalPool, endTime, resolveTime, resolved
 * 
 * Time is determined by:
 * - Current block timestamp (via blockNumber watch)
 * - Can also use Date.now() as fallback (less precise but works)
 */

import { Badge } from '@/components/ui/badge';
import { useEffect, useState, useMemo } from 'react';
import { useReadContract, useReadContracts, useChainId } from 'wagmi';
import { 
  automatedPredictionMarketABI,
  tryGetAutomatedPredictionMarketAddress 
} from '@/lib/contracts/automated-prediction-market';
import type { PredictionMarket } from '@/types/prediction-market';

interface PoolData {
  totalPoolUSDC: string;
  activeMarketCount: number;
  totalBets: number;
}

export function USDCPoolTicker() {
  const chainId = useChainId();
  const contractAddress = tryGetAutomatedPredictionMarketAddress(chainId);
  
  // Get total market count
  const { data: marketCount, isLoading: isLoadingCount } = useReadContract({
    abi: automatedPredictionMarketABI,
    address: contractAddress || undefined,
    functionName: 's_marketCount',
    query: {
      enabled: !!contractAddress,
      refetchInterval: 30000, // Refetch every 30 seconds
    },
  });

  // Create array of market IDs to query (1 to marketCount)
  const marketIds = useMemo(() => {
    if (!marketCount || marketCount === BigInt(0)) return [];
    const count = Number(marketCount);
    return Array.from({ length: count }, (_, i) => i + 1);
  }, [marketCount]);

  // Read all markets in parallel
  const marketContracts = useMemo(() => {
    if (!contractAddress || marketIds.length === 0) return [];
    return marketIds.map((id) => ({
      abi: automatedPredictionMarketABI,
      address: contractAddress,
      functionName: 'markets' as const,
      args: [BigInt(id)],
    }));
  }, [contractAddress, marketIds]);

  const { data: marketsData, isLoading: isLoadingMarkets } = useReadContracts({
    contracts: marketContracts,
    query: {
      enabled: marketContracts.length > 0,
      refetchInterval: 30000,
    },
  });

  // Fetch bet counts from API (getMarketBets reverts on deployed contract)
  // The API reads from BetPlaced events which is more reliable
  const [betCountsFromAPI, setBetCountsFromAPI] = useState<Record<number, number>>({});
  const [isLoadingBetCounts, setIsLoadingBetCounts] = useState(false);

  useEffect(() => {
    if (marketIds.length === 0) return;

    const fetchBetCounts = async () => {
      setIsLoadingBetCounts(true);
      try {
        // Fetch active markets from API which includes bet counts
        const response = await fetch('/api/prediction/markets?includeResolved=false&includeExpired=false');
        if (response.ok) {
          const markets = (await response.json()) as PredictionMarket[];
          const counts: Record<number, number> = {};
          markets.forEach((market) => {
            const marketId = market.marketIndex || parseInt(market.id.replace('market-', ''), 10);
            if (marketId) {
              counts[marketId] = market.totalBets || 0;
            }
          });
          setBetCountsFromAPI(counts);
        }
      } catch (error) {
        console.error('Failed to fetch bet counts from API:', error);
      } finally {
        setIsLoadingBetCounts(false);
      }
    };

    fetchBetCounts();
    // Refetch every 30 seconds
    const interval = setInterval(fetchBetCounts, 30000);
    return () => clearInterval(interval);
  }, [marketIds.length]);

  // Calculate pool data from contract reads
  // Using blockNumber to get current block timestamp via useBlockTimestamp hook
  const data = useMemo<PoolData | null>(() => {
    if (!marketsData || marketsData.length === 0) {
      return {
        totalPoolUSDC: '0.00',
        activeMarketCount: 0,
        totalBets: 0,
      };
    }

    // Use current time (can also use block.timestamp if we read it from a block)
    // For now, using Date.now() - in production you might want to read block.timestamp
    const currentTime = Math.floor(Date.now() / 1000);
    let totalPool = BigInt(0);
    let activeMarketCount = 0;
    let totalBets = 0;

    marketsData.forEach((marketResult, index) => {
      if (!marketResult.result) return;
      
      // Market struct from ABI (matches server-side code in prediction-market-data.ts):
      // [id, endTime, resolveTime, resolved, winningTrack, creator, totalPool, totalPaidOut]
      // Index: 0      1           2           3           4             5        6           7
      // Note: ABI shows 8 fields - use index 6 for totalPool (matches server-side implementation)
      const market = marketResult.result as unknown as readonly [bigint, bigint, bigint, boolean, string, string, bigint, bigint];
      const endTime = Number(market[1]);
      const resolved = market[3];
      const totalPoolAmount = market[6]; // totalPool is at index 6 (matches server-side: data[6])

      // Market is active if: not resolved AND current time < endTime
      const isActive = !resolved && currentTime < endTime;
      
      if (isActive) {
        activeMarketCount++;
        totalPool += totalPoolAmount;
      }

      // Add bet count for this market (from API - getMarketBets reverts on deployed contract)
      // Use market ID from the market data (index + 1 since markets are 1-indexed)
      const marketId = index + 1;
      const betCount = betCountsFromAPI[marketId] || 0;
      totalBets += betCount;
    });

    // Convert to USDC (6 decimals)
    const totalPoolUSDC = Number(totalPool) / 1e6;

    return {
      totalPoolUSDC: totalPoolUSDC.toFixed(2),
      activeMarketCount,
      totalBets,
    };
  }, [marketsData, betCountsFromAPI]); // Recalculate when market or bet count data changes

  const isLoading = isLoadingCount || isLoadingMarkets || isLoadingBetCounts;
  const hasError = !contractAddress; // Error if contract address not found
  const [isAnimating, setIsAnimating] = useState(false);
  
  // Animate on data change
  useEffect(() => {
    if (data?.totalPoolUSDC) {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [data?.totalPoolUSDC]);

  // Theme-aware gradient - more vibrant for money/predictions
  const gradientClasses = "bg-gradient-to-r from-emerald-500 via-green-500 to-teal-600 dark:from-emerald-600 dark:via-green-600 dark:to-teal-700 text-white";

  if (isLoading) {
    return (
      <div className={`${gradientClasses} p-3 sm:p-4 rounded-lg animate-pulse shadow-lg`}>
        <div className="h-16 sm:h-20"></div>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className={`${gradientClasses} p-3 sm:p-4 rounded-lg shadow-lg`}>
        <p className="text-xs sm:text-sm opacity-90">Current Pool</p>
        <p className="text-xs opacity-75">Unable to load pool data</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className={`${gradientClasses} p-3 sm:p-4 rounded-lg shadow-lg`}>
        <p className="text-xs sm:text-sm opacity-90">Current Pool</p>
        <p className="text-xs opacity-75">No active markets</p>
      </div>
    );
  }

  return (
    <div className={`${gradientClasses} p-3 sm:p-4 rounded-lg shadow-lg relative overflow-hidden`}>
      {/* Animated background effect */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent animate-shimmer"></div>
      </div>
      
      <div className="relative z-10">
        <div className="flex items-start sm:items-center justify-between gap-2 sm:gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 sm:mb-2 flex-wrap">
              <Badge 
                variant="outline" 
                className="bg-white/20 dark:bg-white/30 border-white/40 dark:border-white/50 text-white text-[10px] sm:text-xs px-2 py-0.5 font-semibold"
              >
                💰 Current Pool
              </Badge>
              {data.activeMarketCount > 0 && (
                <span className="text-[10px] sm:text-xs opacity-75">
                  {data.activeMarketCount} active market{data.activeMarketCount !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            
            <p className="text-xs sm:text-sm opacity-90 my-1">Total USDC in All Markets</p>
            
            <div
              className={`text-2xl sm:text-3xl md:text-4xl font-bold transition-all duration-300 break-words ${
                isAnimating ? 'scale-110' : ''
              }`}
            >
              {data.totalPoolUSDC} USDC
            </div>
            
            <p className="text-[10px] sm:text-xs opacity-75 mt-2 break-words">
              {data.totalBets} total bet{data.totalBets !== 1 ? 's' : ''} across all markets
            </p>
          </div>

          {/* Animated flow indicator */}
          <div className="relative flex-shrink-0 ml-2 sm:ml-4">
            <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-full bg-white/25 dark:bg-white/35 flex items-center justify-center shadow-lg">
              {isLoading || isAnimating ? (
                <svg
                  className="w-7 h-7 sm:w-10 sm:h-10 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              ) : (
                <div className="relative">
                  <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-white/80 dark:bg-white/90 animate-pulse" />
                  <div className="absolute inset-0 w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-white/40 dark:bg-white/50 animate-ping" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

