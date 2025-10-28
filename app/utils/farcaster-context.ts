import { useState, useEffect } from "react";
import { sdk } from "@farcaster/miniapp-sdk";
import type { Context } from "@farcaster/miniapp-core";

export interface FarcasterContext {
  isInFarcaster: boolean;
  isMiniapp: boolean;
  isFrame: boolean;
  userFid?: number;
  userAddress?: string;
  castHash?: string;
  castAuthorFid?: number;
}

/**
 * Detects if the app is running within a Farcaster environment
 */
export function detectFarcasterContext(): FarcasterContext {
  const context: FarcasterContext = {
    isInFarcaster: false,
    isMiniapp: false,
    isFrame: false,
  };

  // Check if we're in a browser environment
  if (typeof window === 'undefined') {
    return context;
  }

  // Check for Farcaster-specific environment variables or window properties
  const isInFarcasterApp = 
    window.location.hostname.includes('warpcast.com') ||
    window.location.hostname.includes('farcaster.xyz') ||
    window.location.hostname.includes('farcaster.com') ||
    // Check for Farcaster-specific query parameters
    new URLSearchParams(window.location.search).has('fc') ||
    // Check for Farcaster-specific headers (if available)
    document.referrer.includes('warpcast.com') ||
    document.referrer.includes('farcaster.xyz');

  context.isInFarcaster = isInFarcasterApp;
  
  // If we're not in a Farcaster URL, we're definitely not in a miniapp
  if (!isInFarcasterApp) {
    console.log("❌ Not in Farcaster URL - definitely not a miniapp");
    return context; // Return early, no need to check SDK
  }

  // Debug logging
  console.log("Farcaster context detection:", {
    hostname: window.location.hostname,
    referrer: document.referrer,
    searchParams: window.location.search,
    isInFarcasterApp
  });

  // Try to detect miniapp context using the SDK
  try {
    // Check if the miniapp SDK is available and initialized
    if (typeof sdk !== 'undefined' && sdk.context) {
      // Since sdk.context is a Promise, we need to handle it asynchronously
      // For now, we'll just check if the SDK is available
      console.log("Farcaster SDK detected:", {
        sdkAvailable: true,
        contextAvailable: !!sdk.context
      });
      
      // We'll handle the async context in the hook instead
      // This function just detects if we're in a Farcaster URL
      console.log("✅ In Farcaster URL - SDK available for async context loading");
    } else {
      console.log("Farcaster SDK not available:", {
        sdkAvailable: typeof sdk !== 'undefined',
        contextAvailable: typeof sdk !== 'undefined' && !!sdk.context
      });
    }
  } catch (error) {
    console.log('Farcaster SDK not available or not initialized:', error);
  }

  console.log("Final Farcaster context:", context);
  return context;
}

/**
 * Hook to get Farcaster context information
 */
export function useFarcasterContext(): FarcasterContext {
  const [context, setContext] = useState<FarcasterContext>({
    isInFarcaster: false,
    isMiniapp: false,
    isFrame: false,
  });

  useEffect(() => {
    const detectedContext = detectFarcasterContext();
    setContext(detectedContext);

    // Listen for context changes if SDK is available
    // Note: We'll check for context changes periodically instead of subscribing
    // to avoid postMessage serialization issues
    if (typeof sdk !== 'undefined' && sdk.context) {
      const checkContextChanges = async () => {
        try {
          const currentContext = await sdk.context;
          if (currentContext) {
            const isCastLocation = currentContext.location?.type === 'cast_embed' || currentContext.location?.type === 'cast_share';
            const castLocation = isCastLocation ? currentContext.location as Context.CastEmbedLocationContext | Context.CastShareLocationContext : null;
            
            setContext(prev => ({
              ...prev,
              isMiniapp: true,
              isFrame: isCastLocation,
              userFid: currentContext.user?.fid,
              userAddress: undefined, // Address not available in UserContext
              castHash: castLocation?.cast?.hash,
              castAuthorFid: castLocation?.cast?.author?.fid,
            }));
          }
        } catch (error) {
          console.log('Error checking Farcaster context:', error);
        }
      };

      // Check for context changes every 2 seconds
      const interval = setInterval(checkContextChanges, 2000);
      
      // Also check immediately
      checkContextChanges();

      return () => clearInterval(interval);
    }
  }, []);

  return context;
}

/**
 * Checks if the current environment supports Farcaster wallet operations
 */
export function supportsFarcasterWallet(): boolean {
  const context = detectFarcasterContext();
  // Only return true if we're actually in a Farcaster environment AND have user data
  return (context.isMiniapp || context.isFrame) && !!context.userAddress;
}

/**
 * Gets the appropriate wallet address for Farcaster context
 */
export function getFarcasterWalletAddress(): string | undefined {
  const context = detectFarcasterContext();
  return context.userAddress;
}

/**
 * Checks if we should use Farcaster-specific transaction handling
 */
export function shouldUseFarcasterTransactions(): boolean {
  const context = detectFarcasterContext();
  // Only use Farcaster transactions if we're in a miniapp AND have a user address AND SDK is available
  return context.isMiniapp && !!context.userAddress && typeof sdk !== 'undefined' && !!sdk.context;
}
