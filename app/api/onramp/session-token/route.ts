import { NextRequest, NextResponse } from "next/server";
import { generateJWT } from "@/lib/session-token";

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
    const token = await generateJWT(apiKey, apiSecret);

    // Create the request payload
    const payload = {
      addresses,
      assets,
    };

    // Make the API call to Coinbase with JWT authentication
    const response = await fetch(
      "https://api.developer.coinbase.com/onramp/v1/token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      }
    );

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
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
