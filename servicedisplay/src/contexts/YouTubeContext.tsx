import React, { createContext, useContext, useState } from 'react';

interface YouTubeContextType {
  mainPlayersReady: boolean;
  setMainPlayersReady: (ready: boolean) => void;
  isMainPlayerPlaying: boolean;
  setIsMainPlayerPlaying: (playing: boolean) => void;
}

const YouTubeContext = createContext<YouTubeContextType>({
  mainPlayersReady: false,
  setMainPlayersReady: () => {},
  isMainPlayerPlaying: false,
  setIsMainPlayerPlaying: () => {},
});

export const YouTubeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mainPlayersReady, setMainPlayersReady] = useState(false);
  const [isMainPlayerPlaying, setIsMainPlayerPlaying] = useState(false);

  return (
    <YouTubeContext.Provider value={{ 
      mainPlayersReady, 
      setMainPlayersReady,
      isMainPlayerPlaying,
      setIsMainPlayerPlaying
    }}>
      {children}
    </YouTubeContext.Provider>
  );
};

export const useYouTube = () => useContext(YouTubeContext); 