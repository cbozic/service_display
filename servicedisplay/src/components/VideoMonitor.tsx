import React, { useRef, useEffect } from 'react';
import { Box, Typography } from '@mui/material';
import { loadYouTubeAPI } from '../utils/youtubeAPI';

interface VideoMonitorProps {
  mainPlayer: any; // The main YouTube player instance
  videoId: string;
}

const VideoMonitor: React.FC<VideoMonitorProps> = ({ mainPlayer, videoId }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const playerIdRef = useRef<string>(`monitor-${Math.random().toString(36).substr(2, 9)}`);
  const initializedRef = useRef<boolean>(false);
  const syncIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    // Only proceed if we have a container and videoId
    if (!containerRef.current || !videoId) return;

    // Create a div for the player
    const playerDiv = document.createElement('div');
    playerDiv.id = playerIdRef.current;
    containerRef.current.appendChild(playerDiv);

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

    // Load YouTube API and initialize player
    loadYouTubeAPI().then(initPlayer);
    
    return () => {
      if (playerRef.current && typeof playerRef.current.destroy === 'function') {
        playerRef.current.destroy();
      }
      
      if (syncIntervalRef.current) {
        window.clearInterval(syncIntervalRef.current);
      }
    };
  }, [videoId]);

  const startSyncWithMainPlayer = () => {
    // Clear any existing sync interval
    if (syncIntervalRef.current) {
      window.clearInterval(syncIntervalRef.current);
    }

    // Set up new sync interval
    syncIntervalRef.current = window.setInterval(() => {
      if (mainPlayer && playerRef.current) {
        try {
          const mainTime = mainPlayer.getCurrentTime();
          const monitorTime = playerRef.current.getCurrentTime();
          const timeDiff = Math.abs(mainTime - monitorTime);

          // If time difference is more than 0.5 seconds, sync
          if (timeDiff > 0.5) {
            playerRef.current.seekTo(mainTime);
          }

          // Match play state
          const mainState = mainPlayer.getPlayerState();
          const monitorState = playerRef.current.getPlayerState();

          if (mainState !== monitorState) {
            if (mainState === 1) { // Playing
              playerRef.current.playVideo();
            } else if (mainState === 2) { // Paused
              playerRef.current.pauseVideo();
            }
          }
        } catch (error) {
          console.error('Error syncing video:', error);
        }
      }
    }, 1000); // Check every second
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