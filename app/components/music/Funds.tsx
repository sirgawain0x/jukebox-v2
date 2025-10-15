"use client";
import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { FundButton } from "@coinbase/onchainkit/fund";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";

type FundProps = {
  setActiveTab: (tab: string) => void;
};

export function Fund({ setActiveTab }: FundProps) {
  const { address } = useAccount();
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedAmount, setSelectedAmount] = useState(5);
  const [selectedAsset, setSelectedAsset] = useState("ETH");

  const assets = ["ETH", "USDC"];
  const amounts = [5, 10, 20];

  useEffect(() => {
    if (!address) return;
    setLoading(true);
    setError(null);
    setSessionToken(null);

    fetch("/api/onramp/session-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        address,
        assets: [selectedAsset],
      }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to fetch session token");
        }
        return res.json();
      })
      .then((data) => setSessionToken(data.token))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [address, selectedAmount, selectedAsset]);

  const onrampUrl = sessionToken
    ? `https://pay.coinbase.com/buy/select-asset?sessionToken=${sessionToken}&defaultNetwork=base&defaultAsset=${selectedAsset}&presetFiatAmount=${selectedAmount}&fiatCurrency=USD`
    : null;

  return (
    <div className="space-y-6 animate-fade-in">
      <Card title={`Buy ${selectedAsset} on Base`}>
        {/* Asset Selection */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">Select Asset</h3>
          <div className="grid grid-cols-2 gap-2">
            {assets.map((asset) => (
              <Button
                key={asset}
                variant={selectedAsset === asset ? "primary" : "outline"}
                onClick={() => setSelectedAsset(asset)}
              >
                {asset}
              </Button>
            ))}
          </div>
        </div>

        {/* Amount Selection */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">Select Amount (USD)</h3>
          <div className="grid grid-cols-3 gap-2">
            {amounts.map((amount) => (
              <Button
                key={amount}
                variant={selectedAmount === amount ? "primary" : "outline"}
                onClick={() => setSelectedAmount(amount)}
              >
                ${amount}
              </Button>
            ))}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="py-8 text-center text-[var(--app-foreground-muted)]">
            Loading funding options...
          </div>
        )}

        {/* Fund Button */}
        {!loading && onrampUrl && (
          <div className="space-y-4">
            <FundButton
              className="w-full"
              fundingUrl={onrampUrl}
              openIn="tab"
              disabled={!address}
            />
          </div>
        )}

        <Button
          className="mt-4"
          variant="outline"
          onClick={() => setActiveTab("home")}
        >
          Back to Home
        </Button>
      </Card>
    </div>
  );
}
