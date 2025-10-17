"use client";

import { useState, useCallback } from "react";
import { Song } from "@/types/music";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Icon } from "../ui/Icon";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  hasFarcasterProfile,
  lookupArtistFid,
  lookupFidByAddress
} from "@/app/utils/farcaster-artist";

interface ArtistProfileProps {
  song: Song;
  onUpdate?: (updatedSong: Song) => void;
  showEditButton?: boolean;
}

export function ArtistProfile({ song, onUpdate, showEditButton = true }: ArtistProfileProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [artistFid, setArtistFid] = useState(song.artistFid?.toString() || "");
  const [artistUsername, setArtistUsername] = useState(song.artistUsername || "");
  const [artistPfpUrl, setArtistPfpUrl] = useState(song.artistPfpUrl || "");

  const handleSave = useCallback(async () => {
    setIsLoading(true);
    try {
      const updatedSong: Song = {
        ...song,
        artistFid: artistFid ? parseInt(artistFid) : undefined,
        artistUsername: artistUsername || undefined,
        artistPfpUrl: artistPfpUrl || undefined,
      };
      
      onUpdate?.(updatedSong);
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating artist profile:", error);
    } finally {
      setIsLoading(false);
    }
  }, [song, artistFid, artistUsername, artistPfpUrl, onUpdate]);

  const handleAutoLookup = useCallback(async () => {
    setIsLoading(true);
    try {
      // Try to lookup by artist name first
      let farcasterInfo = await lookupArtistFid(song.artist);
      
      // If no Farcaster profile found by name, try by wallet address
      if (!farcasterInfo.hasFarcaster) {
        farcasterInfo = await lookupFidByAddress(song.creatorAddress);
      }
      
      if (farcasterInfo.hasFarcaster) {
        setArtistFid(farcasterInfo.fid?.toString() || "");
        setArtistUsername(farcasterInfo.username || "");
        setArtistPfpUrl(farcasterInfo.pfpUrl || "");
      } else {
        // Clear fields if no Farcaster profile found
        setArtistFid("");
        setArtistUsername("");
        setArtistPfpUrl("");
        // You could show a toast or notification here
        console.log(`No Farcaster profile found for ${song.artist} (${song.creatorAddress})`);
      }
    } catch (error) {
      console.error("Error looking up artist:", error);
    } finally {
      setIsLoading(false);
    }
  }, [song.artist, song.creatorAddress]);

  const handleCancel = useCallback(() => {
    setArtistFid(song.artistFid?.toString() || "");
    setArtistUsername(song.artistUsername || "");
    setArtistPfpUrl(song.artistPfpUrl || "");
    setIsEditing(false);
  }, [song]);

  if (!isEditing) {
    return (
      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
        {song.artistPfpUrl && (
          <img 
            src={song.artistPfpUrl} 
            alt={`${song.artist} profile`} 
            className="w-10 h-10 rounded-full"
          />
        )}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium">{song.artist}</span>
            {hasFarcasterProfile(song) ? (
              <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs">
                @{song.artistUsername || song.artistFid}
              </span>
            ) : (
              <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                No Farcaster
              </span>
            )}
          </div>
          {song.artistUsername ? (
            <p className="text-sm text-gray-600">@{song.artistUsername}</p>
          ) : (
            <p className="text-sm text-gray-500">Wallet: {song.creatorAddress.slice(0, 6)}...{song.creatorAddress.slice(-4)}</p>
          )}
        </div>
        {showEditButton && (
          <Button
            onClick={() => setIsEditing(true)}
            variant="outline"
            size="sm"
            icon={<Icon name="edit" size="sm" />}
          >
            Edit
          </Button>
        )}
      </div>
    );
  }

  return (
    <Card title={`Edit ${song.artist} Profile`}>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="artistFid">Farcaster FID</Label>
          <Input
            id="artistFid"
            type="number"
            value={artistFid}
            onChange={(e) => setArtistFid(e.target.value)}
            placeholder="Enter Farcaster FID"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="artistUsername">Farcaster Username</Label>
          <Input
            id="artistUsername"
            value={artistUsername}
            onChange={(e) => setArtistUsername(e.target.value)}
            placeholder="Enter Farcaster username"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="artistPfpUrl">Profile Picture URL</Label>
          <Input
            id="artistPfpUrl"
            value={artistPfpUrl}
            onChange={(e) => setArtistPfpUrl(e.target.value)}
            placeholder="Enter profile picture URL"
          />
        </div>

        <div className="flex gap-3">
          <Button
            onClick={handleSave}
            disabled={isLoading}
            icon={<Icon name="save" size="sm" />}
          >
            {isLoading ? "Saving..." : "Save"}
          </Button>
          
          <Button
            onClick={handleAutoLookup}
            disabled={isLoading}
            variant="outline"
            icon={<Icon name="search" size="sm" />}
          >
            Auto Lookup
          </Button>
          
          <Button
            onClick={handleCancel}
            variant="outline"
            icon={<Icon name="x" size="sm" />}
          >
            Cancel
          </Button>
        </div>
      </div>
    </Card>
  );
}

interface ArtistProfileListProps {
  songs: Song[];
  onSongUpdate?: (updatedSong: Song) => void;
}

export function ArtistProfileList({ songs, onSongUpdate }: ArtistProfileListProps) {
  const [expandedArtist, setExpandedArtist] = useState<string | null>(null);

  // Group songs by artist
  const songsByArtist = songs.reduce((acc, song) => {
    if (!acc[song.artist]) {
      acc[song.artist] = [];
    }
    acc[song.artist].push(song);
    return acc;
  }, {} as Record<string, Song[]>);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Artist Profiles</h3>
      {Object.entries(songsByArtist).map(([artist, artistSongs]) => {
        const firstSong = artistSongs[0];
        const isExpanded = expandedArtist === artist;
        
        return (
          <div key={artist} className="border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {firstSong.artistPfpUrl && (
                  <img 
                    src={firstSong.artistPfpUrl} 
                    alt={`${artist} profile`} 
                    className="w-8 h-8 rounded-full"
                  />
                )}
                <div>
                  <h4 className="font-medium">{artist}</h4>
                  <p className="text-sm text-gray-600">
                    {artistSongs.length} song{artistSongs.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {hasFarcasterProfile(firstSong) ? (
                  <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded text-xs">
                    Connected
                  </span>
                ) : (
                  <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded text-xs">
                    No Farcaster
                  </span>
                )}
                <Button
                  onClick={() => setExpandedArtist(isExpanded ? null : artist)}
                  variant="outline"
                  size="sm"
                  icon={<Icon name={isExpanded ? "chevron-up" : "chevron-down"} size="sm" />}
                >
                  {isExpanded ? "Hide" : "Edit"}
                </Button>
              </div>
            </div>
            
            {isExpanded && (
              <div className="mt-4">
                <ArtistProfile
                  song={firstSong}
                  onUpdate={(updatedSong) => {
                    // Update all songs for this artist
                    artistSongs.forEach(song => {
                      const updatedSongForArtist = {
                        ...song,
                        artistFid: updatedSong.artistFid,
                        artistUsername: updatedSong.artistUsername,
                        artistPfpUrl: updatedSong.artistPfpUrl,
                      };
                      onSongUpdate?.(updatedSongForArtist);
                    });
                  }}
                  showEditButton={false}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
