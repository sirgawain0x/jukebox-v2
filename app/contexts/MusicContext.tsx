"use client";
import React, { createContext, useContext, useState, useRef, useEffect, useCallback, ReactNode } from 'react';
import { Song } from '@/types/music';

interface MusicContextType {
  // Player state
  selectedSong: Song | null;
  isPlaying: boolean;
  audioLoading: boolean;
  
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
  
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize audio element
  useEffect(() => {
    if (typeof window !== 'undefined' && !audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.preload = 'auto';
      
      // Set up event listeners
      const audio = audioRef.current;
      const handlePlay = () => setIsPlaying(true);
      const handlePause = () => setIsPlaying(false);
      const handleEnded = () => {
        setIsPlaying(false);
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
        audio.pause();
      };
    }
  }, []);

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

  const value: MusicContextType = {
    selectedSong,
    isPlaying,
    audioLoading,
    playQueue,
    currentQueueIndex,
    isAutoPlayEnabled,
    setSelectedSong,
    setIsPlaying,
    handlePreviousSong,
    handleNextSong,
    togglePlayPause,
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

