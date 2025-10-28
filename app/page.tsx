"use client";

import React, { useEffect, useState } from "react";

// Disable static generation for this page since it uses MiniKit
export const dynamic = 'force-dynamic';
import {
  useMiniKit,
  useAddFrame,
  useOpenUrl,
} from "@coinbase/onchainkit/minikit";
import { sdk } from "@farcaster/miniapp-sdk";
import { Button } from "./components/ui/Button";
import { Home } from "./components/music/Home";
import { Features } from "./components/music/Features";
import { Fund } from "./components/music/Funds";
import { FrameMetaTags } from "./components/ui/FrameMetaTags";
import { ErrorBoundary } from "./components/ui/ErrorBoundary";
import AdaptiveHeader from "./components/ui/AdaptiveHeader";
import ClientOnly from "./components/ui/ClientOnly";

// Loading skeleton component
function LoadingSkeleton() {
  return (
    <div className="center-app font-sans text-(--app-foreground) mini-app-theme">
      <div className="center-content flex flex-col">
        <header className="flex justify-between items-center mb-3 h-11">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gray-300 rounded-full animate-pulse"></div>
            <div className="w-24 h-4 bg-gray-300 rounded animate-pulse"></div>
          </div>
          <div className="w-20 h-8 bg-gray-300 rounded animate-pulse"></div>
        </header>

        <main className="flex-1 space-y-6">
          <div className="bg-white/50 rounded-lg p-4 space-y-3">
            <div className="w-3/4 h-6 bg-gray-300 rounded animate-pulse"></div>
            <div className="w-full h-4 bg-gray-300 rounded animate-pulse"></div>
            <div className="w-5/6 h-4 bg-gray-300 rounded animate-pulse"></div>
            <div className="flex gap-3 mt-4">
              <div className="w-32 h-10 bg-gray-300 rounded animate-pulse"></div>
              <div className="w-28 h-10 bg-gray-300 rounded animate-pulse"></div>
            </div>
          </div>

          <div className="bg-white/50 rounded-lg p-4 space-y-3">
            <div className="w-1/2 h-5 bg-gray-300 rounded animate-pulse"></div>
            <div className="w-full h-32 bg-gray-300 rounded animate-pulse"></div>
          </div>
        </main>

        <footer className="mt-2 pt-4 flex justify-center">
          <div className="w-48 h-4 bg-gray-300 rounded animate-pulse"></div>
        </footer>
      </div>
    </div>
  );
}

// Define a proper type for Farcaster context
interface FarcasterContext {
  client?: {
    clientFid?: number;
    platformType?: string;
    safeAreaInsets?: {
      top?: number;
      bottom?: number;
      left?: number;
      right?: number;
    };
  };
  location?: {
    type?: string;
    cast?: unknown;
    notification?: unknown;
  };
}

export default function App() {
  const { context, setMiniAppReady, isMiniAppReady } = useMiniKit();
  const [frameAdded, setFrameAdded] = useState(false);
  const [activeTab, setActiveTab] = useState("home");
  const [farcasterContext, setFarcasterContext] = useState<FarcasterContext | null>(null);

  const addFrame = useAddFrame();
  const openUrl = useOpenUrl();

  // Initialize MiniKit frame
  useEffect(() => {
    if (!isMiniAppReady) {
      setMiniAppReady();
    }
  }, [setMiniAppReady, isMiniAppReady]);

  // Load Farcaster context for richer user data
  useEffect(() => {
    const loadFarcasterContext = async () => {
      try {
        const isInMiniApp = await sdk.isInMiniApp();
        if (isInMiniApp) {
          const context = await sdk.context;
          setFarcasterContext(context);
          
          // Handle different launch contexts
          if (context.location?.type === 'cast_embed') {
            console.log('Launched from cast embed:', context.location.cast);
          } else if (context.location?.type === 'cast_share') {
            console.log('Launched from cast share:', context.location.cast);
          } else if (context.location?.type === 'notification') {
            console.log('Launched from notification:', context.location.notification);
          } else if (context.location?.type === 'launcher') {
            console.log('Launched from app launcher');
          }
        }
      } catch (error) {
        console.error('Error loading Farcaster context:', error);
      }
    };

    loadFarcasterContext();
  }, []);

  const handleAddFrame = async () => {
    const frameAdded = await addFrame();
    setFrameAdded(Boolean(frameAdded));
  };

  // Enhanced platform detection using both SDKs
  const _isBaseApp = context?.client?.clientFid === 309857;
  const _isFarcaster = farcasterContext?.client?.clientFid === 9152;
  const _launchLocation = farcasterContext?.location?.type;

  // Show loading skeleton until frame is ready
  if (!isMiniAppReady) {
    return <LoadingSkeleton />;
  }

  return (
    <>
      <FrameMetaTags 
        imageUrl="https://jukebox.creativeplatform.xyz/screenshot.png"
        postUrl="https://jukebox.creativeplatform.xyz/api/frame"
        buttonText="Open Jukebox"
        state="jukebox"
      />
      <ErrorBoundary>
        <ClientOnly fallback={<LoadingSkeleton />}>
          <div 
            className="center-app font-sans text-(--app-foreground) mini-app-theme"
            style={{
              paddingTop: farcasterContext?.client?.safeAreaInsets?.top || 0,
              paddingBottom: farcasterContext?.client?.safeAreaInsets?.bottom || 0,
              paddingLeft: farcasterContext?.client?.safeAreaInsets?.left || 0,
              paddingRight: farcasterContext?.client?.safeAreaInsets?.right || 0,
            }}
          >
            <div className="center-content flex flex-col">
              <AdaptiveHeader onAddFrame={handleAddFrame} frameAdded={frameAdded || context?.client?.added} />

              {/* Platform-specific features */}
              {/* {isBaseApp && (
                <div className="mb-4 p-2 bg-blue-50 rounded text-sm text-blue-700">
                  🎵 Base App user - Enhanced features enabled!
                </div>
              )}

              {isFarcaster && (
                <div className="mb-4 p-2 bg-purple-50 rounded text-sm text-purple-700">
                  🚀 Farcaster user - Social features enabled!
                </div>
              )} */}

              {/* Location-based features */}
              {/* {launchLocation === 'cast_embed' && (
                <div className="mb-4 p-2 bg-green-50 rounded text-sm text-green-700">
                  📱 Launched from cast - Discovered through social sharing!
                </div>
              )}

              {launchLocation === 'notification' && (
                <div className="mb-4 p-2 bg-yellow-50 rounded text-sm text-yellow-700">
                  🔔 Launched from notification - Welcome back!
                </div>
              )} */}

              <main className="flex-1">
                <ErrorBoundary>
                  {activeTab === "home" && <Home setActiveTab={setActiveTab} />}
                  {activeTab === "features" && <Features setActiveTab={setActiveTab} />}
                  {activeTab === "fund" && <Fund setActiveTab={setActiveTab} />}
                </ErrorBoundary>
              </main>

              <footer className="mt-2 pt-4 flex justify-center">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-(--ock-text-foreground-muted) text-xs"
                  onClick={() => openUrl("https://creativeplatform.xyz")}
                >
                  © {new Date().getFullYear()} Creative Organization DAO. All rights
                  reserved.
                </Button>
              </footer>
            </div>
          </div>
        </ClientOnly>
      </ErrorBoundary>
    </>
  );
}
