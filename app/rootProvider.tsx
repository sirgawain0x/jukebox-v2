"use client";
import { ReactNode, useEffect, useState } from "react";
import { base } from "wagmi/chains";
import { OnchainKitProvider } from "@coinbase/onchainkit";
import { useMiniKit } from '@coinbase/onchainkit/minikit';
import { WalletProvider } from '@/app/contexts/WalletContext';
import { WalletErrorBoundary } from '@/app/components/ui/WalletErrorBoundary';
import "@coinbase/onchainkit/styles.css";

// Enhanced Base chain configuration with multiple RPC endpoints for better reliability
const enhancedBase = {
  ...base,
  rpcUrls: {
    default: {
      http: [
        'https://mainnet.base.org',
        'https://base-mainnet.g.alchemy.com/v2/demo',
        'https://base-mainnet.public.blastapi.io',
        'https://base.drpc.org',
      ],
    },
    public: {
      http: [
        'https://mainnet.base.org',
        'https://base-mainnet.g.alchemy.com/v2/demo',
        'https://base-mainnet.public.blastapi.io',
        'https://base.drpc.org',
      ],
    },
  },
};

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
      chain={enhancedBase}
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
      <WalletErrorBoundary>
        <WalletProvider>
          {isMounted ? (
            <MiniKitWrapper>
              {children}
            </MiniKitWrapper>
          ) : (
            children
          )}
        </WalletProvider>
      </WalletErrorBoundary>
    </OnchainKitProvider>
  );
}
