"use client";
import { Playlist, Song } from "@/types/music";
import { Card } from "../ui/Card";
import { useGetPlaylistNFT } from "@/lib/contracts";
import { useState, useEffect } from "react";
import { getPlaylist } from "@/lib/subgraph";
import { PlaylistSubgraphData } from "@/lib/subgraph";
import { Image as ImageIcon, Loader2 } from "lucide-react";

export function PlaylistView({ playlist }: { playlist: Playlist }) {
  const { name, description, coverImage, tags, address } = playlist;
  const [songs, setSongs] = useState<Song[]>([]);
  const [subgraphData, setSubgraphData] = useState<PlaylistSubgraphData | null>(
    null
  );
  const [isLoadingSubgraph, setIsLoadingSubgraph] = useState(false);
  const [imageLoadError, setImageLoadError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  // For now, we'll use ID 0 as a placeholder since we need to determine the playlist ID
  // In a real implementation, you'd pass the playlist ID or fetch it from the contract
  const { data: playlistData, isLoading: isLoadingPlaylist } =
    useGetPlaylistNFT(undefined);

  // Try to fetch data from subgraph if we have an address
  useEffect(() => {
    if (address) {
      setIsLoadingSubgraph(true);
      getPlaylist(address)
        .then((data) => {
          if (data?.playlist) {
            setSubgraphData(data.playlist);
          }
        })
        .catch((error) => {
          console.warn("Could not fetch playlist from subgraph:", error);
        })
        .finally(() => {
          setIsLoadingSubgraph(false);
        });
    }
  }, [address]);

  useEffect(() => {
    if (playlistData) {
      // Convert the contract data to Song format
      const contractSongs = playlistData.songs.map(
        (songId: string, index: number) => ({
          id: songId,
          title: songId, // We'd need to fetch actual song data from another source
          artist: playlistData.artists[index] || "Unknown Artist",
          cover: playlistData.coverImageUrl || "/placeholder-song.jpg",
          creatorAddress: playlistData.artists[index] || "0x0",
          audioUrl: "", // This would need to be fetched from song metadata
          playCount: 0, // This would need to be fetched from song metadata
          platformName: "Playlist",
        })
      );
      setSongs(contractSongs);
    } else if (subgraphData) {
      // Convert subgraph data to Song format
      const subgraphSongs = subgraphData.songs.map(
        (songId: string, index: number) => ({
          id: songId,
          title: songId,
          artist: subgraphData.artists[index] || "Unknown Artist",
          cover: subgraphData.coverImageUrl || "/placeholder-song.jpg",
          creatorAddress: subgraphData.artists[index] || "0x0",
          audioUrl: "",
          playCount: 0,
          platformName: "Playlist",
        })
      );
      setSongs(subgraphSongs);
    }
  }, [playlistData, subgraphData]);

  // If we have a playlist address, we might need to query it differently
  // For now, we'll show the playlist info and a placeholder for songs
  const isLoadingSongs = isLoadingPlaylist || isLoadingSubgraph;
  const displayData = playlistData || subgraphData;

  return (
    <Card title={name || "Your Playlist"}>
      {coverImage && (
        <div className="mb-4">
          {imageLoading && !imageLoadError && (
            <div className="w-32 h-32 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          )}
          {imageLoadError && (
            <div className="w-32 h-32 bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-700 rounded flex flex-col items-center justify-center p-4">
              <ImageIcon className="w-12 h-12 text-red-400 mb-1" />
              <p className="text-xs text-red-600 dark:text-red-400 text-center">
                Failed to load
              </p>
            </div>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={coverImage}
            alt="Playlist cover"
            className={`w-32 h-32 object-cover rounded ${
              imageLoading && !imageLoadError ? "hidden" : ""
            } ${imageLoadError ? "hidden" : ""}`}
            onLoad={() => {
              setImageLoading(false);
              setImageLoadError(false);
            }}
            onError={() => {
              setImageLoading(false);
              setImageLoadError(true);
            }}
          />
        </div>
      )}
      <div className="mb-2 text-[var(--app-foreground-muted)]">
        {description}
      </div>
      <div className="flex flex-wrap gap-2 mb-4">
        {tags.map((tag: string, idx: number) => (
          <span
            key={idx}
            className="bg-[var(--app-accent-light)] text-[var(--app-accent)] px-2 py-1 rounded text-xs"
          >
            {tag}
          </span>
        ))}
      </div>

      {address && (
        <div className="mb-4 text-xs text-[var(--app-foreground-muted)]">
          <strong>Contract Address:</strong> {address}
        </div>
      )}

      <h4 className="font-medium mb-2">Playlist Songs</h4>
      {isLoadingSongs ? (
        <div>Loading songs...</div>
      ) : displayData ? (
        <div>
          <p className="text-sm text-[var(--app-foreground-muted)] mb-2">
            {displayData.songs.length} songs • Created by {displayData.creator}
          </p>
          {displayData.songs.length === 0 ? (
            <div className="text-[var(--app-foreground-muted)]">
              No songs in this playlist yet.
            </div>
          ) : (
            <ul className="space-y-3">
              {songs.map((song: Song, index: number) => (
                <li
                  key={song.id}
                  className="flex items-center gap-3 border-b pb-2"
                >
                  <div className="w-12 h-12 bg-[var(--app-accent-light)] rounded flex items-center justify-center">
                    <span className="text-[var(--app-accent)] font-bold">
                      {index + 1}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="font-medium flex items-center gap-2">
                      {song.id}
                      <span className="text-xs text-[var(--app-foreground-muted)]">
                        by {song.artist}
                      </span>
                    </div>
                    <div className="text-xs text-[var(--app-foreground-muted)]">
                      Song ID: {song.id}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <div className="text-[var(--app-foreground-muted)]">
          This playlist was created through the Create2Factory. To view songs,
          you&apos;ll need to interact with the deployed playlist contract
          directly.
        </div>
      )}
    </Card>
  );
}
