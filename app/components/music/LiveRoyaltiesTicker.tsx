"use client";

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

  if (isLoading) {
    return (
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4 rounded-lg animate-pulse">
        <div className="h-16"></div>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4 rounded-lg">
        <p className="text-sm opacity-90">Live Royalties</p>
        <p className="text-xs opacity-75">Unable to load royalty data</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4 rounded-lg">
        <p className="text-sm opacity-90">Live Royalties</p>
        <p className="text-xs opacity-75">No active pools</p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4 rounded-lg shadow-lg">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm opacity-90 mb-1">Live Royalties Flowing</p>
          <div
            className={`text-3xl font-bold transition-all duration-300 ${
              isAnimating ? 'scale-110' : ''
            }`}
          >
            {data.totalFlowRateFormatted}
          </div>
          <p className="text-xs opacity-75 mt-1">
            ${data.dailyTotal}/day to {data.artistCount} artist{data.artistCount !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Animated flow indicator - only animate when fetching or data changes */}
        <div className="relative ml-4">
          <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
            {isFetching || isAnimating ? (
              <svg
                className="w-8 h-8 animate-spin"
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
              <div className="w-3 h-3 rounded-full bg-white/60 animate-pulse" />
            )}
          </div>
        </div>
      </div>

      {/* Top artists */}
      {data.topArtists.length > 0 && (
        <div className="mt-4 pt-4 border-t border-white/20">
          <p className="text-xs opacity-75 mb-2">Top Earners (Live)</p>
          <div className="space-y-1">
            {data.topArtists.slice(0, 3).map((artist, i) => (
              <div
                key={artist.address}
                className="flex justify-between text-xs items-center"
              >
                <span className="flex items-center gap-2">
                  <span className="font-bold w-4">{i + 1}.</span>
                  <span className="truncate max-w-[120px]">{artist.name}</span>
                </span>
                <span className="font-semibold">
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

