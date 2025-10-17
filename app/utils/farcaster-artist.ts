import { MiniappUser } from "../../types/miniapp";
import { Song } from "../../types/music";

/**
 * Creates a Farcaster mention object for an artist
 */
export function createArtistMention(song: Song): MiniappUser | null {
  if (!song.artistFid) {
    return null;
  }

  return {
    fid: song.artistFid,
    username: song.artistUsername || song.artist,
    displayName: song.artist,
    pfpUrl: song.artistPfpUrl || song.cover
  };
}

/**
 * Creates an array of mentions for multiple songs
 */
export function createArtistMentions(songs: Song[]): MiniappUser[] {
  const mentions: MiniappUser[] = [];
  const seenFids = new Set<number>();

  songs.forEach(song => {
    const mention = createArtistMention(song);
    if (mention && !seenFids.has(mention.fid)) {
      mentions.push(mention);
      seenFids.add(mention.fid);
    }
  });

  return mentions;
}

/**
 * Generates enhanced cast text with artist mentions
 */
export function generateCastTextWithArtist(
  baseText: string,
  song: Song,
  includeArtistMention: boolean = true
): string {
  if (!includeArtistMention || !song.artistFid) {
    return baseText;
  }

  // Add @username mention to the text if artist has a Farcaster username
  if (song.artistUsername) {
    return baseText.replace(
      song.artist,
      `@${song.artistUsername}`
    );
  }

  return baseText;
}

/**
 * Mock function to simulate artist FID lookup
 * In a real implementation, this would query a database or API
 * to resolve artist names to Farcaster FIDs
 */
export async function lookupArtistFid(artistName: string): Promise<{
  fid?: number;
  username?: string;
  pfpUrl?: string;
  hasFarcaster?: boolean; // Explicit flag to indicate if Farcaster profile exists
}> {
  // This is a mock implementation
  // In reality, you would:
  // 1. Query your database for known artist mappings
  // 2. Use Farcaster's API to search for users by name
  // 3. Use a third-party service like Airstack or similar
  
  const mockArtistMappings: Record<string, { fid: number; username: string; pfpUrl?: string }> = {
    "deadmau5": { fid: 12345, username: "deadmau5", pfpUrl: "https://example.com/deadmau5.jpg" },
    "skrillex": { fid: 23456, username: "skrillex", pfpUrl: "https://example.com/skrillex.jpg" },
    "porter robinson": { fid: 34567, username: "porterrobinson", pfpUrl: "https://example.com/porter.jpg" },
    // Add more mappings as needed
  };

  const normalizedName = artistName.toLowerCase().trim();
  const result = mockArtistMappings[normalizedName];
  
  if (result) {
    return {
      ...result,
      hasFarcaster: true
    };
  }
  
  // No Farcaster profile found
  return {
    hasFarcaster: false
  };
}

/**
 * Enhanced function to lookup Farcaster FID by wallet address
 * This is useful when you have the artist's wallet address but need to find their Farcaster profile
 */
export async function lookupFidByAddress(address: string): Promise<{
  fid?: number;
  username?: string;
  pfpUrl?: string;
  hasFarcaster?: boolean;
}> {
  // Mock implementation - in reality you would:
  // 1. Query Farcaster API for users with this wallet address
  // 2. Use Airstack or similar service to resolve address to FID
  // 3. Check your database for known address-to-FID mappings
  
  const mockAddressMappings: Record<string, { fid: number; username: string; pfpUrl?: string }> = {
    "0x1234567890123456789012345678901234567890": { fid: 12345, username: "deadmau5", pfpUrl: "https://example.com/deadmau5.jpg" },
    "0x2345678901234567890123456789012345678901": { fid: 23456, username: "skrillex", pfpUrl: "https://example.com/skrillex.jpg" },
    "0x3456789012345678901234567890123456789012": { fid: 34567, username: "porterrobinson", pfpUrl: "https://example.com/porter.jpg" },
    // Add more address mappings as needed
  };

  const normalizedAddress = address.toLowerCase();
  const result = mockAddressMappings[normalizedAddress];
  
  if (result) {
    return {
      ...result,
      hasFarcaster: true
    };
  }
  
  // No Farcaster profile found for this address
  return {
    hasFarcaster: false
  };
}

/**
 * Enhances a song object with Farcaster profile information
 */
export async function enhanceSongWithFarcasterProfile(song: Song): Promise<Song> {
  if (song.artistFid) {
    // Already has Farcaster info
    return song;
  }

  // Try to lookup by artist name first
  let farcasterInfo = await lookupArtistFid(song.artist);
  
  // If no Farcaster profile found by name, try by wallet address
  if (!farcasterInfo.hasFarcaster) {
    farcasterInfo = await lookupFidByAddress(song.creatorAddress);
  }
  
  return {
    ...song,
    artistFid: farcasterInfo.fid,
    artistUsername: farcasterInfo.username,
    artistPfpUrl: farcasterInfo.pfpUrl
  };
}

/**
 * Enhanced function to check if an address has a Farcaster profile
 */
export async function checkAddressHasFarcaster(address: string): Promise<boolean> {
  const result = await lookupFidByAddress(address);
  return result.hasFarcaster || false;
}

/**
 * Utility to check if a song has Farcaster profile information
 */
export function hasFarcasterProfile(song: Song): boolean {
  return !!song.artistFid;
}
