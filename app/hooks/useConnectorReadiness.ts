"use client";

import { useState, useEffect, useCallback } from 'react';
import { Connector } from 'wagmi/connectors';

interface ConnectorStatus {
  connector: Connector;
  isReady: boolean;
  isChecking: boolean;
  error: Error | null;
  lastChecked: number;
}

interface UseConnectorReadinessOptions {
  checkInterval?: number; // ms
  retryAttempts?: number;
  retryDelay?: number; // ms
}

// MetaMask-specific error handling
function getMetaMaskError(error: unknown): string {
  if (!error) return 'Unknown error';
  
  const errorMessage = (error as Error).message || String(error);
  
  // Common MetaMask error patterns
  if (errorMessage.includes('User rejected')) {
    return 'Connection cancelled by user';
  }
  
  if (errorMessage.includes('Already processing')) {
    return 'Connection already in progress. Please wait.';
  }
  
  if (errorMessage.includes('No provider')) {
    return 'MetaMask not found. Please install MetaMask extension.';
  }
  
  if (errorMessage.includes('Unsupported chain')) {
    return 'Unsupported network. Please switch to Base network in MetaMask.';
  }
  
  if (errorMessage.includes('Request of type')) {
    return 'MetaMask request failed. Please try again.';
  }
  
  if (errorMessage.includes('chrome-extension://nkbihfbeogaeaoehlefnkodbefgpgknn')) {
    return 'MetaMask connection error. Please refresh the page and try again.';
  }
  
  return errorMessage;
}

export function useConnectorReadiness(
  connectors: Connector[],
  options: UseConnectorReadinessOptions = {}
) {
  const {
    checkInterval = 5000,
    retryAttempts = 3,
    retryDelay = 1000,
  } = options;

  const [connectorStatuses, setConnectorStatuses] = useState<Map<string, ConnectorStatus>>(new Map());
  const [isInitialized, setIsInitialized] = useState(false);

  const checkConnector = useCallback(async (connector: Connector): Promise<boolean> => {
    try {
      switch (connector.type) {
        case 'injected':
          // Check if injected wallet is available
          if (typeof window === 'undefined') return false;
          
          const ethereum = (window as Window & { ethereum?: unknown }).ethereum;
          if (!ethereum) return false;

          // Additional checks for specific wallets
          if (connector.name.toLowerCase().includes('metamask')) {
            // Check if MetaMask is specifically available
            return !!(ethereum.isMetaMask && !ethereum.isCoinbaseWallet);
          }
          
          if (connector.name.toLowerCase().includes('coinbase')) {
            return !!(ethereum.isCoinbaseWallet || ethereum.isCoinbaseBrowser);
          }

          // Generic injected wallet check
          return !!ethereum;

        case 'walletConnect':
          // WalletConnect connectors are generally always available
          return true;

        case 'safe':
          // Safe connectors check for Safe app context
          return !!(window as Window & { parent?: Window }).parent !== window;

        default:
          // For unknown connector types, assume they're ready
          return true;
      }
    } catch (error) {
      console.warn(`Failed to check connector ${connector.name}:`, error);
      return false;
    }
  }, []);

  const updateConnectorStatus = useCallback(async (connector: Connector) => {
    const connectorId = connector.uid;
    
    setConnectorStatuses(prev => {
      const updated = new Map(prev);
      const current = updated.get(connectorId);
      
      if (current?.isChecking) return prev; // Skip if already checking
      
      updated.set(connectorId, {
        connector,
        isReady: current?.isReady || false,
        isChecking: true,
        error: null,
        lastChecked: Date.now(),
      });
      
      return updated;
    });

    let attempts = 0;
    let isReady = false;
    let error: Error | null = null;

    while (attempts < retryAttempts && !isReady) {
      try {
        isReady = await checkConnector(connector);
        if (isReady) break;
      } catch (err) {
        const errorMessage = getMetaMaskError(err);
        error = new Error(errorMessage);
      }
      
      attempts++;
      if (attempts < retryAttempts) {
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }

    setConnectorStatuses(prev => {
      const updated = new Map(prev);
      updated.set(connectorId, {
        connector,
        isReady,
        isChecking: false,
        error,
        lastChecked: Date.now(),
      });
      return updated;
    });
  }, [checkConnector, retryAttempts, retryDelay]);

  // Initialize connector statuses
  useEffect(() => {
    if (connectors.length === 0) return;

    const initializeConnectors = async () => {
      setIsInitialized(false);
      
      // Check all connectors in parallel
      await Promise.all(
        connectors.map(connector => updateConnectorStatus(connector))
      );
      
      setIsInitialized(true);
    };

    initializeConnectors();
  }, [connectors, updateConnectorStatus]);

  // Set up periodic re-checking
  useEffect(() => {
    if (!isInitialized || connectors.length === 0) return;

    const interval = setInterval(() => {
      connectors.forEach(connector => {
        const status = connectorStatuses.get(connector.uid);
        const timeSinceLastCheck = Date.now() - (status?.lastChecked || 0);
        
        // Only re-check if enough time has passed
        if (timeSinceLastCheck > checkInterval) {
          updateConnectorStatus(connector);
        }
      });
    }, checkInterval);

    return () => clearInterval(interval);
  }, [connectors, connectorStatuses, checkInterval, updateConnectorStatus, isInitialized]);

  // Listen for wallet events
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleWalletChange = () => {
      // Re-check all injected connectors when wallet changes
      connectors
        .filter(connector => connector.type === 'injected')
        .forEach(connector => updateConnectorStatus(connector));
    };

    // Listen for wallet provider changes
    window.addEventListener('ethereum#initialized', handleWalletChange);
    
    // Listen for account changes
    const ethereum = (window as Window & { ethereum?: { on: (event: string, callback: () => void) => void; removeListener: (event: string, callback: () => void) => void } }).ethereum;
    if (ethereum) {
      ethereum.on('accountsChanged', handleWalletChange);
      ethereum.on('chainChanged', handleWalletChange);
    }

    return () => {
      window.removeEventListener('ethereum#initialized', handleWalletChange);
      if (ethereum) {
        ethereum.removeListener('accountsChanged', handleWalletChange);
        ethereum.removeListener('chainChanged', handleWalletChange);
      }
    };
  }, [connectors, updateConnectorStatus]);

  const getConnectorStatus = useCallback((connector: Connector) => {
    return connectorStatuses.get(connector.uid) || {
      connector,
      isReady: false,
      isChecking: false,
      error: null,
      lastChecked: 0,
    };
  }, [connectorStatuses]);

  const getReadyConnectors = useCallback(() => {
    return connectors.filter(connector => {
      const status = getConnectorStatus(connector);
      return status.isReady && !status.isChecking;
    });
  }, [connectors, getConnectorStatus]);

  const getCheckingConnectors = useCallback(() => {
    return connectors.filter(connector => {
      const status = getConnectorStatus(connector);
      return status.isChecking;
    });
  }, [connectors, getConnectorStatus]);

  const getErrorConnectors = useCallback(() => {
    return connectors.filter(connector => {
      const status = getConnectorStatus(connector);
      return status.error !== null;
    });
  }, [connectors, getConnectorStatus]);

  const refreshConnector = useCallback((connector: Connector) => {
    updateConnectorStatus(connector);
  }, [updateConnectorStatus]);

  const refreshAllConnectors = useCallback(() => {
    connectors.forEach(connector => updateConnectorStatus(connector));
  }, [connectors, updateConnectorStatus]);

  return {
    // Status
    isInitialized,
    connectorStatuses: Array.from(connectorStatuses.values()),
    
    // Connector lists
    readyConnectors: getReadyConnectors(),
    checkingConnectors: getCheckingConnectors(),
    errorConnectors: getErrorConnectors(),
    
    // Utilities
    getConnectorStatus,
    refreshConnector,
    refreshAllConnectors,
    
    // Computed values
    hasReadyConnectors: getReadyConnectors().length > 0,
    hasCheckingConnectors: getCheckingConnectors().length > 0,
    hasErrorConnectors: getErrorConnectors().length > 0,
  };
}

// Hook for individual connector status
export function useConnectorStatus(connector: Connector) {
  const [status, setStatus] = useState<ConnectorStatus>({
    connector,
    isReady: false,
    isChecking: true,
    error: null,
    lastChecked: 0,
  });

  const checkConnector = useCallback(async () => {
    setStatus(prev => ({ ...prev, isChecking: true, error: null }));

    try {
      let isReady = false;
      
      switch (connector.type) {
        case 'injected':
          if (typeof window !== 'undefined') {
            const ethereum = (window as Window & { ethereum?: unknown }).ethereum;
            isReady = !!ethereum;
          }
          break;
        case 'walletConnect':
        case 'safe':
        default:
          isReady = true;
          break;
      }

      setStatus(prev => ({
        ...prev,
        isReady,
        isChecking: false,
        lastChecked: Date.now(),
      }));
    } catch (error) {
      const errorMessage = getMetaMaskError(error);
      setStatus(prev => ({
        ...prev,
        isChecking: false,
        error: new Error(errorMessage),
        lastChecked: Date.now(),
      }));
    }
  }, [connector]);

  useEffect(() => {
    checkConnector();
  }, [checkConnector]);

  return {
    ...status,
    refresh: checkConnector,
  };
}