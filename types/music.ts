export type Song = {
  id: string;
  title: string;
  artist: string;
  cover: string;
  creatorAddress: string;
  audioUrl: string;
  playCount: number | bigint;
  platformName?: string;
  artistFid?: number; // Farcaster FID for the artist
  artistUsername?: string; // Farcaster username for the artist
  artistPfpUrl?: string; // Artist's Farcaster profile picture URL
};

export type Playlist = {
  name: string;
  coverImage: string;
  description: string;
  tags: string[];
  address?: `0x${string}`;
};

export type RecentTip = {
  amountEth: string;
  timestamp: string;
  txHash?: string;
  sender?: { address: string };
};
