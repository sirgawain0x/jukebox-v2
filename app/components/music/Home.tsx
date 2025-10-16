"use client";
import { useState, useCallback } from "react";
import { useAccount } from "wagmi";
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
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);

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
      <Card title="🎵 Jukebox">
        <p className="text-[var(--app-foreground-muted)] mb-4">
          Discover and support independent
          artists through on-chain music streaming and direct creator tips.
        </p>
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
