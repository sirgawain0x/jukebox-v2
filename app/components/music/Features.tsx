"use client";
import { useEffect } from "react";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Icon } from "../ui/Icon";
import { useMusic } from "@/app/contexts/MusicContext";

type FeaturesProps = {
  setActiveTab: (tab: string) => void;
};

export function Features({ setActiveTab }: FeaturesProps) {
  const { setIsMinimized, selectedSong } = useMusic();

  // Minimize player when navigating to features page
  useEffect(() => {
    if (selectedSong) {
      setIsMinimized(true);
    }
  }, [setIsMinimized, selectedSong]);

  return (
    <div className="space-y-6 animate-fade-in">
      <Card title="How to Use Jukebox">
        <div className="space-y-6 mb-6">
          <section>
            <h3 className="font-semibold text-(--app-foreground) flex items-center gap-2 mb-2">
              <Icon name="music" className="text-(--app-accent)" /> Listen
            </h3>
            <p className="text-(--app-foreground-muted) text-sm pl-7">
              Explore the Jukebox to discover independent artists. Click play to start streaming on-chain music directly.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-(--app-foreground) flex items-center gap-2 mb-2">
              <Icon name="heart" className="text-(--app-accent)" /> Support
            </h3>
            <p className="text-(--app-foreground-muted) text-sm pl-7">
              Love a track? Send a direct tip to the artist using USDC. Your support goes directly to the creator.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-(--app-foreground) flex items-center gap-2 mb-2">
              <Icon name="trending-up" className="text-(--app-accent)" /> Predict
            </h3>
            <p className="text-(--app-foreground-muted) text-sm pl-7">
              Think you know what&apos;s next? Bet on which songs will climb the charts in the Prediction Markets.
            </p>
          </section>
        </div>

        <Button variant="outline" onClick={() => setActiveTab("home")} className="w-full">
          Back to Home
        </Button>
      </Card>
    </div>
  );
}
