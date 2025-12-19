// Play rate oracle service for Superfluid integration
// Calculates verified play counts based on completion rates (anti-spam)

import { redis } from './redis';
import { getPlayCountData } from './play-counts';

export interface PlayRateData {
  trackId: string;
  artistAddress: string;
  totalPlays: number;
  qualifiedPlays: number; // Plays with >30s duration
  averageCompletionRate: number; // 0-1 (0.5 = 50%)
  verifiedPlays: number; // Plays that meet minimum threshold
  trackDuration?: number; // Track duration in seconds
}

const MIN_COMPLETION_RATE = 0.5; // 50% minimum completion rate
const QUALIFIED_PLAY_THRESHOLD = 30; // 30 seconds minimum

/**
 * Get play duration data for a track from Redis
 */
async function getPlayDurationData(trackId: string): Promise<{
  totalDuration: number;
  playCount: number;
  averageDuration: number;
}> {
  if (!redis) {
    return { totalDuration: 0, playCount: 0, averageDuration: 0 };
  }

  try {
    // Get total play count
    const playCount = await redis.get<number>(`play:track:${trackId}:total`) || 0;
    
    // Get total duration (sum of all play durations)
    const totalDuration = await redis.get<number>(`play:track:${trackId}:totalDuration`) || 0;
    
    const averageDuration = playCount > 0 ? totalDuration / playCount : 0;
    
    return { totalDuration, playCount, averageDuration };
  } catch (error) {
    console.error(`Error fetching play duration data for ${trackId}:`, error);
    return { totalDuration: 0, playCount: 0, averageDuration: 0 };
  }
}

/**
 * Get track duration from Spinamp API or cache
 */
async function getTrackDuration(trackId: string): Promise<number | null> {
  if (!redis) {
    return null;
  }

  try {
    // Check cache first
    const cached = await redis.get<number>(`track:${trackId}:duration`);
    if (cached) {
      return cached;
    }

    // Fetch from Spinamp API
    const response = await fetch('https://api.spinamp.xyz/v3/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `
          query GetTrack($id: ID!) {
            processedTrack(id: $id) {
              id
              duration
            }
          }
        `,
        variables: { id: trackId },
      }),
    });

    const result = await response.json();
    const duration = result.data?.processedTrack?.duration;

    if (duration && typeof duration === 'number') {
      // Cache for 24 hours
      await redis.set(`track:${trackId}:duration`, duration, { ex: 24 * 60 * 60 });
      return duration;
    }

    return null;
  } catch (error) {
    console.error(`Error fetching track duration for ${trackId}:`, error);
    return null;
  }
}

/**
 * Calculate verified play count based on completion rate
 * Only counts plays that meet minimum completion threshold (anti-spam)
 */
export async function calculateVerifiedPlays(
  trackId: string,
  artistAddress: string
): Promise<PlayRateData> {
  // Get play count data
  const playData = await getPlayCountData(trackId);
  const durationData = await getPlayDurationData(trackId);
  const trackDuration = await getTrackDuration(trackId);

  const totalPlays = playData.playCount;
  const qualifiedPlays = durationData.playCount; // Plays that were tracked with duration
  
  // Calculate average completion rate
  let averageCompletionRate = 0;
  if (trackDuration && trackDuration > 0 && durationData.averageDuration > 0) {
    averageCompletionRate = Math.min(1, durationData.averageDuration / trackDuration);
  } else if (qualifiedPlays > 0) {
    // Fallback: assume qualified plays (>=30s) are at least 30% complete
    // This is conservative - we'll use actual duration when available
    averageCompletionRate = 0.3;
  }

  // Only count plays that meet minimum threshold (anti-spam filter)
  const verifiedPlays = averageCompletionRate >= MIN_COMPLETION_RATE
    ? qualifiedPlays
    : 0;

  return {
    trackId,
    artistAddress,
    totalPlays,
    qualifiedPlays,
    averageCompletionRate,
    verifiedPlays,
    trackDuration: trackDuration || undefined,
  };
}

/**
 * Update play duration tracking when a play event is recorded
 * This should be called from the play tracking API
 */
export async function updatePlayDuration(
  trackId: string,
  duration: number
): Promise<void> {
  if (!redis || duration < QUALIFIED_PLAY_THRESHOLD) {
    return; // Only track qualified plays
  }

  try {
    // Increment total duration
    await redis.incrby(`play:track:${trackId}:totalDuration`, duration);
    
    // Set expiration (keep for 90 days)
    await redis.expire(`play:track:${trackId}:totalDuration`, 90 * 24 * 60 * 60);
  } catch (error) {
    console.error(`Error updating play duration for ${trackId}:`, error);
  }
}

/**
 * Get verified plays for multiple tracks (batch operation)
 */
export async function getVerifiedPlaysBatch(
  tracks: Array<{ trackId: string; artistAddress: string }>
): Promise<Map<string, PlayRateData>> {
  const results = new Map<string, PlayRateData>();

  // Process in parallel
  const promises = tracks.map(async (track) => {
    const data = await calculateVerifiedPlays(track.trackId, track.artistAddress);
    return { trackId: track.trackId, data };
  });

  const resolved = await Promise.all(promises);
  resolved.forEach(({ trackId, data }) => {
    results.set(trackId, data);
  });

  return results;
}

/**
 * Check if track meets minimum quality threshold
 */
export function meetsQualityThreshold(playRateData: PlayRateData): boolean {
  return playRateData.verifiedPlays > 0 && 
         playRateData.averageCompletionRate >= MIN_COMPLETION_RATE;
}

