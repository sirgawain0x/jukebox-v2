"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import {
  Zap,
  Loader2,
  Download,
  AlertCircle,
  Sparkles,
  Bot,
} from "lucide-react";
import { useAccount, useWalletClient, useBalance } from "wagmi";
import { wrapFetchWithPayment } from "x402-fetch";

interface AIImageGenerationProps {
  className?: string;
}

type AIProvider = "livepeer" | "gemini";

export function AIImageGeneration({ className }: AIImageGenerationProps) {
  const [prompt, setPrompt] = useState("");
  const [selectedProvider, setSelectedProvider] =
    useState<AIProvider>("gemini");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [textResponse, setTextResponse] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<string>("");
  const [imageLoadError, setImageLoadError] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);

  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();

  // Check USDC balance on Base network
  const { data: usdcBalance } = useBalance({
    address: address,
    token: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // USDC on Base
    chainId: 8453, // Base mainnet
  });

  const providers = {
    livepeer: {
      name: "Livepeer Studio",
      icon: Sparkles, // or another Lucide icon, not Image
      description: "High-quality image generation with advanced controls",
      endpoint: "/api/livepeer/text-to-image",
      color: "bg-blue-500",
    },
    gemini: {
      name: "Google Gemini",
      icon: Sparkles,
      description: "Advanced AI with natural language understanding",
      endpoint: "/api/gemini/text-to-image",
      color: "bg-purple-500",
    },
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError("Please enter a prompt");
      return;
    }

    if (!isConnected || !address) {
      setError("Please connect your wallet first");
      return;
    }

    if (!walletClient) {
      setError("Wallet client not available");
      return;
    }

    // Check if connected to Base network
    if (walletClient.chain.id !== 8453) {
      // Base mainnet chain ID
      setError("Please switch to Base network to use x402 payments");
      return;
    }

    // Check USDC balance (approximate cost check)
    const requiredAmount = selectedProvider === "gemini" ? 0.05 : 0.04;
    if (usdcBalance && parseFloat(usdcBalance.formatted) < requiredAmount) {
      setError(
        `Insufficient USDC balance. You need at least $${requiredAmount} USDC to generate an image.`
      );
      return;
    }

    setIsGenerating(true);
    setError(null);
    setGeneratedImage(null);
    setTextResponse("");
    setPaymentStatus("Preparing payment...");

    try {
      // Wrap fetch with x402 payment handling
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fetchWithPayment = wrapFetchWithPayment(fetch, walletClient as any);

      setPaymentStatus("Processing payment...");
      console.log("Wallet connected:", isConnected, "Address:", address);
      console.log("Wallet client:", walletClient);

      const provider = providers[selectedProvider];
      const payload =
        selectedProvider === "livepeer"
          ? {
              prompt,
              height: 576,
              width: 1024,
              safetyCheck: true,
              numImagesPerPrompt: 1,
            }
          : {
              prompt,
            };

      const response = await fetchWithPayment(provider.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("API Error:", response.status, errorData);

        if (response.status === 402) {
          throw new Error(
            "Payment required. Please ensure your wallet is connected and has sufficient USDC balance."
          );
        }

        throw new Error(
          `Failed to generate image: ${response.status}${errorData.error ? ` - ${errorData.error}` : ""}`
        );
      }

      const data = await response.json();

      if (data.success) {
        setGeneratedImage(data.imageUrl);
        setImageLoadError(false);
        setImageLoading(true);
        if (data.textResponse) {
          setTextResponse(data.textResponse);
        }
        setPaymentStatus("Payment successful! Image generated.");
      } else {
        throw new Error(data.error || "Failed to generate image");
      }
    } catch (err) {
      console.error("Image generation error:", err);

      let errorMessage = "Failed to generate image";
      if (err instanceof Error) {
        errorMessage = err.message;

        // Check for specific x402 payment errors
        if (err.message.includes("402")) {
          errorMessage =
            "Payment failed. Please ensure you have sufficient USDC balance on Base network.";
        } else if (err.message.includes("insufficient")) {
          errorMessage =
            "Insufficient USDC balance. Please add funds to your wallet.";
        } else if (err.message.includes("rejected")) {
          errorMessage = "Payment was rejected. Please try again.";
        }
      }

      setError(errorMessage);
      setPaymentStatus("");
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadImage = async () => {
    if (!generatedImage) return;

    try {
      const response = await fetch(generatedImage);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ai-generated-${selectedProvider}-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to download image");
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Provider Selection */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Bot className="w-5 h-5" />
          Choose AI Provider
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(providers).map(([key, provider]) => {
            const Icon = provider.icon;
            return (
              <motion.div
                key={key}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`p-4 rounded-lg border cursor-pointer transition-all ${
                  selectedProvider === key
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
                onClick={() => setSelectedProvider(key as AIProvider)}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-lg ${provider.color} text-white`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-medium">{provider.name}</h4>
                    <p className="text-sm text-gray-600">
                      {provider.description}
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </Card>

      {/* Image Generation */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Generate AI Image</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Prompt</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={`Describe the image you want to generate with ${providers[selectedProvider].name}...`}
              className="w-full p-3 border rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg">
              <AlertCircle className="w-5 h-5" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {paymentStatus && (
            <div className="flex items-center gap-2 text-blue-600 bg-blue-50 p-3 rounded-lg">
              <Zap className="w-5 h-5" />
              <span className="text-sm">{paymentStatus}</span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Cost:{" "}
              <span className="font-medium text-green-600">
                {selectedProvider === "livepeer" ? "$0.04 USDC" : "$0.05 USDC"}
              </span>
            </div>
            <Button
              onClick={handleGenerate}
              disabled={isGenerating || !prompt.trim() || !isConnected}
              className="flex items-center gap-2"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  Generate with {providers[selectedProvider].name}
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>

      {/* Generated Image */}
      {generatedImage && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Generated Image</h3>
            <Button
              onClick={downloadImage}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download
            </Button>
          </div>

          <div className="space-y-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative rounded-lg overflow-hidden"
            >
              {imageLoading && !imageLoadError && (
                <div className="w-full h-96 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                  <Loader2 className="w-12 h-12 animate-spin text-gray-400" />
                </div>
              )}
              {imageLoadError && (
                <div className="w-full h-96 bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-700 rounded-lg flex flex-col items-center justify-center p-4">
                  <AlertCircle className="w-16 h-16 text-red-400 mb-4" />
                  <p className="text-sm text-red-600 dark:text-red-400 text-center">
                    Failed to load generated image
                  </p>
                </div>
              )}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={generatedImage}
                alt="Generated AI image"
                className={`w-full h-auto rounded-lg shadow-lg ${
                  imageLoading && !imageLoadError ? "hidden" : ""
                } ${imageLoadError ? "hidden" : ""}`}
                onLoad={() => {
                  setImageLoading(false);
                  setImageLoadError(false);
                }}
                onError={() => {
                  setImageLoading(false);
                  setImageLoadError(true);
                }}
              />
            </motion.div>

            {textResponse && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">AI Response:</h4>
                <p className="text-sm text-gray-700">{textResponse}</p>
              </div>
            )}

            <div className="text-xs text-gray-500 text-center">
              Generated with {providers[selectedProvider].name} • Paid{" "}
              {selectedProvider === "livepeer" ? "$0.04" : "$0.05"} USDC on Base
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
