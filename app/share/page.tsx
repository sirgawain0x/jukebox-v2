"use client";

import { useEffect, useState, Suspense } from "react";

// Disable static generation for this page since it uses Farcaster SDK
export const dynamic = 'force-dynamic';
import { useSearchParams } from "next/navigation";
// import { sdk } from "@farcaster/miniapp-sdk";
import { handleSplashScreen } from "../utils/farcaster";

interface MiniappUser {
  fid: number;
  username?: string;
  displayName?: string;
  pfpUrl?: string;
}
// Inline MiniappCast type for type safety
interface MiniappCast {
  author: {
    fid: number;
    username?: string;
    displayName?: string;
    pfpUrl?: string;
  };
  hash: string;
  parentHash?: string;
  parentFid?: number;
  timestamp?: number;
  mentions?: MiniappUser[];
  embeds?: string[];
  channelKey?: string;
}

interface FarcasterShareContext {
  location?: {
    type: string;
    cast?: MiniappCast;
  };
}

function isFarcasterShareContext(
  context: unknown
): context is FarcasterShareContext {
  if (typeof context !== "object" || context === null) return false;
  const ctx = context as { location?: unknown };
  if (
    !ctx.location ||
    typeof ctx.location !== "object" ||
    ctx.location === null
  )
    return false;
  const loc = ctx.location as { type?: unknown };
  if (typeof loc.type !== "string") return false;
  return loc.type === "cast_share";
}

export default function SharePageWrapper() {
  return (
    <Suspense
      fallback={<div style={{ padding: 32 }}>Loading shared cast...</div>}
    >
      <SharePage />
    </Suspense>
  );
}

function SharePage() {
  const searchParams = useSearchParams();
  const [isShareContext, setIsShareContext] = useState(false);
  const [sharedCast, setSharedCast] = useState<MiniappCast | null>(null);
  const [loading, setLoading] = useState(true);
  const [urlParams, setUrlParams] = useState<{
    castHash: string | null;
    castFid: string | null;
    viewerFid: string | null;
  }>({ castHash: null, castFid: null, viewerFid: null });

  useEffect(() => {
    // Read query params immediately (SSR/CSR)
    const castHash = searchParams.get("castHash");
    const castFid = searchParams.get("castFid");
    const viewerFid = searchParams.get("viewerFid");
    setUrlParams({ castHash, castFid, viewerFid });

    // Initialize Farcaster Frame and check for share context
    async function init() {
      await handleSplashScreen();
      let context: unknown = null; // sdk.context;
      if (typeof (context as Promise<unknown>).then === "function") {
        context = await (context as Promise<unknown>);
      }
      if (isFarcasterShareContext(context)) {
        setIsShareContext(true);
        setSharedCast(context.location?.cast ?? null);
      }
      setLoading(false);
    }
    init();
  }, [searchParams]);

  if (loading) {
    return <div style={{ padding: 32 }}>Loading shared cast...</div>;
  }

  if (isShareContext && sharedCast) {
    return (
      <div style={{ padding: 32 }}>
        <h1>
          Cast from @{sharedCast.author?.username || sharedCast.author?.fid}
        </h1>
        <p>Cast Hash: {sharedCast.hash}</p>
        {sharedCast.timestamp && (
          <p>
            Timestamp: {new Date(sharedCast.timestamp * 1000).toLocaleString()}
          </p>
        )}
        {/* Add more cast-specific UI here */}
      </div>
    );
  }

  // Fallback: show info from URL params if available
  if (urlParams.castHash && urlParams.castFid) {
    return (
      <div style={{ padding: 32 }}>
        <h1>Cast from FID {urlParams.castFid}</h1>
        <p>Cast Hash: {urlParams.castHash}</p>
        {urlParams.viewerFid && (
          <p>Shared by viewer FID: {urlParams.viewerFid}</p>
        )}
        <p>Waiting for Farcaster context...</p>
      </div>
    );
  }

  // Default fallback UI
  return (
    <div style={{ padding: 32 }}>
      No shared cast detected. This page is intended for Farcaster share
      extension.
    </div>
  );
}