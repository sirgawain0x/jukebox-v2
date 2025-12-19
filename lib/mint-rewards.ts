// NFT minting rewards using Spinamp mint types
// Handles minting achievement NFTs for rewards

import {
  MintDetails,
  MintType,
  BaseMintDetails,
  MintError,
  Asset,
  UnsignedTransaction,
} from './spinamp-utils';

export type AchievementNFT = {
  trackId: string;
  mintDetails: BaseMintDetails;
  achievementType: 'streak' | 'listening' | 'prediction';
}

// Get mint details for achievement NFT
export async function getAchievementMintDetails(
  achievementType: 'streak' | 'listening' | 'prediction',
  trackId?: string
): Promise<BaseMintDetails> {
  // In production, this would query Spinamp API or contract for mint details
  // For now, return mock data
  
  const asset: Asset = {
    symbol: 'ETH',
    decimals: 18,
    address: '0x0000000000000000000000000000000000000000',
  };

  return {
    available: true,
    price: {
      asset,
      value: '0', // Free for achievements
    },
    mintType: MintType.KNOWN_TRACK,
    quantity: 1,
    maxQuantity: 1,
    metadata: {
      sound_tier: 'Forever',
    },
  };
}

// Create mint transaction for achievement
export async function createAchievementMintTransaction(
  achievementType: 'streak' | 'listening' | 'prediction',
  recipientAddress: string,
  trackId?: string
): Promise<UnsignedTransaction | null> {
  const mintDetails = await getAchievementMintDetails(achievementType, trackId);
  
  if (!mintDetails.available || !mintDetails.mintTransaction) {
    return null;
  }

  return {
    ...mintDetails.mintTransaction,
    from: recipientAddress,
    chainId: 8453, // Base mainnet
  };
}

// Check if user can mint achievement
export async function canMintAchievement(
  userId: string,
  achievementType: 'streak' | 'listening' | 'prediction'
): Promise<{
  canMint: boolean;
  reason?: MintError;
  mintDetails?: BaseMintDetails;
}> {
  const mintDetails = await getAchievementMintDetails(achievementType);
  
  if (!mintDetails.available) {
    return {
      canMint: false,
      reason: 'not for sale',
    };
  }

  if (mintDetails.error) {
    return {
      canMint: false,
      reason: mintDetails.error.reason,
    };
  }

  return {
    canMint: true,
    mintDetails,
  };
}

