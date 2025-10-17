import { Song } from "@/types/music";

/**
 * Sample songs with Farcaster profile information for demonstration
 */
export const sampleSongsWithFarcaster: Song[] = [
  {
    id: "1",
    title: "Strobe",
    artist: "deadmau5",
    cover: "https://example.com/deadmau5-cover.jpg",
    creatorAddress: "0x1234567890123456789012345678901234567890",
    audioUrl: "https://example.com/strobe.mp3",
    playCount: 1000000,
    platformName: "SoundCloud",
    artistFid: 12345,
    artistUsername: "deadmau5",
    artistPfpUrl: "https://example.com/deadmau5-pfp.jpg"
  },
  {
    id: "2", 
    title: "Bangarang",
    artist: "skrillex",
    cover: "https://example.com/skrillex-cover.jpg",
    creatorAddress: "0x2345678901234567890123456789012345678901",
    audioUrl: "https://example.com/bangarang.mp3",
    playCount: 2000000,
    platformName: "Spotify",
    artistFid: 23456,
    artistUsername: "skrillex",
    artistPfpUrl: "https://example.com/skrillex-pfp.jpg"
  },
  {
    id: "3",
    title: "Language",
    artist: "porter robinson",
    cover: "https://example.com/porter-cover.jpg", 
    creatorAddress: "0x3456789012345678901234567890123456789012",
    audioUrl: "https://example.com/language.mp3",
    playCount: 1500000,
    platformName: "Apple Music",
    artistFid: 34567,
    artistUsername: "porterrobinson",
    artistPfpUrl: "https://example.com/porter-pfp.jpg"
  },
  {
    id: "4",
    title: "Midnight City",
    artist: "M83",
    cover: "https://example.com/m83-cover.jpg",
    creatorAddress: "0x4567890123456789012345678901234567890123",
    audioUrl: "https://example.com/midnight-city.mp3",
    playCount: 800000,
    platformName: "YouTube Music"
    // Note: No Farcaster profile info - this will demonstrate the lookup functionality
  },
  {
    id: "5",
    title: "Sunflower",
    artist: "Post Malone",
    cover: "https://example.com/postmalone-cover.jpg",
    creatorAddress: "0x5678901234567890123456789012345678901234",
    audioUrl: "https://example.com/sunflower.mp3",
    playCount: 5000000,
    platformName: "Spotify"
    // Note: No Farcaster profile - demonstrates handling addresses without FIDs
  },
  {
    id: "6",
    title: "Blinding Lights",
    artist: "The Weeknd",
    cover: "https://example.com/weeknd-cover.jpg",
    creatorAddress: "0x6789012345678901234567890123456789012345",
    audioUrl: "https://example.com/blinding-lights.mp3",
    playCount: 3000000,
    platformName: "Apple Music"
    // Note: No Farcaster profile - demonstrates handling addresses without FIDs
  }
];

/**
 * Helper function to get a sample song by ID
 */
export function getSampleSong(id: string): Song | undefined {
  return sampleSongsWithFarcaster.find(song => song.id === id);
}

/**
 * Helper function to get all sample songs
 */
export function getAllSampleSongs(): Song[] {
  return sampleSongsWithFarcaster;
}
