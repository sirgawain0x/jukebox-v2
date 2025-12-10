import { NextResponse } from "next/server";

/**
 * API endpoint to serve VAPID public key to client
 * This avoids exposing the key in client-side code and allows runtime configuration
 */
export async function GET() {
  // Read from server-side environment variable (without NEXT_PUBLIC_ prefix)
  const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;

  if (!vapidPublicKey) {
    return NextResponse.json(
      { error: "VAPID public key not configured" },
      { status: 500 }
    );
  }

  return NextResponse.json({ publicKey: vapidPublicKey });
}

