/* 
 * PLAYLIST FUNCTIONALITY COMMENTED OUT
 * This component is temporarily disabled but preserved for future use.
 */

/*
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
import { SongShareMetaTags } from "../ui/SongShareMetaTags";
import {
  useAccount,
  useChainId,
  useWaitForTransactionReceipt,
  useBalance,
} from "wagmi";
import {
  create2FactoryABI,
  getContractAddresses,
  PLAYLIST_NFT_BYTECODE,
  STORAGE_CONTRACT_BYTECODE,
  useInitializePlaylist,
  useCreatePlaylistNFT,
  type PlaylistMetadata,
} from "@/lib/contracts";
import { 
  PLAYLIST_DEPLOYMENT_FEE_USDC, 
  getUSDCAddress,
  erc20ABI,
  formatUSDC 
} from "@/lib/usdc-utils";
import { useReadContract } from "wagmi";
import { extractTransactionErrorMessage } from "@/lib/utils";
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
} from "lucide-react";
import { decodeEventLog, type Address } from "viem";
import { type ContractFunctionParameters } from "viem";
import { pay, getPaymentStatus } from "@base-org/account";

type PayableContractFunctionParameters = ContractFunctionParameters & {
  value?: bigint;
};

// Base Pay configuration - moved outside component to avoid dependency issues
const PAYMENT_RECIPIENT = process.env.NEXT_PUBLIC_WALLET_ADDRESS || "0x1Fde40a4046Eda0cA0539Dd6c77ABF8933B94260";

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
  const [aiAccessUnlocked, setAiAccessUnlocked] = useState(false);
  const [imageGenerationCount, setImageGenerationCount] = useState(0);
  const [useAIGeneration, setUseAIGeneration] = useState(true);
  const [deployedPlaylistAddress, setDeployedPlaylistAddress] = useState<Address | null>(null);
  const [deployedStorageAddress, setDeployedStorageAddress] = useState<Address | null>(null);
  const [storageDeploymentHash, setStorageDeploymentHash] = useState<`0x${string}` | undefined>();
  const [storageSalt, setStorageSalt] = useState<`0x${string}` | null>(null);
  const [saveStorageCalls, setSaveStorageCalls] = useState<PayableContractFunctionParameters[]>([]);

  // Get account and chain info first - required for balance and allowance checks
  const { address, isConnected } = useAccount();
  const chainId = useChainId();

  // USDC balance check
  const { data: usdcBalance } = useBalance({
    address: address,
    token: chainId ? getUSDCAddress(chainId) : undefined,
    chainId: chainId,
  });

  // USDC allowance check
  const { data: usdcAllowance } = useReadContract({
    address: chainId ? getUSDCAddress(chainId) : undefined,
    abi: erc20ABI,
    functionName: "allowance",
    args: address && chainId 
      ? [address, getContractAddresses(chainId).CREATE2_FACTORY] 
      : undefined,
    query: {
      enabled: !!address && !!chainId,
    },
  });
  const { composeCast } = useComposeCast();

  // Helper function to check if network is supported
  const isNetworkSupported = useCallback(() => {
    if (!chainId) return false;
    try {
      getContractAddresses(chainId);
      return true;
    } catch {
      return false;
    }
  }, [chainId]);

  const { data: receipt } = useWaitForTransactionReceipt({
    hash: deploymentHash,
  });

  const { data: storageReceipt } = useWaitForTransactionReceipt({
    hash: storageDeploymentHash,
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

    // Validate network before proceeding
    if (!chainId) {
      setImageGenerationError("Please connect to a supported network");
      return;
    }

    try {
      getContractAddresses(chainId);
    } catch {
      setImageGenerationError("Unsupported network. Please switch to Base mainnet or Base Sepolia.");
      return;
    }

    setLoadingImage(true);
    setImageGenerationError(null);
    setPaymentStatus("Initiating payment...");

    // Determine if we're on testnet based on chainId
    const isTestnet = chainId === 84532; // Base Sepolia

    try {
      // Use Base Pay to handle the payment
      // Base Pay automatically detects connected wallet and uses account abstraction
      // Make sure you're using a wallet that supports account abstraction (e.g., Coinbase Smart Wallet)
      const payment = await pay({
        amount: '0.25', // $0.25 USDC
        to: PAYMENT_RECIPIENT,
        testnet: isTestnet,
      });

      console.log("Payment initiated:", payment.id);
      setPaymentStatus("Payment processing...");

      // Poll for payment status
      let paymentComplete = false;
      let attempts = 0;
      const maxAttempts = 30; // 30 seconds max

      while (!paymentComplete && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
        
        const status = await getPaymentStatus({
          id: payment.id,
          testnet: isTestnet
        });
        console.log("Payment status:", status);

        if (status.status === 'completed') {
          paymentComplete = true;
          setPaymentStatus("Payment successful! Generating image...");

          // Call the API to generate the image
          const response = await fetch("/api/gemini/text-to-image", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
              prompt: imagePrompt,
              paymentId: payment.id,
              testnet: isTestnet
            }),
          });

          if (response.ok) {
            const data = await response.json();
            if (data.success && data.imageUrl) {
              setCoverImage(data.imageUrl);
              setImageLoadError(false);
              setImageLoading(true);
              setPaymentStatus("Image generated successfully!");
              showToast("Image generated successfully with Gemini AI!");
              setTimeout(() => setPaymentStatus(""), 3000);
              setImageGenerationCount(prev => prev + 1);
              setAiAccessUnlocked(false);
            } else {
              throw new Error(data.error || "Failed to generate image");
            }
          } else {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || "Failed to generate image");
          }
        } else if (status.status === 'failed') {
          // Enhanced error handling for UserOperation failures
          const errorReason = status.error || "Payment failed";
          console.error("Payment failed:", {
            paymentId: payment.id,
            reason: errorReason,
            status: status,
            walletAddress: address,
            chainId: chainId,
          });
          throw new Error(`Payment failed: ${errorReason}. Please ensure you're using a wallet that supports account abstraction (like Coinbase Smart Wallet).`);
        }

        attempts++;
      }

      if (!paymentComplete) {
        throw new Error("Payment timeout - please try again");
      }

    } catch (error) {
      console.error("Payment or image generation error:", error);
      
      // Enhanced error handling for UserOperation-specific errors
      let errorMessage = "Failed to process payment or generate image";
      
      if (error instanceof Error) {
        const errorMsg = error.message.toLowerCase();
        
        // UserOperation-specific error patterns
        if (errorMsg.includes('useroperation') || errorMsg.includes('user operation')) {
          errorMessage = "Account abstraction error. Please ensure you're using a smart wallet (like Coinbase Smart Wallet) that supports account abstraction.";
        } else if (errorMsg.includes('gas') || errorMsg.includes('insufficient')) {
          errorMessage = "Insufficient funds or gas error. Please ensure you have enough balance.";
        } else if (errorMsg.includes('signature') || errorMsg.includes('sign')) {
          errorMessage = "Signature error. Please try connecting your wallet again.";
        } else if (errorMsg.includes('network') || errorMsg.includes('chain')) {
          errorMessage = "Network error. Please check your network connection and try again.";
        } else if (errorMsg.includes('timeout')) {
          errorMessage = "Payment timeout. The transaction is taking longer than expected. Please check your wallet and try again.";
        } else if (errorMsg.includes('rejected') || errorMsg.includes('cancelled')) {
          errorMessage = "Payment was cancelled. Please try again.";
        } else {
          errorMessage = error.message;
        }
      }
      
      setImageGenerationError(errorMessage);
    } finally {
      setLoadingImage(false);
      setPaymentStatus("");
    }
  }, [imagePrompt, isConnected, address, chainId, showToast]);

  const handlePayForAIAccess = useCallback(async () => {
    // Set a default prompt and unlock access, then call the generation function
    setImagePrompt("Generate a beautiful abstract cover art for a music playlist");
    setAiAccessUnlocked(true);
    setPaymentStatus("AI access unlocked! You can now generate images.");
    showToast("AI image generation unlocked! You can now generate images.");
    setTimeout(() => setPaymentStatus(""), 3000);
  }, [showToast]);

  const handleOnStatus = useCallback(
    async (status: LifecycleStatus) => {
      console.log("Transaction status:", status);
      
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
        
        // Enhanced error logging with better context
        const errorContext = {
          statusName: status.statusName,
          statusData: status.statusData,
          timestamp: new Date().toISOString(),
          userAddress: address,
          chainId: chainId,
          storageDeployed: !!deployedStorageAddress,
          playlistDeployed: !!deployedPlaylistAddress
        };
        
        // Only log if there's meaningful error data
        if (status.statusData && Object.keys(status.statusData).length > 0) {
          console.error("Transaction error:", errorContext);
        } else {
          console.warn("Transaction failed with empty error data:", errorContext);
        }
        
        // Extract user-friendly error message using utility function
        const errorMessage = extractTransactionErrorMessage(
          status.statusData,
          "Playlist deployment failed. Please try again."
        );
        
        showToast(errorMessage);
        
        // If playlist deployment failed but storage succeeded, reset playlist state to allow retry
        // Note: Storage contract remains deployed but unused - this is acceptable
        if (deployedStorageAddress && !deployedPlaylistAddress) {
          setDeploymentHash(undefined);
          setSavePlaylistCalls([]);
        }
      }
    },
    [showToast, address, chainId, deployedStorageAddress, deployedPlaylistAddress]
  );

  // Setup storage deployment when modal opens
  useEffect(() => {
    if (showSaveModal && address && chainId && !storageSalt && !deployedStorageAddress) {
      // Validate network first
      if (!isNetworkSupported()) {
        console.error("Unsupported network:", chainId);
        showToast(`Unsupported network. Please switch to Base mainnet or Base Sepolia.`);
        setShowSaveModal(false);
        return;
      }

      // Validate sufficient USDC balance
      if (usdcBalance && usdcBalance.value < PLAYLIST_DEPLOYMENT_FEE_USDC) {
        console.error("Insufficient USDC balance:", {
          required: PLAYLIST_DEPLOYMENT_FEE_USDC.toString(),
          available: usdcBalance.value.toString()
        });
        showToast(`Insufficient USDC balance. You need at least ${formatUSDC(PLAYLIST_DEPLOYMENT_FEE_USDC)} USDC.`);
        setShowSaveModal(false);
        return;
      }

      let addresses;
      try {
        addresses = getContractAddresses(chainId);
      } catch (error) {
        console.error("Failed to get contract addresses:", error);
        showToast(`Unsupported network. Please switch to Base mainnet or Base Sepolia.`);
        setShowSaveModal(false);
        return;
      }

      // Generate bytes32 salt for storage contract (32 bytes)
      const storageSaltBytes = new Uint8Array(32);
      crypto.getRandomValues(storageSaltBytes);
      const newStorageSalt = `0x${Buffer.from(storageSaltBytes).toString("hex")}` as `0x${string}`;
      setStorageSalt(newStorageSalt);
      
      console.log("Setting up storage deployment with salt:", newStorageSalt);
      
      // Check if USDC approval is needed
      const allowanceValue = typeof usdcAllowance === "bigint" ? usdcAllowance : BigInt(0);
      const needsApproval = !usdcAllowance || allowanceValue < PLAYLIST_DEPLOYMENT_FEE_USDC;
      
      const calls: PayableContractFunctionParameters[] = [];
      
      // Add USDC approval if needed
      if (needsApproval) {
        calls.push({
          abi: erc20ABI,
          address: getUSDCAddress(chainId),
          functionName: "approve",
          args: [addresses.CREATE2_FACTORY, PLAYLIST_DEPLOYMENT_FEE_USDC],
        });
      }
      
      // Add storage deployment call
      calls.push({
        abi: create2FactoryABI,
        address: addresses.CREATE2_FACTORY,
        functionName: "deploy",
        args: [newStorageSalt, STORAGE_CONTRACT_BYTECODE as `0x${string}`],
      });
      
      console.log("Storage deployment calls:", calls);
      setSaveStorageCalls(calls);
    }
  }, [
    showSaveModal,
    address,
    chainId,
    usdcBalance,
    usdcAllowance,
    storageSalt,
    deployedStorageAddress,
    showToast,
    isNetworkSupported,
  ]);

  // Wait for storage deployment to complete, then deploy playlist
  useEffect(() => {
    if (showSaveModal && storageReceipt && deployedStorageAddress && !deploymentHash && address && chainId) {
      let addresses;
      try {
        addresses = getContractAddresses(chainId);
      } catch (error) {
        console.error("Failed to get contract addresses:", error);
        showToast(`Unsupported network. Please switch to Base mainnet or Base Sepolia.`);
        return;
      }
      
      // Generate bytes32 salt for playlist contract (different from storage)
      const playlistSaltBytes = new Uint8Array(32);
      crypto.getRandomValues(playlistSaltBytes);
      const playlistSalt = `0x${Buffer.from(playlistSaltBytes).toString("hex")}` as `0x${string}`;
      
      // Check if USDC approval is needed
      const allowanceValue = typeof usdcAllowance === "bigint" ? usdcAllowance : BigInt(0);
      const needsApproval = !usdcAllowance || allowanceValue < PLAYLIST_DEPLOYMENT_FEE_USDC;
      
      const calls: PayableContractFunctionParameters[] = [];
      
      // Add USDC approval if needed
      if (needsApproval) {
        calls.push({
          abi: erc20ABI,
          address: getUSDCAddress(chainId),
          functionName: "approve",
          args: [addresses.CREATE2_FACTORY, PLAYLIST_DEPLOYMENT_FEE_USDC],
        });
      }
      
      // Add playlist deployment call
      calls.push({
        abi: create2FactoryABI,
        address: addresses.CREATE2_FACTORY,
        functionName: "deploy",
        args: [playlistSalt, PLAYLIST_NFT_BYTECODE as `0x${string}`],
      });
      
      console.log("Setting up playlist deployment after storage:", {
        chainId,
        addresses,
        playlistName,
        storageAddress: deployedStorageAddress,
        playlistSalt,
        needsApproval,
        calls
      });
      
      setSavePlaylistCalls(calls);
    }
  }, [
    showSaveModal,
    storageReceipt,
    deployedStorageAddress,
    deploymentHash,
    address,
    chainId,
    playlistName,
    usdcBalance,
    usdcAllowance,
    showToast,
  ]);

  // Handle storage contract deployment event
  useEffect(() => {
    if (storageReceipt && !deployedStorageAddress) {
      let addresses;
      try {
        addresses = getContractAddresses(chainId);
      } catch (error) {
        console.error("Failed to get contract addresses for storage receipt processing:", error);
        return;
      }
      
      const eventAbi = create2FactoryABI.find(
        (item) => item.type === "event" && item.name === "ContractDeployed"
      );

      if (!eventAbi) return;

      for (const log of storageReceipt.logs) {
        if (
          log.address.toLowerCase() === addresses.CREATE2_FACTORY.toLowerCase()
        ) {
          try {
            const decodedLog = decodeEventLog({
              abi: [eventAbi],
              data: log.data,
              topics: log.topics,
            });

            const eventArgs = decodedLog.args as {
              contractAddress: `0x${string}`;
              salt: `0x${string}`;
              deployer: `0x${string}`;
            };

            if (eventArgs?.contractAddress) {
              console.log("Storage ContractDeployed event detected:", eventArgs);
              setDeployedStorageAddress(eventArgs.contractAddress);
              break;
            }
          } catch (e) {
            console.warn("Could not decode storage log:", e);
          }
        }
      }
    }
  }, [storageReceipt, deployedStorageAddress, chainId]);

  // Hooks for contract interactions
  const { initializePlaylist, hash: initHash } = useInitializePlaylist();
  const { createPlaylist, hash: createHash } = useCreatePlaylistNFT(deployedPlaylistAddress || undefined);
  
  // Wait for initialization transaction receipt
  const { data: initReceipt } = useWaitForTransactionReceipt({
    hash: initHash,
  });

  useEffect(() => {
    if (receipt && !deployedPlaylistAddress) {
      let addresses;
      try {
        addresses = getContractAddresses(chainId);
      } catch (error) {
        console.error("Failed to get contract addresses for receipt processing:", error);
        return;
      }
      
      const eventAbi = create2FactoryABI.find(
        (item) => item.type === "event" && item.name === "ContractDeployed"
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

            const eventArgs = decodedLog.args as {
              contractAddress: `0x${string}`;
              salt: `0x${string}`;
              deployer: `0x${string}`;
            };

            if (eventArgs?.contractAddress) {
              console.log("ContractDeployed event detected:", eventArgs);
              setDeployedPlaylistAddress(eventArgs.contractAddress);
              
              // Initialize the deployed contract
              initializePlaylist(eventArgs.contractAddress);
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
    deployedPlaylistAddress,
    initializePlaylist,
  ]);

  // Handle initialization completion and create playlist
  useEffect(() => {
    if (address && deployedPlaylistAddress && initReceipt && !createHash) {
      // Wait for initialization transaction to complete before creating playlist
      const metadata: PlaylistMetadata = {
        name: playlistName,
        description: description,
        coverImageUrl: coverImage,
        tags: tags,
        creator: address as Address,
        createdAt: BigInt(Math.floor(Date.now() / 1000)),
        songs: [],
        artists: [],
        isPrivate: false,
        maxSupply: BigInt(0), // 0 = unlimited
        price: BigInt(0), // Free by default
        collaborators: [],
      };
      
      // Use the deployed storage contract address
      if (deployedStorageAddress) {
        createPlaylist(metadata, deployedStorageAddress);
      } else {
        console.error("Storage contract address not available");
        showToast("Storage contract deployment incomplete. Please try again.");
      }
    }
  }, [deployedPlaylistAddress, initReceipt, createHash, deployedStorageAddress, address, playlistName, description, coverImage, tags, createPlaylist, showToast]);

  // Handle playlist creation completion
  useEffect(() => {
    if (deployedPlaylistAddress && createHash && saveState !== "success") {
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
          address: deployedPlaylistAddress,
        });
        // Automatically share the playlist creation achievement
        handleSharePlaylist();
      }, 100);
    }
  }, [deployedPlaylistAddress, createHash, saveState, showToast, launchConfetti, handleSharePlaylist, onCreate, playlistName, coverImage, description, tags]);

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
      {/* Dynamic meta tags for playlist sharing */}
      {playlistName && coverImage && (
        <SongShareMetaTags 
          playlist={{
            name: playlistName,
            coverImage: coverImage,
            description: description,
            tags: tags,
          }}
          title={`${playlistName} - Playlist`}
          description={`Check out the playlist "${playlistName}" on Jukebox`}
        />
      )}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <Card className="bg-(--app-card-bg) border border-(--app-card-border) shadow-2xl overflow-hidden">
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
                className="text-4xl font-bold text-(--app-accent) mb-3"
              >
                Create A Playlist
              </motion.h1>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-(--app-foreground-muted) text-lg"
              >
                Design the perfect playlist with AI-powered cover art
              </motion.p>
            </div>

            <form
              className="space-y-8"
              onSubmit={(e) => {
                e.preventDefault();
                if (!playlistName || initialCreated) return;
                
                // Validate network before opening modal
                if (!isNetworkSupported()) {
                  showToast("Unsupported network. Please switch to Base mainnet or Base Sepolia.");
                  return;
                }
                
                // Warn if no cover image (but allow proceeding)
                if (!coverImage) {
                  const proceed = window.confirm(
                    "You haven't added a cover image. Would you like to continue without one?"
                  );
                  if (!proceed) return;
                }
                
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
                  className="text-lg font-semibold flex items-center gap-3 text-(--app-foreground)"
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
                  className="h-14 text-lg bg-(--app-card-bg) border border-(--app-card-border) focus:border-(--app-accent) rounded-xl transition-all duration-300 shadow-sm focus:shadow-md"
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
                  className="text-lg font-semibold flex items-center gap-3 text-(--app-foreground)"
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
                  className="min-h-[120px] bg-(--app-card-bg) border border-(--app-card-border) focus:border-(--app-accent) rounded-xl transition-all duration-300 shadow-sm focus:shadow-md resize-none text-base"
                />
              </motion.div>

              {/* Cover Art Section with Toggle */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.8 }}
                className="space-y-4"
              >
                <div className="flex items-center justify-between">
                  <Label className="text-lg font-semibold flex items-center gap-3 text-(--app-foreground)">
                    <div className="p-2 bg-blue-500 rounded-lg">
                      <ImageIcon className="w-4 h-4 text-white" />
                    </div>
                    Cover Art
                  </Label>
                  
                  {/* Toggle Switch */}
                  <div className="flex items-center gap-3">
                    <span className={`text-sm font-medium transition-colors duration-200 ${
                      !useAIGeneration ? 'text-(--app-foreground)' : 'text-(--app-foreground-muted)'
                    }`}>
                      Custom URL
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setUseAIGeneration(!useAIGeneration);
                        // Clear any existing image when switching modes
                        setCoverImage("");
                        setImageLoadError(false);
                        setImageLoading(false);
                        setImageGenerationError(null);
                      }}
                      className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                      style={{
                        backgroundColor: useAIGeneration ? '#3B82F6' : '#D1D5DB'
                      }}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                          useAIGeneration ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                    <span className={`text-sm font-medium transition-colors duration-200 ${
                      useAIGeneration ? 'text-(--app-foreground)' : 'text-(--app-foreground-muted)'
                    }`}>
                      AI Generation
                    </span>
                  </div>
                </div>

                {/* AI Image Generation Section */}
                {useAIGeneration && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-4"
                  >
                    <div className="text-center mb-4">
                      <p className="text-sm text-(--app-foreground-muted)">
                        ✨ Google&apos;s Gemini AI - Advanced image generation with
                        natural language understanding
                      </p>
                    </div>

                    {/* Image Generation Counter */}
                    {imageGenerationCount > 0 && (
                      <div className="text-center mb-4">
                        <p className="text-sm text-(--app-foreground-muted)">
                          🎨 Generated {imageGenerationCount} image{imageGenerationCount !== 1 ? 's' : ''} this session
                        </p>
                      </div>
                    )}

                    <div className="p-6 bg-(--app-accent-light) rounded-2xl border-2 border-dashed border-(--app-accent)/50">
                      <div className="space-y-4">
                        {/* LOCKED STATE - Show payment button */}
                        {!aiAccessUnlocked && (
                          <>
                            {/* Disabled text input */}
                            <Textarea
                              value=""
                              placeholder="Click 'Unlock AI Generation' to access the text input and generate images..."
                              className="min-h-[100px] bg-gray-100 border border-gray-300 rounded-xl transition-all duration-300 resize-none cursor-not-allowed"
                              disabled
                            />

                            <div className="text-center mb-2">
                              <p className="text-sm font-medium text-(--app-foreground-muted) flex items-center justify-center gap-1">
                                Cost:{" "}
                                <span className="text-green-600 font-bold">
                                  $0.25 USDC
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
                              onClick={handlePayForAIAccess}
                              disabled={false}
                              className="w-full h-12 bg-green-500 hover:bg-green-500/90 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 group disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <div className="flex items-center gap-2">
                                <Sparkles className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" />
                                Unlock AI Generation
                              </div>
                            </Button>
                          </>
                        )}

                        {/* UNLOCKED STATE - Show text input and generate button */}
                        {aiAccessUnlocked && (
                          <>
                            <Textarea
                              value={imagePrompt}
                              onChange={(e) => {
                                setImagePrompt(e.target.value);
                                if (imageGenerationError) setImageGenerationError(null);
                              }}
                              placeholder="e.g. Futuristic neon city at night, Abstract geometric patterns with sound waves, Retro vinyl record with cosmic background..."
                              className="min-h-[100px] bg-(--app-card-bg) border border-(--app-card-border) focus:border-(--app-accent) rounded-xl transition-all duration-300 resize-none"
                            />

                            <div className="text-center mb-2">
                              <p className="text-sm font-medium text-(--app-foreground-muted) flex items-center justify-center gap-1">
                                Cost:{" "}
                                <span className="text-green-600 font-bold">
                                  $0.25 USDC
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
                                !imagePrompt.trim()
                              }
                              className="w-full h-12 bg-blue-500 hover:bg-blue-500/90 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 group disabled:opacity-50 disabled:cursor-not-allowed"
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
                          </>
                        )}

                        {imageGenerationError && (
                          <div className="text-red-500 text-sm text-center bg-red-50 border border-red-200 rounded-lg p-3">
                            {imageGenerationError}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Manual Cover Image URL Section */}
                {!useAIGeneration && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-3"
                  >
                    <Input
                      id="coverUrl"
                      value={coverImage}
                      onChange={(e) => {
                        setCoverImage(e.target.value);
                        setImageLoadError(false);
                        setImageLoading(true);
                      }}
                      placeholder="https://example.com/your-awesome-cover.jpg"
                        className="h-14 bg-(--app-card-bg) border border-(--app-card-border) focus:border-(--app-accent) rounded-xl transition-all duration-300 shadow-sm focus:shadow-md"
                    />
                  </motion.div>
                )}
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
                <Label className="text-lg font-semibold flex items-center gap-3 text-(--app-foreground)">
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
                    className="h-12 bg-(--app-card-bg) border border-(--app-card-border) focus:border-(--app-accent) rounded-xl transition-all duration-300 shadow-sm focus:shadow-md"
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
                          className="bg-(--app-accent-light) text-(--app-accent) px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 shadow-md border border-(--app-card-border)"
                        >
                          #{tag}
                          <button
                            type="button"
                            onClick={() => removeTag(tag)}
                            className="text-(--app-accent) hover:text-red-500 transition-colors duration-200 cursor-pointer"
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
                {!isNetworkSupported() && isConnected && (
                  <div className="mb-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl">
                    <p className="text-sm text-yellow-800 dark:text-yellow-300 text-center">
                      ⚠️ Unsupported network. Please switch to Base mainnet or Base Sepolia to create a playlist.
                    </p>
                  </div>
                )}
                {!coverImage && playlistName.trim() && (
                  <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
                    <p className="text-sm text-blue-800 dark:text-blue-300 text-center">
                      💡 Tip: Add a cover image to make your playlist stand out!
                    </p>
                  </div>
                )}
                <Button
                  type="submit"
                  disabled={initialCreated || !playlistName.trim() || !isNetworkSupported()}
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
            className="fixed inset-0 z-9999 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white dark:bg-gray-900 rounded-2xl p-8 shadow-2xl w-full max-w-md mx-4 border border-gray-200 dark:border-gray-700"
            >
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Music className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  Save Forever for $0.10 USDC
                </h2>
                <div className="text-gray-600 dark:text-gray-400 mb-2">
                  {formatUSDC(PLAYLIST_DEPLOYMENT_FEE_USDC)} USDC
                </div>
                <p className="text-xs bg-pink-50 dark:bg-pink-900/20 text-pink-800 dark:text-pink-300 px-3 py-2 rounded-md">
                  Plus network gas fees for transaction execution.
                </p>
              </div>

              <div className="space-y-4">
                <Button
                  variant="outline"
                  className="w-full h-12 border border-(--app-card-border) hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl transition-all duration-200"
                  onClick={() => {
                    // Reset all deployment state
                    setShowSaveModal(false);
                    setSaveState("idle");
                    setStorageSalt(null);
                    setDeployedStorageAddress(null);
                    setStorageDeploymentHash(undefined);
                    setDeployedPlaylistAddress(null);
                    setDeploymentHash(undefined);
                    setSaveStorageCalls([]);
                    setSavePlaylistCalls([]);
                  }}
                  disabled={saveState === "pending"}
                >
                  {saveState === "error" ? "Close & Reset" : "Cancel"}
                </Button>

                {/* Storage Deployment Transaction */}
                {!deployedStorageAddress && saveStorageCalls.length > 0 && (
                  <Transaction
                    calls={saveStorageCalls}
                    onStatus={(status) => {
                      if (status.statusName === "transactionPending") {
                        setSaveState("pending");
                      } else if (status.statusName === "success") {
                        const txHash = status.statusData.transactionReceipts?.[0]?.transactionHash;
                        if (txHash) {
                          setStorageDeploymentHash(txHash as `0x${string}`);
                        }
                      } else if (status.statusName === "error") {
                        setSaveState("error");
                        const errorMessage = extractTransactionErrorMessage(
                          status.statusData,
                          "Storage deployment failed. Please try again."
                        );
                        showToast(errorMessage);
                        // Reset storage state on error to allow retry
                        setStorageSalt(null);
                        setStorageDeploymentHash(undefined);
                        setSaveStorageCalls([]);
                      }
                    }}
                  >
                    <TransactionButton
                      text={saveState === "pending" ? "Deploying Storage..." : "Deploy Storage Contract"}
                      disabled={
                        saveState === "pending" ||
                        initialCreated ||
                        !playlistName.trim() ||
                        (usdcBalance && usdcBalance.value < PLAYLIST_DEPLOYMENT_FEE_USDC) ||
                        !address ||
                        !chainId
                      }
                      className="w-full h-12 bg-blue-500 hover:bg-blue-500/90 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </Transaction>
                )}

                {/* Playlist Deployment Transaction - shown after storage is deployed */}
                {deployedStorageAddress && savePlaylistCalls.length > 0 && (
                  <Transaction
                    calls={savePlaylistCalls}
                    onStatus={handleOnStatus}
                  >
                    <TransactionButton
                      text={saveState === "pending" ? "Deploying Playlist..." : "Deploy Playlist"}
                      disabled={
                        saveState === "pending" ||
                        initialCreated ||
                        !playlistName.trim() ||
                        !address ||
                        !chainId
                      }
                      className="w-full h-12 bg-blue-500 hover:bg-blue-500/90 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </Transaction>
                )}

                {/* Status messages */}
                {deployedStorageAddress && !deployedPlaylistAddress && (
                  <div className="text-sm text-center mt-2 text-green-600 dark:text-green-400">
                    ✓ Storage contract deployed. Ready to deploy playlist.
                  </div>
                )}
              </div>

              {saveState === "error" && (
                <div className="text-red-500 text-sm text-center mt-4">
                  Transaction failed. Please try again.
                </div>
              )}

              {usdcBalance && usdcBalance.value < PLAYLIST_DEPLOYMENT_FEE_USDC && (
                <div className="text-yellow-600 text-sm text-center mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  ⚠️ Insufficient USDC balance. You need at least{" "}
                  {formatUSDC(PLAYLIST_DEPLOYMENT_FEE_USDC)} USDC to deploy this playlist.
                  <br />
                  Current balance: {usdcBalance ? formatUSDC(usdcBalance.value) : "0"} USDC
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
            className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-9999 pointer-events-auto"
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
*/
