"use client";
import { ReactNode, useEffect } from "react";
import { base } from "wagmi/chains";
import { OnchainKitProvider } from "@coinbase/onchainkit";
import { sdk } from "@farcaster/miniapp-sdk";
import "@coinbase/onchainkit/styles.css";

export function RootProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    // Call ready() to signal the MiniApp is ready to be displayed
    // This prevents jitter and content reflows
    sdk.actions.ready();
  }, []);

  return (
    <OnchainKitProvider
      apiKey={process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY}
      chain={base}
      config={{
        appearance: {
          mode: "auto",
        },
        wallet: {
          display: "modal",
          preference: "all",
        },
      }}
      miniKit={{
        enabled: true,
        autoConnect: true,
        notificationProxyUrl: undefined,
      }}
    >
      {children}
    </OnchainKitProvider>
  );
}
