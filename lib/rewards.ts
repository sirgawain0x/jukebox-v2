// USDC/ETH rewards for play-to-earn mechanics
// Awards USDC for daily listening goals (ETH used for tipping, not rewards)

import { isEligibleForRewards, getDailyStats } from './session-tracking';
import { parseUSDC } from './usdc-utils';

export type RewardEligibility = {
  eligible: boolean;
  songsPlayed: number;
  songsNeeded: number;
  rewardAmount?: string; // USDC amount (e.g., "0.10" = $0.10 USDC)
  rewardType: 'USDC';
}

// Daily reward amount: $0.10 USDC for 10+ full song plays
const DAILY_REWARD_AMOUNT_USDC = '0.10';

// Check reward eligibility
export async function checkRewardEligibility(
  userId: string
): Promise<RewardEligibility> {
  const eligible = await isEligibleForRewards(userId);
  const stats = await getDailyStats(userId);
  
  return {
    eligible,
    songsPlayed: stats.fullPlays,
    songsNeeded: eligible ? 0 : 10,
    rewardAmount: eligible ? DAILY_REWARD_AMOUNT_USDC : undefined,
    rewardType: 'USDC',
  };
}

// Claim rewards - transfers USDC to user
export async function claimRewards(userId: string): Promise<{
  success: boolean;
  txHash?: string;
  error?: string;
}> {
  const eligibility = await checkRewardEligibility(userId);
  
  if (!eligibility.eligible) {
    return {
      success: false,
      error: 'Not eligible for rewards. Listen to 10+ full songs today.',
    };
  }

  // In production, this would:
  // 1. Check if reward was already claimed today (prevent double-claiming)
  // 2. Transfer USDC from reward pool to user's address
  // 3. Record the claim in Redis/database
  // 4. Return transaction hash
  
  // For now, return mock success
  // TODO: Implement actual USDC transfer using wagmi/viem
  return {
    success: true,
    txHash: '0x' + Math.random().toString(16).substr(2, 64),
  };
}

// Get reward amount in USDC (BigInt format with 6 decimals)
export function getRewardAmountUSDC(): bigint {
  return parseUSDC(DAILY_REWARD_AMOUNT_USDC);
}

