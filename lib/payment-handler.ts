/**
 * Payment handler utility for x402 payment protocol
 * Import this in API routes instead of using middleware to keep bundle size down
 */

import { facilitator } from "@coinbase/x402";
import { NextRequest, NextResponse } from "next/server";

export type PaymentConfig = {
  price: string;
  network: "base" | "base-sepolia" | "polygon" | "polygon-amoy" | "avalanche" | "avalanche-fuji" | "iotex" | "sei" | "sei-testnet" | "solana" | "solana-devnet" | "peaq";
  config: {
    description: string;
    maxTimeoutSeconds?: number;
  };
};

export const PAYMENT_ROUTES: Record<string, PaymentConfig> = {
  "/api/livepeer/text-to-image": {
    price: "$0.04",
    network: "base",
    config: {
      description: "AI Image Generation with Livepeer - Generate custom images from text prompts using advanced AI models",
      maxTimeoutSeconds: 120,
    },
  },
  "/api/gemini/text-to-image": {
    price: "$0.05",
    network: "base",
    config: {
      description: "AI Cover Art Generation with Gemini - Create professional cover art and album artwork using Google's Gemini AI",
      maxTimeoutSeconds: 120,
    },
  },
};

/**
 * Handle payment verification for protected API routes
 * Call this at the start of your API route handler
 */
export const handlePayment = async (
  request: NextRequest,
  routePath: string
): Promise<NextResponse | null> => {
  const config = PAYMENT_ROUTES[routePath];
  
  if (!config) {
    return null; // No payment required
  }

  // Import payment middleware dynamically to avoid bundling in edge runtime
  const { paymentMiddleware } = await import("x402-next");
  
  const walletAddress = (process.env.WALLET_ADDRESS || "0xYourAddress") as `0x${string}`;
  
  const middleware = paymentMiddleware(
    walletAddress,
    { [routePath]: config },
    facilitator
  );

  // Execute middleware logic
  const response = await middleware(request);
  
  // If middleware returns a response (payment required), return it
  // Otherwise return null to continue with normal request handling
  return response as NextResponse | null;
};

/**
 * Wrap your API route handler with payment verification
 * 
 * Example usage:
 * ```ts
 * import { withPayment } from '@/lib/payment-handler';
 * 
 * export const GET = withPayment('/api/livepeer/text-to-image', async (request) => {
 *   // Your protected logic here
 *   return NextResponse.json({ data: 'success' });
 * });
 * ```
 */
export const withPayment = (
  routePath: string,
  handler: (request: NextRequest) => Promise<NextResponse>
) => {
  return async (request: NextRequest): Promise<NextResponse> => {
    const paymentResponse = await handlePayment(request, routePath);
    
    if (paymentResponse) {
      return paymentResponse;
    }
    
    return handler(request);
  };
};

