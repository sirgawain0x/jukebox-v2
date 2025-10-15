"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { Wallet, ExternalLink } from "lucide-react";

export function WalletConnection() {
  const { address, isConnected, chain } = useAccount();
  const { connectors, connect } = useConnect();
  const { disconnect } = useDisconnect();

  if (isConnected) {
    return (
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Wallet className="w-5 h-5 text-green-600" />
            <div>
              <div className="font-medium">
                {address?.slice(0, 6)}...{address?.slice(-4)}
              </div>
              <div className="text-sm text-gray-600">
                {chain?.name || "Unknown Network"}
              </div>
            </div>
          </div>
          <Button onClick={() => disconnect()} variant="outline" size="sm">
            Disconnect
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-2">
          <Wallet className="w-5 h-5 text-gray-600" />
          <span className="font-medium">Connect Wallet</span>
        </div>
        <p className="text-sm text-gray-600">
          Connect your wallet to generate images with x402 payments
        </p>
        <div className="space-y-2">
          {connectors.map((connector) => (
            <Button
              key={connector.id}
              onClick={() => connect({ connector })}
              className="w-full"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Connect {connector.name}
            </Button>
          ))}
        </div>
      </div>
    </Card>
  );
}
