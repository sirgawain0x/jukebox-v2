// Session tracking for play-to-earn mechanics
// Tracks daily listening sessions and prediction streaks

import { redis } from './redis';

export type SessionData = {
  songsPlayed: number;
  fullPlays: number; // 30+ seconds
  startTime: number;
  lastUpdate: number;
}

export type DailyStats = {
  songsPlayed: number;
  fullPlays: number;
  eligible: boolean; // 10+ songs
}

const DAILY_GOAL = 10; // 10 full songs per day for rewards

// Get today's date key
function getTodayKey(): string {
  return new Date().toISOString().split('T')[0];
}

// Get user's daily session data
export async function getDailySession(
  userId: string
): Promise<SessionData> {
  if (!redis) {
    return {
      songsPlayed: 0,
      fullPlays: 0,
      startTime: Date.now(),
      lastUpdate: Date.now(),
    };
  }

  try {
    const today = getTodayKey();
    const key = `session:user:${userId}:${today}`;
    const data = await redis.get<SessionData>(key);
    
    if (data) {
      return data;
    }

    return {
      songsPlayed: 0,
      fullPlays: 0,
      startTime: Date.now(),
      lastUpdate: Date.now(),
    };
  } catch (error) {
    console.error('Error getting daily session:', error);
    return {
      songsPlayed: 0,
      fullPlays: 0,
      startTime: Date.now(),
      lastUpdate: Date.now(),
    };
  }
}

// Update daily session
export async function updateDailySession(
  userId: string,
  fullPlay: boolean = false
): Promise<SessionData> {
  if (!redis) {
    return {
      songsPlayed: 0,
      fullPlays: 0,
      startTime: Date.now(),
      lastUpdate: Date.now(),
    };
  }

  try {
    const today = getTodayKey();
    const key = `session:user:${userId}:${today}`;
    
    const current = await getDailySession(userId);
    const updated: SessionData = {
      songsPlayed: current.songsPlayed + 1,
      fullPlays: fullPlay ? current.fullPlays + 1 : current.fullPlays,
      startTime: current.startTime || Date.now(),
      lastUpdate: Date.now(),
    };

    await redis.set(key, updated, { ex: 24 * 60 * 60 }); // 24 hour TTL
    return updated;
  } catch (error) {
    console.error('Error updating daily session:', error);
    return {
      songsPlayed: 0,
      fullPlays: 0,
      startTime: Date.now(),
      lastUpdate: Date.now(),
    };
  }
}

// Get daily stats
export async function getDailyStats(userId: string): Promise<DailyStats> {
  const session = await getDailySession(userId);
  return {
    songsPlayed: session.songsPlayed,
    fullPlays: session.fullPlays,
    eligible: session.fullPlays >= DAILY_GOAL,
  };
}

// Check if user is eligible for rewards
export async function isEligibleForRewards(userId: string): Promise<boolean> {
  const stats = await getDailyStats(userId);
  return stats.eligible;
}

// Get prediction streak
export async function getPredictionStreak(userId: string): Promise<number> {
  if (!redis) {
    return 0;
  }

  try {
    const key = `prediction:streak:${userId}`;
    const streak = await redis.get<number>(key) || 0;
    return streak;
  } catch (error) {
    console.error('Error getting prediction streak:', error);
    return 0;
  }
}

// Update prediction streak
export async function updatePredictionStreak(
  userId: string,
  correct: boolean
): Promise<number> {
  if (!redis) {
    return 0;
  }

  try {
    const key = `prediction:streak:${userId}`;
    
    if (correct) {
      const current = await redis.get<number>(key) || 0;
      const newStreak = current + 1;
      await redis.set(key, newStreak, { ex: 30 * 24 * 60 * 60 }); // 30 days
      return newStreak;
    } else {
      // Reset streak on incorrect prediction
      await redis.del(key);
      return 0;
    }
  } catch (error) {
    console.error('Error updating prediction streak:', error);
    return 0;
  }
}

// Check if user qualifies for streak reward (3+ weeks)
export async function qualifiesForStreakReward(userId: string): Promise<boolean> {
  const streak = await getPredictionStreak(userId);
  return streak >= 3; // 3 weeks = 3 correct predictions
}

