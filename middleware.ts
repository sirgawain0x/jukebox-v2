import { NextRequest, NextResponse } from "next/server";

/**
 * Lightweight middleware - payment logic moved to lib/payment-handler.ts
 * This keeps the Edge Function bundle size under 1MB
 */
export const middleware = async (request: NextRequest) => {
  // Add any lightweight middleware logic here
  // For payment handling, use the withPayment wrapper in your API routes
  
  return NextResponse.next();
};

// Only run middleware on specific paths if needed
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    // '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
