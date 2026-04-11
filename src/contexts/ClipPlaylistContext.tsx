import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { VideoClip, ClipPlaylist } from '../types/clipPlaylist';

// Ensure the last clip in the list always has pauseAtEnd: true
const enforceLastClipPause = (clips: VideoClip[]): VideoClip[] => {
  if (clips.length === 0) return clips;
  const lastIndex = clips.length - 1;
  if (clips[lastIndex].pauseAtEnd) return clips;
  return clips.map((c, i) => i === lastIndex ? { ...c, pauseAtEnd: true } : c);
};

interface ClipPlaylistContextType {
  clips: VideoClip[];
  currentClipIndex: number;
  isClipModeActive: boolean;
  isTransitioningBetweenClips: boolean;
  clipInPoint: number | null;
  videoTitles: Record<string, string>;
  addClip: (clip: VideoClip) => void;
  removeClip: (id: string) => void;
  updateClip: (id: string, updates: Partial<VideoClip>) => void;
  reorderClips: (fromIndex: number, toIndex: number) => void;
  clearClips: () => void;
  setCurrentClipIndex: (index: number) => void;
  setIsTransitioningBetweenClips: (value: boolean) => void;
  setClipInPoint: (time: number | null) => void;
  importClips: (json: string, currentVideoId?: string) => { success: boolean; warning?: string };
  exportClips: () => string;
  isPlaybackMode: boolean;
  setIsPlaybackMode: (value: boolean) => void;
  registerVideoTitle: (videoId: string, title: string) => void;
  registerVideoTitles: (entries: { videoId: string; title: string }[]) => void;
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
  const [videoTitles, setVideoTitles] = useState<Record<string, string>>({});

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
        return newClips;
      } else {
        // Adjust currentClipIndex if needed
        setCurrentClipIndex(prevIndex => {
          if (prevIndex >= newClips.length) return newClips.length - 1;
          return prevIndex;
        });
      }
      return enforceLastClipPause(newClips);
    });
  }, []);

  const updateClip = useCallback((id: string, updates: Partial<VideoClip>) => {
    setClips(prev => {
      const updated = prev.map(c => c.id === id ? { ...c, ...updates } : c);
      return enforceLastClipPause(updated);
    });
  }, []);

  const reorderClips = useCallback((fromIndex: number, toIndex: number) => {
    setClips(prev => {
      const newClips = [...prev];
      const [moved] = newClips.splice(fromIndex, 1);
      newClips.splice(toIndex, 0, moved);
      return enforceLastClipPause(newClips);
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
      const version = data.version || 1;

      if (version === 1) {
        // v1 migration: copy top-level videoId onto each clip
        const legacyVideoId = data.videoId || currentVideoId || '';
        const migratedClips: VideoClip[] = data.clips.map(c => ({
          ...c,
          videoId: c.videoId || legacyVideoId,
        }));

        if (currentVideoId && data.videoId && data.videoId !== currentVideoId) {
          warning = `Clip playlist was created for video ${data.videoId} but current video is ${currentVideoId}. Times may not match.`;
        }

        setClips(enforceLastClipPause(migratedClips));
        setCurrentClipIndex(migratedClips.length > 0 ? 0 : -1);
      } else {
        // v2: clips already have videoId, merge imported videoTitles
        setClips(enforceLastClipPause(data.clips));
        setCurrentClipIndex(data.clips.length > 0 ? 0 : -1);

        if (data.videoTitles) {
          setVideoTitles(prev => ({ ...prev, ...data.videoTitles }));
        }
      }

      setIsPlaybackMode(false);
      return { success: true, warning };
    } catch {
      return { success: false, warning: 'Failed to parse clip playlist JSON' };
    }
  }, []);

  const exportClips = useCallback((): string => {
    // Collect unique videoIds from clips and build filtered title map
    const usedVideoIds = Array.from(new Set(clips.map(c => c.videoId)));
    const filteredTitles: Record<string, string> = {};
    for (const id of usedVideoIds) {
      if (videoTitles[id]) {
        filteredTitles[id] = videoTitles[id];
      }
    }

    const playlist: ClipPlaylist = {
      version: 2,
      videoTitles: filteredTitles,
      clips,
    };
    return JSON.stringify(playlist, null, 2);
  }, [clips, videoTitles]);

  const registerVideoTitle = useCallback((videoId: string, title: string) => {
    if (!videoId || !title) return;
    setVideoTitles(prev => {
      if (prev[videoId] === title) return prev;
      return { ...prev, [videoId]: title };
    });
  }, []);

  const registerVideoTitles = useCallback((entries: { videoId: string; title: string }[]) => {
    if (entries.length === 0) return;
    setVideoTitles(prev => {
      const updates: Record<string, string> = {};
      let hasChanges = false;
      for (const { videoId, title } of entries) {
        if (videoId && title && prev[videoId] !== title) {
          updates[videoId] = title;
          hasChanges = true;
        }
      }
      return hasChanges ? { ...prev, ...updates } : prev;
    });
  }, []);

  return (
    <ClipPlaylistContext.Provider value={{
      clips,
      currentClipIndex,
      isClipModeActive,
      isTransitioningBetweenClips,
      clipInPoint,
      videoTitles,
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
      registerVideoTitle,
      registerVideoTitles,
    }}>
      {children}
    </ClipPlaylistContext.Provider>
  );
};
