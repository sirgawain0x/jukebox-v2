# Payment Handler Setup (x402 Protocol)

## Overview

The payment logic has been moved from Edge Middleware to individual API routes to reduce bundle size and stay under Vercel's 1MB Edge Function limit.

## Architecture

- **Old Approach**: Heavy x402 middleware running on every request → 1.02 MB bundle size
- **New Approach**: Lightweight middleware + payment logic in API routes → Under 1 MB bundle size

## How It Works

### 1. Payment Configuration (`lib/payment-handler.ts`)

All payment configurations are centralized in the `PAYMENT_ROUTES` object:

```typescript
export const PAYMENT_ROUTES: Record<string, PaymentConfig> = {
  "/api/livepeer/text-to-image": {
    price: "$0.04",
    network: "base",
    config: {
      description: "AI Image Generation with Livepeer",
      maxTimeoutSeconds: 120,
    },
  },
  // Add more routes as needed
};
```

### 2. Protecting API Routes

Use the `withPayment` wrapper to protect your API endpoints:

```typescript
import { withPayment } from "@/lib/payment-handler";

const handler = async (request: NextRequest) => {
  // Your protected logic here
  return NextResponse.json({ data: 'success' });
};

export const POST = withPayment("/api/your-route", handler);
```

### 3. Environment Variables

Make sure to set your receiving wallet address:

```env
WALLET_ADDRESS=0xYourWalletAddressHere
```

## Adding New Protected Routes

1. Add your route configuration to `PAYMENT_ROUTES` in `lib/payment-handler.ts`
2. Create your API route file
3. Wrap your handler with `withPayment`

Example:

```typescript
// app/api/new-feature/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withPayment } from "@/lib/payment-handler";

const handler = async (request: NextRequest) => {
  // Your logic here
  return NextResponse.json({ success: true });
};

export const POST = withPayment("/api/new-feature", handler);
```

Then add to `PAYMENT_ROUTES`:

```typescript
"/api/new-feature": {
  price: "$0.10",
  network: "base",
  config: {
    description: "Your feature description",
    maxTimeoutSeconds: 60,
  },
},
```

## Benefits

✅ **Reduced Bundle Size**: Edge middleware stays under 1 MB limit  
✅ **Better Performance**: x402 logic only loads when needed  
✅ **Easier Maintenance**: All payment configs in one place  
✅ **Flexibility**: Each route can have different payment settings

## Current Protected Routes

- `/api/livepeer/text-to-image` - $0.04 (AI Image Generation)
- `/api/gemini/text-to-image` - $0.05 (AI Cover Art Generation)

## Testing

To test payment-protected routes locally:

1. Set your `WALLET_ADDRESS` environment variable
2. Make a POST request to the protected endpoint
3. The system will return payment requirements if payment hasn't been made
4. Complete the payment flow
5. Retry the request with payment proof

## Troubleshooting

- **Bundle size still too large**: Check middleware.ts isn't importing heavy dependencies
- **Payment not working**: Verify WALLET_ADDRESS is set and valid
- **Route not protected**: Ensure you're using `withPayment` wrapper and route is in PAYMENT_ROUTES

