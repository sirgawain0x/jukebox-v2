// Engagement scoring system
// Calculates engagement scores based on plays, tips, shares, and predictions

import { Song } from '@/types/music';
import { redis } from './redis';
import { getWebsiteTypeFromUrl, SupportedWebsites } from './spinamp-utils';

export type EngagementWeights = {
  play: number;
  tip: number;
  share: number;
  prediction: number;
  shareByPlatform?: Record<string, number>;
}

export const DEFAULT_WEIGHTS: EngagementWeights = {
  play: 1,
  tip: 10,
  share: 5,
  prediction: 3,
  shareByPlatform: {
    twitter: 5,
    instagram: 4,
    facebook: 3,
    youtube: 6,
    soundcloud: 4,
    tiktok: 5,
    custom: 2,
  },
};

// Calculate engagement score for a song
export function calculateEngagementScore(
  song: Song,
  weights: EngagementWeights = DEFAULT_WEIGHTS
): number {
  let score = 0;

  // Plays
  const playCount = typeof song.playCount === 'number' ? song.playCount : 0;
  score += playCount * weights.play;

  // Tips
  const tipCount = song.tipCount || 0;
  score += tipCount * weights.tip;

  // Shares (weighted by platform)
  const shareCount = song.shareCount || 0;
  const shareWeight = weights.shareByPlatform?.['custom'] || weights.share;
  score += shareCount * shareWeight;

  // Predictions
  const predictionCount = song.predictionCount || 0;
  score += predictionCount * weights.prediction;

  return Math.round(score);
}

// Get engagement data from Redis
export async function getEngagementData(trackId: string): Promise<{
  playCount: number;
  tipCount: number;
  shareCount: number;
  predictionCount: number;
  shareByPlatform: Record<string, number>;
}> {
  if (!redis) {
    return {
      playCount: 0,
      tipCount: 0,
      shareCount: 0,
      predictionCount: 0,
      shareByPlatform: {},
    };
  }

  try {
    const [playCount, tipCount, shareCount, predictionCount] = await Promise.all([
      redis.get<number>(`play:track:${trackId}:total`) || 0,
      redis.get<number>(`tip:track:${trackId}:total`) || 0,
      redis.get<number>(`share:track:${trackId}:total`) || 0,
      redis.get<number>(`prediction:track:${trackId}:total`) || 0,
    ]);

    // Get share counts by platform
    const shareByPlatform: Record<string, number> = {};
    for (const website of SupportedWebsites) {
      const count = await redis.get<number>(`share:track:${trackId}:platform:${website.id}`) || 0;
      if (count > 0) {
        shareByPlatform[website.id] = count;
      }
    }

    return {
      playCount,
      tipCount,
      shareCount,
      predictionCount,
      shareByPlatform,
    };
  } catch (error) {
    console.error('Error getting engagement data:', error);
    return {
      playCount: 0,
      tipCount: 0,
      shareCount: 0,
      predictionCount: 0,
      shareByPlatform: {},
    };
  }
}

// Record a share event with platform detection
export async function recordShareEvent(
  trackId: string,
  shareUrl: string
): Promise<void> {
  if (!redis) {
    return;
  }

  try {
    const platformType = getWebsiteTypeFromUrl(shareUrl);
    
    // Increment total shares
    await redis.incr(`share:track:${trackId}:total`);
    
    // Increment platform-specific shares
    await redis.incr(`share:track:${trackId}:platform:${platformType}`);
    
    // Apply time-weighted decay (recent shares weighted higher)
    const today = new Date().toISOString().split('T')[0];
    await redis.incr(`share:track:${trackId}:daily:${today}`);
    await redis.expire(`share:track:${trackId}:daily:${today}`, 7 * 24 * 60 * 60);
  } catch (error) {
    console.error('Error recording share event:', error);
  }
}

// Record a tip event
export async function recordTipEvent(trackId: string, amount?: number): Promise<void> {
  if (!redis) {
    return;
  }

  try {
    await redis.incr(`tip:track:${trackId}:total`);
    if (amount) {
      await redis.incrbyfloat(`tip:track:${trackId}:amount`, amount);
    }
  } catch (error) {
    console.error('Error recording tip event:', error);
  }
}

// Record a prediction event
export async function recordPredictionEvent(trackId: string): Promise<void> {
  if (!redis) {
    return;
  }

  try {
    await redis.incr(`prediction:track:${trackId}:total`);
  } catch (error) {
    console.error('Error recording prediction event:', error);
  }
}

// Calculate time-weighted engagement score (recent activity weighted higher)
export function calculateTimeWeightedScore(
  baseScore: number,
  daysAgo: number
): number {
  // Exponential decay: weight = e^(-daysAgo / 7)
  // Recent activity (0 days) = 1.0, 7 days ago = 0.37, 14 days ago = 0.14
  const decayFactor = Math.exp(-daysAgo / 7);
  return baseScore * decayFactor;
}

// Get engagement score with time weighting
export async function getTimeWeightedEngagementScore(
  trackId: string,
  weights: EngagementWeights = DEFAULT_WEIGHTS
): Promise<number> {
  const engagement = await getEngagementData(trackId);
  
  // For now, use current data without time weighting
  // In production, you'd fetch historical data and apply time weighting
  const song: Song = {
    id: trackId,
    title: '',
    artist: '',
    cover: '',
    creatorAddress: '',
    audioUrl: '',
    playCount: engagement.playCount,
    tipCount: engagement.tipCount,
    shareCount: engagement.shareCount,
    predictionCount: engagement.predictionCount,
  };

  return calculateEngagementScore(song, weights);
}

