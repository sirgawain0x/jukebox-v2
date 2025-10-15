import { sdk } from "@farcaster/miniapp-sdk";

/**
 * Initializes the Farcaster Frame and dismisses the splash screen
 * Call this when your interface is ready to be displayed
 */
export async function initializeFarcasterFrame(options?: {
  disableNativeGestures?: boolean;
}) {
  try {
    // Call ready to dismiss the splash screen
    await sdk.actions.ready(options);
    console.log("Farcaster frame is ready");
    return true;
  } catch (error) {
    console.error("Error initializing Farcaster frame:", error);
    return false;
  }
}

/**
 * Wrapper to handle frame initialization with proper timing
 */
export async function handleSplashScreen(options?: {
  disableNativeGestures?: boolean;
  delay?: number;
}) {
  const { delay = 100, ...readyOptions } = options || {};

  // Small delay to ensure content is rendered
  if (delay > 0) {
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  return await initializeFarcasterFrame(readyOptions);
}
