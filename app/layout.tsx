import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { SafeArea } from "@coinbase/onchainkit/minikit";
import { minikitConfig } from "../minikit.config";
import { RootProvider } from "./rootProvider";
import "./globals.css";

const ROOT_URL =
  process.env.NEXT_PUBLIC_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'http://localhost:3000');


export async function generateMetadata(): Promise<Metadata> {
  return {
    title: minikitConfig.miniapp.name,
    description: minikitConfig.miniapp.description,
    openGraph: {
      url: ROOT_URL,
      title: process.env.NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME || "Jukebox",
      description: "On-chain music. Tip artists directly. AI-powered playlists.",
      images: [
        {
          url: `${ROOT_URL}/hero.png`,
          width: 1200,
          height: 630,
          alt: "Jukebox",
        },
      ],
      siteName: "Jukebox",
      type: "website",
      locale: "en_US",
    },
    twitter: {
      card: "summary_large_image",
      creator: "@creativecrtv",
      title: process.env.NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME || "Jukebox",
      description: "On-chain music. Tip artists directly. AI-powered playlists.",
      images: [
        {
          url: `${ROOT_URL}/hero.png`,
          width: 1200,
          height: 630,
          alt: "Jukebox",
        },
      ],
    },
    alternates: {
      canonical: ROOT_URL,
    },
    other: {
      "fc:frame": JSON.stringify({
        version: minikitConfig.miniapp.version,
        imageUrl: minikitConfig.miniapp.heroImageUrl,
        button: {
          title: `Play the ${minikitConfig.miniapp.name}`,
          action: {
            name: `Launch ${minikitConfig.miniapp.name}`,
            type: "launch_frame",
          },
        },
      }),
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <RootProvider>
      <html lang="en" suppressHydrationWarning>
        <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`} suppressHydrationWarning>
          <SafeArea>{children}</SafeArea>
        </body>
      </html>
    </RootProvider>
  );
}
