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
  const initAttemptsRef = useRef<number>(0);

  const initPlayer = () => {
    if (!containerRef.current || !videoId) return;

    if (window.YT && window.YT.Player) {
      try {
        // Clear existing player if it exists
        if (playerRef.current) {
          playerRef.current.destroy();
        }

        // Create new player div
        const playerDiv = document.createElement('div');
        playerDiv.id = playerIdRef.current;
        containerRef.current.innerHTML = ''; // Clear container
        containerRef.current.appendChild(playerDiv);

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
            enablejsapi: 1,
            playsinline: 1,
            vq: 'small'
          },
          events: {
            onReady: (event) => {
              // Only apply styles once
              if (!initializedRef.current && containerRef.current) {
                initializedRef.current = true;
                
                // Find the iframe
                const iframe = containerRef.current.querySelector('iframe');
                if (iframe) {
                  iframe.style.pointerEvents = 'none';
                }

                // Set lower quality for monitor
                event.target.setPlaybackQuality('small');
              }
              
              // Start sync process if main player exists
              if (mainPlayer) {
                startSyncWithMainPlayer();
              }
            },
            onError: (error) => {
              console.error('Monitor player error:', error);
              // Retry initialization if we haven't tried too many times
              if (initAttemptsRef.current < 3) {
                initAttemptsRef.current++;
                setTimeout(initPlayer, 1000);
              }
            }
          }
        });
      } catch (error) {
        console.error('Error initializing YouTube player:', error);
        // Retry initialization if we haven't tried too many times
        if (initAttemptsRef.current < 3) {
          initAttemptsRef.current++;
          setTimeout(initPlayer, 1000);
        }
      }
    } else {
      // Try again in 100ms if YT API isn't ready
      setTimeout(initPlayer, 100);
    }
  };

  useEffect(() => {
    initAttemptsRef.current = 0; // Reset attempts counter
    
    // Load API and initialize player
    loadYouTubeAPI()
      .then(() => {
        // Small delay to ensure API is fully ready
        setTimeout(initPlayer, 100);
      })
      .catch(error => {
        console.error('Error loading YouTube API:', error);
      });

    return () => {
      if (playerRef.current && typeof playerRef.current.destroy === 'function') {
        playerRef.current.destroy();
      }
      
      if (syncIntervalRef.current) {
        window.clearInterval(syncIntervalRef.current);
      }
    };
  }, [videoId]);

  // Add new effect to handle mainPlayer changes
  useEffect(() => {
    if (mainPlayer && playerRef.current) {
      startSyncWithMainPlayer();
    }
  }, [mainPlayer]);

  const startSyncWithMainPlayer = () => {
    // Clear any existing sync interval
    if (syncIntervalRef.current) {
      window.clearInterval(syncIntervalRef.current);
    }

    // Initial sync
    if (mainPlayer && playerRef.current) {
      try {
        const mainTime = mainPlayer.getCurrentTime();
        playerRef.current.seekTo(mainTime, true);
        
        if (mainPlayer.getPlayerState() === 1) {
          playerRef.current.playVideo();
        } else {
          playerRef.current.pauseVideo();
        }
      } catch (error) {
        console.error('Error during initial sync:', error);
      }
    }

    // Set up sync interval
    syncIntervalRef.current = window.setInterval(() => {
      if (mainPlayer && playerRef.current) {
        try {
          // Get main player state and time
          const mainPlayerState = mainPlayer.getPlayerState();
          const mainTime = mainPlayer.getCurrentTime();
          const monitorTime = playerRef.current.getCurrentTime();
          
          // If time difference is more than 0.3 seconds, sync
          if (Math.abs(mainTime - monitorTime) > 0.3) {
            playerRef.current.seekTo(mainTime, true);
          }

          // Match play/pause state
          if (mainPlayerState === 1 && playerRef.current.getPlayerState() !== 1) {
            playerRef.current.playVideo();
          } else if (mainPlayerState === 2 && playerRef.current.getPlayerState() !== 2) {
            playerRef.current.pauseVideo();
          }
        } catch (error) {
          console.error('Error during video sync:', error);
        }
      }
    }, 500); // Check more frequently (every 500ms)
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