"use client";
import { type ReactNode } from "react";
import { base } from "wagmi/chains";
import { OnchainKitProvider } from "@coinbase/onchainkit";
import { MusicProvider } from '@/app/contexts/MusicContext';
import { WalletProvider } from '@/app/contexts/WalletContext';
import "@coinbase/onchainkit/styles.css";

export function RootProvider({ children }: { children: ReactNode }) {
  return (
    <OnchainKitProvider
      apiKey={process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY}
      chain={base}
      config={{
        appearance: {
          mode: "auto",
          theme: "mini-app-theme",
          name: process.env.NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME || "Jukebox",
          logo: process.env.NEXT_PUBLIC_ICON_URL || `${process.env.NEXT_PUBLIC_URL}/logo.png`,
        },
      }}
      miniKit={{
        enabled: true
      }}
    >
      <WalletProvider>
        <MusicProvider>
          {children}
        </MusicProvider>
      </WalletProvider>
    </OnchainKitProvider>
  );
}
