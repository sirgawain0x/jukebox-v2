// Pool validation utilities for Superfluid
// Validates pool addresses and checks balances

import { ethers } from 'ethers';

const POOL_ABI = [
  'function superToken() external view returns (address)',
  'function getPool(address superToken) external view returns (address poolAddress, address admin, int96 totalUnits, int96 flowRate)',
];

const SUPER_TOKEN_ABI = [
  'function balanceOf(address account) external view returns (uint256)',
  'function symbol() external view returns (string)',
  'function decimals() external view returns (uint8)',
];

export interface PoolValidationResult {
  isValid: boolean;
  superTokenAddress?: string;
  balance?: bigint;
  balanceFormatted?: string;
  error?: string;
}

/**
 * Validate pool address and get super token
 */
export async function validatePool(
  provider: ethers.providers.Provider,
  poolAddress: string
): Promise<{ isValid: boolean; superTokenAddress?: string; error?: string }> {
  try {
    const poolContract = new ethers.Contract(poolAddress, POOL_ABI, provider);
    const superTokenAddress = await poolContract.superToken();
    
    return {
      isValid: true,
      superTokenAddress,
    };
  } catch (error) {
    return {
      isValid: false,
      error: error instanceof Error ? error.message : 'Invalid pool address',
    };
  }
}

/**
 * Check user's balance of super token
 */
export async function checkSuperTokenBalance(
  provider: ethers.providers.Provider,
  superTokenAddress: string,
  userAddress: string
): Promise<{ balance: bigint; balanceFormatted: string; decimals: number }> {
  try {
    const tokenContract = new ethers.Contract(
      superTokenAddress,
      SUPER_TOKEN_ABI,
      provider
    );

    const [balance, decimals, symbol] = await Promise.all([
      tokenContract.balanceOf(userAddress),
      tokenContract.decimals(),
      tokenContract.symbol(),
    ]);

    const balanceFormatted = ethers.utils.formatUnits(balance, decimals);

    return {
      balance,
      balanceFormatted: `${balanceFormatted} ${symbol}`,
      decimals: Number(decimals),
    };
  } catch (error) {
    throw new Error(
      `Failed to check balance: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Validate pool and check user balance
 */
export async function validatePoolAndBalance(
  provider: ethers.providers.Provider,
  poolAddress: string,
  userAddress: string
): Promise<PoolValidationResult> {
  try {
    // Validate pool
    const poolValidation = await validatePool(provider, poolAddress);
    
    if (!poolValidation.isValid || !poolValidation.superTokenAddress) {
      return {
        isValid: false,
        error: poolValidation.error || 'Invalid pool',
      };
    }

    // Check balance
    const balanceInfo = await checkSuperTokenBalance(
      provider,
      poolValidation.superTokenAddress,
      userAddress
    );

    return {
      isValid: true,
      superTokenAddress: poolValidation.superTokenAddress,
      balance: balanceInfo.balance,
      balanceFormatted: balanceInfo.balanceFormatted,
    };
  } catch (error) {
    return {
      isValid: false,
      error: error instanceof Error ? error.message : 'Validation failed',
    };
  }
}

/**
 * Check if user has sufficient balance for flow rate
 */
export function hasSufficientBalance(
  balance: bigint,
  flowRateWeiPerSecond: bigint,
  durationSeconds: number = 86400 // 1 day default
): boolean {
  const requiredAmount = flowRateWeiPerSecond * BigInt(durationSeconds);
  return balance >= requiredAmount;
}

