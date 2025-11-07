"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import type { KeyboardEvent } from "react";
import Image from "next/image";
import type { TrendingTrack } from "@/lib/trending-songs";

export interface SongPickerProps {
  songs: TrendingTrack[];
  selectedSongId?: string;
  onSelect: (song: TrendingTrack) => void;
  disabled?: boolean;
  isLoading?: boolean;
  placeholder?: string;
}

export function SongPicker({
  songs,
  selectedSongId,
  onSelect,
  disabled = false,
  isLoading = false,
  placeholder = "Select a song",
}: SongPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number>(() => songs.findIndex((song) => song.id === selectedSongId));
  const containerRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const listboxId = useMemo(() => `song-picker-${Math.random().toString(36).slice(2)}`, []);

  const selectedSong = songs.find((song) => song.id === selectedSongId) ?? null;

  useEffect(() => {
    setActiveIndex((prev) => {
      const next = songs.findIndex((song) => song.id === selectedSongId);
      if (next === -1) {
        if (prev >= 0 && prev < songs.length) return prev;
        return songs.length ? 0 : -1;
      }
      return next;
    });
  }, [songs, selectedSongId]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
      return () => document.removeEventListener("mousedown", handleOutsideClick);
    }

    return undefined;
  }, [isOpen]);

  const handleToggle = () => {
    if (disabled || isLoading) return;
    setIsOpen((prev) => !prev);
  };

  const focusOption = (index: number) => {
    if (!songs.length) return;
    const nextIndex = (index + songs.length) % songs.length;
    setActiveIndex(nextIndex);
    const option = document.getElementById(`${listboxId}-option-${nextIndex}`);
    option?.scrollIntoView({ block: "nearest" });
  };

  const handleTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (disabled || isLoading) return;

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        if (!isOpen) setIsOpen(true);
        focusOption(activeIndex >= 0 ? activeIndex + 1 : 0);
        break;
      case "ArrowUp":
        event.preventDefault();
        if (!isOpen) setIsOpen(true);
        focusOption(activeIndex >= 0 ? activeIndex - 1 : songs.length - 1);
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else if (activeIndex >= 0 && songs[activeIndex]) {
          onSelect(songs[activeIndex]);
          setIsOpen(false);
        }
        break;
      case "Escape":
        if (isOpen) {
          event.preventDefault();
          setIsOpen(false);
        }
        break;
      default:
        break;
    }
  };

  const handleListKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (disabled || isLoading) return;

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        focusOption(activeIndex + 1);
        break;
      case "ArrowUp":
        event.preventDefault();
        focusOption(activeIndex - 1);
        break;
      case "Home":
        event.preventDefault();
        focusOption(0);
        break;
      case "End":
        event.preventDefault();
        focusOption(songs.length - 1);
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        if (activeIndex >= 0 && songs[activeIndex]) {
          onSelect(songs[activeIndex]);
          setIsOpen(false);
          triggerRef.current?.focus();
        }
        break;
      case "Escape":
        event.preventDefault();
        setIsOpen(false);
        triggerRef.current?.focus();
        break;
      default:
        break;
    }
  };

  const handleOptionClick = (song: TrendingTrack, index: number) => {
    if (disabled) return;
    onSelect(song);
    setIsOpen(false);
    setActiveIndex(index);
    triggerRef.current?.focus();
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        className={`flex w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-left text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${disabled || isLoading ? "cursor-not-allowed opacity-60" : "hover:border-[#0052ff]"}`}
        onClick={handleToggle}
        onKeyDown={handleTriggerKeyDown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={isOpen ? listboxId : undefined}
        disabled={disabled}
      >
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {selectedSong?.cover ? (
            <Image
              src={selectedSong.cover}
              alt={selectedSong.title}
              width={40}
              height={40}
              className="h-10 w-10 rounded object-cover"
              unoptimized
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded bg-[#f0f4ff] text-xs text-[#0052ff]">
              🎵
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-[#111111]">
              {selectedSong ? selectedSong.title : placeholder}
            </p>
            <p className="truncate text-xs text-(--app-foreground-muted)">
              {selectedSong ? selectedSong.artist : "Choose a song from the list"}
            </p>
          </div>
        </div>
        <span className="ml-2 text-xs text-(--app-foreground-muted)">{isOpen ? "▲" : "▼"}</span>
      </button>

      {isOpen && (
        <div
          role="listbox"
          id={listboxId}
          tabIndex={-1}
          aria-activedescendant={activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined}
          onKeyDown={handleListKeyDown}
          className="absolute z-20 mt-2 max-h-64 w-full overflow-y-auto rounded-md border border-[rgba(0,0,0,0.1)] bg-white shadow-lg focus:outline-none"
        >
          {isLoading ? (
            <div className="px-3 py-4 text-sm text-(--app-foreground-muted)">Loading songs...</div>
          ) : songs.length === 0 ? (
            <div className="px-3 py-4 text-sm text-(--app-foreground-muted)">No songs available</div>
          ) : (
            songs.map((song, index) => {
              const isActive = index === activeIndex;
              const isSelected = song.id === selectedSongId;

              return (
                <div
                  key={song.id}
                  id={`${listboxId}-option-${index}`}
                  role="option"
                  aria-selected={isSelected}
                  tabIndex={-1}
                  className={`flex cursor-pointer items-center gap-3 px-3 py-2 text-sm transition ${isActive ? "bg-[#f0f4ff]" : "hover:bg-[#f5f5f5]"}`}
                  onMouseEnter={() => focusOption(index)}
                  onClick={() => handleOptionClick(song, index)}
                >
                  {song.cover ? (
                    <Image
                      src={song.cover}
                      alt={song.title}
                      width={36}
                      height={36}
                      className="h-9 w-9 rounded object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-9 w-9 items-center justify-center rounded bg-[#f0f4ff] text-xs text-[#0052ff]">
                      🎵
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[#111111]">{song.title}</p>
                    <p className="truncate text-xs text-(--app-foreground-muted)">{song.artist}</p>
                  </div>
                  {isSelected && <span className="text-xs text-[#0052ff]">Selected</span>}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
