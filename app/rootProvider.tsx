"use client";
import { ReactNode, useEffect, useState } from "react";
import { base } from "wagmi/chains";
import { OnchainKitProvider } from "@coinbase/onchainkit";
import { useMiniKit } from '@coinbase/onchainkit/minikit';
import "@coinbase/onchainkit/styles.css";

function MiniKitWrapper({ children }: { children: ReactNode }) {
  const [isMounted, setIsMounted] = useState(false);
  const { setFrameReady, isFrameReady } = useMiniKit();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isMounted && !isFrameReady) {
      setFrameReady();
    }
  }, [isMounted, setFrameReady, isFrameReady]);

  return <>{children}</>;
}

export function RootProvider({ children }: { children: ReactNode }) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <OnchainKitProvider
      apiKey={process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY}
      chain={base}
      config={{
        appearance: {
          mode: "auto",
          name: "Jukebox",
          logo: `${process.env.NEXT_PUBLIC_URL}/logo.png`,
        },
        wallet: {
          display: "modal",
          preference: "all",
        },
      }}
      miniKit={{
        enabled: true
      }}
    >
      {isMounted ? (
        <MiniKitWrapper>
          {children}
        </MiniKitWrapper>
      ) : (
        children
      )}
    </OnchainKitProvider>
  );
}
