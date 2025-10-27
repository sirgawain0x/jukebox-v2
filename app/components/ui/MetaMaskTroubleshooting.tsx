"use client";

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  AlertCircle, 
  CheckCircle2, 
  ExternalLink, 
  RefreshCw,
  Settings,
  Shield,
  Wifi
} from 'lucide-react';

interface TroubleshootingStep {
  title: string;
  description: string;
  action: string;
  icon: React.ReactElement;
  href?: string;
  onClick?: () => void;
}

interface MetaMaskTroubleshootingProps {
  error?: Error | null;
  onRetry?: () => void;
  className?: string;
}

export function MetaMaskTroubleshooting({ 
  error, 
  onRetry, 
  className 
}: MetaMaskTroubleshootingProps) {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const getErrorType = () => {
    if (!error) return 'unknown';
    
    const message = error.message.toLowerCase();
    
    if (message.includes('user rejected')) return 'user-rejected';
    if (message.includes('no provider')) return 'no-provider';
    if (message.includes('unsupported chain')) return 'unsupported-chain';
    if (message.includes('already processing')) return 'already-processing';
    if (message.includes('chrome-extension://nkbihfbeogaeaoehlefnkodbefgpgknn')) return 'metamask-error';
    
    return 'unknown';
  };

  const errorType = getErrorType();

  const troubleshootingSteps: Record<string, TroubleshootingStep[]> = {
    'no-provider': [
      {
        title: 'Install MetaMask Extension',
        description: 'Download and install MetaMask from the official website',
        action: 'Visit MetaMask.io',
        icon: <ExternalLink className="w-4 h-4" />,
        href: 'https://metamask.io/download/'
      },
      {
        title: 'Enable Extension',
        description: 'Make sure MetaMask is enabled in your browser extensions',
        action: 'Check Extensions',
        icon: <Settings className="w-4 h-4" />
      }
    ],
    'unsupported-chain': [
      {
        title: 'Switch to Base Network',
        description: 'Add Base network to MetaMask and switch to it',
        action: 'Add Base Network',
        icon: <Wifi className="w-4 h-4" />,
        href: 'https://docs.base.org/tools/network-faucets'
      },
      {
        title: 'Check Network Settings',
        description: 'Verify you&apos;re connected to the correct network',
        action: 'Open MetaMask',
        icon: <Settings className="w-4 h-4" />
      }
    ],
    'already-processing': [
      {
        title: 'Wait for Current Request',
        description: 'A connection request is already in progress',
        action: 'Check MetaMask',
        icon: <RefreshCw className="w-4 h-4" />
      },
      {
        title: 'Refresh Page',
        description: 'If the issue persists, refresh the page',
        action: 'Refresh Page',
        icon: <RefreshCw className="w-4 h-4" />,
        onClick: () => window.location.reload()
      }
    ],
    'metamask-error': [
      {
        title: 'Refresh the Page',
        description: 'This error usually resolves with a page refresh',
        action: 'Refresh Page',
        icon: <RefreshCw className="w-4 h-4" />,
        onClick: () => window.location.reload()
      },
      {
        title: 'Restart MetaMask',
        description: 'Close and reopen MetaMask extension',
        action: 'Restart Extension',
        icon: <Settings className="w-4 h-4" />
      }
    ],
    'user-rejected': [
      {
        title: 'Try Again',
        description: 'Click connect and approve the connection in MetaMask',
        action: 'Connect Again',
        icon: <CheckCircle2 className="w-4 h-4" />,
        onClick: onRetry
      }
    ]
  };

  const steps = troubleshootingSteps[errorType as keyof typeof troubleshootingSteps] || [
    {
      title: 'Check MetaMask Status',
      description: 'Make sure MetaMask is installed and unlocked',
      action: 'Open MetaMask',
      icon: <Shield className="w-4 h-4" />
    },
    {
      title: 'Refresh Page',
      description: 'Try refreshing the page and connecting again',
      action: 'Refresh Page',
      icon: <RefreshCw className="w-4 h-4" />,
      onClick: () => window.location.reload()
    }
  ];

  const getErrorTitle = () => {
    switch (errorType) {
      case 'no-provider':
        return 'MetaMask Not Found';
      case 'unsupported-chain':
        return 'Wrong Network';
      case 'already-processing':
        return 'Connection In Progress';
      case 'metamask-error':
        return 'MetaMask Error';
      case 'user-rejected':
        return 'Connection Cancelled';
      default:
        return 'Connection Error';
    }
  };

  const getErrorDescription = () => {
    switch (errorType) {
      case 'no-provider':
        return 'MetaMask extension is not installed or not detected.';
      case 'unsupported-chain':
        return 'Please switch to Base network in MetaMask.';
      case 'already-processing':
        return 'A connection request is already in progress.';
      case 'metamask-error':
        return 'MetaMask encountered an error. Try refreshing the page.';
      case 'user-rejected':
        return 'You cancelled the connection request.';
      default:
        return 'An error occurred while connecting to MetaMask.';
    }
  };

  return (
    <Card className={`p-4 ${className}`}>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <div>
            <h3 className="font-semibold text-red-800">{getErrorTitle()}</h3>
            <p className="text-sm text-red-700">{getErrorDescription()}</p>
          </div>
        </div>

        <div className="space-y-2">
          {steps.map((step, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                {step.icon}
                <div>
                  <div className="font-medium text-sm">{step.title}</div>
                  <div className="text-xs text-gray-600">{step.description}</div>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={step.onClick}
                className="text-xs"
              >
                {step.action}
                {step.href && <ExternalLink className="w-3 h-3 ml-1" />}
              </Button>
            </div>
          ))}
        </div>

        {/* Additional Help Section */}
        <div className="border-t pt-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpandedSection(expandedSection === 'help' ? null : 'help')}
            className="w-full justify-between"
          >
            <span>Need More Help?</span>
            <span className="text-xs text-gray-500">
              {expandedSection === 'help' ? 'Hide' : 'Show'}
            </span>
          </Button>
          
          {expandedSection === 'help' && (
            <div className="mt-3 space-y-2 text-sm text-gray-600">
              <div className="flex items-start gap-2">
                <span className="text-blue-500 mt-0.5">•</span>
                <span>Make sure MetaMask is unlocked and you&apos;re on the correct account</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-blue-500 mt-0.5">•</span>
                <span>Try disconnecting and reconnecting MetaMask</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-blue-500 mt-0.5">•</span>
                <span>Clear browser cache and cookies if issues persist</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-blue-500 mt-0.5">•</span>
                <span>Try using a different browser or incognito mode</span>
              </div>
            </div>
          )}
        </div>

        {/* Quick Retry Button */}
        {onRetry && (
          <div className="flex gap-2 pt-2">
            <Button
              onClick={onRetry}
              variant="outline"
              className="flex-1"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
            <Button
              onClick={() => window.location.reload()}
              variant="default"
              className="flex-1"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh Page
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}
