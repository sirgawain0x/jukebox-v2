"use client";

import { useEffect, useState, Suspense } from "react";

// Disable static generation for this page since it uses Farcaster SDK
export const dynamic = 'force-dynamic';
import { useSearchParams } from "next/navigation";
// import { sdk } from "@farcaster/miniapp-sdk";
import { handleSplashScreen } from "../utils/farcaster";
import { useComposeCast } from "@coinbase/onchainkit/minikit";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Icon } from "../components/ui/Icon";

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
  const { composeCast } = useComposeCast();
  const [isShareContext, setIsShareContext] = useState(false);
  const [sharedCast, setSharedCast] = useState<MiniappCast | null>(null);
  const [loading, setLoading] = useState(true);
  const [urlParams, setUrlParams] = useState<{
    castHash: string | null;
    castFid: string | null;
    viewerFid: string | null;
  }>({ castHash: null, castFid: null, viewerFid: null });

  // Helper function to share back to Farcaster with mentions
  const handleShareBack = (text: string, _mentions: MiniappUser[] = []) => {
    composeCast({
      text,
      embeds: [window.location.href]
    });
  };

  // Helper function to create a mention from cast author
  const createAuthorMention = (cast: MiniappCast): MiniappUser | null => {
    if (!cast.author?.fid) return null;
    
    return {
      fid: cast.author.fid,
      username: cast.author.username,
      displayName: cast.author.displayName,
      pfpUrl: cast.author.pfpUrl
    };
  };

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
    const authorMention = createAuthorMention(sharedCast);
    const allMentions = [
      ...(authorMention ? [authorMention] : []),
      ...(sharedCast.mentions || [])
    ];

    return (
      <div className="p-6 max-w-2xl mx-auto space-y-6">
        <Card title="🎵 Shared Cast from Jukebox">
          <div className="space-y-4">
            {/* Cast Author Info */}
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              {sharedCast.author?.pfpUrl && (
                <img 
                  src={sharedCast.author.pfpUrl} 
                  alt="Author profile" 
                  className="w-12 h-12 rounded-full"
                />
              )}
              <div>
                <h3 className="font-semibold">
                  @{sharedCast.author?.username || sharedCast.author?.fid}
                </h3>
                {sharedCast.author?.displayName && (
                  <p className="text-sm text-gray-600">{sharedCast.author.displayName}</p>
                )}
              </div>
            </div>

            {/* Cast Details */}
            <div className="space-y-2 text-sm">
              <p><strong>Cast Hash:</strong> {sharedCast.hash}</p>
              {sharedCast.timestamp && (
                <p><strong>Shared:</strong> {new Date(sharedCast.timestamp * 1000).toLocaleString()}</p>
              )}
              {sharedCast.mentions && sharedCast.mentions.length > 0 && (
                <div>
                  <strong>Mentions:</strong>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {sharedCast.mentions.map((mention, index) => (
                      <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                        @{mention.username || mention.fid}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                onClick={() => handleShareBack(
                  `🎵 Thanks for sharing this cast! Check out Jukebox for more amazing music discovery 🎶`,
                  authorMention ? [authorMention] : []
                )}
                icon={<Icon name="share" size="sm" />}
              >
                Share Back
              </Button>
              
              <Button
                onClick={() => handleShareBack(
                  `🎵 Discovered this through Jukebox! Supporting artists directly on the blockchain 🎶✨`,
                  allMentions
                )}
                variant="outline"
                icon={<Icon name="music" size="sm" />}
              >
                Share Jukebox
              </Button>
            </div>
          </div>
        </Card>

        {/* Link to main app */}
        <Card title="🎶 Explore Jukebox">
          <p className="text-gray-600 mb-4">
            Discover more amazing music and support artists directly on the blockchain.
          </p>
          <Button
            onClick={() => window.location.href = '/'}
            icon={<Icon name="arrow-right" size="sm" />}
          >
            Go to Jukebox
          </Button>
        </Card>
      </div>
    );
  }

  // Fallback: show info from URL params if available
  if (urlParams.castHash && urlParams.castFid) {
    return (
      <div className="p-6 max-w-2xl mx-auto space-y-6">
        <Card title="🎵 Shared Cast">
          <div className="space-y-4">
            <div className="space-y-2 text-sm">
              <p><strong>Cast from FID:</strong> {urlParams.castFid}</p>
              <p><strong>Cast Hash:</strong> {urlParams.castHash}</p>
              {urlParams.viewerFid && (
                <p><strong>Shared by viewer FID:</strong> {urlParams.viewerFid}</p>
              )}
            </div>
            <p className="text-gray-600">Waiting for Farcaster context...</p>
            <Button
              onClick={() => window.location.href = '/'}
              icon={<Icon name="arrow-right" size="sm" />}
            >
              Go to Jukebox
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Default fallback UI
  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <Card title="🎶 Welcome to Jukebox">
        <div className="space-y-4">
          <p className="text-gray-600">
            No shared cast detected. This page is intended for Farcaster share extension.
          </p>
          <p className="text-gray-600">
            Discover amazing music and support artists directly on the blockchain.
          </p>
          <Button
            onClick={() => window.location.href = '/'}
            icon={<Icon name="arrow-right" size="sm" />}
          >
            Explore Jukebox
          </Button>
        </div>
      </Card>
    </div>
  );
}
