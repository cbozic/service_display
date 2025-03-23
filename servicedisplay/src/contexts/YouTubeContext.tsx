import React, { createContext, useContext, useState, useRef } from 'react';

interface YouTubeContextType {
  isPlayEnabled: boolean;
  setIsPlayEnabled: (enabled: boolean) => void;
  mainPlayersReady: boolean;
  setMainPlayersReady: (ready: boolean) => void;
  backgroundPlayerRef: React.MutableRefObject<any>;
  isMainPlayerPlaying: boolean;
  setIsMainPlayerPlaying: (playing: boolean) => void;
  backgroundVolume: number;
  setBackgroundVolume: (volume: number) => void;
  backgroundMuted: boolean;
  setBackgroundMuted: (muted: boolean) => void;
}

const YouTubeContext = createContext<YouTubeContextType | undefined>(undefined);

export const YouTubeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isPlayEnabled, setIsPlayEnabled] = useState(false);
  const [mainPlayersReady, setMainPlayersReady] = useState(false);
  const [isMainPlayerPlaying, setIsMainPlayerPlaying] = useState(false);
  const [backgroundVolume, setBackgroundVolume] = useState(10);
  const [backgroundMuted, setBackgroundMuted] = useState(false);
  const backgroundPlayerRef = useRef<any>(null);

  return (
    <YouTubeContext.Provider value={{ 
      isPlayEnabled, 
      setIsPlayEnabled, 
      mainPlayersReady, 
      setMainPlayersReady,
      backgroundPlayerRef,
      isMainPlayerPlaying,
      setIsMainPlayerPlaying,
      backgroundVolume,
      setBackgroundVolume,
      backgroundMuted,
      setBackgroundMuted
    }}>
      {children}
    </YouTubeContext.Provider>
  );
};

export const useYouTube = () => {
  const context = useContext(YouTubeContext);
  if (context === undefined) {
    throw new Error('useYouTube must be used within a YouTubeProvider');
  }
  return context;
}; 