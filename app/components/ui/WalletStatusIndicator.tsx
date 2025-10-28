"use client";

import React from 'react';
import { useWalletStatus } from '@/app/contexts/WalletContext';
import { 
  CheckCircle2, 
  Loader2, 
  AlertCircle, 
  RefreshCw,
  Wifi,
  WifiOff
} from "lucide-react";
import { cn } from '@/lib/utils';

interface WalletStatusIndicatorProps {
  className?: string;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'minimal' | 'detailed';
}

export function WalletStatusIndicator({ 
  className, 
  showText = true, 
  size = 'md',
  variant = 'default'
}: WalletStatusIndicatorProps) {
  const { status, hasError, error } = useWalletStatus();

  const getIcon = () => {
    switch (status) {
      case 'connected':
        return <CheckCircle2 className={cn("text-green-600", getSizeClasses())} />;
      case 'connecting':
      case 'reconnecting':
        return <Loader2 className={cn("text-blue-600 animate-spin", getSizeClasses())} />;
      case 'error':
        return <AlertCircle className={cn("text-red-600", getSizeClasses())} />;
      default:
        return <WifiOff className={cn("text-gray-400", getSizeClasses())} />;
    }
  };

  const getText = () => {
    switch (status) {
      case 'connected':
        return 'Connected';
      case 'connecting':
        return 'Connecting...';
      case 'reconnecting':
        return 'Reconnecting...';
      case 'error':
        return 'Error';
      default:
        return 'Disconnected';
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'w-4 h-4';
      case 'lg':
        return 'w-6 h-6';
      default:
        return 'w-5 h-5';
    }
  };

  const getTextSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'text-xs';
      case 'lg':
        return 'text-base';
      default:
        return 'text-sm';
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
        return 'text-gray-500';
    }
  };

  if (variant === 'minimal') {
    return (
      <div className={cn("flex items-center", className)}>
        {getIcon()}
      </div>
    );
  }

  if (variant === 'detailed') {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        {getIcon()}
        <div className="flex flex-col">
          <span className={cn("font-medium", getTextSizeClasses(), getStatusColor())}>
            {getText()}
          </span>
          {hasError && error && (
            <span className="text-xs text-red-600 truncate max-w-32">
              {error.message}
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {getIcon()}
      {showText && (
        <span className={cn("font-medium", getTextSizeClasses(), getStatusColor())}>
          {getText()}
        </span>
      )}
    </div>
  );
}

// Compact status indicator for headers/navbars
export function WalletStatusDot({ className }: { className?: string }) {
  const { status } = useWalletStatus();

  const getDotColor = () => {
    switch (status) {
      case 'connected':
        return 'bg-green-500';
      case 'connecting':
      case 'reconnecting':
        return 'bg-blue-500 animate-pulse';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-gray-400';
    }
  };

  return (
    <div 
      className={cn(
        "w-2 h-2 rounded-full",
        getDotColor(),
        className
      )}
      title={`Wallet ${status}`}
    />
  );
}

// Connection quality indicator
export function ConnectionQualityIndicator({ className }: { className?: string }) {
  const { isConnected, isReconnecting } = useWalletStatus();

  if (!isConnected) {
    return (
      <div className={cn("flex items-center gap-1 text-gray-400", className)}>
        <WifiOff className="w-4 h-4" />
        <span className="text-xs">Offline</span>
      </div>
    );
  }

  if (isReconnecting) {
    return (
      <div className={cn("flex items-center gap-1 text-yellow-600", className)}>
        <RefreshCw className="w-4 h-4 animate-spin" />
        <span className="text-xs">Reconnecting</span>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-1 text-green-600", className)}>
      <Wifi className="w-4 h-4" />
      <span className="text-xs">Online</span>
    </div>
  );
}
