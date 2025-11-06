"use client";
import { useState, useCallback, useEffect } from "react";
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
import { PredictionMarket } from "../prediction/PredictionMarket";
import { MyBets } from "../prediction/MyBets";
import { MarketLeaderboard } from "../prediction/MarketLeaderboard";
import { CreateMarket } from "../prediction/CreateMarket";

type HomeProps = {
  setActiveTab: (tab: string) => void;
  initialSection?: "music" | "predictions";
};

export function Home({ setActiveTab, initialSection = "music" }: HomeProps) {
  const { isConnected } = useAccount();
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [activeSection, setActiveSection] = useState<"music" | "predictions">(initialSection);

  const handleSongTipped = () => {
    // Songs are now managed by the PlaylistView component via contract
  };
  const handlePlaylistCreate = useCallback((pl: Playlist) => {
    setPlaylist(pl);
  }, []);
  const artistId =
    selectedSong?.artist || "sound-0x7e4c2e6e6e2e2e2e2e2e2e2e2e2e2e2e2e2e2e2e";

  // Sync activeSection when initialSection prop changes
  useEffect(() => {
    setActiveSection(initialSection);
  }, [initialSection]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Section Tabs */}
      <Card>
        <div className="flex gap-2">
          <Button
            variant={activeSection === "music" ? "primary" : "outline"}
            onClick={() => setActiveSection("music")}
            className="flex-1"
          >
            <Icon name="music" size="sm" className="mr-2" />
            Music
          </Button>
          <Button
            variant={activeSection === "predictions" ? "primary" : "outline"}
            onClick={() => setActiveSection("predictions")}
            className="flex-1"
          >
            <Icon name="trending-up" size="sm" className="mr-2" />
            Predictions
          </Button>
        </div>
      </Card>

      {activeSection === "music" && (
        <>
          <Card title="🎵 Jukebox">
            <p className="text-(--app-foreground-muted) mb-4">
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
        </>
      )}

      {activeSection === "predictions" && (
        <>
          <ErrorBoundary>
            <CreateMarket />
          </ErrorBoundary>
          <ErrorBoundary>
            <PredictionMarket />
          </ErrorBoundary>
          <ErrorBoundary>
            <MyBets />
          </ErrorBoundary>
          <ErrorBoundary>
            <MarketLeaderboard />
          </ErrorBoundary>
        </>
      )}
    </div>
  );
}
