"use client";

import * as React from "react";
import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useAccount, useSendTransaction } from "wagmi";
import { parseEther } from "viem";

interface ImageGenerationTransactionProps {
  ethAmount: string;
  onTransactionComplete?: (hash: `0x${string}`) => void;
  className?: string;
}

export function ImageGenerationTransaction({
  ethAmount,
  onTransactionComplete,
  className,
}: ImageGenerationTransactionProps) {
  const { isConnected } = useAccount();
  const [error, setError] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const { sendTransactionAsync } = useSendTransaction();

  const handlePayment = async () => {
    try {
      setError("");
      setIsLoading(true);
      const hash = await sendTransactionAsync({
        to: "0x1Fde40a4046Eda0cA0539Dd6c77ABF8933B94260" as `0x${string}`,
        value: parseEther(ethAmount),
      });
      onTransactionComplete?.(hash);
      setIsSuccess(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to send transaction. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="text-center text-sm text-red-500">
        Please connect your wallet to generate images
      </div>
    );
  }

  return (
    <div className={className}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        <Button
          onClick={handlePayment}
          disabled={isLoading || isSuccess}
          className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <span className="animate-spin">⚡</span>
              Processing...
            </span>
          ) : isSuccess ? (
            "Transaction Complete!"
          ) : (
            `Pay ${ethAmount} ETH to Generate`
          )}
        </Button>

        {error && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-2 text-sm text-red-500 text-center"
          >
            {error}
          </motion.p>
        )}
      </motion.div>
    </div>
  );
}
