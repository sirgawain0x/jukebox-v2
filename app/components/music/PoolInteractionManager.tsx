"use client";

import { useState, useEffect } from 'react';
import { useAccount, usePublicClient, useWalletClient } from 'wagmi';
// Note: Using ethers here because the underlying superfluid-pool-claiming library
// expects ethers.Signer and ethers.Provider types. We use wagmi hooks to check
// wallet connection status, but convert to ethers for the actual contract calls.
import { ethers } from 'ethers';
import { formatUnits } from 'viem';
import {
  connectToPool,
  disconnectFromPool,
  claimAllFromPool,
  isConnectedToPool,
  getClaimableAmount,
  GDA_FORWARDER_ADDRESS,
} from '@/lib/superfluid-pool-claiming';
import { useToast } from '../ui/ToastProvider';
import { Card } from '../ui/Card';
import { Input } from '@/components/ui/input';
import { Icon } from '../ui/Icon';

interface PoolInteractionManagerProps {
  poolAddress?: string;
  marketId?: number;
}

export function PoolInteractionManager({
  poolAddress: initialPoolAddress,
  marketId,
}: PoolInteractionManagerProps) {
  const { address, isConnected: isWalletConnected } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { showToast } = useToast();

  const [poolAddress, setPoolAddress] = useState(initialPoolAddress || '');
  const [memberAddress, setMemberAddress] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [isPoolConnected, setIsPoolConnected] = useState(false);
  const [claimableAmount, setClaimableAmount] = useState<string>('0');
  const [loadingStatus, setLoadingStatus] = useState(false);

  // Set member address to connected wallet if available
  useEffect(() => {
    if (address && !memberAddress) {
      setMemberAddress(address);
    }
  }, [address, memberAddress]);

  // Check connection status and claimable amount
  useEffect(() => {
    if (poolAddress && memberAddress && isWalletConnected && publicClient) {
      checkPoolStatus();
    }
  }, [poolAddress, memberAddress, isWalletConnected, publicClient]);

  const checkPoolStatus = async () => {
    if (!poolAddress || !memberAddress || !publicClient) return;

    setLoadingStatus(true);
    try {
      // Use window.ethereum for ethers provider (required by superfluid-pool-claiming library)
      // We check publicClient to ensure wallet is connected via wagmi
      if (typeof window === 'undefined' || !(window as any).ethereum) {
        return;
      }

      // ethers v5 uses Web3Provider instead of BrowserProvider
      const ethersProvider = new ethers.providers.Web3Provider((window as any).ethereum);

      const connected = await isConnectedToPool(
        ethersProvider,
        poolAddress,
        memberAddress
      );
      setIsPoolConnected(connected);

      const claimable = await getClaimableAmount(
        ethersProvider,
        poolAddress,
        memberAddress
      );
      setClaimableAmount(formatUnits(claimable, 6)); // USDC has 6 decimals
    } catch (error) {
      console.error('Error checking pool status:', error);
    } finally {
      setLoadingStatus(false);
    }
  };

  const handleConnect = async () => {
    if (!isWalletConnected || !walletClient) {
      showToast('Please connect your wallet first');
      return;
    }

    if (!poolAddress) {
      showToast('Please enter a pool address');
      return;
    }

    setIsConnecting(true);
    try {
      // Use window.ethereum for ethers provider (required by superfluid-pool-claiming library)
      // We check walletClient to ensure wallet is connected via wagmi
      if (typeof window === 'undefined' || !(window as any).ethereum) {
        showToast('Wallet not available');
        return;
      }

      // ethers v5 uses Web3Provider instead of BrowserProvider
      const ethersProvider = new ethers.providers.Web3Provider((window as any).ethereum);
      const signer = await ethersProvider.getSigner();
      const result = await connectToPool(signer, poolAddress);

      if (result.success) {
        showToast('Successfully connected to pool!');
        setIsPoolConnected(true);
        // Refresh status
        setTimeout(checkPoolStatus, 2000);
      } else {
        showToast(`Failed to connect: ${result.error}`);
      }
    } catch (error) {
      console.error('Error connecting to pool:', error);
      showToast(
        `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!isWalletConnected || !walletClient) {
      showToast('Please connect your wallet first');
      return;
    }

    if (!poolAddress) {
      showToast('Please enter a pool address');
      return;
    }

    setIsDisconnecting(true);
    try {
      // Use window.ethereum for ethers provider (required by superfluid-pool-claiming library)
      // We check walletClient to ensure wallet is connected via wagmi
      if (typeof window === 'undefined' || !(window as any).ethereum) {
        showToast('Wallet not available');
        return;
      }

      // ethers v5 uses Web3Provider instead of BrowserProvider
      const ethersProvider = new ethers.providers.Web3Provider((window as any).ethereum);
      const signer = await ethersProvider.getSigner();
      const result = await disconnectFromPool(signer, poolAddress);

      if (result.success) {
        showToast('Successfully disconnected from pool');
        setIsPoolConnected(false);
      } else {
        showToast(`Failed to disconnect: ${result.error}`);
      }
    } catch (error) {
      console.error('Error disconnecting from pool:', error);
      showToast(
        `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    } finally {
      setIsDisconnecting(false);
    }
  };

  const handleClaim = async () => {
    if (!isWalletConnected || !walletClient) {
      showToast('Please connect your wallet first');
      return;
    }

    if (!poolAddress) {
      showToast('Please enter a pool address');
      return;
    }

    const addressToClaim = memberAddress || address;
    if (!addressToClaim) {
      showToast('Please enter a member address');
      return;
    }

    setIsClaiming(true);
    try {
      // Use window.ethereum for ethers provider (required by superfluid-pool-claiming library)
      // We check walletClient to ensure wallet is connected via wagmi
      if (typeof window === 'undefined' || !(window as any).ethereum) {
        showToast('Wallet not available');
        return;
      }

      // ethers v5 uses Web3Provider instead of BrowserProvider
      const ethersProvider = new ethers.providers.Web3Provider((window as any).ethereum);
      const signer = await ethersProvider.getSigner();
      const result = await claimAllFromPool(signer, poolAddress, addressToClaim);

      if (result.success) {
        showToast('Successfully claimed tokens from pool!');
        // Refresh claimable amount
        setTimeout(checkPoolStatus, 2000);
      } else {
        showToast(`Failed to claim: ${result.error}`);
      }
    } catch (error) {
      console.error('Error claiming from pool:', error);
      showToast(
        `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    } finally {
      setIsClaiming(false);
    }
  };

  return (
    <Card className="max-w-2xl mx-auto" title="Pool Interaction Manager">
      <div className="space-y-4">
        {!isWalletConnected && (
          <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              Please connect your wallet to interact with pools
            </p>
          </div>
        )}

        {isWalletConnected && (
          <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
            <p className="text-sm text-green-800 dark:text-green-200">
              Wallet Connected: {address}
            </p>
          </div>
        )}

        <div className="space-y-2">
          <label className="text-sm font-medium text-(--app-foreground)">
            Pool Address
          </label>
          <Input
            placeholder="0x..."
            value={poolAddress}
            onChange={(e) => setPoolAddress(e.target.value)}
            disabled={!!initialPoolAddress}
          />
          {marketId && (
            <p className="text-xs text-(--app-foreground-muted)">
              Market ID: {marketId}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-(--app-foreground)">
            Member Address (for claiming)
          </label>
          <Input
            placeholder={address || '0x...'}
            value={memberAddress}
            onChange={(e) => setMemberAddress(e.target.value)}
          />
          <p className="text-xs text-(--app-foreground-muted)">
            Leave empty to use connected wallet address
          </p>
        </div>

        {/* Status Display */}
        {poolAddress && memberAddress && (
          <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-(--app-foreground-muted)">
                Pool Connection Status:
              </span>
              <span
                className={`text-sm font-semibold ${
                  isPoolConnected
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                {loadingStatus
                  ? 'Checking...'
                  : isPoolConnected
                    ? 'Connected to Pool'
                    : 'Not Connected to Pool'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-(--app-foreground-muted)">
                Claimable Amount:
              </span>
              <span className="text-sm font-semibold text-(--app-foreground)">
                {loadingStatus ? '...' : `${claimableAmount} USDC`}
              </span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleConnect}
            disabled={!isWalletConnected || !poolAddress || isConnecting}
            className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {isConnecting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Icon name="check" size="sm" />
                Connect to Pool
              </>
            )}
          </button>

          <button
            onClick={handleDisconnect}
            disabled={!isWalletConnected || !poolAddress || isDisconnecting}
            className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {isDisconnecting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Disconnecting...
              </>
            ) : (
              <>
                <Icon name="x" size="sm" />
                Disconnect
              </>
            )}
          </button>
        </div>

        <button
          onClick={handleClaim}
          disabled={!isWalletConnected || !poolAddress || isClaiming}
          className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          {isClaiming ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Claiming...
            </>
          ) : (
            <>
              <Icon name="trending-up" size="sm" />
              Claim All Tokens
            </>
          )}
        </button>

        {/* Info */}
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <p className="text-xs text-blue-800 dark:text-blue-200">
            <strong>Note:</strong> Connecting to a pool automatically claims all
            previously available tokens. You'll start receiving streams in
            real-time once connected.
          </p>
        </div>
      </div>
    </Card>
  );
}

