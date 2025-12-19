"use client";

import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';

interface ArtistRoyaltyData {
  artistAddress: string;
  totalFlowRate: string;
  totalFlowRateFormatted: string;
  dailyTotal: string;
  pools: Array<{
    marketId: number;
    poolAddress: string;
    units: string;
    flowRate: number;
    boostedFlowRate: number;
    dailyEarnings: string;
    boost: {
      multiplier: number;
      expiresAt: number;
    } | null;
  }>;
}

interface ArtistRoyaltyCardProps {
  artistAddress: string;
  artistName?: string;
}

export function ArtistRoyaltyCard({ artistAddress, artistName }: ArtistRoyaltyCardProps) {
  useAccount();
  const [data, setData] = useState<ArtistRoyaltyData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const fetchData = async () => {
      try {
        const response = await fetch(
          `/api/superfluid/royalties/live?artist=${artistAddress}`
        );
        if (!response.ok) {
          throw new Error('Failed to fetch artist royalties');
        }
        const newData = await response.json();

        if (!mounted) return;

        setData(newData);
        setIsLoading(false);
      } catch (err) {
        console.error('Error fetching artist royalties:', err);
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Unknown error');
          setIsLoading(false);
        }
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 10000); // Poll every 10 seconds

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [artistAddress]);

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 animate-pulse">
        <div className="h-20"></div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
        <p className="text-sm text-red-500">
          {error || 'No royalty data available'}
        </p>
      </div>
    );
  }

  const displayName = artistName || `${artistAddress.slice(0, 6)}...${artistAddress.slice(-4)}`;

  return (
    <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
            {displayName}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Real-time Royalties
          </p>
        </div>
        {data.pools.some((p) => p.boost) && (
          <div className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 rounded text-xs font-semibold text-yellow-800 dark:text-yellow-200">
            BOOSTED
          </div>
        )}
      </div>

      <div className="space-y-2">
        <div>
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
            Current Flow Rate
          </p>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {data.totalFlowRateFormatted}
          </p>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
          <div>
            <p className="text-xs text-gray-600 dark:text-gray-400">Daily Earnings</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              ${data.dailyTotal}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-600 dark:text-gray-400">Active Pools</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              {data.pools.length}
            </p>
          </div>
        </div>

        {/* Pool breakdown */}
        {data.pools.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Pool Breakdown
            </p>
            <div className="space-y-2">
              {data.pools.map((pool) => (
                <div
                  key={pool.marketId}
                  className="bg-white/50 dark:bg-gray-800/50 p-2 rounded text-xs"
                >
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">
                      Market #{pool.marketId}
                    </span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      ${pool.dailyEarnings}/day
                    </span>
                  </div>
                  {pool.boost && (
                    <div className="mt-1 text-yellow-600 dark:text-yellow-400">
                      {pool.boost.multiplier}x boost active
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

