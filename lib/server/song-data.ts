import { Song } from "@/types/music";

const SPINAMP_API = "https://api.spinamp.xyz/v3/graphql";

/**
 * Fetch a complete song object from Spinamp by track ID
 */
export async function fetchSongById(songId: string): Promise<Song | null> {
  try {
    const query = `
      query GetTrack($id: ID!) {
        processedTrackByTrackId(id: $id) {
          id
          title
          lossyArtworkUrl
          lossyAudioUrl
          artistByArtistId {
            id
            name
          }
          platformByPlatformId {
            name
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
        variables: { id: songId },
      }),
      next: { revalidate: 3600 }, // Cache for 1 hour
    });

    if (!response.ok) {
      console.error(`Failed to fetch song ${songId}: HTTP ${response.status}`);
      return null;
    }

    const result = await response.json();

    if (result.errors) {
      console.error("GraphQL errors:", result.errors);
      return null;
    }

    const track = result.data?.processedTrackByTrackId;
    if (!track) {
      return null;
    }

    // Extract artist address from artist ID (format: "artist/{address}")
    const artistId = track.artistByArtistId?.id || "";
    const creatorAddress = artistId.split("/")[1] || "";

    const song: Song = {
      id: track.id || songId,
      title: track.title || "Unknown Title",
      artist: track.artistByArtistId?.name || "Unknown Artist",
      cover: track.lossyArtworkUrl || "",
      creatorAddress,
      audioUrl: track.lossyAudioUrl || "",
      playCount: 0,
      platformName: track.platformByPlatformId?.name,
    };

    return song;
  } catch (error) {
    console.error(`Failed to fetch song ${songId}:`, error);
    return null;
  }
}

