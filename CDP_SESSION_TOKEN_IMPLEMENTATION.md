# CDP Session Token Implementation Guide

## Overview

This guide explains how to implement the `Funds.tsx` component, which integrates Coinbase Developer Platform (CDP) session tokens to enable secure onramp functionality. The implementation allows users to purchase crypto assets (ETH, USDC) using fiat currency through Coinbase Pay.

## Table of Contents

1. [Architecture](#architecture)
2. [Prerequisites](#prerequisites)
3. [Setup](#setup)
4. [Component Implementation](#component-implementation)
5. [API Route Setup](#api-route-setup)
6. [Utility Functions](#utility-functions)
7. [Environment Variables](#environment-variables)
8. [Usage](#usage)
9. [Security Considerations](#security-considerations)
10. [Troubleshooting](#troubleshooting)

---

## Architecture

### Flow Diagram

```
User Wallet Connection
        ↓
Frontend (Funds.tsx)
        ↓
POST /api/onramp/session-token
        ↓
Generate JWT (CDP SDK)
        ↓
POST https://api.developer.coinbase.com/onramp/v1/token
        ↓
Session Token ← Response
        ↓
Construct Onramp URL
        ↓
FundButton (OnchainKit)
        ↓
Coinbase Pay (External)
```

### Key Components

- **Frontend**: `Funds.tsx` - User interface for asset selection and funding
- **API Route**: `/api/onramp/session-token/route.ts` - Server-side session token generation
- **Utilities**: `session-token.ts` - JWT generation and helper functions
- **Constants**: `onramp-utils.ts` - Asset mappings and URL builders

---

## Prerequisites

### Required Packages

```json
{
  "dependencies": {
    "@coinbase/onchainkit": "^latest",
    "@coinbase/cdp-sdk": "^latest",
    "wagmi": "^latest",
    "next": "^14+",
    "react": "^18+"
  }
}
```

Install dependencies:

```bash
npm install @coinbase/onchainkit @coinbase/cdp-sdk wagmi
```

### CDP API Credentials

1. Visit [Coinbase Developer Platform](https://portal.cdp.coinbase.com/)
2. Create a new project or select existing one
3. Generate API credentials:
   - API Key Name (CDP_API_KEY_NAME)
   - API Private Key (CDP_API_KEY_PRIVATE_KEY)

---

## Setup

### Step 1: Environment Variables

Create or update `.env.local`:

```bash
# Coinbase Developer Platform API Credentials
CDP_API_KEY_NAME=your_cdp_api_key_name
CDP_API_KEY_PRIVATE_KEY=your_cdp_private_key

# OnchainKit Configuration
NEXT_PUBLIC_ONCHAINKIT_API_KEY=your_onchainkit_api_key
```

⚠️ **Security Note**: Never commit these keys to version control. Add `.env.local` to `.gitignore`.

### Step 2: Configure OnchainKit Provider

Update `app/providers.tsx`:

```tsx
import { OnchainKitProvider } from '@coinbase/onchainkit/provider';
import { base } from 'viem/chains';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <OnchainKitProvider
      apiKey={process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY}
      chain={base}
    >
      {children}
    </OnchainKitProvider>
  );
}
```

---

## Component Implementation

### Funds.tsx - Complete Implementation

```tsx
"use client";
import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { FundButton } from "@coinbase/onchainkit/fund";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";

type FundProps = {
  setActiveTab: (tab: string) => void;
};

export function Fund({ setActiveTab }: FundProps) {
  const { address } = useAccount();
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedAmount, setSelectedAmount] = useState(5);
  const [selectedAsset, setSelectedAsset] = useState("ETH");

  const assets = ["ETH", "USDC"];
  const amounts = [5, 10, 20];

  // Fetch session token when wallet connects or selections change
  useEffect(() => {
    if (!address) return;
    
    setLoading(true);
    setError(null);
    setSessionToken(null);

    fetch("/api/onramp/session-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        address,
        assets: [selectedAsset],
      }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to fetch session token");
        }
        return res.json();
      })
      .then((data) => setSessionToken(data.token))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [address, selectedAmount, selectedAsset]);

  // Construct Coinbase Pay URL with session token
  const onrampUrl = sessionToken
    ? `https://pay.coinbase.com/buy/select-asset?sessionToken=${sessionToken}&defaultNetwork=base&defaultAsset=${selectedAsset}&presetFiatAmount=${selectedAmount}&fiatCurrency=USD`
    : null;

  return (
    <div className="space-y-6 animate-fade-in">
      <Card title={`Buy ${selectedAsset} on Base`}>
        {/* Asset Selection */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">Select Asset</h3>
          <div className="grid grid-cols-2 gap-2">
            {assets.map((asset) => (
              <Button
                key={asset}
                variant={selectedAsset === asset ? "primary" : "outline"}
                onClick={() => setSelectedAsset(asset)}
              >
                {asset}
              </Button>
            ))}
          </div>
        </div>

        {/* Amount Selection */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">Select Amount (USD)</h3>
          <div className="grid grid-cols-3 gap-2">
            {amounts.map((amount) => (
              <Button
                key={amount}
                variant={selectedAmount === amount ? "primary" : "outline"}
                onClick={() => setSelectedAmount(amount)}
              >
                ${amount}
              </Button>
            ))}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="py-8 text-center text-[var(--app-foreground-muted)]">
            Loading funding options...
          </div>
        )}

        {/* Fund Button */}
        {!loading && onrampUrl && (
          <div className="space-y-4">
            <FundButton
              className="w-full"
              fundingUrl={onrampUrl}
              openIn="tab"
              disabled={!address}
            />
          </div>
        )}

        <Button
          className="mt-4"
          variant="outline"
          onClick={() => setActiveTab("home")}
        >
          Back to Home
        </Button>
      </Card>
    </div>
  );
}
```

### Key Features

1. **Asset Selection**: Toggle between ETH and USDC
2. **Amount Selection**: Preset amounts ($5, $10, $20)
3. **Real-time Token Generation**: Fetches new session token on selection change
4. **Error Handling**: Displays user-friendly error messages
5. **Loading States**: Visual feedback during token generation
6. **Wallet Integration**: Uses wagmi for wallet connection

---

## API Route Setup

### 1. Session Token Generation Utility

Create `lib/session-token.ts`:

```typescript
import { generateJwt } from "@coinbase/cdp-sdk/auth";

interface SessionTokenRequest {
  addresses: Array<{
    address: string;
    blockchains: string[];
  }>;
  assets?: string[];
}

/**
 * Generates a JWT token for CDP API authentication using the CDP SDK
 * JWT expires after 120 seconds (2 minutes)
 */
export async function generateJWT(
  keyName: string,
  keySecret: string
): Promise<string> {
  const requestMethod = "POST";
  const requestHost = "api.developer.coinbase.com";
  const requestPath = "/onramp/v1/token";

  try {
    const token = await generateJwt({
      apiKeyId: keyName,
      apiKeySecret: keySecret,
      requestMethod: requestMethod,
      requestHost: requestHost,
      requestPath: requestPath,
      expiresIn: 120, // 2 minutes
    });

    return token;
  } catch (error) {
    console.error("Error generating JWT:", error);
    throw error;
  }
}

/**
 * Generates a session token for secure onramp/offramp initialization
 * Client-side helper function
 */
export async function generateSessionToken(
  params: SessionTokenRequest
): Promise<string | null> {
  try {
    const response = await fetch("/api/onramp/session-token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error("Session token generation failed:", error);
      throw new Error(error.error || "Failed to generate session token");
    }

    const data = await response.json();
    return data.token;
  } catch (error) {
    console.error("Error generating session token:", error);
    return null;
  }
}

/**
 * Helper function to format addresses for session token request
 */
export function formatAddressesForToken(
  address: string,
  networks: string[]
): Array<{ address: string; blockchains: string[] }> {
  return [
    {
      address,
      blockchains: networks,
    },
  ];
}
```

### 2. API Route Handler

Create `app/api/onramp/session-token/route.ts`:

```typescript
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
    const apiKey = process.env.CDP_API_KEY_NAME;
    const apiSecret = process.env.CDP_API_KEY_PRIVATE_KEY;

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
```

---

## Utility Functions

### onramp-utils.ts

Helper functions for asset/network compatibility and URL generation:

```typescript
// Asset-network compatibility mapping
export const ASSET_NETWORK_MAP: Record<string, string[]> = {
  ETH: ["ethereum", "base", "optimism", "arbitrum", "polygon"],
  USDC: ["ethereum", "base", "optimism", "arbitrum", "polygon", "solana"],
  // ... more assets
};

/**
 * Generate onramp URL parameters
 */
export interface OnrampURLParams {
  sessionToken?: string;
  appId?: string;
  addresses: Array<{ address: string; blockchains: string[] }>;
  defaultAsset: string;
  defaultPaymentMethod: string;
  presetFiatAmount?: string;
  fiatCurrency?: string;
  defaultNetwork?: string;
  redirectUrl?: string;
}

/**
 * Generate complete onramp URL
 */
export const generateOnrampURL = (params: OnrampURLParams): string => {
  const baseUrl = "https://pay.coinbase.com/buy/select-asset";
  const urlParams = new URLSearchParams();

  // Add all parameters
  if (params.sessionToken) urlParams.append("sessionToken", params.sessionToken);
  if (params.appId) urlParams.append("appId", params.appId);
  urlParams.append("addresses", JSON.stringify(params.addresses));
  urlParams.append("defaultAsset", params.defaultAsset);
  urlParams.append("defaultPaymentMethod", params.defaultPaymentMethod);
  
  if (params.presetFiatAmount && params.fiatCurrency) {
    urlParams.append("presetFiatAmount", params.presetFiatAmount);
    urlParams.append("fiatCurrency", params.fiatCurrency);
  }
  
  if (params.defaultNetwork) urlParams.append("defaultNetwork", params.defaultNetwork);
  if (params.redirectUrl) urlParams.append("redirectUrl", params.redirectUrl);

  return `${baseUrl}?${urlParams.toString()}`;
};

/**
 * Check if asset is compatible with network
 */
export const isAssetCompatibleWithNetwork = (
  asset: string,
  network: string
): boolean => {
  return ASSET_NETWORK_MAP[asset]?.includes(network) || false;
};

/**
 * Get compatible networks for an asset
 */
export const getCompatibleNetworksForAsset = (asset: string): string[] => {
  return ASSET_NETWORK_MAP[asset] || [];
};
```

---

## Environment Variables

### Required Configuration

```bash
# .env.local

# CDP API Credentials (Required)
# Get from https://portal.cdp.coinbase.com/
CDP_API_KEY_NAME=organizations/{org_id}/apiKeys/{key_id}
CDP_API_KEY_PRIVATE_KEY=-----BEGIN EC PRIVATE KEY-----\n...\n-----END EC PRIVATE KEY-----

# OnchainKit API Key (Required)
# Get from https://portal.cdp.coinbase.com/
NEXT_PUBLIC_ONCHAINKIT_API_KEY=your_onchainkit_api_key

# Optional: Base URL for redirects
NEXT_PUBLIC_BASE_URL=https://yourdomain.com
```

### Security Notes

1. **Private Key Format**: The CDP private key should be in PEM format with `\n` for newlines
2. **Never Expose**: Keep private keys server-side only (no `NEXT_PUBLIC_` prefix)
3. **Key Rotation**: Regularly rotate API keys for security
4. **Git Ignore**: Always add `.env.local` to `.gitignore`

---

## Usage

### Basic Implementation

```tsx
import { Fund } from "@/app/components/music/Funds";

function App() {
  const [activeTab, setActiveTab] = useState("home");

  return (
    <div>
      {activeTab === "fund" && <Fund setActiveTab={setActiveTab} />}
    </div>
  );
}
```

### Advanced Usage with Custom Configuration

```tsx
"use client";
import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { FundButton } from "@coinbase/onchainkit/fund";
import { generateOnrampURL } from "@/lib/onramp-utils";

export function CustomFund() {
  const { address } = useAccount();
  const [sessionToken, setSessionToken] = useState<string | null>(null);

  useEffect(() => {
    if (!address) return;

    // Fetch session token
    fetch("/api/onramp/session-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        addresses: [
          {
            address,
            blockchains: ["base", "ethereum", "polygon"],
          },
        ],
        assets: ["ETH", "USDC", "MATIC"],
      }),
    })
      .then((res) => res.json())
      .then((data) => setSessionToken(data.token));
  }, [address]);

  // Use helper function to generate URL
  const onrampUrl = sessionToken
    ? generateOnrampURL({
        sessionToken,
        addresses: [{ address: address!, blockchains: ["base"] }],
        defaultAsset: "ETH",
        defaultPaymentMethod: "CARD",
        defaultNetwork: "base",
        presetFiatAmount: "100",
        fiatCurrency: "USD",
        redirectUrl: `${window.location.origin}/success`,
      })
    : null;

  return (
    <div>
      {onrampUrl && (
        <FundButton
          fundingUrl={onrampUrl}
          openIn="popup"
          text="Buy Crypto"
        />
      )}
    </div>
  );
}
```

---

## Security Considerations

### 1. Server-Side Token Generation

✅ **DO**: Generate session tokens server-side
❌ **DON'T**: Expose CDP API keys in client-side code

```typescript
// ✅ CORRECT: Server-side (API route)
const token = await generateJWT(
  process.env.CDP_API_KEY_NAME!,
  process.env.CDP_API_KEY_PRIVATE_KEY!
);

// ❌ WRONG: Client-side
const token = await generateJWT(
  process.env.NEXT_PUBLIC_CDP_API_KEY_NAME!, // DON'T DO THIS
  process.env.NEXT_PUBLIC_CDP_API_KEY_PRIVATE_KEY! // DON'T DO THIS
);
```

### 2. JWT Expiration

- JWTs expire after **120 seconds (2 minutes)**
- Session tokens should be regenerated for new transactions
- Implement token caching with expiration tracking if needed

### 3. Input Validation

```typescript
// Validate wallet address
function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

// Validate in API route
if (!isValidAddress(requestData.address)) {
  return NextResponse.json(
    { error: "Invalid wallet address" },
    { status: 400 }
  );
}
```

### 4. Rate Limiting

Implement rate limiting to prevent abuse:

```typescript
// Example with upstash/ratelimit
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, "60 s"),
});

export async function POST(request: NextRequest) {
  const ip = request.ip ?? "127.0.0.1";
  const { success } = await ratelimit.limit(ip);
  
  if (!success) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429 }
    );
  }
  
  // ... rest of handler
}
```

### 5. Error Handling

Never expose sensitive information in error messages:

```typescript
// ✅ CORRECT: Generic error message
return NextResponse.json(
  { error: "Failed to generate session token" },
  { status: 500 }
);

// ❌ WRONG: Exposes internal details
return NextResponse.json(
  { error: `JWT generation failed: ${apiKey} invalid` },
  { status: 500 }
);
```

---

## Troubleshooting

### Common Issues

#### 1. "CDP API credentials not configured"

**Cause**: Missing or incorrect environment variables

**Solution**:
```bash
# Check .env.local exists and has correct values
CDP_API_KEY_NAME=organizations/xxx/apiKeys/xxx
CDP_API_KEY_PRIVATE_KEY=-----BEGIN EC PRIVATE KEY-----\n...\n-----END EC PRIVATE KEY-----

# Restart development server
npm run dev
```

#### 2. "Failed to generate session token"

**Possible Causes**:
- Expired or invalid CDP API keys
- Incorrect private key format
- Network connectivity issues
- Rate limiting

**Debug Steps**:
```typescript
// Add detailed logging in route.ts
console.log("API Key Name:", apiKey ? "Set" : "Missing");
console.log("API Secret:", apiSecret ? "Set" : "Missing");
console.log("JWT Token:", token.substring(0, 20) + "...");
console.log("Response Status:", response.status);
console.log("Response Body:", await response.text());
```

#### 3. FundButton Not Working

**Check**:
1. Wallet is connected: `address` is defined
2. Session token is valid: `sessionToken` is not null
3. Onramp URL is properly formatted
4. Network connectivity to `pay.coinbase.com`

**Debug**:
```tsx
console.log("Address:", address);
console.log("Session Token:", sessionToken);
console.log("Onramp URL:", onrampUrl);
```

#### 4. "Invalid private key format"

**Solution**: Ensure private key has proper newlines

```typescript
// Correct format with \n
const key = "-----BEGIN EC PRIVATE KEY-----\nMHcCAQ...\n-----END EC PRIVATE KEY-----";

// Or use template literals
const key = `-----BEGIN EC PRIVATE KEY-----
MHcCAQ...
-----END EC PRIVATE KEY-----`;
```

#### 5. CORS Issues

If testing locally, ensure proper CORS headers:

```typescript
// Add to route.ts
export async function POST(request: NextRequest) {
  const response = await handleRequest(request);
  
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  
  return response;
}
```

### Debugging Tips

1. **Enable Verbose Logging**:
```typescript
const DEBUG = process.env.NODE_ENV === "development";

if (DEBUG) {
  console.log("[Session Token] Request:", requestData);
  console.log("[Session Token] JWT:", token);
  console.log("[Session Token] Response:", data);
}
```

2. **Test JWT Generation Separately**:
```typescript
// Create test-jwt.ts
import { generateJWT } from "./lib/session-token";

async function test() {
  const token = await generateJWT(
    process.env.CDP_API_KEY_NAME!,
    process.env.CDP_API_KEY_PRIVATE_KEY!
  );
  console.log("JWT:", token);
}

test();
```

3. **Use Network Inspector**:
   - Open browser DevTools → Network tab
   - Filter for "session-token"
   - Check request/response payloads
   - Verify status codes

---

## API Reference

### POST /api/onramp/session-token

**Request Body**:
```typescript
{
  // Simple format
  address: string;
  assets?: string[];
  
  // OR Full format
  addresses: Array<{
    address: string;
    blockchains: string[];
  }>;
  assets?: string[];
}
```

**Response**:
```typescript
{
  token: string; // Session token for Coinbase Pay
}
```

**Error Response**:
```typescript
{
  error: string; // Error message
}
```

### Coinbase Pay URL Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sessionToken` | string | Yes | Session token from API |
| `defaultAsset` | string | Yes | Asset symbol (ETH, USDC) |
| `defaultNetwork` | string | Yes | Network name (base, ethereum) |
| `presetFiatAmount` | number | No | Preset purchase amount |
| `fiatCurrency` | string | No | Currency code (USD, EUR) |
| `redirectUrl` | string | No | Return URL after purchase |

---

## Best Practices

### 1. Token Caching

Implement caching to reduce API calls:

```typescript
const tokenCache = new Map<string, { token: string; expires: number }>();

function getCachedToken(key: string): string | null {
  const cached = tokenCache.get(key);
  if (cached && cached.expires > Date.now()) {
    return cached.token;
  }
  return null;
}

function setCachedToken(key: string, token: string) {
  tokenCache.set(key, {
    token,
    expires: Date.now() + 100_000, // 100 seconds (leave buffer)
  });
}
```

### 2. Loading States

Provide clear feedback to users:

```tsx
{loading && (
  <div className="flex items-center justify-center py-8">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    <span className="ml-3">Preparing payment options...</span>
  </div>
)}
```

### 3. Error Recovery

Allow users to retry on errors:

```tsx
{error && (
  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
    <p className="text-red-700 mb-2">{error}</p>
    <button
      onClick={() => refetchToken()}
      className="text-red-700 underline"
    >
      Try Again
    </button>
  </div>
)}
```

### 4. Analytics

Track key events:

```typescript
// Track session token generation
analytics.track("session_token_requested", {
  asset: selectedAsset,
  amount: selectedAmount,
  success: !!sessionToken,
});

// Track funding button click
analytics.track("fund_button_clicked", {
  asset: selectedAsset,
  amount: selectedAmount,
});
```

---

## Additional Resources

### Documentation
- [CDP API Documentation](https://docs.cdp.coinbase.com/)
- [OnchainKit Documentation](https://onchainkit.xyz/)
- [Coinbase Pay Integration Guide](https://docs.cloud.coinbase.com/pay-sdk/docs)

### Support
- [CDP Developer Portal](https://portal.cdp.coinbase.com/)
- [OnchainKit GitHub](https://github.com/coinbase/onchainkit)
- [Coinbase Developer Discord](https://discord.gg/cdp)

### Example Projects
- [OnchainKit Template](https://github.com/coinbase/onchainkit-template)
- [CDP SDK Examples](https://github.com/coinbase/cdp-sdk-samples)

---

## Changelog

### Version 1.0.0 (Current)
- Initial implementation with CDP session tokens
- Support for ETH and USDC on Base network
- Preset amount selection ($5, $10, $20)
- Error handling and loading states
- Security best practices implemented

---

## License

This implementation guide is part of the creative-player project.

