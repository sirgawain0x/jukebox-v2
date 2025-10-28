"use client";

import React from "react";
import { useWallet } from "@/app/contexts/WalletContext";
import { useFarcasterTransactions } from "@/app/utils/farcaster-transactions";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";

/**
 * Test component to verify Farcaster integration
 * This component shows the current wallet context and allows testing transactions
 */
export function FarcasterTestComponent() {
  const wallet = useWallet();
  const farcasterTransactions = useFarcasterTransactions();

  const handleTestTransaction = async () => {
    if (!farcasterTransactions.canUseFarcaster) {
      alert("Not in Farcaster environment - cannot test transactions");
      return;
    }

    try {
      // Test with a small amount to a test address
      const testTransaction = farcasterTransactions.createTipTransaction(
        "0x0000000000000000000000000000000000000000", // Test address
        "1000000000000000" // 0.001 ETH in wei
      );

      const result = await farcasterTransactions.sendTransaction(testTransaction);
      
      if (result.success) {
        alert(`✅ Transaction successful! Hash: ${result.hash}`);
      } else {
        alert(`❌ Transaction failed: ${result.error}`);
      }
    } catch (error) {
      alert(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <Card title="🧪 Farcaster Integration Test">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="space-y-2">
            <div className="font-medium">Wallet Status:</div>
            <div>Connected: {wallet.isConnected ? '✅' : '❌'}</div>
            <div>Address: {wallet.address || 'None'}</div>
            <div>Connector: {wallet.connectorName || 'None'}</div>
          </div>
          
          <div className="space-y-2">
            <div className="font-medium">Farcaster Context:</div>
            <div>In Farcaster: {wallet.isInFarcaster ? '✅' : '❌'}</div>
            <div>Is Miniapp: {wallet.isMiniapp ? '✅' : '❌'}</div>
            <div>Is Frame: {wallet.isFrame ? '✅' : '❌'}</div>
            <div>Use Farcaster: {wallet.shouldUseFarcasterWallet ? '✅' : '❌'}</div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="font-medium">Farcaster User Info:</div>
          <div>FID: {wallet.farcasterUserFid || 'None'}</div>
          <div>Address: {wallet.farcasterUserAddress || 'None'}</div>
        </div>

        <div className="space-y-2">
          <div className="font-medium">Transaction Capabilities:</div>
          <div>Can Use Farcaster: {farcasterTransactions.canUseFarcaster ? '✅' : '❌'}</div>
          <div>User Address: {farcasterTransactions.userAddress || 'None'}</div>
        </div>

        <div className="pt-4 border-t">
          <Button
            onClick={handleTestTransaction}
            disabled={!farcasterTransactions.canUseFarcaster}
            className="w-full"
          >
            {farcasterTransactions.canUseFarcaster 
              ? '🧪 Test Farcaster Transaction' 
              : '❌ Not Available (Not in Farcaster)'
            }
          </Button>
        </div>

        <div className="text-xs text-gray-600 bg-gray-50 p-3 rounded">
          <div className="font-medium mb-2">How to test:</div>
          <ol className="list-decimal list-inside space-y-1">
            <li>Open this app in Warpcast or another Farcaster client</li>
            <li>Look for &quot;In Farcaster: ✅&quot; and &quot;Is Miniapp: ✅&quot; above</li>
            <li>If both are true, click the test button</li>
            <li>Check the browser console for detailed logs</li>
          </ol>
        </div>
      </div>
    </Card>
  );
}
