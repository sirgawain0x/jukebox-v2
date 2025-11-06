export type MarketSide = "YES" | "NO";

export type MarketStatus = "ACTIVE" | "RESOLVED" | "CANCELLED";

export interface PredictionMarket {
  id: string;
  songId: string;
  songTitle: string;
  songArtist: string;
  songCover?: string;
  endTime: number; // Unix timestamp
  status: MarketStatus;
  createdAt: number;
  totalPoolYes: bigint; // USDC amount in wei (6 decimals)
  totalPoolNo: bigint; // USDC amount in wei (6 decimals)
  totalBets: number;
  contractAddress?: string;
  marketIndex?: number; // Index in contract
}

export interface MarketBet {
  id: string;
  marketId: string;
  userAddress: string;
  side: MarketSide;
  amount: bigint; // USDC amount in wei (6 decimals)
  timestamp: number;
  claimed: boolean;
  txHash?: string;
}

export interface MarketResolution {
  marketId: string;
  winner: MarketSide;
  resolvedAt: number;
  totalPayout: bigint; // USDC amount in wei
  platformFee: bigint; // USDC amount in wei
  winnerCount: number;
  txHash?: string;
}

export interface MarketMetrics {
  songId: string;
  tips: number;
  plays: number;
  uniqueListeners: number;
  timeWeight: number;
  score: number;
  rank: number;
}

export interface MarketOdds {
  yesOdds: number; // Percentage (0-100)
  noOdds: number; // Percentage (0-100)
  yesImplied: number; // Implied probability
  noImplied: number; // Implied probability
}

export interface UserPredictionStats {
  totalBets: number;
  totalWagered: bigint;
  totalWon: bigint;
  totalClaimed: bigint;
  winRate: number; // Percentage
  activeBets: number;
  pendingWinnings: bigint;
}

