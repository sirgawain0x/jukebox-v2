// Network validation and switching utilities
// Handles network validation for Superfluid operations

// Base Mainnet
export const BASE_MAINNET_CHAIN_ID = '0x2105'; // 8453 in hex
export const BASE_MAINNET_CHAIN_ID_DECIMAL = 8453;

// Base Sepolia (Testnet)
export const BASE_SEPOLIA_CHAIN_ID = '0x14a34'; // 84532 in hex
export const BASE_SEPOLIA_CHAIN_ID_DECIMAL = 84532;

// Optimism Sepolia (for reference)
export const OP_SEPOLIA_CHAIN_ID = '0xaa37dc'; // 11155420 in hex
export const OP_SEPOLIA_CHAIN_ID_DECIMAL = 11155420;

/**
 * Switch to Base Mainnet
 */
export async function switchToBaseMainnet(): Promise<boolean> {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('MetaMask or compatible wallet not found');
  }

  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: BASE_MAINNET_CHAIN_ID }],
    });
    return true;
  } catch (switchError: unknown) {
    // This error code indicates that the chain has not been added to MetaMask
    if ((switchError as { code?: number })?.code === 4902) {
      try {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [
            {
              chainId: BASE_MAINNET_CHAIN_ID,
              chainName: 'Base Mainnet',
              nativeCurrency: {
                name: 'Ether',
                symbol: 'ETH',
                decimals: 18,
              },
              rpcUrls: ['https://mainnet.base.org'],
              blockExplorerUrls: ['https://basescan.org'],
            },
          ],
        });
        return true;
      } catch (addError) {
        console.error('Failed to add Base Mainnet:', addError);
        return false;
      }
    }
    console.error('Failed to switch to Base Mainnet:', switchError);
    return false;
  }
}

/**
 * Switch to Base Sepolia
 */
export async function switchToBaseSepolia(): Promise<boolean> {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('MetaMask or compatible wallet not found');
  }

  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: BASE_SEPOLIA_CHAIN_ID }],
    });
    return true;
  } catch (switchError: unknown) {
    if ((switchError as { code?: number })?.code === 4902) {
      try {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [
            {
              chainId: BASE_SEPOLIA_CHAIN_ID,
              chainName: 'Base Sepolia',
              nativeCurrency: {
                name: 'Ether',
                symbol: 'ETH',
                decimals: 18,
              },
              rpcUrls: ['https://sepolia.base.org'],
              blockExplorerUrls: ['https://sepolia.basescan.org'],
            },
          ],
        });
        return true;
      } catch (addError) {
        console.error('Failed to add Base Sepolia:', addError);
        return false;
      }
    }
    console.error('Failed to switch to Base Sepolia:', switchError);
    return false;
  }
}

/**
 * Check if current network is Base Mainnet
 */
export function isBaseMainnet(chainId: number | string): boolean {
  const chainIdNum = typeof chainId === 'string' 
    ? parseInt(chainId, 16) 
    : chainId;
  return chainIdNum === BASE_MAINNET_CHAIN_ID_DECIMAL;
}

/**
 * Check if current network is Base Sepolia
 */
export function isBaseSepolia(chainId: number | string): boolean {
  const chainIdNum = typeof chainId === 'string' 
    ? parseInt(chainId, 16) 
    : chainId;
  return chainIdNum === BASE_SEPOLIA_CHAIN_ID_DECIMAL;
}

/**
 * Get network name from chain ID
 */
export function getNetworkName(chainId: number | string): string {
  if (isBaseMainnet(chainId)) return 'Base Mainnet';
  if (isBaseSepolia(chainId)) return 'Base Sepolia';
  return 'Unknown Network';
}

