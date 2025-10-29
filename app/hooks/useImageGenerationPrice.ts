import { useEffect, useState } from "react";

export interface ImageGenerationPrice {
  usdPrice: number;
  ethPrice: string;
  lastUpdated: Date;
  isLoading: boolean;
  error?: string;
}

export function useImageGenerationPrice() {
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Fixed pricing for Gemini - Base Pay handles the actual payment
  const price: ImageGenerationPrice = {
    usdPrice: 0.25, // $0.25 USDC per image
    ethPrice: "0.000065789", // Approximate ETH equivalent at current rates
    lastUpdated,
    isLoading: false,
    error: undefined,
  };

  // Update timestamp periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdated(new Date());
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  return price;
}
