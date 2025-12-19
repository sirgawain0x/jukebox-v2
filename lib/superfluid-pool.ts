// Superfluid GDA pool management service
// Handles pool creation, unit updates, and stream management
// NOTE: For batch operations, use Host batchCall (see superfluid-batch-call.ts)
// instead of individual operations for better gas efficiency

import { redis } from './redis';

export interface GDAPool {
  marketId: number;
  poolAddress: string;
  tokenAddress: string; // fUSDCx address
  createdAt: number;
  totalFlowRate: bigint; // Current flow rate (per second)
  totalMembers: number;
  isActive: boolean;
}

const POOL_KEY_PREFIX = 'superfluid:pool:';
const POOL_MEMBERS_KEY_PREFIX = 'superfluid:pool:members:';

/**
 * Store pool information
 */
export async function storePool(pool: GDAPool): Promise<void> {
  if (!redis) {
    throw new Error('Redis not available');
  }

  const key = `${POOL_KEY_PREFIX}${pool.marketId}`;
  await redis.set(key, JSON.stringify(pool));
  
  // Also store in market index
  await redis.sadd('superfluid:pools:active', pool.marketId.toString());
}

/**
 * Get pool for market
 */
export async function getPool(marketId: number): Promise<GDAPool | null> {
  if (!redis) {
    return null;
  }

  try {
    const key = `${POOL_KEY_PREFIX}${marketId}`;
    const data = await redis.get<GDAPool>(key);
    return data || null;
  } catch (error) {
    console.error(`Error fetching pool for market ${marketId}:`, error);
    return null;
  }
}

/**
 * Update pool flow rate
 */
export async function updatePoolFlowRate(
  marketId: number,
  flowRate: bigint
): Promise<void> {
  if (!redis) {
    return;
  }

  try {
    const pool = await getPool(marketId);
    if (!pool) {
      return;
    }

    pool.totalFlowRate = flowRate;
    await storePool(pool);
  } catch (error) {
    console.error(`Error updating pool flow rate:`, error);
  }
}

/**
 * Add member to pool
 */
export async function addPoolMember(
  marketId: number,
  memberAddress: string,
  units: bigint
): Promise<void> {
  if (!redis) {
    return;
  }

  try {
    const key = `${POOL_MEMBERS_KEY_PREFIX}${marketId}`;
    await redis.hset(key, { [memberAddress]: units.toString() });
    
    // Update pool member count
    const pool = await getPool(marketId);
    if (pool) {
      pool.totalMembers = await getPoolMemberCount(marketId);
      await storePool(pool);
    }
  } catch (error) {
    console.error(`Error adding pool member:`, error);
  }
}

/**
 * Update member units in pool
 */
export async function updateMemberUnits(
  marketId: number,
  memberAddress: string,
  units: bigint
): Promise<void> {
  if (!redis) {
    return;
  }

  try {
    const key = `${POOL_MEMBERS_KEY_PREFIX}${marketId}`;
    const existing = await redis.hget<string>(key, memberAddress);
    
    if (!existing) {
      // New member
      await addPoolMember(marketId, memberAddress, units);
    } else {
      // Update existing
      await redis.hset(key, { [memberAddress]: units.toString() });
    }
  } catch (error) {
    console.error(`Error updating member units:`, error);
  }
}

/**
 * Get member units
 */
export async function getMemberUnits(
  marketId: number,
  memberAddress: string
): Promise<bigint> {
  if (!redis) {
    return BigInt(0);
  }

  try {
    const key = `${POOL_MEMBERS_KEY_PREFIX}${marketId}`;
    const units = await redis.hget<string>(key, memberAddress);
    return units ? BigInt(units) : BigInt(0);
  } catch (error) {
    console.error(`Error fetching member units:`, error);
    return BigInt(0);
  }
}

/**
 * Get all pool members
 */
export async function getPoolMembers(marketId: number): Promise<Map<string, bigint>> {
  const members = new Map<string, bigint>();

  if (!redis) {
    return members;
  }

  try {
    const key = `${POOL_MEMBERS_KEY_PREFIX}${marketId}`;
    const data = await redis.hgetall<Record<string, string>>(key);
    
    if (data) {
      Object.entries(data).forEach(([address, units]) => {
        members.set(address, BigInt(units));
      });
    }
  } catch (error) {
    console.error(`Error fetching pool members:`, error);
  }

  return members;
}

/**
 * Get pool member count
 */
export async function getPoolMemberCount(marketId: number): Promise<number> {
  if (!redis) {
    return 0;
  }

  try {
    const key = `${POOL_MEMBERS_KEY_PREFIX}${marketId}`;
    return await redis.hlen(key);
  } catch (error) {
    console.error(`Error fetching pool member count:`, error);
    return 0;
  }
}

/**
 * Get all active pools
 */
export async function getActivePools(): Promise<GDAPool[]> {
  if (!redis) {
    return [];
  }

  try {
    const marketIds = await redis.smembers<string[]>('superfluid:pools:active');
    const pools = await Promise.all(
      marketIds.map((id) => getPool(parseInt(id)))
    );
    return pools.filter((p): p is GDAPool => p !== null);
  } catch (error) {
    console.error('Error fetching active pools:', error);
    return [];
  }
}

/**
 * Deactivate pool (when market resolves)
 */
export async function deactivatePool(marketId: number): Promise<void> {
  if (!redis) {
    return;
  }

  try {
    const pool = await getPool(marketId);
    if (pool) {
      pool.isActive = false;
      await storePool(pool);
      await redis.srem('superfluid:pools:active', marketId.toString());
    }
  } catch (error) {
    console.error(`Error deactivating pool:`, error);
  }
}

/**
 * Calculate total flow rate for pool
 * Sum of all individual flow rates
 */
export async function calculateTotalFlowRate(marketId: number): Promise<bigint> {
  // This would integrate with Superfluid SDK to get actual flow rate
  // For now, return stored value
  const pool = await getPool(marketId);
  return pool?.totalFlowRate || BigInt(0);
}

