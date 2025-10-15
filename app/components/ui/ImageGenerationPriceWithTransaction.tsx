"use client";

import * as React from "react";
import { useState } from "react";
import EthPriceDisplay, {
  PriceData,
} from "@/app/components/ui/EthPriceDisplay";
import { ImageGenerationTransaction } from "./ImageGenerationTransaction";

interface ImageGenerationPriceWithTransactionProps {
  onTransactionComplete?: (hash: `0x${string}`) => void;
  className?: string;
}

export function ImageGenerationPriceWithTransaction({
  onTransactionComplete,
  className,
}: ImageGenerationPriceWithTransactionProps) {
  const [ethAmount, setEthAmount] = useState("0.000008547");

  return (
    <div className={className}>
      <EthPriceDisplay
        className="mb-6"
        onPriceUpdate={(price: PriceData) => setEthAmount(price.ethPrice)}
      />
      <ImageGenerationTransaction
        ethAmount={ethAmount}
        onTransactionComplete={onTransactionComplete}
      />
    </div>
  );
}
