"use client";

import React from 'react';
import { Card } from '@/components/ui/card';
import { WalletConnection } from '@/app/components/ui/WalletConnection';
import { WalletStatusIndicator, WalletStatusDot, ConnectionQualityIndicator } from '@/app/components/ui/WalletStatusIndicator';
import { useWallet, useWalletStatus, useWalletConnectors } from '@/app/contexts/WalletContext';
import { WalletErrorBoundary } from '@/app/components/ui/WalletErrorBoundary';

/**
 * Comprehensive example showing all the new wallet connection features
 * This component demonstrates the enhanced wallet connection system
 */
export function WalletConnectionExample() {
  const { address, chainName, connectorName, isConnected } = useWallet();
  const { status, hasError } = useWalletStatus();
  const { available, hasAvailable } = useWalletConnectors();

  return (
    <div className="space-y-6 p-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Enhanced Wallet Connection System
        </h2>
        <p className="text-gray-600">
          A comprehensive wallet connection solution with better UX, error handling, and status management
        </p>
      </div>

      {/* Status Overview */}
      <Card className="p-4">
        <h3 className="font-semibold mb-4">Connection Status Overview</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <WalletStatusIndicator variant="detailed" />
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className="text-sm font-medium">Status Dot:</span>
              <WalletStatusDot />
            </div>
            <ConnectionQualityIndicator />
          </div>
          <div className="text-center">
            <div className="text-sm text-gray-600">
              <div>Available: {available.length}</div>
            </div>
          </div>
        </div>
      </Card>

      {/* Main Wallet Connection Component */}
      <WalletErrorBoundary>
        <WalletConnection showDetails={true} />
      </WalletErrorBoundary>

      {/* Connection Details */}
      {isConnected && (
        <Card className="p-4">
          <h3 className="font-semibold mb-4">Connection Details</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Address:</span>
              <span className="font-mono">{address}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Network:</span>
              <span>{chainName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Wallet:</span>
              <span>{connectorName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Status:</span>
              <span className="capitalize">{status}</span>
            </div>
          </div>
        </Card>
      )}

      {/* Available Connectors */}
      {hasAvailable && (
        <Card className="p-4">
          <h3 className="font-semibold mb-4">Available Wallets</h3>
          <div className="space-y-2">
            {available.map((connector) => (
              <div key={connector.uid} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <span className="font-medium">{connector.name}</span>
                <span className="text-sm text-green-600">Ready</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Error States */}
      {hasError && (
        <Card className="p-4 border-red-200 bg-red-50">
          <h3 className="font-semibold text-red-800 mb-2">Connection Issues</h3>
          <p className="text-sm text-red-700">
            Some wallet connectors are experiencing issues. Check your wallet extensions and try again.
          </p>
        </Card>
      )}

      {/* Usage Examples */}
      <Card className="p-4">
        <h3 className="font-semibold mb-4">Usage Examples</h3>
        <div className="space-y-4 text-sm">
          <div>
            <h4 className="font-medium mb-2">1. Basic Wallet Connection</h4>
            <pre className="bg-gray-100 p-2 rounded text-xs overflow-x-auto">
{`import { WalletConnection } from '@/app/components/ui/WalletConnection';

<WalletConnection showDetails={true} />`}
            </pre>
          </div>
          
          <div>
            <h4 className="font-medium mb-2">2. Status Indicator</h4>
            <pre className="bg-gray-100 p-2 rounded text-xs overflow-x-auto">
{`import { WalletStatusIndicator } from '@/app/components/ui/WalletStatusIndicator';

<WalletStatusIndicator variant="detailed" showText={true} />`}
            </pre>
          </div>
          
          <div>
            <h4 className="font-medium mb-2">3. Using Wallet Context</h4>
            <pre className="bg-gray-100 p-2 rounded text-xs overflow-x-auto">
{`import { useWallet, useWalletStatus } from '@/app/contexts/WalletContext';

function MyComponent() {
  const { address, isConnected, connect, disconnect } = useWallet();
  const { status, isConnecting, hasError } = useWalletStatus();
  
  return (
    <div>
      {isConnected ? (
        <p>Connected: {address}</p>
      ) : (
        <button onClick={() => connect(connector)}>
          Connect Wallet
        </button>
      )}
    </div>
  );
}`}
            </pre>
          </div>
          
          <div>
            <h4 className="font-medium mb-2">4. Error Boundary</h4>
            <pre className="bg-gray-100 p-2 rounded text-xs overflow-x-auto">
{`import { WalletErrorBoundary } from '@/app/components/ui/WalletErrorBoundary';

<WalletErrorBoundary>
  <YourWalletComponent />
</WalletErrorBoundary>`}
            </pre>
          </div>
        </div>
      </Card>

      {/* Features List */}
      <Card className="p-4">
        <h3 className="font-semibold mb-4">Enhanced Features</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <h4 className="font-medium mb-2">✅ Improved UX</h4>
            <ul className="space-y-1 text-gray-600">
              <li>• Loading states and animations</li>
              <li>• Real-time status indicators</li>
              <li>• Copy address functionality</li>
              <li>• Toast notifications</li>
              <li>• Connector-specific icons</li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-medium mb-2">✅ Better Error Handling</h4>
            <ul className="space-y-1 text-gray-600">
              <li>• Comprehensive error boundaries</li>
              <li>• Retry mechanisms</li>
              <li>• User-friendly error messages</li>
              <li>• Graceful fallbacks</li>
              <li>• Error recovery options</li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-medium mb-2">✅ Connector Management</h4>
            <ul className="space-y-1 text-gray-600">
              <li>• Automatic readiness checks</li>
              <li>• Periodic re-validation</li>
              <li>• Wallet event listening</li>
              <li>• Availability detection</li>
              <li>• Retry with backoff</li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-medium mb-2">✅ State Management</h4>
            <ul className="space-y-1 text-gray-600">
              <li>• Centralized wallet context</li>
              <li>• Connection persistence</li>
              <li>• Reconnection handling</li>
              <li>• Status synchronization</li>
              <li>• Type-safe interfaces</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}
