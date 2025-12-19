// Superfluid units calculation and management
// Calculates artist units based on verified play counts

import { calculateVerifiedPlays } from './superfluid-play-oracle';
import { updateMemberUnits, getMemberUnits } from './superfluid-pool';

export interface UnitUpdate {
  marketId: number;
  artistAddress: string;
  trackId: string;
  currentUnits: bigint;
  newUnits: bigint;
  verifiedPlays: number;
  timestamp: number;
}

/**
 * Calculate units from verified play count
 * 1 verified play = 1 unit (can be scaled)
 */
export function calculateUnitsFromPlayCount(verifiedPlays: number): bigint {
  // Simple 1:1 mapping (1 play = 1 unit)
  // Can be adjusted: e.g., 10 plays = 1 unit for scaling
  return BigInt(verifiedPlays);
}

/**
 * Get current units for artist in market pool
 */
export async function getArtistUnits(
  marketId: number,
  artistAddress: string
): Promise<bigint> {
  return await getMemberUnits(marketId, artistAddress);
}

/**
 * Update units for artist based on play counts
 */
export async function updateArtistUnits(
  marketId: number,
  trackId: string,
  artistAddress: string
): Promise<UnitUpdate | null> {
  // Calculate verified plays
  const playRateData = await calculateVerifiedPlays(trackId, artistAddress);
  
  // Only update if artist has verified plays (anti-spam)
  if (playRateData.verifiedPlays === 0) {
    console.log(`Skipping ${artistAddress}: No verified plays (spam filter)`);
    return null;
  }

  // Calculate new units
  const newUnits = calculateUnitsFromPlayCount(playRateData.verifiedPlays);
  const currentUnits = await getArtistUnits(marketId, artistAddress);

  // Update in pool
  await updateMemberUnits(marketId, artistAddress, newUnits);

  return {
    marketId,
    artistAddress,
    trackId,
    currentUnits,
    newUnits,
    verifiedPlays: playRateData.verifiedPlays,
    timestamp: Date.now(),
  };
}

/**
 * Batch update units for multiple artists
 */
export async function updateUnitsForMarket(
  marketId: number,
  tracks: Array<{ trackId: string; artistAddress: string }>
): Promise<UnitUpdate[]> {
  const updates: UnitUpdate[] = [];

  // Process in parallel (with rate limiting consideration)
  const batchSize = 10; // Process 10 at a time
  for (let i = 0; i < tracks.length; i += batchSize) {
    const batch = tracks.slice(i, i + batchSize);
    
    const batchUpdates = await Promise.all(
      batch.map((track) =>
        updateArtistUnits(marketId, track.trackId, track.artistAddress)
      )
    );

    updates.push(...batchUpdates.filter((u): u is UnitUpdate => u !== null));
    
    // Small delay between batches to avoid rate limits
    if (i + batchSize < tracks.length) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  return updates;
}

/**
 * Check if units need updating (rate limiting)
 */
export async function shouldUpdateUnits(
  trackId: string,
  artistAddress: string,
  _minIntervalSeconds: number = 300 // 5 minutes default
): Promise<boolean> {
  // This would check last update time from Redis
  // For now, always return true (can be enhanced with caching)
  return true;
}

/**
 * Get total units for market pool
 */
export async function getTotalPoolUnits(marketId: number): Promise<bigint> {
  const { getPoolMembers } = await import('./superfluid-pool');
  const members = await getPoolMembers(marketId);
  
  let total = BigInt(0);
  members.forEach((units) => {
    total += units;
  });
  
  return total;
}

/**
 * Calculate artist's share percentage of pool
 */
export async function calculateArtistShare(
  marketId: number,
  artistAddress: string
): Promise<number> {
  const artistUnits = await getArtistUnits(marketId, artistAddress);
  const totalUnits = await getTotalPoolUnits(marketId);
  
  if (totalUnits === BigInt(0)) {
    return 0;
  }
  
  // Return as percentage (0-100)
  return Number((artistUnits * BigInt(10000)) / totalUnits) / 100;
}

