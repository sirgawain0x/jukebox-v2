// Pool claiming and connection utilities for Superfluid
// Handles connecting/disconnecting from pools and claiming tokens

import { ethers } from 'ethers';

// GDAv1Forwarder contract address (same on all Superfluid chains)
export const GDA_FORWARDER_ADDRESS = '0x6DA13Bde224A05a288748d857b9e7DDEffd1dE08';

// Minimal ABI for GDAv1Forwarder
const GDA_FORWARDER_ABI = [
  'function connectPool(address pool, bytes memory userData) external returns (bool)',
  'function disconnectPool(address pool, bytes memory userData) external returns (bool)',
  'function claimAll(address pool, address memberAddress, bytes memory userData) external',
  'function updateMemberUnits(address pool, address[] memory receivers, uint128[] memory units) external',
];

export interface PoolConnectionResult {
  success: boolean;
  transactionHash?: string;
  error?: string;
}

/**
 * Connect to a Superfluid pool
 * When a member connects, they start receiving streams in real-time
 * Connecting automatically claims all previously available tokens
 */
export async function connectToPool(
  signer: ethers.Signer,
  poolAddress: string,
  userData: string = '0x'
): Promise<PoolConnectionResult> {
  try {
    const forwarderContract = new ethers.Contract(
      GDA_FORWARDER_ADDRESS,
      GDA_FORWARDER_ABI,
      signer
    );

    const tx = await forwarderContract.connectPool(poolAddress, userData);
    const receipt = await tx.wait();

    if (!receipt) {
      return {
        success: false,
        error: 'Transaction receipt is null. Transaction may still be pending.',
      };
    }

    return {
      success: receipt.status === 1,
      transactionHash: receipt.hash,
    };
  } catch (error) {
    console.error('Error connecting to pool:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Disconnect from a Superfluid pool
 * Stops receiving streams from the pool
 */
export async function disconnectFromPool(
  signer: ethers.Signer,
  poolAddress: string,
  userData: string = '0x'
): Promise<PoolConnectionResult> {
  try {
    const forwarderContract = new ethers.Contract(
      GDA_FORWARDER_ADDRESS,
      GDA_FORWARDER_ABI,
      signer
    );

    const tx = await forwarderContract.disconnectPool(poolAddress, userData);
    const receipt = await tx.wait();

    if (!receipt) {
      return {
        success: false,
        error: 'Transaction receipt is null. Transaction may still be pending.',
      };
    }

    return {
      success: receipt.status === 1,
      transactionHash: receipt.hash,
    };
  } catch (error) {
    console.error('Error disconnecting from pool:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Claim all available tokens from a pool
 * Explicitly withdraws accumulated tokens
 */
export async function claimAllFromPool(
  signer: ethers.Signer,
  poolAddress: string,
  memberAddress: string,
  userData: string = '0x'
): Promise<PoolConnectionResult> {
  try {
    const forwarderContract = new ethers.Contract(
      GDA_FORWARDER_ADDRESS,
      GDA_FORWARDER_ABI,
      signer
    );

    const tx = await forwarderContract.claimAll(poolAddress, memberAddress, userData);
    const receipt = await tx.wait();

    if (!receipt) {
      return {
        success: false,
        error: 'Transaction receipt is null. Transaction may still be pending.',
      };
    }

    return {
      success: receipt.status === 1,
      transactionHash: receipt.hash,
    };
  } catch (error) {
    console.error('Error claiming from pool:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Check if member is connected to pool
 * Note: This requires querying the pool contract directly
 */
export async function isConnectedToPool(
  provider: ethers.Provider,
  poolAddress: string,
  memberAddress: string
): Promise<boolean> {
  try {
    // Pool ABI for checking connection status
    const POOL_ABI = [
      'function isMemberConnected(address member) external view returns (bool)',
      'function getMemberFlowRate(address member) external view returns (int96)',
    ];

    const poolContract = new ethers.Contract(poolAddress, POOL_ABI, provider);
    
    // Try to get member flow rate - if > 0, they're connected
    const flowRate = await poolContract.getMemberFlowRate(memberAddress);
    return flowRate > 0n;
  } catch (error) {
    console.error('Error checking pool connection:', error);
    return false;
  }
}

/**
 * Get claimable amount for a member
 * Returns the amount of tokens available to claim
 */
export async function getClaimableAmount(
  provider: ethers.Provider,
  poolAddress: string,
  memberAddress: string
): Promise<bigint> {
  try {
    const POOL_ABI = [
      'function getClaimable(address member) external view returns (uint256)',
    ];

    const poolContract = new ethers.Contract(poolAddress, POOL_ABI, provider);
    const claimable = await poolContract.getClaimable(memberAddress);
    return claimable;
  } catch (error) {
    console.error('Error getting claimable amount:', error);
    return 0n;
  }
}

/**
 * Batch connect multiple members to pool
 * Useful for onboarding multiple artists at once
 */
export async function batchConnectToPool(
  signer: ethers.Signer,
  poolAddress: string,
  memberAddresses: string[]
): Promise<PoolConnectionResult[]> {
  const results: PoolConnectionResult[] = [];

  for (const memberAddress of memberAddresses) {
    // Each member needs to connect themselves (can't connect others)
    // So this would need to be called by each member
    // For now, return instructions
    results.push({
      success: false,
      error: 'Each member must connect themselves. Use connectToPool with their signer.',
    });
  }

  return results;
}

