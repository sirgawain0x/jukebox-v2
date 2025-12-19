// Prediction streak tracking
// Tracks consecutive correct predictions and awards rewards

import { redis } from './redis';
import { getPredictionStreak, qualifiesForStreakReward } from './session-tracking';

export type StreakReward = {
  type: 'NFT' | 'Token' | 'Badge';
  name: string;
  description: string;
}

// Get streak reward info
export async function getStreakRewardInfo(
  userId: string
): Promise<StreakReward | null> {
  const qualifies = await qualifiesForStreakReward(userId);
  
  if (!qualifies) {
    return null;
  }

  const streak = await getPredictionStreak(userId);
  
  return {
    type: 'NFT',
    name: `Prediction Master (${streak} weeks)`,
    description: `You've correctly predicted the #1 song ${streak} weeks in a row!`,
  };
}

// Award streak reward (would mint NFT or award tokens)
export async function awardStreakReward(
  userId: string
): Promise<{
  success: boolean;
  rewardId?: string;
  error?: string;
}> {
  const qualifies = await qualifiesForStreakReward(userId);
  
  if (!qualifies) {
    return {
      success: false,
      error: 'Not eligible for streak reward',
    };
  }

  // In production, this would mint an NFT or award tokens
  // For now, mark as claimed in Redis
  if (redis) {
    try {
      const key = `prediction:streak:reward:${userId}`;
      await redis.set(key, 'claimed', { ex: 365 * 24 * 60 * 60 }); // 1 year
    } catch (error) {
      console.error('Error claiming streak reward:', error);
    }
  }

  return {
    success: true,
    rewardId: `streak-reward-${userId}-${Date.now()}`,
  };
}

// Check if streak reward already claimed
export async function isStreakRewardClaimed(userId: string): Promise<boolean> {
  if (!redis) {
    return false;
  }

  try {
    const key = `prediction:streak:reward:${userId}`;
    const claimed = await redis.get<string>(key);
    return claimed === 'claimed';
  } catch (error) {
    console.error('Error checking streak reward claim:', error);
    return false;
  }
}

