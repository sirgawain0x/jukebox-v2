"use client";

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useWallet, useWalletStatus, useWalletConnectors } from '@/app/contexts/WalletContext';
import { 
  Wallet, 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  Copy,
  ExternalLink as ExternalLinkIcon
} from "lucide-react";
import { MetaMaskTroubleshooting } from './MetaMaskTroubleshooting';
import { useToast } from '@/app/components/ui/ToastProvider';

interface Connector {
  uid: string;
  name: string;
  type: string;
}

interface WalletConnectionProps {
  className?: string;
  showDetails?: boolean;
}

export function WalletConnection({ className, showDetails = true }: WalletConnectionProps) {
  const { 
    address, 
    chainName, 
    connectorName, 
    connect, 
    disconnect, 
    error, 
    clearError 
  } = useWallet();
  
  const { status, isConnected, isConnecting, isReconnecting, hasError } = useWalletStatus();
  const { available, hasAvailable } = useWalletConnectors();
  const { showToast } = useToast();
  
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const handleConnect = async (connector: Connector) => {
    try {
      // Clear any previous errors
      clearError();
      
      // Add a small delay to prevent rapid clicking
      await new Promise(resolve => setTimeout(resolve, 100));
      
      await connect(connector);
      showToast({
        message: `Connected to ${connector.name}`,
        type: 'success'
      });
    } catch (_err) {
      console.error('Connection error:', _err);
      
      // Get more specific error message
      let errorMessage = `Failed to connect to ${connector.name}`;
      
      if (_err instanceof Error) {
        if (_err.message.includes('User rejected')) {
          errorMessage = 'Connection cancelled by user';
        } else if (_err.message.includes('Already processing')) {
          errorMessage = 'Connection already in progress. Please wait.';
        } else if (_err.message.includes('No provider')) {
          errorMessage = 'Wallet not found. Please install MetaMask or another wallet.';
        } else if (_err.message.includes('Unsupported chain')) {
          errorMessage = 'Unsupported network. Please switch to Base network.';
        } else if (_err.message.includes('chrome-extension://nkbihfbeogaeaoehlefnkodbefgpgknn')) {
          errorMessage = 'MetaMask connection error. Please refresh the page and try again.';
        } else {
          errorMessage = _err.message;
        }
      }
      
      showToast({
        message: errorMessage,
        type: 'error'
      });
    }
  };

  const handleDisconnect = async () => {
    try {
      setIsDisconnecting(true);
      await disconnect();
      showToast({
        message: 'Wallet disconnected',
        type: 'success'
      });
    } catch (_err) {
      console.error('Disconnect error:', _err);
      showToast({
        message: 'Failed to disconnect wallet',
        type: 'error'
      });
    } finally {
      setIsDisconnecting(false);
    }
  };

  const handleCopyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      showToast({
        message: 'Address copied to clipboard',
        type: 'success'
      });
    }
  };

  const handleRetry = () => {
    clearError();
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'connected':
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case 'connecting':
      case 'reconnecting':
        return <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Wallet className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'connected':
        return 'Connected';
      case 'connecting':
        return 'Connecting...';
      case 'reconnecting':
        return 'Reconnecting...';
      case 'error':
        return 'Connection Error';
      default:
        return 'Connect Wallet';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'connected':
        return 'text-green-600';
      case 'connecting':
      case 'reconnecting':
        return 'text-blue-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  if (isConnected) {
    return (
      <Card className={`p-4 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getStatusIcon()}
            <div className="min-w-0 flex-1">
              <div className="font-medium text-sm">
                {address?.slice(0, 6)}...{address?.slice(-4)}
              </div>
              {showDetails && (
                <div className="text-xs text-gray-600 space-y-1">
                  <div>{chainName || "Unknown Network"}</div>
                  <div>{connectorName || "Unknown Wallet"}</div>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {showDetails && (
              <Button
                onClick={handleCopyAddress}
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
              >
                <Copy className="w-4 h-4" />
              </Button>
            )}
            <Button 
              onClick={handleDisconnect} 
              variant="outline" 
              size="sm"
              disabled={isDisconnecting}
            >
              {isDisconnecting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Disconnect'
              )}
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className={`p-4 ${className}`}>
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-2">
          {getStatusIcon()}
          <span className={`font-medium ${getStatusColor()}`}>
            {getStatusText()}
          </span>
        </div>
        
        {hasError && (
          <MetaMaskTroubleshooting 
            error={error} 
            onRetry={handleRetry}
          />
        )}

        {!hasError && (
          <>
            <p className="text-sm text-gray-600">
              Connect your wallet to generate images with x402 payments
            </p>
            
            {hasAvailable ? (
              <div className="space-y-2">
                {available.map((connector) => (
                  <WalletConnectorButton
                    key={connector.uid}
                    connector={connector}
                    onClick={() => handleConnect(connector)}
                    disabled={isConnecting || isReconnecting}
                  />
                ))}
              </div>
            ) : (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <div className="flex items-center gap-2 text-yellow-800 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  <span>No wallet extensions detected</span>
                </div>
                <p className="text-xs text-yellow-700 mt-1">
                  Please install a wallet extension like MetaMask or Coinbase Wallet
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </Card>
  );
}

interface WalletConnectorButtonProps {
  connector: Connector;
  onClick: () => void;
  disabled?: boolean;
}

function WalletConnectorButton({ connector, onClick, disabled }: WalletConnectorButtonProps) {
  const [isReady, setIsReady] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  React.useEffect(() => {
    const checkConnector = async () => {
      try {
        setIsChecking(true);
        if (connector.type === 'injected') {
          // Check if injected wallet is available
          setIsReady(!!(window as Window & { ethereum?: unknown }).ethereum);
        } else {
          // For other connector types, assume they're ready
          setIsReady(true);
        }
      } catch {
        setIsReady(false);
      } finally {
        setIsChecking(false);
      }
    };

    checkConnector();
  }, [connector]);

  const getConnectorIcon = () => {
    switch (connector.name.toLowerCase()) {
      case 'metamask':
        return '🦊';
      case 'coinbase wallet':
        return '🔵';
      case 'walletconnect':
        return '🔗';
      default:
        return <ExternalLinkIcon className="w-4 h-4" />;
    }
  };

  return (
    <Button
      onClick={onClick}
      disabled={disabled || !isReady || isChecking}
      className="w-full justify-start"
      variant="outline"
    >
      {isChecking ? (
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      ) : (
        <span className="mr-2">{getConnectorIcon()}</span>
      )}
      <span className="flex-1 text-left">
        {isChecking ? 'Checking...' : `Connect ${connector.name}`}
      </span>
      {!isReady && !isChecking && (
        <span className="text-xs text-gray-500">Not available</span>
      )}
    </Button>
  );
}
