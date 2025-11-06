import { Song } from "@/types/music";

export interface SongMetrics {
  songId: string;
  tips: number;
  plays: number;
  uniqueListeners: number;
  timeWeight: number;
}

export interface CalculatedScore {
  songId: string;
  score: number;
  metrics: SongMetrics;
}

/**
 * Calculate time-weighted factor based on when activity occurred
 * More recent activity gets higher weight
 */
function calculateTimeWeight(
  timestamps: number[],
  startTime: number,
  endTime: number
): number {
  if (timestamps.length === 0) return 0;

  const totalDuration = endTime - startTime;
  let weightedSum = 0;

  for (const timestamp of timestamps) {
    // Normalize timestamp to 0-1 range within the period
    const normalizedTime = (timestamp - startTime) / totalDuration;
    // Recent activity gets higher weight (exponential decay backwards)
    const weight = Math.exp(normalizedTime - 1); // 0 at start, 1 at end
    weightedSum += weight;
  }

  return weightedSum / timestamps.length;
}

/**
 * Calculate the "hottest" score for a song
 * Formula: (tips * 0.4) + (plays * 0.3) + (uniqueListeners * 0.2) + (timeWeight * 0.1)
 */
export function calculateSongScore(
  metrics: SongMetrics
): number {
  const { tips, plays, uniqueListeners, timeWeight } = metrics;

  // Normalize metrics to prevent any single metric from dominating
  // Using log scaling for tips and plays to handle large numbers
  const normalizedTips = tips > 0 ? Math.log10(tips + 1) : 0;
  const normalizedPlays = plays > 0 ? Math.log10(plays + 1) : 0;
  const normalizedListeners = uniqueListeners;

  // Calculate weighted score
  const score =
    normalizedTips * 0.4 +
    normalizedPlays * 0.3 +
    normalizedListeners * 0.2 +
    timeWeight * 0.1;

  return score;
}

/**
 * Fetch metrics for a song from Spinamp API and calculate score
 */
export async function fetchSongMetrics(
  songId: string,
  startTime: number,
  endTime: number
): Promise<SongMetrics> {
  try {
    // Query Spinamp GraphQL API for song metrics
    const query = `
      query GetSongMetrics($songId: ID!, $startTime: BigInt!, $endTime: BigInt!) {
        processedTrack(id: $songId) {
          id
          title
          artistByArtistId {
            name
          }
        }
        # Note: This would need to be expanded based on actual Spinamp schema
        # to fetch tips, plays, and unique listeners within the time period
      }
    `;

    const response = await fetch("https://api.spinamp.xyz/v3/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
        variables: {
          songId,
          startTime: startTime.toString(),
          endTime: endTime.toString(),
        },
      }),
    });

    const result = await response.json();

    if (result.errors) {
      console.error("Error fetching song metrics:", result.errors);
      return {
        songId,
        tips: 0,
        plays: 0,
        uniqueListeners: 0,
        timeWeight: 0,
      };
    }

    // For now, return placeholder metrics
    // In production, parse the actual data from Spinamp response
    // and calculate real metrics from on-chain events and API data
    return {
      songId,
      tips: 0, // Would fetch from on-chain tip events
      plays: 0, // Would fetch from Spinamp API
      uniqueListeners: 0, // Would calculate from unique addresses
      timeWeight: 0.5, // Placeholder
    };
  } catch (error) {
    console.error("Failed to fetch song metrics:", error);
    return {
      songId,
      tips: 0,
      plays: 0,
      uniqueListeners: 0,
      timeWeight: 0,
    };
  }
}

/**
 * Calculate scores for multiple songs and rank them
 */
export async function calculateScoresForSongs(
  songs: Song[],
  startTime: number,
  endTime: number
): Promise<CalculatedScore[]> {
  const scores: CalculatedScore[] = [];

  for (const song of songs) {
    const metrics = await fetchSongMetrics(song.id, startTime, endTime);
    const score = calculateSongScore(metrics);
    scores.push({
      songId: song.id,
      score,
      metrics,
    });
  }

  // Sort by score descending
  scores.sort((a, b) => b.score - a.score);

  return scores;
}

/**
 * Get the top-ranked song (winner) from a list of calculated scores
 */
export function getWinner(scores: CalculatedScore[]): string | null {
  if (scores.length === 0) return null;
  return scores[0].songId;
}

