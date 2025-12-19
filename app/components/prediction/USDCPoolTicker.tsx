"use client";

import { Badge } from '@/components/ui/badge';
import { useEffect, useState } from 'react';

interface PoolData {
  totalPoolUSDC: string;
  activeMarketCount: number;
  totalBets: number;
}

export function USDCPoolTicker() {
  const [data, setData] = useState<PoolData | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let mounted = true;

    const fetchData = async () => {
      if (!mounted) return;
      
      setIsFetching(true);
      try {
        const response = await fetch('/api/prediction/pool');
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Failed to fetch pool data' }));
          throw new Error(errorData.error || 'Failed to fetch pool data');
        }
        const newData = await response.json();

        if (!mounted) return;

        // Animate on change
        setData((prevData) => {
          if (prevData && newData.totalPoolUSDC !== prevData.totalPoolUSDC) {
            setIsAnimating(true);
            setTimeout(() => {
              if (mounted) {
                setIsAnimating(false);
              }
            }, 1000);
          }
          return newData;
        });
        if (mounted) {
          setIsLoading(false);
          setHasError(false);
        }
      } catch (error) {
        console.error('Error fetching pool data:', error);
        if (mounted) {
          setIsLoading(false);
          setHasError(true);
          setData({
            totalPoolUSDC: '0.00',
            activeMarketCount: 0,
            totalBets: 0,
          });
        }
      } finally {
        if (mounted) {
          setIsFetching(false);
        }
      }
    };

    // Initial fetch
    fetchData();

    // Poll every 30 seconds
    const interval = setInterval(fetchData, 30000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

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
              {isFetching || isAnimating ? (
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

