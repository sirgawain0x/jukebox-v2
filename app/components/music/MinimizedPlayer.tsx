"use client";
import React, { useState, useRef, useCallback, useEffect } from 'react';
import Image from 'next/image';
import { useMusic } from '@/app/contexts/MusicContext';
import { Icon } from '../ui/Icon';
import { AnimatedAudioIndicator } from '../ui/AnimatedAudioIndicator';

export function MinimizedPlayer() {
  const {
    selectedSong,
    isPlaying,
    audioLoading,
    playQueue,
    isMinimized,
    setIsMinimized,
    togglePlayPause,
    handleNextSong,
    closePlayer,
    audioRef,
  } = useMusic();


  const [showControls, setShowControls] = useState(true);
  const fadeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const titleContainerRef = useRef<HTMLDivElement>(null);
  const [shouldScroll, setShouldScroll] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);


  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };


  // Handle showing the volume slider

  // Handle showing controls
  const handleShowControls = useCallback(() => {
    setShowControls(true);

    // Clear any existing fade timeout
    if (fadeTimeoutRef.current) {
      clearTimeout(fadeTimeoutRef.current);
    }

    // Only set fade timeout if currently playing
    if (isPlaying) {
      fadeTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
        fadeTimeoutRef.current = null;
      }, 3000);
    }
  }, [isPlaying]);

  // Auto-hide controls on mount and when playing changes
  React.useEffect(() => {
    handleShowControls();

    // Cleanup on unmount
    return () => {
      if (fadeTimeoutRef.current) {
        clearTimeout(fadeTimeoutRef.current);
      }
    };
  }, [handleShowControls, isPlaying]);

  // Update progress bar
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
    };
  }, [audioRef]);

  // Check if title should scroll
  useEffect(() => {
    const checkOverflow = () => {
      if (titleContainerRef.current && selectedSong?.title) {
        // Create a temporary element to measure the text
        const temp = document.createElement('div');
        temp.style.cssText = 'position: absolute; visibility: hidden; white-space: nowrap; font-size: 0.875rem; font-weight: 500;';
        temp.textContent = selectedSong.title;
        document.body.appendChild(temp);

        const textWidth = temp.offsetWidth;
        const containerWidth = titleContainerRef.current.clientWidth;
        const isOverflowing = textWidth > containerWidth;

        document.body.removeChild(temp);
        setShouldScroll(isOverflowing);
      }
    };

    // Small delay to ensure accurate measurements after render and fonts load
    const timeout = setTimeout(checkOverflow, 100);
    window.addEventListener('resize', checkOverflow);

    return () => {
      clearTimeout(timeout);
      window.removeEventListener('resize', checkOverflow);
    };
  }, [selectedSong?.title]);

  if (!selectedSong || !isMinimized) {
    return null;
  }

  return (
    <div
      className="fixed bottom-4 left-4 right-4 z-50 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border border-gray-200 dark:border-gray-800 rounded-lg shadow-lg p-3 animate-slide-up"
      onMouseEnter={handleShowControls}
      onMouseMove={handleShowControls}
      onTouchStart={handleShowControls}
    >
      <div className="flex items-center gap-3">
        {/* Album Art */}
        {selectedSong.cover ? (
          <Image
            src={selectedSong.cover}
            alt={selectedSong.title}
            width={48}
            height={48}
            className="w-12 h-12 rounded-lg object-cover cursor-pointer"
            unoptimized
            onClick={() => setIsMinimized(false)}
          />
        ) : (
          <div
            className="w-12 h-12 rounded-lg bg-gray-200 dark:bg-gray-800 flex items-center justify-center cursor-pointer"
            onClick={() => setIsMinimized(false)}
          >
            <Icon name="star" size="sm" className="text-gray-400 dark:text-gray-600" />
          </div>)}

        {/* Song Info */}
        <div
          ref={titleContainerRef}
          className="flex-1 min-w-0 cursor-pointer overflow-hidden"
          onClick={() => setIsMinimized(false)}
        >
          {shouldScroll ? (
            <div className="font-medium text-sm animate-marquee dark:text-white">
              <span className="inline-block pr-8">{selectedSong.title}</span>
              <span className="inline-block pr-8">{selectedSong.title}</span>
            </div>
          ) : (
            <div className="font-medium text-sm truncate dark:text-white">{selectedSong.title}</div>
          )}
          <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{selectedSong.artist}</div>
          {/* Time display */}
          <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">

          {/* Play/Pause button with animated indicator behind it */}
          <div className="relative">
            {/* Audio indicator - stays visible, positioned behind the button */}
            {isPlaying && (
              <div className="absolute inset-0 flex items-center justify-center z-0 pointer-events-none">
                <AnimatedAudioIndicator
                  isPlaying={isPlaying}
                  size="sm"
                  className="text-blue-500 dark:text-blue-400 opacity-60"
                  variant="bars"
                />
              </div>
            )}

            {/* Button with fade effect */}
            <button
              onClick={togglePlayPause}
              className={`relative z-10 w-11 h-11 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-all duration-500 ease-in-out cursor-pointer dark:text-white ${showControls || !isPlaying ? 'opacity-100' : 'opacity-0'
                }`}
              title={isPlaying ? "Pause" : "Play"}
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {audioLoading ? (
                <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
              ) : (
                <Icon name={isPlaying ? "pause" : "play"} size="sm" />
              )}
            </button>
          </div>

          <button
            onClick={handleNextSong}
            disabled={playQueue.length <= 1}
            className="w-11 h-11 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer dark:text-white"
            title="Next song"
            aria-label="Next song"
          >
            <Icon name="fast-forward" size="sm" />
          </button>

          {/* Close button */}
          <button
            onClick={closePlayer}
            className="w-11 h-11 flex items-center justify-center hover:bg-red-100 rounded transition-colors cursor-pointer text-gray-500 hover:text-red-600"
            title="Close player"
            aria-label="Close player"
          >
            <Icon name="x" size="sm" />
          </button>
        </div>
      </div>
    </div>
  );
}

