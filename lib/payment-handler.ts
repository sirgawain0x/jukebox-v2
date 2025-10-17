/**
 * Payment handler utility for x402 payment protocol
 * Import this in API routes instead of using middleware to keep bundle size down
 */

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
  "/api/gemini/text-to-image": {
    price: "$0.05",
    network: "base", // Using mainnet for production
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

  // Validate wallet address for production
  const walletAddress = process.env.WALLET_ADDRESS;
  if (!walletAddress || walletAddress === "0xYourAddress") {
    console.error("WALLET_ADDRESS environment variable not set or using placeholder");
    return NextResponse.json(
      { error: "Payment configuration error", details: "Wallet address not configured" },
      { status: 500 }
    );
  }

  try {
    // Import payment middleware dynamically to avoid bundling in edge runtime
    const { paymentMiddleware } = await import("x402-next");
    
    // Use CDP facilitator for mainnet if API keys are available, otherwise use testnet
    let facilitatorConfig;
    
    if (process.env.CDP_API_KEY_ID && process.env.CDP_API_KEY_SECRET) {
      // Use CDP facilitator for mainnet
      const { facilitator } = await import("@coinbase/x402");
      facilitatorConfig = facilitator;
      console.log("Using CDP facilitator for mainnet payments");
    } else {
      // Fallback to testnet facilitator
      facilitatorConfig = {
        url: "https://x402.org/facilitator" as const,
      };
      console.warn("CDP API keys not found, using testnet facilitator. Set CDP_API_KEY_ID and CDP_API_KEY_SECRET for mainnet.");
    }
    
    const middleware = paymentMiddleware(
      walletAddress as `0x${string}`,
      { [routePath]: config },
      facilitatorConfig
    );

    // Execute middleware logic
    const response = await middleware(request);
    
    // If middleware returns a response (payment required), return it
    // Otherwise return null to continue with normal request handling
    return response as NextResponse | null;
  } catch (error) {
    console.error("Payment handler error:", error);
    return NextResponse.json(
      { error: "Payment processing failed", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
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

