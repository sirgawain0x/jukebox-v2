// Fan boost service for Superfluid integration
// Manages fan boost multipliers and flow rate increases

import { redis } from './redis';

export interface FanBoost {
  artistAddress: string;
  multiplier: number; // 1.0 = no boost, 1.5 = 50% boost
  duration: number; // seconds
  expiresAt: number; // timestamp
  boostedBy: string; // user address
  totalBoosted: bigint; // Total USDC boosted
}

const BOOST_KEY_PREFIX = 'fanboost:';
const BOOST_HISTORY_KEY_PREFIX = 'fanboost:history:';

/**
 * Apply fan boost to artist's flow rate
 */
export async function applyFanBoost(
  artistAddress: string,
  multiplier: number,
  duration: number,
  boostedBy: string,
  boostAmount?: bigint // Optional: amount of USDC used for boost
): Promise<FanBoost> {
  if (!redis) {
    throw new Error('Redis not available');
  }

  // Validate multiplier (1.0x to 5.0x)
  if (multiplier < 1.0 || multiplier > 5.0) {
    throw new Error('Multiplier must be between 1.0 and 5.0');
  }

  // Validate duration (max 7 days)
  if (duration <= 0 || duration > 7 * 24 * 60 * 60) {
    throw new Error('Duration must be between 1 second and 7 days');
  }

  const expiresAt = Date.now() + (duration * 1000);

  const boost: FanBoost = {
    artistAddress,
    multiplier,
    duration,
    expiresAt,
    boostedBy,
    totalBoosted: boostAmount || BigInt(0),
  };

  // Store active boost
  await redis.set(
    `${BOOST_KEY_PREFIX}${artistAddress}`,
    JSON.stringify(boost),
    { ex: duration }
  );

  // Store in history
  const historyKey = `${BOOST_HISTORY_KEY_PREFIX}${artistAddress}`;
  await redis.lpush(historyKey, JSON.stringify(boost));
  await redis.expire(historyKey, 30 * 24 * 60 * 60); // Keep history for 30 days
  await redis.ltrim(historyKey, 0, 99); // Keep last 100 boosts

  return boost;
}

/**
 * Get active boost for artist
 */
export async function getActiveBoost(
  artistAddress: string
): Promise<FanBoost | null> {
  if (!redis) {
    return null;
  }

  try {
    const data = await redis.get<string>(`${BOOST_KEY_PREFIX}${artistAddress}`);
    if (!data) {
      return null;
    }

    const boost: FanBoost = JSON.parse(data);

    // Check if expired
    if (Date.now() > boost.expiresAt) {
      // Clean up expired boost
      await redis.del(`${BOOST_KEY_PREFIX}${artistAddress}`);
      return null;
    }

    return boost;
  } catch (error) {
    console.error(`Error fetching boost for ${artistAddress}:`, error);
    return null;
  }
}

/**
 * Get boosted flow rate (applies multiplier if active boost exists)
 */
export async function getBoostedFlowRate(
  artistAddress: string,
  baseFlowRate: bigint
): Promise<{ flowRate: bigint; multiplier: number; isBoosted: boolean }> {
  const boost = await getActiveBoost(artistAddress);

  if (!boost) {
    return {
      flowRate: baseFlowRate,
      multiplier: 1.0,
      isBoosted: false,
    };
  }

  // Apply multiplier
  const multiplier = boost.multiplier;
  const boostedFlowRate = (baseFlowRate * BigInt(Math.floor(multiplier * 10000))) / BigInt(10000);

  return {
    flowRate: boostedFlowRate,
    multiplier,
    isBoosted: true,
  };
}

/**
 * Clear expired boost (cleanup function)
 */
export async function clearExpiredBoost(artistAddress: string): Promise<boolean> {
  if (!redis) {
    return false;
  }

  try {
    const boost = await getActiveBoost(artistAddress);
    if (!boost) {
      // Already cleared or doesn't exist
      return true;
    }

    // If expired, delete it
    if (Date.now() > boost.expiresAt) {
      await redis.del(`${BOOST_KEY_PREFIX}${artistAddress}`);
      return true;
    }

    return false;
  } catch (error) {
    console.error(`Error clearing boost for ${artistAddress}:`, error);
    return false;
  }
}

/**
 * Get boost history for artist
 */
export async function getBoostHistory(
  artistAddress: string,
  limit: number = 10
): Promise<FanBoost[]> {
  if (!redis) {
    return [];
  }

  try {
    const historyKey = `${BOOST_HISTORY_KEY_PREFIX}${artistAddress}`;
    const data = await redis.lrange<string>(historyKey, 0, limit - 1);

    return data.map((item) => JSON.parse(item));
  } catch (error) {
    console.error(`Error fetching boost history for ${artistAddress}:`, error);
    return [];
  }
}

/**
 * Get total boosted amount for artist (all time)
 */
export async function getTotalBoosted(artistAddress: string): Promise<bigint> {
  const history = await getBoostHistory(artistAddress, 100);
  return history.reduce((total, boost) => total + boost.totalBoosted, BigInt(0));
}

/**
 * Get all active boosts (for monitoring/admin)
 */
export async function getAllActiveBoosts(): Promise<FanBoost[]> {
  if (!redis) {
    return [];
  }

  try {
    // Note: This is a simplified implementation
    // In production, you'd want to maintain a set of active boost keys
    // For now, we'll return empty array - this can be enhanced with a proper index
    return [];
  } catch (error) {
    console.error('Error fetching all active boosts:', error);
    return [];
  }
}

