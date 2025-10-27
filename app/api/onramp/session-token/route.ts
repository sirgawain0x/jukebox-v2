import { NextRequest, NextResponse } from "next/server";
import { generateJWT } from "@/lib/session-token";

// Helper function to create a fetch with timeout
const fetchWithTimeout = async (url: string, options: RequestInit, timeoutMs: number = 30000) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
};

// Helper function to retry failed requests
const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> => {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxRetries) {
        throw lastError;
      }
      
      // Exponential backoff with jitter
      const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
      console.log(`Attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
};

export async function POST(request: NextRequest) {
  try {
    const requestData = await request.json();

    // Support both formats: simple address or full addresses array
    let addresses: Array<{ address: string; blockchains: string[] }>;
    let assets: string[] = ["ETH", "USDC"];

    if (requestData.address && typeof requestData.address === "string") {
      // Simple format - just address
      addresses = [
        {
          address: requestData.address,
          blockchains: ["base", "ethereum"],
        },
      ];
    } else if (requestData.addresses && Array.isArray(requestData.addresses)) {
      // Full format - addresses array
      addresses = requestData.addresses;
      if (requestData.assets) {
        assets = requestData.assets;
      }
    } else {
      return NextResponse.json(
        { error: "Address or addresses array is required" },
        { status: 400 }
      );
    }

    // Get CDP credentials
    const apiKey = process.env.CDP_API_KEY;
    const apiSecret = process.env.CDP_API_SECRET;

    if (!apiKey || !apiSecret) {
      return NextResponse.json(
        { error: "CDP API credentials not configured" },
        { status: 500 }
      );
    }

    // Generate JWT using CDP SDK
    console.log("Generating JWT token...");
    const token = await generateJWT(apiKey, apiSecret);
    console.log("JWT token generated successfully");

    // Create the request payload
    const payload = {
      addresses,
      assets,
    };
    
    console.log("Making request to Coinbase API with payload:", JSON.stringify(payload, null, 2));

    // Make the API call to Coinbase with JWT authentication using retry logic
    const response = await retryWithBackoff(async () => {
      return await fetchWithTimeout(
        "https://api.developer.coinbase.com/onramp/v1/token",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        },
        30000 // 30 second timeout
      );
    }, 3, 2000); // 3 retries with 2 second base delay

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Coinbase API error:", errorText);
      return NextResponse.json(
        { error: "Failed to generate session token" },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json({ token: data.token });
  } catch (error) {
    console.error("Session token generation error:", error);
    
    // Provide more specific error messages based on the error type
    if (error instanceof Error) {
      if (error.name === 'AbortError' || error.message.includes('timeout')) {
        return NextResponse.json(
          { error: "Request timeout - Coinbase API is taking too long to respond" },
          { status: 504 }
        );
      }
      
      if (error.message.includes('fetch failed') || error.message.includes('ConnectTimeoutError')) {
        return NextResponse.json(
          { error: "Network error - Unable to connect to Coinbase API" },
          { status: 503 }
        );
      }
      
      if (error.message.includes('JWT') || error.message.includes('token')) {
        return NextResponse.json(
          { error: "Authentication error - Invalid JWT token" },
          { status: 401 }
        );
      }
    }
    
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
