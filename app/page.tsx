"use client";

import React, { useEffect, useState } from "react";

// Disable static generation for this page since it uses MiniKit
export const dynamic = 'force-dynamic';
import {
  useOpenUrl,
  useAddFrame,
} from "@coinbase/onchainkit/minikit";
import { Button } from "./components/ui/Button";
import { Home } from "./components/music/Home";
import { Features } from "./components/music/Features";
import { Fund } from "./components/music/Funds";
import { handleSplashScreen } from "./utils/farcaster";
import { FrameMetaTags } from "./components/ui/FrameMetaTags";
import { ErrorBoundary } from "./components/ui/ErrorBoundary";
import MiniAppExperience from "./components/ui/MiniAppExperience";
import AdaptiveHeader from "./components/ui/AdaptiveHeader";
import ClientOnly from "./components/ui/ClientOnly";

// Loading skeleton component
function LoadingSkeleton() {
  return (
    <div className="center-app font-sans text-[var(--app-foreground)] mini-app-theme">
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

export default function App() {
  const [frameAdded, setFrameAdded] = useState(false);
  const [activeTab, setActiveTab] = useState("home");
  const [isFrameReady, setIsFrameReady] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  const addFrame = useAddFrame();
  const openUrl = useOpenUrl();

  // Handle client-side mounting
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Handle Farcaster splash screen dismissal
  useEffect(() => {
    if (!isMounted) return;

    const initializeApp = async () => {
      try {
        // Initialize Farcaster frame and dismiss splash screen
        const success = await handleSplashScreen({
          disableNativeGestures: false, // Set to true if your app has conflicting gestures
          delay: 100, // Small delay to ensure content is rendered
        });

        if (success) {
          setIsFrameReady(true);
        }
      } catch (error) {
        console.error("Failed to initialize Farcaster frame:", error);
        setIsFrameReady(true); // Fallback to show content anyway
      }
    };

    initializeApp();
  }, [isMounted]);

  const handleAddFrame = async () => {
    const frameAdded = await addFrame();
    setFrameAdded(Boolean(frameAdded));
  };


  // Show loading skeleton until app is ready (only after mounting)
  if (!isMounted || !isFrameReady) {
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
          <div className="center-app font-sans text-[var(--app-foreground)] mini-app-theme">
            <div className="center-content flex flex-col">
              <AdaptiveHeader onAddFrame={handleAddFrame} frameAdded={frameAdded} />
              
              <MiniAppExperience onAddFrame={handleAddFrame} frameAdded={frameAdded} />

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
                  className="text-[var(--ock-text-foreground-muted)] text-xs"
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
