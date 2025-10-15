"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  useMiniKit,
  useAddFrame,
  useOpenUrl,
} from "@coinbase/onchainkit/minikit";
import {
  Name,
  Identity,
  Address,
  Avatar,
  EthBalance,
} from "@coinbase/onchainkit/identity";
import {
  ConnectWallet,
  Wallet,
  WalletDropdown,
  WalletDropdownDisconnect,
} from "@coinbase/onchainkit/wallet";
import { Button } from "./components/ui/Button";
import { Icon } from "./components/ui/Icon";
import { Home } from "./components/music/Home";
import { Features } from "./components/music/Features";
import { Fund } from "./components/music/Funds";
import { handleSplashScreen } from "./utils/farcaster";
import { FrameMetaTags } from "./components/ui/FrameMetaTags";
import { ErrorBoundary } from "./components/ui/ErrorBoundary";

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
  const { context } = useMiniKit();
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

  const handleAddFrame = useCallback(async () => {
    const frameAdded = await addFrame();
    setFrameAdded(Boolean(frameAdded));
  }, [addFrame]);

  const saveFrameButton = useMemo(() => {
    if (context && !context.client.added) {
      return (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleAddFrame}
          className="text-[var(--app-accent)] p-4"
          icon={<Icon name="plus" size="sm" />}
        >
          Save Frame
        </Button>
      );
    }

    if (frameAdded) {
      return (
        <div className="flex items-center space-x-1 text-sm font-medium text-[#0052FF] animate-fade-out">
          <Icon name="check" size="sm" className="text-[#0052FF]" />
          <span>Saved</span>
        </div>
      );
    }

    return null;
  }, [context, frameAdded, handleAddFrame]);

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
        <div className="center-app font-sans text-[var(--app-foreground)] mini-app-theme">
          <div className="center-content flex flex-col">
            <header className="flex justify-between items-center mb-3 h-11">
              <div>
                <div className="flex items-center space-x-2">
                  <Wallet className="z-10">
                    <ConnectWallet>
                      <Name className="text-inherit" />
                    </ConnectWallet>
                    <WalletDropdown>
                      <Identity className="px-4 pt-3 pb-2" hasCopyAddressOnClick>
                        <Avatar />
                        <Name />
                        <Address />
                        <EthBalance />
                      </Identity>
                      <WalletDropdownDisconnect />
                    </WalletDropdown>
                  </Wallet>
                </div>
              </div>
              <div>{saveFrameButton}</div>
            </header>

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
      </ErrorBoundary>
    </>
  );
}
