import type { Song } from "@/types/music";

const SPINAMP_API = "https://api.spinamp.xyz/v3/graphql";

export interface TrendingTrack {
  id: string;
  title: string;
  artist: string;
  cover: string;
  audioUrl: string;
  artistId: string;
}

/**
 * Fetch top 10 trending tracks from Spinamp
 */
export async function fetchTrendingSongs(limit: number = 10): Promise<TrendingTrack[]> {
  try {
    const query = `
      query TrendingTracks($first: Int!) {
        allTrendingTracks(first: $first) {
          edges {
            node {
              processedTrackByTrackId {
                id
                title
                lossyArtworkUrl
                lossyAudioUrl
                artistByArtistId {
                  id
                  name
                }
              }
            }
          }
        }
      }
    `;

    const response = await fetch(SPINAMP_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
        variables: {
          first: limit,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    if (result.errors) {
      console.error("GraphQL errors:", result.errors);
      throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
    }

    const edges = result.data?.allTrendingTracks?.edges || [];
    
    return edges.map((edge: any, index: number) => {
      const track = edge.node?.processedTrackByTrackId;
      if (!track) return null;

      return {
        id: track.id,
        title: track.title || "Unknown Title",
        artist: track.artistByArtistId?.name || "Unknown Artist",
        cover: track.lossyArtworkUrl || "",
        audioUrl: track.lossyAudioUrl || "",
        artistId: track.artistByArtistId?.id || "",
      };
    }).filter((song: TrendingTrack | null): song is TrendingTrack => song !== null);
  } catch (error) {
    console.error("Failed to fetch trending songs:", error);
    // Return empty array on error
    return [];
  }
}

/**
 * Convert trending tracks to Song format
 */
export function trendingTracksToSongs(tracks: TrendingTrack[]): Song[] {
  return tracks.map((track, index) => ({
    id: track.id,
    title: track.title,
    artist: track.artist,
    cover: track.cover,
    creatorAddress: track.artistId,
    audioUrl: track.audioUrl,
    playCount: 0,
  }));
}

/**
 * Calculate weekly end time (next Monday at 12:01 AM UTC)
 * Markets reset every Monday at 00:01 UTC
 */
export function getWeeklyEndTime(): number {
  const now = new Date();
  
  // Get current UTC date components
  const utcYear = now.getUTCFullYear();
  const utcMonth = now.getUTCMonth();
  const utcDate = now.getUTCDate();
  const utcHour = now.getUTCHours();
  const utcMinute = now.getUTCMinutes();
  
  // Create a date at midnight UTC for today to calculate day of week
  const utcMidnight = new Date(Date.UTC(utcYear, utcMonth, utcDate));
  
  // Calculate UTC day of week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
  // Using Zeller's congruence or simpler: calculate from epoch
  // Jan 1, 1970 (epoch) was a Thursday
  const epochDay = Math.floor(utcMidnight.getTime() / (1000 * 60 * 60 * 24));
  // Thursday = 4 in JavaScript's getDay() (0=Sun, 1=Mon, ..., 4=Thu, ..., 6=Sat)
  // So: (epochDay + 4) % 7 gives us the day where 0=Thu
  // We need to convert: (epochDay + 4) % 7 where 0=Thu, 1=Fri, 2=Sat, 3=Sun, 4=Mon, 5=Tue, 6=Wed
  // Convert to standard: 0=Sun, 1=Mon, ..., 6=Sat
  const utcDayOfWeek = (epochDay + 4) % 7; // This gives us the correct day of week
  
  // Calculate days until next Monday
  // If today is Monday and it's before 00:01, use today's 00:01
  // Otherwise, calculate next Monday
  let daysUntilMonday: number;
  
  if (utcDayOfWeek === 1 && utcHour === 0 && utcMinute < 1) {
    // Today is Monday and it's before 00:01, use today
    daysUntilMonday = 0;
  } else {
    // Calculate days until next Monday
    // Monday is day 1, so:
    // - If today is Monday (1) after 00:01: 7 days
    // - If today is Tuesday (2): 6 days
    // - If today is Wednesday (3): 5 days
    // - If today is Thursday (4): 4 days
    // - If today is Friday (5): 3 days
    // - If today is Saturday (6): 2 days
    // - If today is Sunday (0): 1 day
    daysUntilMonday = utcDayOfWeek === 0 ? 1 : (8 - utcDayOfWeek);
  }
  
  // Create next Monday at 00:01 UTC
  const nextMonday = new Date(Date.UTC(utcYear, utcMonth, utcDate + daysUntilMonday, 0, 1, 0, 0));
  
  // Return as Unix timestamp (seconds)
  return Math.floor(nextMonday.getTime() / 1000);
}

