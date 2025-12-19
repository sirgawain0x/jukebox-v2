"use client";
import React, { createContext, useContext, useState, useRef, useEffect, useCallback, ReactNode } from 'react';
import { Song } from '@/types/music';
import {
  createPlayTrackingState,
  startPlayTracking,
  updatePlayProgress,
  pausePlayTracking,
  endPlayTracking,
  reportPlayEvent,
  resetIfExpired,
  type PlayTrackingState,
} from '@/lib/play-tracking';
import { useAccount } from 'wagmi';

interface MusicContextType {
  // Player state
  selectedSong: Song | null;
  isPlaying: boolean;
  audioLoading: boolean;
  volume: number;
  isMuted: boolean;
  
  // Queue management
  playQueue: Song[];
  currentQueueIndex: number;
  isAutoPlayEnabled: boolean;
  
  // Player controls
  setSelectedSong: (song: Song) => void;
  setIsPlaying: (playing: boolean) => void;
  handlePreviousSong: () => void;
  handleNextSong: () => void;
  togglePlayPause: () => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  closePlayer: () => void;
  
  // Queue controls
  addToQueue: (song: Song) => void;
  removeFromQueue: (songId: string, index: number) => void;
  clearQueue: () => void;
  setAutoPlayEnabled: (enabled: boolean) => void;
  reorderQueue: (oldIndex: number, newIndex: number) => void;
  
  // UI state
  isMinimized: boolean;
  setIsMinimized: (minimized: boolean) => void;
  
  // Audio ref for external control
  audioRef: React.MutableRefObject<HTMLAudioElement | null>;
}

const MusicContext = createContext<MusicContextType | undefined>(undefined);

export function MusicProvider({ children }: { children: ReactNode }) {
  const [selectedSong, setSelectedSongState] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioLoading, setAudioLoading] = useState(false);
  const [playQueue, setPlayQueue] = useState<Song[]>([]);
  const [currentQueueIndex, setCurrentQueueIndex] = useState(0);
  const [isAutoPlayEnabled, setIsAutoPlayEnabled] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const [volume, setVolumeState] = useState(1); // 0 to 1
  const [isMuted, setIsMuted] = useState(false);
  const [previousVolume, setPreviousVolume] = useState(1);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playTrackingStateRef = useRef<PlayTrackingState>(createPlayTrackingState());
  const timeUpdateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const selectedSongRef = useRef<Song | null>(null);
  const addressRef = useRef<string | undefined>(undefined);
  const { address } = useAccount();

  // Keep refs in sync with state
  useEffect(() => {
    selectedSongRef.current = selectedSong;
  }, [selectedSong]);

  useEffect(() => {
    addressRef.current = address;
  }, [address]);

  // Initialize audio element
  useEffect(() => {
    if (typeof window !== 'undefined' && !audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.preload = 'auto';
      audioRef.current.volume = 1; // Default volume
    }
  }, []);

  // Set up event listeners (only once, using refs for latest values)
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handlePlay = () => {
      setIsPlaying(true);
      // Start play tracking - use ref to get latest value
      const currentSong = selectedSongRef.current;
      if (currentSong) {
        playTrackingStateRef.current = startPlayTracking(
          resetIfExpired(playTrackingStateRef.current),
          currentSong.id
        );
      }
    };
    
    const handlePause = () => {
      setIsPlaying(false);
      // Pause play tracking
      playTrackingStateRef.current = pausePlayTracking(playTrackingStateRef.current);
    };
    
    const handleEnded = async () => {
      setIsPlaying(false);
      // End play tracking and report - use refs to get latest values
      const currentSong = selectedSongRef.current;
      const currentAddress = addressRef.current;
      if (currentSong) {
        const currentState = playTrackingStateRef.current;
        const finalEvent = endPlayTracking(currentState);
        
        // Only report if we haven't already reported a qualified play for this song
        // This prevents double-counting when the 30s threshold was already reached in handleTimeUpdate
        if (finalEvent && finalEvent.duration >= 30 && !currentState.qualifiedPlayReported) {
          finalEvent.userId = currentAddress || null;
          // Report play event (daily session is updated in the API route)
          await reportPlayEvent(finalEvent, currentAddress || null);
        }
        playTrackingStateRef.current = createPlayTrackingState();
      }
    };
    
    const handleLoadStart = () => setAudioLoading(true);
    const handleCanPlay = () => setAudioLoading(false);
    const handleError = () => setAudioLoading(false);

    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('loadstart', handleLoadStart);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('loadstart', handleLoadStart);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('error', handleError);
    };
  }, []); // Empty deps - listeners only set up once, refs provide latest values

  // Sync volume with audio element
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  // Track play progress and report qualified plays
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !selectedSong) {
      return;
    }

    // Reset tracking state when song changes
    playTrackingStateRef.current = startPlayTracking(
      createPlayTrackingState(),
      selectedSong.id
    );

    // Set up timeupdate listener for play tracking
    const handleTimeUpdate = async () => {
      if (!isPlaying || !selectedSong) {
        return;
      }

      const currentTime = audio.currentTime;
      const { state: newState, shouldReport } = updatePlayProgress(
        playTrackingStateRef.current,
        currentTime
      );

      playTrackingStateRef.current = newState;

      // Report qualified play if threshold reached
      // Note: We don't update daily session here to avoid double-counting
      // Daily session is updated in handleEnded when the song finishes
      if (shouldReport) {
        const event = {
          trackId: selectedSong.id,
          userId: address || null,
          duration: newState.totalPlayed,
          timestamp: Date.now(),
          sessionId: newState.sessionId,
          state: 'pending' as const,
        };
        await reportPlayEvent(event, address || null);
      }
    };

    // Check every 5 seconds for qualified plays
    timeUpdateIntervalRef.current = setInterval(handleTimeUpdate, 5000);
    audio.addEventListener('timeupdate', handleTimeUpdate);

    return () => {
      if (timeUpdateIntervalRef.current) {
        clearInterval(timeUpdateIntervalRef.current);
      }
      audio.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [selectedSong, isPlaying, address]);

  // Auto-play next song when current song ends
  useEffect(() => {
    const audio = audioRef.current;
    
    const handleEnded = () => {
      if (isAutoPlayEnabled && playQueue.length > 0) {
        const nextIndex = (currentQueueIndex + 1) % playQueue.length;
        setCurrentQueueIndex(nextIndex);
        
        // Auto-select and play next song
        const nextSong = playQueue[nextIndex];
        if (nextSong && audio) {
          setSelectedSongState(nextSong);
          audio.src = nextSong.audioUrl;
          audio.currentTime = 0;
          audio.play().catch(() => {
            // Autoplay might be blocked, ignore error
          });
        }
      }
    };

    if (audio) {
      audio.addEventListener('ended', handleEnded);
      return () => audio.removeEventListener('ended', handleEnded);
    }
  }, [isAutoPlayEnabled, playQueue, currentQueueIndex]);

  // Handle song selection
  const setSelectedSong = useCallback((song: Song) => {
    setSelectedSongState(song);
    
    // Add to queue if not already present
    setPlayQueue(prevQueue => {
      const newQueue = prevQueue.find(s => s.id === song.id) 
        ? prevQueue 
        : [...prevQueue, song];
      
      const existingIndex = newQueue.findIndex(s => s.id === song.id);
      setCurrentQueueIndex(existingIndex >= 0 ? existingIndex : newQueue.length - 1);
      
      return newQueue;
    });

    // Play the song
    if (audioRef.current) {
      audioRef.current.src = song.audioUrl;
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {
        // Autoplay might be blocked, ignore error
      });
    }

    // When user selects a song, minimize the player if on home page
    // This will be controlled by the app logic
  }, []);

  // Player controls
  const togglePlayPause = useCallback(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(() => {
          // Autoplay might be blocked, ignore error
        });
      }
    }
  }, [isPlaying]);

  const handlePreviousSong = useCallback(() => {
    if (playQueue.length <= 1) return;
    
    const newIndex = currentQueueIndex > 0 ? currentQueueIndex - 1 : playQueue.length - 1;
    const prevSong = playQueue[newIndex];
    if (prevSong) {
      setSelectedSongState(prevSong);
      setCurrentQueueIndex(newIndex);
      
      if (audioRef.current) {
        audioRef.current.src = prevSong.audioUrl;
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => {});
      }
    }
  }, [playQueue, currentQueueIndex]);

  const handleNextSong = useCallback(() => {
    if (playQueue.length <= 1) return;
    
    const newIndex = (currentQueueIndex + 1) % playQueue.length;
    const nextSong = playQueue[newIndex];
    if (nextSong) {
      setSelectedSongState(nextSong);
      setCurrentQueueIndex(newIndex);
      
      if (audioRef.current) {
        audioRef.current.src = nextSong.audioUrl;
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => {});
      }
    }
  }, [playQueue, currentQueueIndex]);

  // Queue management
  const addToQueue = useCallback((song: Song) => {
    setPlayQueue(prevQueue => {
      if (prevQueue.find(s => s.id === song.id)) {
        return prevQueue;
      }
      return [...prevQueue, song];
    });
  }, []);

  const removeFromQueue = useCallback((songId: string, indexToRemove: number) => {
    setPlayQueue(prevQueue => {
      const newQueue = prevQueue.filter((_, index) => index !== indexToRemove);
      
      setCurrentQueueIndex(prevIndex => {
        if (indexToRemove < prevIndex) {
          return prevIndex - 1;
        } else if (indexToRemove === prevIndex) {
          if (newQueue.length === 0) {
            return 0;
          }
          return prevIndex >= newQueue.length ? newQueue.length - 1 : prevIndex;
        }
        return prevIndex;
      });
      
      return newQueue;
    });
  }, []);

  const clearQueue = useCallback(() => {
    setPlayQueue([]);
    setCurrentQueueIndex(0);
    setSelectedSongState(null);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
  }, []);

  const reorderQueue = useCallback((oldIndex: number, newIndex: number) => {
    setPlayQueue(prevQueue => {
      const newQueue = [...prevQueue];
      const [removed] = newQueue.splice(oldIndex, 1);
      newQueue.splice(newIndex, 0, removed);
      
      // Update currentQueueIndex if necessary
      setCurrentQueueIndex(oldCurrentIndex => {
        let newCurrentIndex = oldCurrentIndex;

        if (oldIndex === oldCurrentIndex) {
          newCurrentIndex = newIndex;
        } else if (oldIndex < oldCurrentIndex && newIndex >= oldCurrentIndex) {
          newCurrentIndex = oldCurrentIndex - 1;
        } else if (oldIndex > oldCurrentIndex && newIndex <= oldCurrentIndex) {
          newCurrentIndex = oldCurrentIndex + 1;
        }

        return newCurrentIndex;
      });
      
      return newQueue;
    });
  }, []);

  // Volume controls
  const setVolume = useCallback((newVolume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, newVolume));
    setVolumeState(clampedVolume);
    if (audioRef.current) {
      audioRef.current.volume = clampedVolume;
    }
    // Unmute if volume is set above 0
    if (clampedVolume > 0 && isMuted) {
      setIsMuted(false);
    }
  }, [isMuted]);

  const toggleMute = useCallback(() => {
    if (isMuted) {
      // Unmute: restore previous volume
      setVolumeState(previousVolume);
      if (audioRef.current) {
        audioRef.current.volume = previousVolume;
      }
      setIsMuted(false);
    } else {
      // Mute: save current volume and set to 0
      setPreviousVolume(volume);
      setVolumeState(0);
      if (audioRef.current) {
        audioRef.current.volume = 0;
      }
      setIsMuted(true);
    }
  }, [isMuted, volume, previousVolume]);

  const closePlayer = useCallback(() => {
    // Pause and clear audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
    // Clear state
    setSelectedSongState(null);
    setIsPlaying(false);
    setIsMinimized(false);
  }, []);

  const value: MusicContextType = {
    selectedSong,
    isPlaying,
    audioLoading,
    volume,
    isMuted,
    playQueue,
    currentQueueIndex,
    isAutoPlayEnabled,
    setSelectedSong,
    setIsPlaying,
    handlePreviousSong,
    handleNextSong,
    togglePlayPause,
    setVolume,
    toggleMute,
    closePlayer,
    addToQueue,
    removeFromQueue,
    clearQueue,
    setAutoPlayEnabled: setIsAutoPlayEnabled,
    reorderQueue,
    isMinimized,
    setIsMinimized,
    audioRef,
  };

  return (
    <MusicContext.Provider value={value}>
      {children}
    </MusicContext.Provider>
  );
}

export function useMusic() {
  const context = useContext(MusicContext);
  if (context === undefined) {
    throw new Error('useMusic must be used within a MusicProvider');
  }
  return context;
}

