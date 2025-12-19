export type Song = {
  id: string;
  title: string;
  artist: string;
  cover: string;
  creatorAddress: string;
  audioUrl: string;
  playCount: number | bigint;
  platformName?: string;
  // Engagement metrics
  engagementScore?: number;
  tipCount?: number;
  shareCount?: number;
  predictionCount?: number;
  // Social links
  socialLinks?: Array<{
    type: string;
    url: string;
  }>;
  // Curation
  isCurated?: boolean;
  verified?: boolean;
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
