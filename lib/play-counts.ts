// Service for fetching play counts from Redis
// Handles batch operations and caching

import { redis } from './redis';

export type PlayCountData = {
  trackId: string;
  playCount: number;
  dailyCount?: number;
  weeklyCount?: number;
}

const CACHE_TTL = 5 * 60; // 5 minutes in seconds

// Get play count for a single track
export async function getPlayCount(trackId: string): Promise<number> {
  if (!redis) {
    return 0;
  }

  try {
    const key = `play:track:${trackId}:total`;
    const count = await redis.get<number>(key);
    return count || 0;
  } catch (error) {
    console.error('Error fetching play count:', error);
    return 0;
  }
}

// Get play counts for multiple tracks (batch operation)
export async function getPlayCounts(
  trackIds: string[]
): Promise<Map<string, number>> {
  if (!redis || trackIds.length === 0) {
    return new Map();
  }

  const counts = new Map<string, number>();

  try {
    // Use pipeline for batch operations
    const pipeline = redis.pipeline();
    trackIds.forEach((trackId) => {
      pipeline.get(`play:track:${trackId}:total`);
    });

    const results = await pipeline.exec();
    trackIds.forEach((trackId, index) => {
      const count = results[index] as number | null;
      counts.set(trackId, count || 0);
    });
  } catch (error) {
    console.error('Error fetching play counts:', error);
    // Return zeros for all tracks on error
    trackIds.forEach((trackId) => {
      counts.set(trackId, 0);
    });
  }

  return counts;
}

// Get detailed play count data for a track
export async function getPlayCountData(
  trackId: string
): Promise<PlayCountData> {
  if (!redis) {
    return {
      trackId,
      playCount: 0,
    };
  }

  try {
    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];

    const [total, daily, weekly] = await Promise.all([
      redis.get<number>(`play:track:${trackId}:total`),
      redis.get<number>(`play:track:${trackId}:${today}`),
      redis.get<number>(`play:track:${trackId}:weekly:${weekAgo}`),
    ]);

    return {
      trackId,
      playCount: total || 0,
      dailyCount: daily || 0,
      weeklyCount: weekly || 0,
    };
  } catch (error) {
    console.error('Error fetching play count data:', error);
    return {
      trackId,
      playCount: 0,
    };
  }
}

// Get cached play count (client-side helper)
export function getCachedPlayCount(
  trackId: string,
  cache: Map<string, { count: number; timestamp: number }>
): number | null {
  const cached = cache.get(trackId);
  if (!cached) {
    return null;
  }

  const now = Date.now();
  const age = now - cached.timestamp;
  const maxAge = CACHE_TTL * 1000; // Convert to milliseconds

  if (age > maxAge) {
    cache.delete(trackId);
    return null;
  }

  return cached.count;
}

// Set cached play count (client-side helper)
export function setCachedPlayCount(
  trackId: string,
  count: number,
  cache: Map<string, { count: number; timestamp: number }>
): void {
  cache.set(trackId, {
    count,
    timestamp: Date.now(),
  });
}

