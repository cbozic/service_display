import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { VideoClip, ClipPlaylist } from '../types/clipPlaylist';

interface ClipPlaylistContextType {
  clips: VideoClip[];
  currentClipIndex: number;
  isClipModeActive: boolean;
  isTransitioningBetweenClips: boolean;
  clipInPoint: number | null;
  addClip: (clip: VideoClip) => void;
  removeClip: (id: string) => void;
  updateClip: (id: string, updates: Partial<VideoClip>) => void;
  reorderClips: (fromIndex: number, toIndex: number) => void;
  clearClips: () => void;
  setCurrentClipIndex: (index: number) => void;
  setIsTransitioningBetweenClips: (value: boolean) => void;
  setClipInPoint: (time: number | null) => void;
  importClips: (json: string, currentVideoId?: string) => { success: boolean; warning?: string };
  exportClips: (videoId: string) => string;
  isPlaybackMode: boolean;
  setIsPlaybackMode: (value: boolean) => void;
}

const ClipPlaylistContext = createContext<ClipPlaylistContextType | undefined>(undefined);

export const useClipPlaylist = () => {
  const context = useContext(ClipPlaylistContext);
  if (!context) {
    throw new Error('useClipPlaylist must be used within a ClipPlaylistProvider');
  }
  return context;
};

interface ClipPlaylistProviderProps {
  children: ReactNode;
}

export const ClipPlaylistProvider: React.FC<ClipPlaylistProviderProps> = ({ children }) => {
  const [clips, setClips] = useState<VideoClip[]>([]);
  const [currentClipIndex, setCurrentClipIndex] = useState<number>(-1);
  const [isTransitioningBetweenClips, setIsTransitioningBetweenClips] = useState(false);
  const [clipInPoint, setClipInPoint] = useState<number | null>(null);
  const [isPlaybackMode, setIsPlaybackMode] = useState(false);

  const isClipModeActive = clips.length > 0;

  const addClip = useCallback((clip: VideoClip) => {
    setClips(prev => [...prev, clip]);
    // If this is the first clip, set index to 0
    setCurrentClipIndex(prev => prev === -1 ? 0 : prev);
  }, []);

  const removeClip = useCallback((id: string) => {
    setClips(prev => {
      const newClips = prev.filter(c => c.id !== id);
      if (newClips.length === 0) {
        setCurrentClipIndex(-1);
        setIsPlaybackMode(false);
      } else {
        // Adjust currentClipIndex if needed
        setCurrentClipIndex(prevIndex => {
          if (prevIndex >= newClips.length) return newClips.length - 1;
          return prevIndex;
        });
      }
      return newClips;
    });
  }, []);

  const updateClip = useCallback((id: string, updates: Partial<VideoClip>) => {
    setClips(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  }, []);

  const reorderClips = useCallback((fromIndex: number, toIndex: number) => {
    setClips(prev => {
      const newClips = [...prev];
      const [moved] = newClips.splice(fromIndex, 1);
      newClips.splice(toIndex, 0, moved);
      return newClips;
    });
    // Adjust currentClipIndex to follow the clip that was playing
    setCurrentClipIndex(prevIndex => {
      if (prevIndex === fromIndex) return toIndex;
      if (fromIndex < prevIndex && toIndex >= prevIndex) return prevIndex - 1;
      if (fromIndex > prevIndex && toIndex <= prevIndex) return prevIndex + 1;
      return prevIndex;
    });
  }, []);

  const clearClips = useCallback(() => {
    setClips([]);
    setCurrentClipIndex(-1);
    setClipInPoint(null);
    setIsPlaybackMode(false);
  }, []);

  const importClips = useCallback((json: string, currentVideoId?: string): { success: boolean; warning?: string } => {
    try {
      const data: ClipPlaylist = JSON.parse(json);
      if (!data.clips || !Array.isArray(data.clips)) {
        return { success: false, warning: 'Invalid clip playlist format: missing clips array' };
      }

      let warning: string | undefined;
      if (currentVideoId && data.videoId && data.videoId !== currentVideoId) {
        warning = `Clip playlist was created for video ${data.videoId} but current video is ${currentVideoId}. Times may not match.`;
      }

      setClips(data.clips);
      setCurrentClipIndex(data.clips.length > 0 ? 0 : -1);
      setIsPlaybackMode(false);
      return { success: true, warning };
    } catch {
      return { success: false, warning: 'Failed to parse clip playlist JSON' };
    }
  }, []);

  const exportClips = useCallback((videoId: string): string => {
    const playlist: ClipPlaylist = {
      version: 1,
      videoId,
      clips,
    };
    return JSON.stringify(playlist, null, 2);
  }, [clips]);

  return (
    <ClipPlaylistContext.Provider value={{
      clips,
      currentClipIndex,
      isClipModeActive,
      isTransitioningBetweenClips,
      clipInPoint,
      addClip,
      removeClip,
      updateClip,
      reorderClips,
      clearClips,
      setCurrentClipIndex,
      setIsTransitioningBetweenClips,
      setClipInPoint,
      importClips,
      exportClips,
      isPlaybackMode,
      setIsPlaybackMode,
    }}>
      {children}
    </ClipPlaylistContext.Provider>
  );
};
