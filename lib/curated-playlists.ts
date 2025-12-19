// Curated playlist system to combat artist spam
// Implements cooldown periods and curation rules

import { Song } from '@/types/music';
import { redis } from './redis';

export type CurationRule = {
  maxSongsPerArtistPerWeek: number;
  minEngagementScore?: number;
  requireVerification?: boolean;
}

export const DEFAULT_CURATION_RULES: CurationRule = {
  maxSongsPerArtistPerWeek: 3,
  minEngagementScore: 10,
  requireVerification: false,
};

// Check if an artist has exceeded the cooldown limit
export async function checkArtistCooldown(
  artistId: string,
  rules: CurationRule = DEFAULT_CURATION_RULES
): Promise<{ allowed: boolean; reason?: string }> {
  if (!redis) {
    return { allowed: true }; // Allow if Redis not available
  }

  try {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];
    
    const key = `curation:artist:${artistId}:week:${weekAgo}`;
    const count = await redis.get<number>(key) || 0;

    if (count >= rules.maxSongsPerArtistPerWeek) {
      return {
        allowed: false,
        reason: `Artist has reached the limit of ${rules.maxSongsPerArtistPerWeek} songs per week`,
      };
    }

    return { allowed: true };
  } catch (error) {
    console.error('Error checking artist cooldown:', error);
    return { allowed: true }; // Allow on error
  }
}

// Increment artist song count for the week
export async function incrementArtistSongCount(artistId: string): Promise<void> {
  if (!redis) {
    return;
  }

  try {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];
    
    const key = `curation:artist:${artistId}:week:${weekAgo}`;
    await redis.incr(key);
    await redis.expire(key, 7 * 24 * 60 * 60); // 7 days TTL
  } catch (error) {
    console.error('Error incrementing artist song count:', error);
  }
}

// Check if a song meets curation criteria
export async function isSongCurated(
  song: Song,
  rules: CurationRule = DEFAULT_CURATION_RULES
): Promise<boolean> {
  // Check artist cooldown
  const cooldownCheck = await checkArtistCooldown(song.creatorAddress, rules);
  if (!cooldownCheck.allowed) {
    return false;
  }

  // Check engagement score if required
  if (rules.minEngagementScore && song.engagementScore !== undefined) {
    if (song.engagementScore < rules.minEngagementScore) {
      return false;
    }
  }

  // Check verification if required
  if (rules.requireVerification && !song.verified) {
    return false;
  }

  return true;
}

// Filter songs to only curated ones
export async function filterCuratedSongs(
  songs: Song[],
  rules: CurationRule = DEFAULT_CURATION_RULES
): Promise<Song[]> {
  const curatedSongs: Song[] = [];

  for (const song of songs) {
    const isCurated = await isSongCurated(song, rules);
    if (isCurated) {
      curatedSongs.push({
        ...song,
        isCurated: true,
        verified: true,
      });
    }
  }

  return curatedSongs;
}

// Get artist upload frequency (for admin panel)
export async function getArtistUploadFrequency(
  artistId: string
): Promise<{ thisWeek: number; lastWeek: number; total: number }> {
  if (!redis) {
    return { thisWeek: 0, lastWeek: 0, total: 0 };
  }

  try {
    const thisWeek = new Date().toISOString().split('T')[0];
    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];

    const [thisWeekCount, lastWeekCount] = await Promise.all([
      redis.get<number>(`curation:artist:${artistId}:week:${thisWeek}`),
      redis.get<number>(`curation:artist:${artistId}:week:${twoWeeksAgo}`),
    ]);

    // Total would require a different data structure, for now return 0
    return {
      thisWeek: thisWeekCount ?? 0,
      lastWeek: lastWeekCount ?? 0,
      total: 0,
    };
  } catch (error) {
    console.error('Error getting artist upload frequency:', error);
    return { thisWeek: 0, lastWeek: 0, total: 0 };
  }
}

// Manually curate a song (admin function)
export async function manuallyCurateSong(
  songId: string,
  curated: boolean
): Promise<void> {
  if (!redis) {
    return;
  }

  try {
    const key = `curation:manual:${songId}`;
    if (curated) {
      await redis.set(key, 'true', { ex: 365 * 24 * 60 * 60 }); // 1 year
    } else {
      await redis.del(key);
    }
  } catch (error) {
    console.error('Error manually curating song:', error);
  }
}

// Check if a song is manually curated
export async function isManuallyCurated(songId: string): Promise<boolean> {
  if (!redis) {
    return false;
  }

  try {
    const key = `curation:manual:${songId}`;
    const curated = await redis.get<string>(key);
    return curated === 'true';
  } catch (error) {
    console.error('Error checking manual curation:', error);
    return false;
  }
}

