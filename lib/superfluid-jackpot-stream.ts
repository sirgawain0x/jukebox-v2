// Jackpot streaming service for Superfluid integration
// Offers winners option to stream winnings instead of lump sum

import { redis } from './redis';

export interface JackpotStreamOption {
  marketId: number;
  winnerAddress: string;
  totalWinnings: bigint;
  streamRate: bigint; // USDC per second
  duration: number; // seconds
  dailyAmount: bigint; // USDC per day
  option: 'lump-sum' | 'stream';
  streamId?: string; // Superfluid stream ID
  createdAt?: number;
}

const STREAM_DURATION_DAYS = 20; // Default: 20 days
const STREAM_KEY_PREFIX = 'jackpot:stream:';
const STREAM_OPTION_KEY_PREFIX = 'jackpot:option:';

/**
 * Calculate streaming options for jackpot winner
 */
export async function calculateJackpotStreamOptions(
  marketId: number,
  winnerAddress: string,
  totalWinnings: bigint
): Promise<JackpotStreamOption> {
  const duration = STREAM_DURATION_DAYS * 24 * 60 * 60; // Convert to seconds
  
  // Flow rate = total / duration (per second)
  const streamRate = totalWinnings / BigInt(duration);
  
  // Daily amount for display
  const dailyAmount = (totalWinnings * 86400n) / BigInt(duration);

  return {
    marketId,
    winnerAddress,
    totalWinnings,
    streamRate,
    duration,
    dailyAmount,
    option: 'stream', // Default to stream (user can choose)
  };
}

/**
 * Store user's choice for jackpot payout
 */
export async function setJackpotOption(
  marketId: number,
  winnerAddress: string,
  option: 'lump-sum' | 'stream',
  streamOption?: JackpotStreamOption
): Promise<void> {
  if (!redis) {
    throw new Error('Redis not available');
  }

  const key = `${STREAM_OPTION_KEY_PREFIX}${marketId}:${winnerAddress}`;
  
  const data = {
    marketId,
    winnerAddress,
    option,
    streamOption: streamOption || null,
    timestamp: Date.now(),
  };

  // Store for 30 days
  await redis.set(key, JSON.stringify(data), { ex: 30 * 24 * 60 * 60 });
}

/**
 * Get user's jackpot option choice
 */
export async function getJackpotOption(
  marketId: number,
  winnerAddress: string
): Promise<'lump-sum' | 'stream' | null> {
  if (!redis) {
    return null;
  }

  try {
    const key = `${STREAM_OPTION_KEY_PREFIX}${marketId}:${winnerAddress}`;
    const data = await redis.get<{ option: 'lump-sum' | 'stream' }>(key);
    return data?.option || null;
  } catch (error) {
    console.error(`Error fetching jackpot option:`, error);
    return null;
  }
}

/**
 * Store jackpot stream information
 */
export async function storeJackpotStream(
  winnerAddress: string,
  streamOption: JackpotStreamOption,
  streamId: string
): Promise<void> {
  if (!redis) {
    throw new Error('Redis not available');
  }

  const streamData = {
    ...streamOption,
    streamId,
    createdAt: Date.now(),
  };

  const key = `${STREAM_KEY_PREFIX}${winnerAddress}:${streamOption.marketId}`;
  
  // Store for duration of stream + 7 days
  await redis.set(
    key,
    JSON.stringify(streamData),
    { ex: streamOption.duration + (7 * 24 * 60 * 60) }
  );
}

/**
 * Get active jackpot stream for user
 */
export async function getJackpotStream(
  winnerAddress: string,
  marketId: number
): Promise<JackpotStreamOption | null> {
  if (!redis) {
    return null;
  }

  try {
    const key = `${STREAM_KEY_PREFIX}${winnerAddress}:${marketId}`;
    const data = await redis.get<JackpotStreamOption>(key);
    return data || null;
  } catch (error) {
    console.error(`Error fetching jackpot stream:`, error);
    return null;
  }
}

/**
 * Get all active jackpot streams for a user
 */
export async function getUserJackpotStreams(
  winnerAddress: string
): Promise<JackpotStreamOption[]> {
  if (!redis) {
    return [];
  }

  try {
    // Note: This is a simplified implementation
    // In production, you'd maintain an index of active streams
    // For now, we'll return empty array - this can be enhanced
    return [];
  } catch (error) {
    console.error(`Error fetching user jackpot streams:`, error);
    return [];
  }
}

/**
 * Calculate remaining stream amount
 */
export function calculateRemainingStreamAmount(
  streamOption: JackpotStreamOption
): bigint {
  if (!streamOption.createdAt) {
    return streamOption.totalWinnings;
  }

  const elapsed = Date.now() - streamOption.createdAt;
  const elapsedSeconds = Math.floor(elapsed / 1000);
  const streamed = streamOption.streamRate * BigInt(elapsedSeconds);
  const remaining = streamOption.totalWinnings - streamed;

  return remaining > 0n ? remaining : 0n;
}

/**
 * Format stream rate for display
 */
export function formatStreamRate(streamRate: bigint): string {
  const perSecond = Number(streamRate) / 1e6; // USDC has 6 decimals
  const perMinute = perSecond * 60;
  const perHour = perMinute * 60;
  const perDay = perHour * 24;

  if (perDay >= 1) {
    return `$${perDay.toFixed(2)}/day`;
  } else if (perHour >= 0.01) {
    return `$${perHour.toFixed(4)}/hour`;
  } else if (perMinute >= 0.0001) {
    return `$${perMinute.toFixed(6)}/min`;
  } else {
    return `$${perSecond.toFixed(8)}/sec`;
  }
}

