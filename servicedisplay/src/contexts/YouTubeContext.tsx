import React, { createContext, useContext, useState } from 'react';

interface YouTubeContextType {
  mainPlayersReady: boolean;
  setMainPlayersReady: (ready: boolean) => void;
  isMainPlayerPlaying: boolean;
  setIsMainPlayerPlaying: (playing: boolean) => void;
  isPlayEnabled: boolean;
  setIsPlayEnabled: (enabled: boolean) => void;
}

const YouTubeContext = createContext<YouTubeContextType>({
  mainPlayersReady: false,
  setMainPlayersReady: () => {},
  isMainPlayerPlaying: false,
  setIsMainPlayerPlaying: () => {},
  isPlayEnabled: false,
  setIsPlayEnabled: () => {},
});

export const YouTubeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mainPlayersReady, setMainPlayersReady] = useState(true);
  const [isMainPlayerPlaying, setIsMainPlayerPlaying] = useState(false);
  const [isPlayEnabled, setIsPlayEnabled] = useState(false);

  return (
    <YouTubeContext.Provider value={{ 
      mainPlayersReady, 
      setMainPlayersReady,
      isMainPlayerPlaying,
      setIsMainPlayerPlaying,
      isPlayEnabled,
      setIsPlayEnabled
    }}>
      {children}
    </YouTubeContext.Provider>
  );
};

export const useYouTube = () => useContext(YouTubeContext); 