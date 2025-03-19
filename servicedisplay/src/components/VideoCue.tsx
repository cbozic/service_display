import React, { useRef, useEffect } from 'react';
import { Box } from '@mui/material';

// Updated TypeScript declarations with correct types
declare global {
  interface Window {
    YT: {
      Player: new (
        elementIdOrElement: string | HTMLElement,
        config: {
          videoId: string;
          width?: string | number;
          height?: string | number;
          playerVars?: {
            controls?: number;
            modestbranding?: number;
            rel?: number;
            showinfo?: number;
            autoplay?: number;
            mute?: number;
            start?: number;
            enablejsapi?: number;
            // Add origin to known properties
            origin?: string;
          };
          events?: {
            onReady?: (event: { target: any }) => void;
            onStateChange?: (event: { data: number }) => void;
            onError?: (event: { data: number }) => void;
          };
        }
      ) => any;
    };
    // Fix the type declaration - no optional modifier
    onYouTubeIframeAPIReady: () => void;
  }
}

interface VideoCueProps {
  mainPlayer: any; // The main YouTube player instance
  videoId: string;
}

const VideoCue: React.FC<VideoCueProps> = ({ mainPlayer, videoId }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerIdRef = useRef<string>(`yt-cue-${Math.random().toString(36).substr(2, 9)}`);
  const playerRef = useRef<any>(null);
  const syncIntervalRef = useRef<number | null>(null);
  
  // Initialize the YouTube API once
  useEffect(() => {
    if (window.YT && window.YT.Player) return;
    
    // Add the API script
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    tag.async = true;
    document.head.appendChild(tag);
  }, []);
  
  // Initialize the player when videoId changes
  useEffect(() => {
    // Only proceed if we have a container and videoId
    if (!containerRef.current || !videoId) return;
    
    // Clear any previous player
    if (playerRef.current && typeof playerRef.current.destroy === 'function') {
      playerRef.current.destroy();
      playerRef.current = null;
    }
    
    if (syncIntervalRef.current) {
      window.clearInterval(syncIntervalRef.current);
      syncIntervalRef.current = null;
    }
    
    // Prepare the container
    containerRef.current.innerHTML = '';
    const playerContainer = document.createElement('div');
    playerContainer.id = playerIdRef.current;
    containerRef.current.appendChild(playerContainer);
    
    // Wait for YT API and create player
    const initPlayer = () => {
      if (window.YT && window.YT.Player) {
        playerRef.current = new window.YT.Player(playerIdRef.current, {
          videoId: videoId,
          width: '100%',
          height: '100%',
          playerVars: {
            controls: 0,
            modestbranding: 1,
            rel: 0,
            showinfo: 0,
            autoplay: 0,
            mute: 1,
            enablejsapi: 1
          },
          events: {
            onReady: (event) => {
              // Player is ready, start sync process if main player exists
              if (mainPlayer) {
                startSyncWithMainPlayer();
              }
            }
          }
        });
      } else {
        // Try again in 100ms
        setTimeout(initPlayer, 100);
      }
    };
    
    initPlayer();
    
    return () => {
      if (playerRef.current && typeof playerRef.current.destroy === 'function') {
        playerRef.current.destroy();
      }
      
      if (syncIntervalRef.current) {
        window.clearInterval(syncIntervalRef.current);
      }
    };
  }, [videoId]);
  
  // Handle main player changes
  useEffect(() => {
    // Only start sync if both players exist
    if (mainPlayer && playerRef.current) {
      startSyncWithMainPlayer();
    }
    
    return () => {
      if (syncIntervalRef.current) {
        window.clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
      }
    };
  }, [mainPlayer]);
  
  // Function to start synchronizing with the main player
  const startSyncWithMainPlayer = () => {
    // Clear any existing interval
    if (syncIntervalRef.current) {
      window.clearInterval(syncIntervalRef.current);
    }
    
    // Initial sync
    syncWithMainPlayer();
    
    // Setup regular sync
    syncIntervalRef.current = window.setInterval(syncWithMainPlayer, 500);
  };
  
  // Function to sync the cue player with the main player
  const syncWithMainPlayer = () => {
    if (!mainPlayer || !playerRef.current) return;
    
    try {
      // Get main player state
      const mainState = mainPlayer.getPlayerState();
      const cueState = playerRef.current.getPlayerState();
      
      // Sync time if difference is greater than 0.5 seconds
      const mainTime = mainPlayer.getCurrentTime();
      const cueTime = playerRef.current.getCurrentTime();
      
      if (Math.abs(mainTime - cueTime) > 0.5) {
        playerRef.current.seekTo(mainTime, true);
      }
      
      // Sync play/pause state
      if (mainState === 1 && cueState !== 1) { // 1 = playing
        playerRef.current.playVideo();
      } else if (mainState === 2 && cueState !== 2) { // 2 = paused
        playerRef.current.pauseVideo();
      }
    } catch (error) {
      console.error('Error syncing video cue:', error);
    }
  };
  
  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'var(--dark-surface)',
        borderRadius: '8px',
        overflow: 'hidden',
        position: 'relative'
      }}
      ref={containerRef}
    />
  );
};

export default VideoCue; 