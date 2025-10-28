"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAccount, useConnect, useDisconnect, Connector } from 'wagmi';
import { useOnchainKit } from '@coinbase/onchainkit';
import { useFarcasterContext, supportsFarcasterWallet, getFarcasterWalletAddress } from '@/app/utils/farcaster-context';

interface WalletContextType {
  // Connection state
  isConnected: boolean;
  isConnecting: boolean;
  isReconnecting: boolean;
  
  // Account info
  address: `0x${string}` | undefined;
  chainId: number | undefined;
  chainName: string | undefined;
  
  // Connector info
  connector: Connector | undefined;
  connectorName: string | undefined;
  
  // Available connectors
  connectors: readonly Connector[];
  availableConnectors: readonly Connector[];
  
  // Actions
  connect: (connector: Connector) => Promise<void>;
  disconnect: () => Promise<void>;
  
  // Error handling
  error: Error | null;
  clearError: () => void;
  
  // Connection status
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';
  
  // Farcaster-specific properties
  isInFarcaster: boolean;
  isMiniapp: boolean;
  isFrame: boolean;
  farcasterUserFid?: number;
  farcasterUserAddress?: string;
  shouldUseFarcasterWallet: boolean;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

interface WalletProviderProps {
  children: ReactNode;
}

export function WalletProvider({ children }: WalletProviderProps) {
  const { address, isConnected, chain, connector } = useAccount();
  const { connectors, connect, isPending: isConnecting, error: connectError } = useConnect();
  const { disconnect } = useDisconnect();
  
  // Use OnchainKit's hook for better compatibility
  const _onchainKit = useOnchainKit();
  
  // Get Farcaster context
  const farcasterContext = useFarcasterContext();
  
  const [error, setError] = useState<Error | null>(null);
  const [isReconnecting, setIsReconnecting] = useState(false);

  // Determine if we should use Farcaster wallet
  const shouldUseFarcasterWallet = supportsFarcasterWallet() && farcasterContext.isMiniapp;
  
  // Get the effective address (Farcaster address if in miniapp, otherwise wagmi address)
  const effectiveAddress = shouldUseFarcasterWallet 
    ? (getFarcasterWalletAddress() as `0x${string}` | undefined)
    : address;
  
  // Determine effective connection state
  const effectiveIsConnected = shouldUseFarcasterWallet 
    ? !!farcasterContext.userAddress
    : isConnected;

  // Determine connection status
  const connectionStatus: WalletContextType['connectionStatus'] = React.useMemo(() => {
    if (error || connectError) return 'error';
    if (isReconnecting) return 'reconnecting';
    if (isConnecting) return 'connecting';
    if (effectiveIsConnected) return 'connected';
    return 'disconnected';
  }, [error, connectError, isReconnecting, isConnecting, effectiveIsConnected]);

  // Filter available connectors (those that are ready)
  const availableConnectors = React.useMemo(() => {
    return connectors.filter(connector => {
      try {
        // Check if connector is ready
        if (connector.type === 'injected') {
          return typeof window !== 'undefined' && !!(window as Window & { ethereum?: unknown }).ethereum;
        }
        return true; // Other connector types are generally always available
      } catch {
        return false;
      }
    });
  }, [connectors]);

  // Enhanced connect function with better error handling
  const handleConnect = async (connector: Connector) => {
    try {
      setError(null);
      
      // If we're in a Farcaster miniapp, we don't need to connect externally
      if (shouldUseFarcasterWallet) {
        console.log('Using Farcaster wallet, no external connection needed');
        return;
      }
      
      // Add a small delay to prevent rapid clicking issues
      await new Promise(resolve => setTimeout(resolve, 100));
      
      await connect({ connector });
    } catch (err) {
      console.error('Connection error:', err);
      
      // Provide more specific error messages
      let errorMessage = 'Failed to connect wallet';
      
      if (err instanceof Error) {
        if (err.message.includes('User rejected')) {
          errorMessage = 'Connection cancelled by user';
        } else if (err.message.includes('Already processing')) {
          errorMessage = 'Connection already in progress';
        } else if (err.message.includes('No provider')) {
          errorMessage = 'Wallet not found. Please install MetaMask or another wallet.';
        } else if (err.message.includes('Unsupported chain')) {
          errorMessage = 'Unsupported network. Please switch to Base network.';
        } else {
          errorMessage = err.message;
        }
      }
      
      const error = new Error(errorMessage);
      setError(error);
      throw error;
    }
  };

  // Enhanced disconnect function
  const handleDisconnect = async () => {
    try {
      setError(null);
      
      // If we're in a Farcaster miniapp, we can't disconnect externally
      if (shouldUseFarcasterWallet) {
        console.log('Cannot disconnect Farcaster wallet from within miniapp');
        return;
      }
      
      await disconnect();
    } catch (err) {
      console.error('Disconnect error:', err);
      const error = err instanceof Error ? err : new Error('Failed to disconnect wallet');
      setError(error);
      throw error;
    }
  };

  // Clear error function
  const clearError = () => {
    setError(null);
  };

  // Monitor reconnection attempts
  useEffect(() => {
    if (!isConnected && !isConnecting) {
      setIsReconnecting(true);
      const timer = setTimeout(() => {
        setIsReconnecting(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isConnected, isConnecting]);

  // Clear error when connection succeeds
  useEffect(() => {
    if (isConnected) {
      setError(null);
    }
  }, [isConnected]);

  const contextValue: WalletContextType = {
    // Connection state
    isConnected: effectiveIsConnected,
    isConnecting,
    isReconnecting,
    
    // Account info
    address: effectiveAddress,
    chainId: chain?.id,
    chainName: chain?.name,
    
    // Connector info
    connector,
    connectorName: connector?.name,
    
    // Available connectors
    connectors,
    availableConnectors,
    
    // Actions
    connect: handleConnect,
    disconnect: handleDisconnect,
    
    // Error handling
    error: error || connectError,
    clearError,
    
    // Connection status
    connectionStatus,
    
    // Farcaster-specific properties
    isInFarcaster: farcasterContext.isInFarcaster,
    isMiniapp: farcasterContext.isMiniapp,
    isFrame: farcasterContext.isFrame,
    farcasterUserFid: farcasterContext.userFid,
    farcasterUserAddress: farcasterContext.userAddress,
    shouldUseFarcasterWallet,
  };

  return (
    <WalletContext.Provider value={contextValue}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}

// Hook for wallet connection status
export function useWalletStatus() {
  const { connectionStatus, isConnected, isConnecting, isReconnecting, error, shouldUseFarcasterWallet } = useWallet();
  
  return {
    status: connectionStatus,
    isConnected,
    isConnecting,
    isReconnecting,
    hasError: !!error,
    error,
    isFarcasterWallet: shouldUseFarcasterWallet,
  };
}

// Hook for available connectors
export function useWalletConnectors() {
  const { connectors, availableConnectors } = useWallet();
  
  return {
    all: connectors,
    available: availableConnectors,
    hasAvailable: availableConnectors.length > 0,
  };
}