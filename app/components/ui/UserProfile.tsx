"use client";

import { useEffect, useState, useRef } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';
import { useWallet } from '@/app/contexts/WalletContext';
import { useFarcasterContext } from '@/app/utils/farcaster-context';
import { getName, getAvatar, getAttestations } from '@coinbase/onchainkit/identity';
import { base } from 'wagmi/chains';
import { useBalance } from 'wagmi';
import { formatUnits } from 'viem';
import { CheckCircle2, Copy, ChevronDown, LogOut } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { useToast } from '@/app/components/ui/ToastProvider';

const COINBASE_VERIFIED_ACCOUNT_SCHEMA_ID =
  '0xf8b05c79f090979bf4a80270aba232dff11a10d9ca55c4f88de95317970f0de9';

interface UserProfileData {
  name: string | null;
  avatar: string | null;
  isLoading: boolean;
  isVerified: boolean;
}

export function UserProfile() {
  const wallet = useWallet();
  const farcasterContext = useFarcasterContext();
  const { showToast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isInMiniApp, setIsInMiniApp] = useState(false);
  const [miniappUser, setMiniappUser] = useState<{
    fid?: number;
    username?: string;
    displayName?: string;
    pfpUrl?: string;
  } | null>(null);
  const [profileData, setProfileData] = useState<UserProfileData>({
    name: null,
    avatar: null,
    isLoading: true,
    isVerified: false,
  });

  // ETH (native) balance on Base
  const {
    data: ethBalance,
    isLoading: ethLoading,
  } = useBalance({
    address: wallet.address as `0x${string}` | undefined,
    chainId: 8453, // Base mainnet
  });

  // USDC balance on Base
  const {
    data: usdcBalance,
    isLoading: usdcLoading,
  } = useBalance({
    address: wallet.address as `0x${string}` | undefined,
    token: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // USDC on Base
    chainId: 8453,
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen]);

  const handleCopyAddress = async () => {
    if (!wallet.address) return;
    
    try {
      await navigator.clipboard.writeText(wallet.address);
      showToast({
        message: 'Address copied to clipboard',
        type: 'success',
      });
    } catch (error) {
      console.error('Failed to copy address:', error);
      showToast({
        message: 'Could not copy address to clipboard',
        type: 'error',
      });
    }
  };

  const handleDisconnect = async () => {
    if (wallet.shouldUseFarcasterWallet) {
      showToast({
        message: 'Farcaster wallet cannot be disconnected from within the miniapp',
        type: 'error',
      });
      return;
    }

    try {
      setIsDisconnecting(true);
      await wallet.disconnect();
      showToast({
        message: 'Wallet disconnected successfully',
        type: 'success',
      });
      setIsOpen(false);
    } catch (error) {
      console.error('Disconnect error:', error);
      showToast({
        message: error instanceof Error ? error.message : 'Failed to disconnect wallet',
        type: 'error',
      });
    } finally {
      setIsDisconnecting(false);
    }
  };

  // Helper function to safely fetch attestations with error handling
  const fetchAttestationsSafely = async (address: string): Promise<boolean> => {
    try {
      // Validate address format before making request
      if (!address || !address.startsWith('0x') || address.length !== 42) {
        return false;
      }

      const attestations = await getAttestations(
        address as `0x${string}`,
        base,
        {
          schemas: [COINBASE_VERIFIED_ACCOUNT_SCHEMA_ID],
        }
      );
      
      // Check for non-revoked, non-expired attestations
      return attestations.some(att => !att.revoked && (att.expirationTime === 0 || att.expirationTime > Date.now() / 1000));
    } catch (error) {
      // Silently handle errors - this is a non-critical feature
      // The error might be due to network issues, encoding problems, or API limitations
      if (error instanceof Error) {
        // Only log if it's not the specific encoding error we're trying to handle
        if (!error.message.includes('ISO-8859-1') && !error.message.includes('headers')) {
          console.error('Error fetching attestations:', error.message);
        }
      }
      return false;
    }
  };

  // Load miniapp context according to miniappContextrules.mdc
  useEffect(() => {
    const loadMiniAppContext = async () => {
      try {
        // Check if we're in a Mini App using sdk.isInMiniApp()
        const miniAppStatus = await sdk.isInMiniApp();
        setIsInMiniApp(miniAppStatus);

        if (miniAppStatus) {
          // Get context and extract user info using sdk.context
          const context = await sdk.context;
          if (context?.user) {
            setMiniappUser({
              fid: context.user.fid,
              username: context.user.username,
              displayName: context.user.displayName,
              pfpUrl: context.user.pfpUrl,
            });
          }
        }
      } catch (error) {
        console.error('Error loading miniapp context:', error);
        setIsInMiniApp(false);
        setMiniappUser(null);
      }
    };

    loadMiniAppContext();
  }, []);

  useEffect(() => {
    const fetchProfile = async () => {
      // Priority 1: Farcaster miniapp user data (if available)
      // Use miniapp context data first, fallback to farcasterContext for backward compatibility
      const userFid = miniappUser?.fid ?? farcasterContext.userFid;
      const displayName = miniappUser?.displayName ?? farcasterContext.displayName;
      const username = miniappUser?.username ?? farcasterContext.username;
      const pfpUrl = miniappUser?.pfpUrl ?? farcasterContext.pfpUrl;
      
      if ((isInMiniApp || farcasterContext.isMiniapp) && userFid !== undefined) {
        // Still check for attestations even for Farcaster users
        const isVerified = wallet.address ? await fetchAttestationsSafely(wallet.address) : false;

        setProfileData({
          name: displayName || username || null,
          avatar: pfpUrl || null,
          isLoading: false,
          isVerified,
        });
        return;
      }

      // Priority 2: Onchain identity (ENS/Basename) for connected wallet
      if (wallet.address) {
        // Ensure address is properly formatted
        const formattedAddress = wallet.address.toLowerCase() as `0x${string}`;
        
        try {
          console.log('Fetching ENS name for address:', formattedAddress);
          // Get the name first
          const name = await getName({ address: formattedAddress, chain: base });
          console.log('Resolved ENS name:', name, 'for address:', formattedAddress);
          
          // Try to get avatar if we have an ENS name
          let avatar: string | null = null;
          if (name && name.trim()) {
            try {
              console.log('Fetching avatar for ENS name:', name);
              avatar = await getAvatar({ ensName: name, chain: base });
              console.log('Resolved avatar URL:', avatar, 'for ENS name:', name);
            } catch (avatarError) {
              console.warn('Failed to get avatar for ENS name:', name, avatarError);
            }
          } else {
            console.log('No ENS name found for address:', formattedAddress);
          }

          // Fetch attestations in parallel
          const isVerified = await fetchAttestationsSafely(wallet.address);

          setProfileData({
            name: name && name.trim() ? name : null, // Only set name if it's not empty
            avatar,
            isLoading: false,
            isVerified,
          });
        } catch (error) {
          console.error('Error fetching profile for address:', formattedAddress, error);
          // Fallback to address, still try to get attestations
          const isVerified = await fetchAttestationsSafely(wallet.address);

          setProfileData({
            name: `${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}`,
            avatar: null,
            isLoading: false,
            isVerified,
          });
        }
      } else {
        setProfileData({
          name: null,
          avatar: null,
          isLoading: false,
          isVerified: false,
        });
      }
    };

    fetchProfile();
  }, [
    wallet.address, 
    isInMiniApp, 
    miniappUser?.fid, 
    miniappUser?.displayName, 
    miniappUser?.username, 
    miniappUser?.pfpUrl,
    farcasterContext.isMiniapp, 
    farcasterContext.userFid, 
    farcasterContext.displayName, 
    farcasterContext.username, 
    farcasterContext.pfpUrl
  ]);

  // Show profile if wallet is connected OR if we have miniapp user data
  const userFid = miniappUser?.fid ?? farcasterContext.userFid;
  if (!wallet.isConnected && userFid === undefined) {
    return null;
  }

  if (profileData.isLoading) {
    return (
      <div className="flex items-center space-x-3">
        <div className="h-10 w-10 rounded-full bg-gray-200 animate-pulse" />
        <div className="space-y-2">
          <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
          <div className="h-3 w-32 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  const displayName = profileData.name || 
    (wallet.address ? `${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}` : 'User');
  const initials = displayName
    .replace(/\.eth$|\.base\.eth$|\.basetest\.eth$/i, '')
    .charAt(0)
    .toUpperCase();

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Clickable profile button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-3 hover:opacity-80 transition-opacity cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-lg p-1"
        aria-label="User profile menu"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <div className="relative h-10 w-10 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center">
          {profileData.avatar ? (
            <Image
              src={profileData.avatar}
              alt={displayName}
              width={40}
              height={40}
              className="h-full w-full object-cover"
              unoptimized
              onError={(e) => {
                // Fallback to initials if image fails to load
                e.currentTarget.style.display = 'none';
              }}
            />
          ) : null}
          {!profileData.avatar && (
            <span className="text-sm font-medium text-gray-600">{initials}</span>
          )}
        </div>
        <div className="flex flex-col min-w-0 items-start">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium truncate">
              {displayName}
            </span>
            {profileData.isVerified && (
              <Badge
                variant="secondary"
                className="flex items-center gap-1 px-1.5 py-0 h-5 text-xs bg-blue-50 text-blue-700 border-blue-200"
                title="Coinbase Verified Account"
              >
                <CheckCircle2 className="w-3 h-3" />
                <span>Verified</span>
              </Badge>
            )}
            <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </div>
          {(miniappUser?.username ?? farcasterContext.username) && (
            <span className="text-xs text-gray-500 truncate">@{miniappUser?.username ?? farcasterContext.username}</span>
          )}
        </div>
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-72 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50 overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3 mb-3">
              <div className="relative h-12 w-12 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center">
                {profileData.avatar ? (
                  <Image
                    src={profileData.avatar}
                    alt={displayName}
                    width={48}
                    height={48}
                    className="h-full w-full object-cover"
                    unoptimized
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : null}
                {!profileData.avatar && (
                  <span className="text-base font-medium text-gray-600">{initials}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold truncate">
                    {displayName}
                  </span>
                  {profileData.isVerified && (
                    <Badge
                      variant="secondary"
                      className="flex items-center gap-1 px-1.5 py-0 h-5 text-xs bg-blue-50 text-blue-700 border-blue-200"
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Verified</span>
                    </Badge>
                  )}
                </div>
                {(miniappUser?.username ?? farcasterContext.username) && (
                  <span className="text-xs text-gray-500">@{miniappUser?.username ?? farcasterContext.username}</span>
                )}
                {wallet.address && !(miniappUser?.username ?? farcasterContext.username) && (
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-500 font-mono">
                      {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
                    </span>
                    <button
                      onClick={handleCopyAddress}
                      className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 transition-colors p-0.5"
                      aria-label="Copy address"
                      title="Copy full address"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>
            
            {wallet.address && (
              <div className="space-y-2 mt-3">
                {wallet.chainName && (
                  <div className="text-xs text-gray-500">
                    Network: {wallet.chainName}
                  </div>
                )}
                {/* {wallet.connectorName && (
                  <div className="text-xs text-gray-500">
                    Wallet: {wallet.connectorName}
                  </div>
                )} */}
              </div>
            )}
          </div>

          {wallet.address && (
            <div className="p-2 border-b border-gray-200 dark:border-gray-700">
              <div className="flex flex-col gap-3 px-2 py-1">
                {(ethLoading || usdcLoading) ? (
                  <div className="text-xs text-gray-500 animate-pulse">
                    Loading balances...
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden">
                        <Image 
                          src="/tokens/eth-logo.svg" 
                          alt="ETH" 
                          width={32} 
                          height={32}
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <span className="font-bold text-sm text-(--app-foreground)">ETH:</span>
                      <span className="text-sm font-medium text-(--app-foreground)">
                        {ethBalance
                          ? Number(formatUnits(ethBalance.value, ethBalance.decimals)).toFixed(4)
                          : "0.0000"}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden">
                        <Image 
                          src="/tokens/usdc-logo.svg" 
                          alt="USDC" 
                          width={32} 
                          height={32}
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <span className="font-bold text-sm text-(--app-foreground)">USDC:</span>
                      <span className="text-sm font-medium text-(--app-foreground)">
                        {usdcBalance
                          ? Number(formatUnits(usdcBalance.value, usdcBalance.decimals)).toFixed(4)
                          : "0.0000"}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          <div className="p-2">
            <Button
              onClick={handleDisconnect}
              disabled={isDisconnecting || wallet.shouldUseFarcasterWallet}
              variant="outline"
              size="sm"
              className="w-full justify-start"
            >
              {isDisconnecting ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Disconnecting...
                </>
              ) : (
                <>
                  <LogOut className="w-4 h-4 mr-2" />
                  {wallet.shouldUseFarcasterWallet ? 'Cannot disconnect Farcaster wallet' : 'Disconnect'}
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

