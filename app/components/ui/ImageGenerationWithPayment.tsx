"use client";

import * as React from "react";
import { useState } from "react";
import { ImageGenerationTransaction } from "./ImageGenerationTransaction";
import EthPriceDisplay, { PriceData } from "./EthPriceDisplay";
import { Button } from "../ui/Button";

interface ImageGenerationWithPaymentProps {
  onGenerate: (paymentHash: `0x${string}`) => void;
  className?: string;
}

export function ImageGenerationWithPayment({
  onGenerate,
  className,
}: ImageGenerationWithPaymentProps) {
  const [ethAmount, setEthAmount] = useState("0.000008547");
  const [hasCompletedPayment, setHasCompletedPayment] = useState(false);
  const [paymentHash, setPaymentHash] = useState<`0x${string}` | null>(null);

  const handlePriceUpdate = (price: PriceData) => {
    setEthAmount(price.ethPrice);
  };

  const handleTransactionComplete = (hash: `0x${string}`) => {
    setPaymentHash(hash);
    setHasCompletedPayment(true);
  };

  return (
    <div className={className}>
      {!hasCompletedPayment ? (
        <>
          <EthPriceDisplay className="mb-6" onPriceUpdate={handlePriceUpdate} />
          <ImageGenerationTransaction
            ethAmount={ethAmount}
            onTransactionComplete={handleTransactionComplete}
          />
        </>
      ) : paymentHash ? (
        <Button onClick={() => onGenerate(paymentHash)} className="w-full">
          Generate Image
        </Button>
      ) : null}
    </div>
  );
}
