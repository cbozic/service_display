import React, { useRef, useEffect } from 'react';
import { Box, Typography } from '@mui/material';

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

interface VideoMonitorProps {
  mainPlayer: any; // The main YouTube player instance
  videoId: string;
}

const VideoMonitor: React.FC<VideoMonitorProps> = ({ mainPlayer, videoId }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerIdRef = useRef<string>(`yt-cue-${Math.random().toString(36).substr(2, 9)}`);
  const playerRef = useRef<any>(null);
  const syncIntervalRef = useRef<number | null>(null);
  const initializedRef = useRef<boolean>(false); // Track if we've initialized
  
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
    
    // Reset initialization flag when video ID changes
    initializedRef.current = false;
    
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
        try {
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
                // Only apply styles once
                if (!initializedRef.current && containerRef.current) {
                  initializedRef.current = true;
                  
                  // Find the iframe
                  const iframe = containerRef.current.querySelector('iframe');
                  if (iframe) {
                    // Apply pointer-events style directly to iframe
                    iframe.style.pointerEvents = 'none';
                  }
                }
                
                // Player is ready, start sync process if main player exists
                if (mainPlayer) {
                  startSyncWithMainPlayer();
                }
              }
            }
          });
        } catch (error) {
          console.error('Error initializing YouTube player:', error);
        }
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
    if (mainPlayer && playerRef.current && initializedRef.current) {
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
    // Don't setup multiple intervals
    if (syncIntervalRef.current) {
      window.clearInterval(syncIntervalRef.current);
    }
    
    // Initial sync
    syncWithMainPlayer();
    
    // Setup regular sync
    syncIntervalRef.current = window.setInterval(syncWithMainPlayer, 500);
  };
  
  // Function to sync the monitor player with the main player
  const syncWithMainPlayer = () => {
    if (!mainPlayer || !playerRef.current) return;
    
    try {
      // Get main player state
      const mainState = mainPlayer.getPlayerState();
      const monitorState = playerRef.current.getPlayerState();
      
      // Only sync if we have valid states
      if (typeof mainState === 'undefined' || typeof monitorState === 'undefined') {
        return;
      }
      
      // Sync time if difference is greater than 0.5 seconds
      const mainTime = mainPlayer.getCurrentTime();
      const monitorTime = playerRef.current.getCurrentTime();
      
      if (!isNaN(mainTime) && !isNaN(monitorTime) && Math.abs(mainTime - monitorTime) > 0.5) {
        playerRef.current.seekTo(mainTime, true);
      }
      
      // Sync play/pause state
      if (mainState === 1 && monitorState !== 1) { // 1 = playing
        playerRef.current.playVideo();
      } else if (mainState === 2 && monitorState !== 2) { // 2 = paused
        playerRef.current.pauseVideo();
      }
    } catch (error) {
      console.error('Error syncing video monitor:', error);
    }
  };
  
  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'var(--dark-surface)',
        borderRadius: '8px',
        overflow: 'hidden',
        position: 'relative',
        '& iframe': {
          pointerEvents: 'none !important'
        }
      }}
    >
      <Typography
        variant="subtitle1"
        sx={{
          color: '#fff',
          padding: '8px',
          width: '100%',
          textAlign: 'center',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          fontWeight: 500,
          letterSpacing: '0.5px'
        }}
      >
        Video Monitor (Experimental)
      </Typography>
      <Box
        ref={containerRef}
        onClick={(e) => e.preventDefault()}
        sx={{ flex: 1, width: '100%' }}
      />
    </Box>
  );
};

export default VideoMonitor; 