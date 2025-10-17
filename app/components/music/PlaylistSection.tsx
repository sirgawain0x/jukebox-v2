"use client";
import { useState, useCallback, useEffect } from "react";
import confetti from "canvas-confetti";
import { motion, AnimatePresence } from "framer-motion";
import { Playlist } from "@/types/music";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Transaction,
  TransactionButton,
  LifecycleStatus,
} from "@coinbase/onchainkit/transaction";
import { useComposeCast } from "@coinbase/onchainkit/minikit";
import {
  useAccount,
  useChainId,
  useWaitForTransactionReceipt,
  useWalletClient,
  useBalance,
} from "wagmi";
import {
  useGetRequiredETH,
  create2FactoryABI,
  getContractAddresses,
} from "@/lib/contracts";
import { wrapFetchWithPayment } from "x402-fetch";
import {
  Music,
  Image as ImageIcon,
  Hash,
  Sparkles,
  X,
  Wand2,
  ChevronRight,
  Loader2,
  Tag,
  FileText,
  Wallet,
} from "lucide-react";
import { decodeEventLog } from "viem";
import { type ContractFunctionParameters } from "viem";

type PayableContractFunctionParameters = ContractFunctionParameters & {
  value?: bigint;
};

export function PlaylistSection({
  onCreate,
  created: initialCreated,
}: {
  onCreate: (playlist: Playlist) => void;
  created: boolean;
}) {
  const [playlistName, setPlaylistName] = useState("");
  const [coverImage, setCoverImage] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [imagePrompt, setImagePrompt] = useState("");
  const [loadingImage, setLoadingImage] = useState(false);
  const [imageGenerationError, setImageGenerationError] = useState<
    string | null
  >(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveState, setSaveState] = useState<
    "idle" | "pending" | "success" | "error"
  >("idle");
  const [deploymentHash, setDeploymentHash] = useState<
    `0x${string}` | undefined
  >();
  const [savePlaylistCalls, setSavePlaylistCalls] = useState<
    PayableContractFunctionParameters[]
  >([]);
  const [paymentStatus, setPaymentStatus] = useState<string>("");
  const [imageLoadError, setImageLoadError] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);

  // Get ETH amount for $0.10 (10 cents) for saving playlist
  const { data: savePlaylistCost, isLoading: isLoadingSaveCost } =
    useGetRequiredETH(BigInt(10));

  const SAVE_PLAYLIST_COST = savePlaylistCost ?? BigInt("39582170607071750"); // Fallback to ~$0.10

  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const chainId = useChainId();
  const { composeCast } = useComposeCast();

  // Check USDC balance on Base network
  const { data: usdcBalance } = useBalance({
    address: address,
    token: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // USDC on Base
    chainId: 8453, // Base mainnet
  });

  const { data: receipt } = useWaitForTransactionReceipt({
    hash: deploymentHash,
  });

  const launchConfetti = useCallback(() => {
    // Ensure confetti is called safely without DOM conflicts
    if (typeof window !== "undefined") {
      // Use requestAnimationFrame to avoid DOM manipulation conflicts
      requestAnimationFrame(() => {
        try {
          confetti({
            particleCount: 200,
            spread: 70,
            origin: { y: 0.4 },
            colors: ["#8B5CF6", "#EC4899", "#10B981", "#F59E0B"],
            disableForReducedMotion: true,
          });
        } catch (error) {
          console.warn("Confetti error:", error);
        }
      });
    }
  }, []);

  const showToast = useCallback((message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  }, []);

  // Sharing function for playlist creation
  const handleSharePlaylist = useCallback(() => {
    if (!playlistName) return;
    
    const tagsText = tags.length > 0 ? ` #${tags.join(' #')}` : '';
    composeCast({
      text: `🎵 Just created my new playlist "${playlistName}" with AI-generated cover art! Check out Jukebox for blockchain-powered music discovery${tagsText} 🎶✨`,
      embeds: [window.location.href]
    });
  }, [playlistName, tags, composeCast]);

  const handleGenerateImage = useCallback(async () => {
    if (!imagePrompt.trim()) return;

    if (!isConnected || !address) {
      setImageGenerationError("Please connect your wallet first");
      return;
    }

    if (!walletClient) {
      setImageGenerationError("Wallet client not available");
      return;
    }

    // Check if connected to Base network
    if (walletClient.chain.id !== 8453) {
      // Base mainnet chain ID
      setImageGenerationError(
        "Please switch to Base network to use x402 payments"
      );
      return;
    }

    // Check USDC balance (approximate cost check)
    const requiredAmount = 0.05; // $0.05 USDC for Gemini
    if (usdcBalance && parseFloat(usdcBalance.formatted) < requiredAmount) {
      setImageGenerationError(
        `Insufficient USDC balance. You need at least $${requiredAmount} USDC to generate an image.`
      );
      return;
    }

    setLoadingImage(true);
    setImageGenerationError(null);
    setPaymentStatus("Preparing payment...");

    try {
      // Use x402 payment for image generation
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fetchWithPayment = wrapFetchWithPayment(fetch, walletClient as any);

      setPaymentStatus("Processing payment...");
      console.log("Wallet connected:", isConnected, "Address:", address);
      console.log("Wallet client:", walletClient);

      const response = await fetchWithPayment("/api/gemini/text-to-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: imagePrompt,
        }),
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
      if (data.imageUrl) {
        setCoverImage(data.imageUrl);
        setImageLoadError(false);
        setImageLoading(true);
        setPaymentStatus("Payment successful! Image generated.");
        showToast("Image generated successfully with Gemini AI!");
        setTimeout(() => setPaymentStatus(""), 3000);
      } else {
        throw new Error("No image URL returned");
      }
    } catch (error: unknown) {
      console.error("Image generation error:", error);

      let errorMessage = "Failed to generate image. Please try again.";
      if (error instanceof Error) {
        errorMessage = error.message;

        // Check for specific x402 payment errors
        if (error.message.includes("402")) {
          errorMessage =
            "Payment failed. Please ensure you have sufficient USDC balance on Base network.";
        } else if (error.message.includes("insufficient")) {
          errorMessage =
            "Insufficient USDC balance. Please add funds to your wallet.";
        } else if (error.message.includes("rejected")) {
          errorMessage = "Payment was rejected. Please try again.";
        }
      }

      setImageGenerationError(errorMessage);
      setPaymentStatus("");
    } finally {
      setLoadingImage(false);
    }
  }, [imagePrompt, showToast, isConnected, address, walletClient, usdcBalance]);

  const handleOnStatus = useCallback(
    async (status: LifecycleStatus) => {
      if (status.statusName === "transactionPending") {
        setSaveState("pending");
      } else if (status.statusName === "success") {
        const txHash =
          status.statusData.transactionReceipts?.[0]?.transactionHash;
        if (txHash) {
          setDeploymentHash(txHash as `0x${string}`);
        }
      } else if (status.statusName === "error") {
        setSaveState("error");
        showToast("Transaction failed. Please try again.");
      }
    },
    [showToast, address, chainId]
  );

  useEffect(() => {
    if (showSaveModal && address) {
      const saltBytes = new Uint8Array(32);
      crypto.getRandomValues(saltBytes);
      const salt = `0x${Buffer.from(saltBytes).toString("hex")}` as const;
      const addresses = getContractAddresses(chainId);
      setSavePlaylistCalls([
        {
          abi: create2FactoryABI,
          address: addresses.CREATE2_FACTORY,
          functionName: "deployPlaylist",
          args: [
            playlistName,
            coverImage,
            description,
            tags,
            address as `0x${string}`,
            addresses.PRICE_FEED,
            salt,
          ],
          value: SAVE_PLAYLIST_COST,
        },
      ]);
    }
  }, [
    showSaveModal,
    address,
    chainId,
    playlistName,
    coverImage,
    description,
    tags,
    SAVE_PLAYLIST_COST,
  ]);

  useEffect(() => {
    if (receipt) {
      const addresses = getContractAddresses(chainId);
      const eventAbi = create2FactoryABI.find(
        (item) => item.type === "event" && item.name === "PlaylistDeployed"
      );

      if (!eventAbi) return;

      for (const log of receipt.logs) {
        if (
          log.address.toLowerCase() === addresses.CREATE2_FACTORY.toLowerCase()
        ) {
          try {
            const decodedLog = decodeEventLog({
              abi: [eventAbi],
              data: log.data,
              topics: log.topics,
            });

            const deployedAddress = decodedLog.args as {
              playlistAddress: `0x${string}`;
            };

            if (deployedAddress) {
              setSaveState("success");
              // Use setTimeout to ensure modal is closed before confetti
              setTimeout(() => {
                setShowSaveModal(false);
                launchConfetti();
                showToast("Playlist created!");
                onCreate({
                  name: playlistName,
                  coverImage,
                  description,
                  tags,
                  address: deployedAddress.playlistAddress,
                });
                // Automatically share the playlist creation achievement
                handleSharePlaylist();
              }, 100);
              break; // Exit loop once we've found and processed the log
            }
          } catch (e) {
            // Not the event we're looking for, continue
            console.warn("Could not decode log:", e);
          }
        }
      }
    }
  }, [
    receipt,
    deploymentHash,
    chainId,
    onCreate,
    playlistName,
    coverImage,
    description,
    tags,
    showToast,
    launchConfetti,
    handleSharePlaylist,
  ]);

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  return (
    <div className="w-full max-w-4xl mx-auto" id="playlist-section">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <Card className="bg-[var(--app-card-bg)] border border-[var(--app-card-border)] shadow-2xl overflow-hidden">
          <CardContent className="p-8">
            {/* Header */}
            <div className="text-center mb-8">
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{
                  delay: 0.2,
                  type: "spring" as const,
                  stiffness: 200,
                }}
                className="w-20 h-20 bg-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl"
              >
                <Music className="w-10 h-10 text-white" />
              </motion.div>
              <motion.h1
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-4xl font-bold text-[var(--app-accent)] mb-3"
              >
                Create A Playlist
              </motion.h1>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-[var(--app-foreground-muted)] text-lg"
              >
                Design the perfect playlist with AI-powered cover art
              </motion.p>
            </div>

            <form
              className="space-y-8"
              onSubmit={(e) => {
                e.preventDefault();
                if (!playlistName || initialCreated) return;
                setShowSaveModal(true);
              }}
            >
              {/* Playlist Name */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 }}
                className="space-y-3"
              >
                <Label
                  htmlFor="name"
                  className="text-lg font-semibold flex items-center gap-3 text-[var(--app-foreground)]"
                >
                  <div className="p-2 bg-blue-500 rounded-lg">
                    <Music className="w-4 h-4 text-white" />
                  </div>
                  Playlist Name
                </Label>
                <Input
                  id="name"
                  value={playlistName}
                  onChange={(e) => setPlaylistName(e.target.value)}
                  placeholder="My Awesome Playlist"
                  className="h-14 text-lg bg-[var(--app-card-bg)] border border-[var(--app-card-border)] focus:border-[var(--app-accent)] rounded-xl transition-all duration-300 shadow-sm focus:shadow-md"
                  required
                />
              </motion.div>

              {/* Description */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.7 }}
                className="space-y-3"
              >
                <Label
                  htmlFor="description"
                  className="text-lg font-semibold flex items-center gap-3 text-[var(--app-foreground)]"
                >
                  <div className="p-2 bg-blue-500 rounded-lg">
                    <FileText className="w-4 h-4 text-white" />
                  </div>
                  Description
                </Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe your playlist mood and vibe..."
                  className="min-h-[120px] bg-[var(--app-card-bg)] border border-[var(--app-card-border)] focus:border-[var(--app-accent)] rounded-xl transition-all duration-300 shadow-sm focus:shadow-md resize-none text-base"
                />
              </motion.div>

              {/* AI Image Generation */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.8 }}
                className="space-y-4"
              >
                <Label className="text-lg font-semibold flex items-center gap-3 text-[var(--app-foreground)]">
                  <div className="p-2 bg-blue-500 rounded-lg">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  AI Cover Art Generation
                </Label>

                <div className="text-center mb-4">
                  <p className="text-sm text-[var(--app-foreground-muted)]">
                    ✨ Google&apos;s Gemini AI - Advanced image generation with
                    natural language understanding
                  </p>
                </div>

                <div className="p-6 bg-[var(--app-accent-light)] rounded-2xl border-2 border-dashed border-[var(--app-accent)]/50">
                  <div className="space-y-4">
                    <Textarea
                      value={imagePrompt}
                      onChange={(e) => {
                        setImagePrompt(e.target.value);
                        if (imageGenerationError) setImageGenerationError(null);
                      }}
                      placeholder="e.g. Futuristic neon city at night, Abstract geometric patterns with sound waves, Retro vinyl record with cosmic background..."
                      className="min-h-[100px] bg-[var(--app-card-bg)] border border-[var(--app-card-border)] focus:border-[var(--app-accent)] rounded-xl transition-all duration-300 resize-none"
                    />

                    {/* Wallet connection check */}
                    {!isConnected && (
                      <div className="text-center p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <div className="flex items-center justify-center gap-2 text-yellow-700">
                          <Wallet className="w-5 h-5" />
                          <span className="text-sm font-medium">
                            Please connect your wallet to generate images
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Network check */}
                    {isConnected &&
                      walletClient &&
                      walletClient.chain.id !== 8453 && (
                        <div className="text-center p-4 bg-red-50 border border-red-200 rounded-lg">
                          <div className="flex items-center justify-center gap-2 text-red-700">
                            <Wallet className="w-5 h-5" />
                            <span className="text-sm font-medium">
                              Please switch to Base network for x402 payments
                            </span>
                          </div>
                        </div>
                      )}

                    {/* USDC balance check */}
                    {isConnected &&
                      walletClient &&
                      walletClient.chain.id === 8453 &&
                      usdcBalance &&
                      parseFloat(usdcBalance.formatted) < 0.05 && (
                        <div className="text-center p-4 bg-orange-50 border border-orange-200 rounded-lg">
                          <div className="flex items-center justify-center gap-2 text-orange-700">
                            <Wallet className="w-5 h-5" />
                            <span className="text-sm font-medium">
                              Insufficient USDC balance. You need at least $0.05
                              USDC.
                            </span>
                          </div>
                        </div>
                      )}

                    <div className="text-center mb-2">
                      <p className="text-sm font-medium text-[var(--app-foreground-muted)] flex items-center justify-center gap-1">
                        Cost:{" "}
                        <span className="text-green-600 font-bold">
                          $0.05 USDC
                        </span>{" "}
                        on Base
                      </p>
                    </div>

                    {paymentStatus && (
                      <div className="text-center p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm text-blue-700">{paymentStatus}</p>
                      </div>
                    )}

                    <Button
                      type="button"
                      onClick={handleGenerateImage}
                      disabled={
                        loadingImage ||
                        !imagePrompt.trim() ||
                        !isConnected ||
                        !walletClient ||
                        walletClient.chain.id !== 8453 ||
                        (usdcBalance &&
                          parseFloat(usdcBalance.formatted) < 0.05)
                      }
                      className="w-full h-12 bg-[var(--app-accent)] hover:bg-[var(--app-accent)]/90 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 group disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loadingImage ? (
                        <div className="flex items-center gap-2">
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Generating Magic...
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Wand2 className="w-5 h-5 group-hover:rotate-12 transition-transform duration-300" />
                          Generate with Gemini AI
                        </div>
                      )}
                    </Button>

                    {imageGenerationError && (
                      <div className="text-red-500 text-sm text-center bg-red-50 border border-red-200 rounded-lg p-3">
                        {imageGenerationError}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>

              {/* Manual Cover Image URL */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.9 }}
                className="space-y-3"
              >
                <Label
                  htmlFor="coverUrl"
                  className="text-lg font-semibold flex items-center gap-3 text-[var(--app-foreground)]"
                >
                  <div className="p-2 bg-[var(--app-accent)] rounded-lg">
                    <ImageIcon className="w-4 h-4 text-white" />
                  </div>
                  Or Use Custom Cover Image URL
                </Label>
                <Input
                  id="coverUrl"
                  value={coverImage}
                  onChange={(e) => {
                    setCoverImage(e.target.value);
                    setImageLoadError(false);
                    setImageLoading(true);
                  }}
                  placeholder="https://example.com/your-awesome-cover.jpg"
                  className="h-14 bg-[var(--app-card-bg)] border border-[var(--app-card-border)] focus:border-[var(--app-accent)] rounded-xl transition-all duration-300 shadow-sm focus:shadow-md"
                />
              </motion.div>

              {/* Cover Image Preview */}
              <AnimatePresence>
                {coverImage && (
                  <motion.div
                    key="cover-image-preview"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.2 }}
                    className="flex justify-center"
                  >
                    <div className="relative group">
                      {imageLoading && !imageLoadError && (
                        <div className="w-48 h-48 bg-gray-200 dark:bg-gray-700 rounded-2xl shadow-2xl flex items-center justify-center">
                          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                        </div>
                      )}
                      {imageLoadError && (
                        <div className="w-48 h-48 bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-700 rounded-2xl shadow-2xl flex flex-col items-center justify-center p-4">
                          <ImageIcon className="w-12 h-12 text-red-400 mb-2" />
                          <p className="text-xs text-red-600 dark:text-red-400 text-center">
                            Failed to load image
                          </p>
                        </div>
                      )}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={coverImage}
                        alt="Playlist cover"
                        className={`w-48 h-48 object-cover rounded-2xl shadow-2xl group-hover:scale-105 transition-transform duration-300 ${
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
                      <button
                        type="button"
                        onClick={() => {
                          setCoverImage("");
                          setImageLoadError(false);
                          setImageLoading(false);
                        }}
                        className="absolute -top-2 -right-2 w-8 h-8 bg-red-500/80 hover:bg-red-500 text-white rounded-full flex items-center justify-center transition-colors duration-200 shadow-lg z-10 cursor-pointer"
                        aria-label="Remove cover image"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Tags */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1.0 }}
                className="space-y-4"
              >
                <Label className="text-lg font-semibold flex items-center gap-3 text-[var(--app-foreground)]">
                  <div className="p-2 bg-blue-500 rounded-lg">
                    <Hash className="w-4 h-4 text-white" />
                  </div>
                  Tags
                </Label>

                <div className="flex gap-2">
                  <Input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addTag();
                      }
                    }}
                    placeholder="Add a tag and press Enter"
                    className="h-12 bg-[var(--app-card-bg)] border border-[var(--app-card-border)] focus:border-[var(--app-accent)] rounded-xl transition-all duration-300 shadow-sm focus:shadow-md"
                  />
                  <Button
                    type="button"
                    onClick={addTag}
                    className="h-12 px-6 bg-blue-500 hover:bg-blue-500/90 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    <Tag className="w-4 h-4" />
                  </Button>
                </div>

                {tags.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-wrap gap-3"
                  >
                    <AnimatePresence mode="popLayout">
                      {tags.map((tag: string) => (
                        <motion.span
                          key={tag}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          layout
                          className="bg-[var(--app-accent-light)] text-[var(--app-accent)] px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 shadow-md border border-[var(--app-card-border)]"
                        >
                          #{tag}
                          <button
                            type="button"
                            onClick={() => removeTag(tag)}
                            className="text-[var(--app-accent)] hover:text-red-500 transition-colors duration-200 cursor-pointer"
                            aria-label={`Remove ${tag} tag`}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </motion.span>
                      ))}
                    </AnimatePresence>
                  </motion.div>
                )}
              </motion.div>

              {/* Submit Button */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.1 }}
                className="pt-6"
              >
                <Button
                  type="submit"
                  disabled={initialCreated || !playlistName.trim()}
                  className="w-full h-16 text-xl font-bold bg-blue-500 hover:bg-blue-500/90 text-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 group relative overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="relative z-10 flex items-center gap-3">
                    {initialCreated ? (
                      <>
                        <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                          <svg
                            className="w-4 h-4 text-white"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                        Playlist Created!
                      </>
                    ) : (
                      <>
                        <Music className="w-6 h-6 group-hover:rotate-12 transition-transform duration-300" />
                        Create My Playlist
                        <ChevronRight className="w-6 h-6 group-hover:translate-x-1 transition-transform duration-300" />
                      </>
                    )}
                  </span>
                </Button>
              </motion.div>
            </form>
          </CardContent>
        </Card>
      </motion.div>

      {/* Save Modal */}
      <AnimatePresence>
        {showSaveModal && (
          <motion.div
            key="save-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-[var(--app-card-bg)] rounded-2xl p-8 shadow-2xl w-full max-w-md mx-4 border border-[var(--app-card-border)]"
            >
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-[var(--app-accent)] rounded-full flex items-center justify-center mx-auto mb-4">
                  <Music className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-[var(--app-foreground)] mb-2">
                  Save Forever for $0.10
                </h2>
                <p className="text-[var(--app-foreground-muted)] mb-2">
                  ≈{" "}
                  {isLoadingSaveCost
                    ? "Loading..."
                    : `${(Number(SAVE_PLAYLIST_COST) / 1e18).toFixed(6)} ETH`}
                </p>
                <p className="text-xs bg-[#EC407A]/10 px-2 py-1 rounded-md">
                  This does not include network gas fees, which can be higher
                  for playlist deployment.
                </p>
              </div>

              <div className="space-y-4">
                <Button
                  variant="outline"
                  className="w-full h-12 border border-[var(--app-card-border)] hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl transition-all duration-200"
                  onClick={() => setShowSaveModal(false)}
                  disabled={saveState === "pending"}
                >
                  Cancel
                </Button>

                <Transaction
                  calls={savePlaylistCalls}
                  onStatus={handleOnStatus}
                >
                  <TransactionButton
                    disabled={
                      saveState === "pending" ||
                      initialCreated ||
                      !playlistName.trim()
                    }
                    className="w-full h-12 bg-[var(--app-accent)] hover:bg-[var(--app-accent)]/90 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                  />
                </Transaction>
              </div>

              {saveState === "error" && (
                <div className="text-red-500 text-sm text-center mt-4">
                  Transaction failed. Please try again.
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key="toast-notification"
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-[9999] pointer-events-auto"
          >
            <div className="bg-black/90 text-white px-6 py-3 rounded-xl shadow-2xl border border-white/20 backdrop-blur-sm">
              <p className="font-medium">{toast}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
