"use client";

import { Badge } from '@/components/ui/badge';
import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';

interface LiveRoyaltyData {
  totalFlowRate: string;
  totalFlowRateFormatted: string;
  dailyTotal: string;
  artistCount: number;
  topArtists: Array<{
    address: string;
    name: string;
    flowRate: number;
    dailyEarnings: string;
  }>;
}

export function LiveRoyaltiesTicker() {
  useAccount();
  const [data, setData] = useState<LiveRoyaltyData | null>(null);
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
        const response = await fetch('/api/superfluid/royalties/live');
        if (!response.ok) {
          // If response is not ok, try to get error message from response
          const errorData = await response.json().catch(() => ({ error: 'Failed to fetch royalties' }));
          throw new Error(errorData.error || 'Failed to fetch royalties');
        }
        const newData = await response.json();

        if (!mounted) return;

        // Animate on change (compare with previous data without causing re-render)
        setData((prevData) => {
          if (prevData && newData.totalFlowRate !== prevData.totalFlowRate) {
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
        console.error('Error fetching live royalties:', error);
        if (mounted) {
          setIsLoading(false);
          setHasError(true);
          // Set default empty data on error to show fallback UI
          setData({
            totalFlowRate: '0',
            totalFlowRateFormatted: '$0.00000000/sec',
            dailyTotal: '0.00',
            artistCount: 0,
            topArtists: [],
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

    // Poll every 30 seconds (reduced from 5 seconds to save resources)
    const interval = setInterval(fetchData, 30000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []); // Empty dependency array - only run on mount/unmount

  // Theme-aware gradient that works in both light and dark modes
  const gradientClasses = "bg-gradient-to-r from-blue-500 to-purple-600 dark:from-blue-600 dark:to-purple-700 text-white";

  if (isLoading) {
    return (
      <div className={`${gradientClasses} p-3 sm:p-4 rounded-lg animate-pulse`}>
        <div className="h-12 sm:h-16"></div>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className={`${gradientClasses} p-3 sm:p-4 rounded-lg`}>
        <p className="text-xs sm:text-sm opacity-90">Live Royalties</p>
        <p className="text-xs opacity-75">Unable to load royalty data</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className={`${gradientClasses} p-3 sm:p-4 rounded-lg`}>
        <p className="text-xs sm:text-sm opacity-90">Live Royalties</p>
        <p className="text-xs opacity-75">No active pools</p>
      </div>
    );
  }

  return (
    <div className={`${gradientClasses} p-3 sm:p-4 rounded-lg shadow-lg`}>
      <div className="flex items-start sm:items-center justify-between gap-2 sm:gap-4">
        <div className="flex-1 min-w-0">
          <Badge 
            variant="outline" 
            className="mb-1 sm:mb-2 bg-white/10 dark:bg-white/20 border-white/30 dark:border-white/40 text-white text-[10px] sm:text-xs px-2 py-0.5"
          >
            Coming Soon!
          </Badge>
          <p className="text-xs sm:text-sm opacity-90 my-1">Live Royalties Flowing</p>
          <div
            className={`text-xl sm:text-2xl md:text-3xl font-bold transition-all duration-300 break-words ${
              isAnimating ? 'scale-110' : ''
            }`}
          >
            {data.totalFlowRateFormatted}
          </div>
          <p className="text-[10px] sm:text-xs opacity-75 mt-1 break-words">
            ${data.dailyTotal}/day to {data.artistCount} artist{data.artistCount !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Animated flow indicator - only animate when fetching or data changes */}
        <div className="relative flex-shrink-0 ml-2 sm:ml-4">
          <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-white/20 dark:bg-white/30 flex items-center justify-center">
            {isFetching || isAnimating ? (
              <svg
                className="w-6 h-6 sm:w-8 sm:h-8 animate-spin"
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
              <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-white/60 dark:bg-white/70 animate-pulse" />
            )}
          </div>
        </div>
      </div>

      {/* Top artists */}
      {data.topArtists.length > 0 && (
        <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-white/20 dark:border-white/30">
          <p className="text-[10px] sm:text-xs opacity-75 mb-2">Top Earners (Live)</p>
          <div className="space-y-1">
            {data.topArtists.slice(0, 3).map((artist, i) => (
              <div
                key={artist.address}
                className="flex justify-between text-[10px] sm:text-xs items-center gap-2"
              >
                <span className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
                  <span className="font-bold w-3 sm:w-4 flex-shrink-0">{i + 1}.</span>
                  <span className="truncate">{artist.name}</span>
                </span>
                <span className="font-semibold flex-shrink-0 text-[10px] sm:text-xs">
                  ${artist.flowRate.toFixed(6)}/sec
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

