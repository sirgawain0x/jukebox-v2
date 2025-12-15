"use client";
import { type ReactNode } from "react";
import { base, baseSepolia } from "wagmi/chains";
import { OnchainKitProvider } from "@coinbase/onchainkit";
import { MusicProvider } from '@/app/contexts/MusicContext';
import { WalletProvider } from '@/app/contexts/WalletContext';
import { ThemeProvider } from '@/app/contexts/ThemeContext';
import "@coinbase/onchainkit/styles.css";

// Use Base Sepolia for testing, Base Mainnet for production
// Change this based on your environment or use an env variable
const isTestnet = process.env.NEXT_PUBLIC_USE_TESTNET === "true";
const defaultChain = isTestnet ? baseSepolia : base;

export function RootProvider({ children }: { children: ReactNode }) {
  return (
    <OnchainKitProvider
      apiKey={process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY}
      chain={defaultChain}
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
      <ThemeProvider>
        <WalletProvider>
          <MusicProvider>
            {children}
          </MusicProvider>
        </WalletProvider>
      </ThemeProvider>
    </OnchainKitProvider>
  );
}
