import React, { createContext, useContext, useState } from 'react';

interface YouTubeContextType {
  mainPlayersReady: boolean;
  setMainPlayersReady: (ready: boolean) => void;
}

const YouTubeContext = createContext<YouTubeContextType>({
  mainPlayersReady: false,
  setMainPlayersReady: () => {},
});

export const YouTubeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mainPlayersReady, setMainPlayersReady] = useState(false);

  return (
    <YouTubeContext.Provider value={{ mainPlayersReady, setMainPlayersReady }}>
      {children}
    </YouTubeContext.Provider>
  );
};

export const useYouTube = () => useContext(YouTubeContext); 