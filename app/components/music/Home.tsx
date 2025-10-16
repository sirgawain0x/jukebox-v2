"use client";
import { useState, useCallback } from "react";
import { useAccount } from "wagmi";
import { useIsInMiniApp } from "@coinbase/onchainkit/minikit";
import { Playlist, Song } from "@/types/music";
import { Button } from "../ui/Button";
import { Icon } from "../ui/Icon";
import { Card } from "../ui/Card";
import { Jukebox } from "./Jukebox";
import { PlaylistSection } from "./PlaylistSection";
import { PlaylistView } from "./PlaylistView";
import { RecentTips } from "./RecentTips";
import { UserBalances } from "./UserBalances";
import { ErrorBoundary } from "../ui/ErrorBoundary";
// import ProtectedExample from "../examples/ProtectedExample";

type HomeProps = {
  setActiveTab: (tab: string) => void;
};

export function Home({ setActiveTab }: HomeProps) {
  const { isConnected } = useAccount();
  const isInMiniApp = useIsInMiniApp();
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);

  // More accurate Mini App detection - check for actual Farcaster environment
  const isActuallyInMiniApp = isInMiniApp && 
    (typeof window !== 'undefined' && 
     (window.location.href.includes('farcaster.xyz') ||
      window.location.href.includes('warpcast.com') ||
      window.navigator.userAgent.includes('Farcaster') ||
      window.navigator.userAgent.includes('Warpcast') ||
      // Check for MiniKit specific environment variables or properties
      (window as any).farcaster ||
      (window as any).minikit));

  const handleSongTipped = () => {
    // Songs are now managed by the PlaylistView component via contract
  };
  const handlePlaylistCreate = useCallback((pl: Playlist) => {
    setPlaylist(pl);
  }, []);
  const artistId =
    selectedSong?.artist || "sound-0x7e4c2e6e6e2e2e2e2e2e2e2e2e2e2e2e2e2e2e2e";

  return (
    <div className="space-y-6 animate-fade-in">
      <Card title={isActuallyInMiniApp ? "🎵 Jukebox (Mini App)" : "Jukebox 🎵"}>
        <p className="text-[var(--app-foreground-muted)] mb-4">
          Discover and support independent
          artists through on-chain music streaming and direct creator tips.
        </p>
        {/* Mini App exclusive features indicator */}
        {isActuallyInMiniApp && (
          <div className="bg-gradient-to-r from-purple-100 to-blue-100 border border-purple-200 rounded-lg p-3 mb-4">
            <div className="flex items-center space-x-2">
              <Icon name="star" size="sm" className="text-purple-600" />
              <span className="text-sm font-medium text-purple-800">Mini App Exclusive Features</span>
            </div>
            <div className="mt-2 text-xs text-purple-600">
              Enhanced sharing, auto-connection, and Farcaster integration enabled
            </div>
          </div>
        )}
        <div className="flex gap-3 flex-wrap">
          <Button
            onClick={() => setActiveTab("features")}
            icon={<Icon name="arrow-right" size="sm" />}
          >
            Explore Features
          </Button>
          <Button
            onClick={() => setActiveTab("fund")}
            variant="outline"
            icon={<Icon name="plus" size="sm" />}
            disabled={!isConnected}
          >
            {isConnected ? "Add Funds" : "Add Funds"}
          </Button>
        </div>
      </Card>
      <ErrorBoundary>
        <UserBalances />
      </ErrorBoundary>
      <ErrorBoundary>
        <Jukebox
          onSongTipped={handleSongTipped}
          setSelectedSong={setSelectedSong}
          playlist={playlist}
        />
      </ErrorBoundary>
      <ErrorBoundary>
        <PlaylistSection onCreate={handlePlaylistCreate} created={!!playlist} />
      </ErrorBoundary>
      {playlist && (
        <ErrorBoundary>
          <div>
            <PlaylistView playlist={playlist} />
            <RecentTips artistId={artistId} />
          </div>
        </ErrorBoundary>
      )}

      {/* Example of Protected Feature - temporarily disabled */}
      {/* <ProtectedExample /> */}
    </div>
  );
}
