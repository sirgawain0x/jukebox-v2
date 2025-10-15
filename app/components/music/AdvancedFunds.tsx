"use client";
import { useState, useEffect, useCallback } from "react";
import { useAccount } from "wagmi";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Icon } from "../ui/Icon";
import { FundCard } from "@coinbase/onchainkit/fund";
import { GeneratedLinkModal } from "../ui/GeneratedLinkModal";
import { generateSessionToken } from "@/lib/session-token";
import {
  generateOnrampURL,
  getCurrencySymbol,
  getDefaultNetworkForAsset,
  getCompatibleNetworksForAsset,
  fetchCryptoPrices,
  PAYMENT_METHODS,
  PAYMENT_CURRENCIES,
  NETWORKS,
  COUNTRY_LIST,
  US_STATES,
} from "@/lib/onramp-utils";

type AdvancedFundsProps = {
  setActiveTab: (tab: string) => void;
  cdpProjectId?: string;
};

export function AdvancedFunds({
  setActiveTab,
  cdpProjectId,
}: AdvancedFundsProps) {
  const { address, isConnected } = useAccount();
  const [viewMode, setViewMode] = useState<"simple" | "advanced">("simple");
  const [selectedAsset, setSelectedAsset] = useState("USDC");
  const [amount, setAmount] = useState("10");
  const [selectedNetwork, setSelectedNetwork] = useState("base");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("CARD");
  const [selectedPaymentCurrency, setSelectedPaymentCurrency] = useState("USD");
  const [selectedCountry, setSelectedCountry] = useState("US");
  const [selectedState, setSelectedState] = useState("CA");
  const [enableGuestCheckout, setEnableGuestCheckout] = useState(true);
  const [useSecureInit, setUseSecureInit] = useState(true);
  const [isGeneratingToken, setIsGeneratingToken] = useState(false);
  const [generatedUrl, setGeneratedUrl] = useState("");
  const [showUrlModal, setShowUrlModal] = useState(false);
  const [cryptoPrices, setCryptoPrices] = useState<Record<string, number>>({});

  // Define supported assets with prices
  const assets = [
    { symbol: "USDC", name: "USD Coin", price: cryptoPrices["USDC"] || 1 },
    { symbol: "ETH", name: "Ethereum", price: cryptoPrices["ETH"] || 3500 },
    { symbol: "BTC", name: "Bitcoin", price: cryptoPrices["BTC"] || 67000 },
    { symbol: "USDT", name: "Tether", price: cryptoPrices["USDT"] || 1 },
    { symbol: "DAI", name: "Dai", price: cryptoPrices["DAI"] || 1 },
    {
      symbol: "WETH",
      name: "Wrapped Ethereum",
      price: cryptoPrices["WETH"] || 3500,
    },
  ];

  // Fetch cryptocurrency prices
  useEffect(() => {
    const getPrices = async () => {
      try {
        const prices = await fetchCryptoPrices();
        setCryptoPrices(prices);
      } catch (error) {
        console.error("Failed to fetch cryptocurrency prices:", error);
      }
    };

    if (viewMode === "advanced") {
      getPrices();
    }
  }, [viewMode]);

  // Update network when asset changes
  useEffect(() => {
    const compatibleNetworks = getCompatibleNetworksForAsset(selectedAsset);
    if (
      compatibleNetworks.length > 0 &&
      !compatibleNetworks.includes(selectedNetwork)
    ) {
      setSelectedNetwork(getDefaultNetworkForAsset(selectedAsset));
    }
  }, [selectedAsset, selectedNetwork]);

  // Generate session token
  const handleGenerateSessionToken = useCallback(async () => {
    if (!address) {
      alert("Please connect your wallet first");
      return null;
    }

    try {
      setIsGeneratingToken(true);

      const sessionToken = await generateSessionToken({
        addresses: [
          {
            address: address,
            blockchains: [selectedNetwork],
          },
        ],
        assets: [selectedAsset],
      });

      return sessionToken;
    } catch (error) {
      console.error("Error generating session token:", error);
      alert(
        "Session token generation failed. The transaction will proceed with standard authentication."
      );
      return null;
    } finally {
      setIsGeneratingToken(false);
    }
  }, [address, selectedNetwork, selectedAsset]);

  // Handle direct onramp
  const handleOnramp = useCallback(async () => {
    if (!isConnected || !address) {
      alert("Please connect your wallet first");
      return;
    }

    let sessionToken: string | undefined;

    if (useSecureInit) {
      const token = await handleGenerateSessionToken();
      if (token) {
        sessionToken = token;
      }
    }

    // Build addresses array
    const addresses = [
      {
        address: address,
        blockchains: [selectedNetwork],
      },
    ];

    // Build params for One-Click-Buy URL
    const params: import("@/lib/onramp-utils").OnrampURLParams = {
      appId: cdpProjectId,
      addresses,
      defaultAsset: selectedAsset,
      defaultPaymentMethod: selectedPaymentMethod,
      defaultNetwork: selectedNetwork,
      redirectUrl: window.location.origin + "/onramp",
      enableGuestCheckout,
      sessionToken,
      country: selectedCountry,
      state: selectedState,
    };

    if (selectedPaymentMethod === "CRYPTO_ACCOUNT") {
      params.presetCryptoAmount = amount;
    } else {
      params.presetFiatAmount = amount;
      params.fiatCurrency = selectedPaymentCurrency;
    }

    const url = generateOnrampURL(params);
    window.open(url, "_blank");
  }, [
    isConnected,
    address,
    useSecureInit,
    selectedAsset,
    amount,
    selectedNetwork,
    selectedPaymentMethod,
    selectedPaymentCurrency,
    enableGuestCheckout,
    selectedCountry,
    selectedState,
    handleGenerateSessionToken,
    cdpProjectId,
  ]);

  // Handle URL generation
  const handleGenerateUrl = useCallback(async () => {
    if (!address) {
      alert("Please connect your wallet first");
      return;
    }

    let sessionToken: string | undefined;

    if (useSecureInit) {
      const token = await handleGenerateSessionToken();
      if (token) {
        sessionToken = token;
      }
    }

    // Build addresses array
    const addresses = [
      {
        address: address,
        blockchains: [selectedNetwork],
      },
    ];

    // Build params for One-Click-Buy URL
    const params: import("@/lib/onramp-utils").OnrampURLParams = {
      appId: cdpProjectId,
      addresses,
      defaultAsset: selectedAsset,
      defaultPaymentMethod: selectedPaymentMethod,
      defaultNetwork: selectedNetwork,
      redirectUrl: window.location.origin + "/onramp",
      enableGuestCheckout,
      sessionToken,
      country: selectedCountry,
      state: selectedState,
    };

    if (selectedPaymentMethod === "CRYPTO_ACCOUNT") {
      params.presetCryptoAmount = amount;
    } else {
      params.presetFiatAmount = amount;
      params.fiatCurrency = selectedPaymentCurrency;
    }

    const url = generateOnrampURL(params);
    setGeneratedUrl(url);
    setShowUrlModal(true);
  }, [
    address,
    useSecureInit,
    selectedAsset,
    amount,
    selectedNetwork,
    selectedPaymentMethod,
    selectedPaymentCurrency,
    enableGuestCheckout,
    selectedCountry,
    selectedState,
    handleGenerateSessionToken,
    cdpProjectId,
  ]);

  const handleCopyUrl = useCallback(() => {
    navigator.clipboard.writeText(generatedUrl);
    alert("URL copied to clipboard!");
  }, [generatedUrl]);

  const handleOpenUrl = useCallback(() => {
    window.open(generatedUrl, "_blank");
  }, [generatedUrl]);

  return (
    <div className="space-y-6 animate-fade-in">
      <Card title="Add Funds to Your Wallet">
        {/* View Mode Toggle */}
        <div className="mb-6">
          <div className="flex space-x-2">
            <Button
              variant={viewMode === "simple" ? "primary" : "outline"}
              onClick={() => setViewMode("simple")}
              size="sm"
            >
              Simple
            </Button>
            <Button
              variant={viewMode === "advanced" ? "primary" : "outline"}
              onClick={() => setViewMode("advanced")}
              size="sm"
            >
              Advanced
            </Button>
          </div>
        </div>

        {viewMode === "simple" ? (
          /* Simple Mode - Original OnchainKit FundCard */
          <div>
            <FundCard
              assetSymbol="ETH"
              country="US"
              currency="USD"
              presetAmountInputs={["10", "20", "100"]}
            />
          </div>
        ) : (
          /* Advanced Mode - Custom Configuration */
          <div className="space-y-4">
            {/* Asset Selection */}
            <div>
              <label className="block text-sm font-medium mb-2">Asset</label>
              <select
                value={selectedAsset}
                onChange={(e) => setSelectedAsset(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg bg-white"
              >
                {assets.map((asset) => (
                  <option key={asset.symbol} value={asset.symbol}>
                    {asset.name} ({asset.symbol})
                  </option>
                ))}
              </select>
            </div>

            {/* Network Selection */}
            <div>
              <label className="block text-sm font-medium mb-2">Network</label>
              <select
                value={selectedNetwork}
                onChange={(e) => setSelectedNetwork(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg bg-white"
              >
                {NETWORKS.filter((network) =>
                  getCompatibleNetworksForAsset(selectedAsset).includes(
                    network.id
                  )
                ).map((network) => (
                  <option key={network.id} value={network.id}>
                    {network.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Amount Input */}
            <div>
              <label className="block text-sm font-medium mb-2">Amount</label>
              <div className="flex space-x-2 mb-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setAmount("10")}
                >
                  {getCurrencySymbol(selectedPaymentCurrency)}10
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setAmount("25")}
                >
                  {getCurrencySymbol(selectedPaymentCurrency)}25
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setAmount("50")}
                >
                  {getCurrencySymbol(selectedPaymentCurrency)}50
                </Button>
              </div>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg"
                placeholder="Enter amount"
              />
            </div>

            {/* Payment Currency */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Payment Currency
              </label>
              <select
                value={selectedPaymentCurrency}
                onChange={(e) => setSelectedPaymentCurrency(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg bg-white"
              >
                {PAYMENT_CURRENCIES.map((currency) => (
                  <option key={currency.code} value={currency.code}>
                    {currency.name} ({currency.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Country Selection */}
            <div>
              <label className="block text-sm font-medium mb-2">Country</label>
              <select
                value={selectedCountry}
                onChange={(e) => setSelectedCountry(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg bg-white"
              >
                {COUNTRY_LIST.map((country) => (
                  <option key={country.code} value={country.code}>
                    {country.name}
                  </option>
                ))}
              </select>
            </div>

            {/* State Selection (for US) */}
            {selectedCountry === "US" && (
              <div>
                <label className="block text-sm font-medium mb-2">State</label>
                <select
                  value={selectedState}
                  onChange={(e) => setSelectedState(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg bg-white"
                >
                  {US_STATES.map((state) => (
                    <option key={state.code} value={state.code}>
                      {state.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Payment Method */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Payment Method
              </label>
              <select
                value={selectedPaymentMethod}
                onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg bg-white"
              >
                {PAYMENT_METHODS.map((method) => (
                  <option key={method.id} value={method.id}>
                    {method.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Options */}
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={enableGuestCheckout}
                  onChange={(e) => setEnableGuestCheckout(e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm">Enable Guest Checkout</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={useSecureInit}
                  onChange={(e) => setUseSecureInit(e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm">Use Secure Session Token</span>
              </label>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 flex-wrap">
              <Button
                onClick={handleOnramp}
                disabled={!isConnected || isGeneratingToken}
                icon={<Icon name="arrow-right" size="sm" />}
              >
                {isGeneratingToken ? "Generating..." : "Buy Crypto Now"}
              </Button>
              <Button
                onClick={handleGenerateUrl}
                disabled={!isConnected || isGeneratingToken}
                variant="outline"
                icon={<Icon name="plus" size="sm" />}
              >
                Generate URL
              </Button>
            </div>
          </div>
        )}

        {/* Back Button */}
        <Button
          className="mt-4"
          variant="ghost"
          onClick={() => setActiveTab("home")}
        >
          Back to Home
        </Button>
      </Card>

      {/* URL Modal */}
      {showUrlModal && (
        <GeneratedLinkModal
          title="Generated Onramp URL"
          url={generatedUrl}
          onClose={() => setShowUrlModal(false)}
          onCopy={handleCopyUrl}
          onOpen={handleOpenUrl}
        />
      )}
    </div>
  );
}
