import React, { useRef, useEffect, useCallback, useState } from 'react';
import { Box, Typography, Button, Dialog, DialogContent, DialogContentText, DialogActions } from '@mui/material';
import OndemandVideoOutlinedIcon from '@mui/icons-material/OndemandVideoOutlined';
import { loadYouTubeAPI } from '../utils/youtubeAPI';
import { enableStorageAccess } from '../utils/youtubeUtils';
import VideoTimeDisplay from './VideoTimeDisplay';

interface YouTubeEvent {
  target: any;
}

interface YouTubeErrorEvent {
  data: number;
}

interface YouTubePlayerConfig {
  videoId?: string;
  width: string | number;
  height: string | number;
  playerVars?: {
    controls?: number;
    modestbranding?: number;
    rel?: number;
    showinfo?: number;
    autoplay?: number;
    mute?: number;
    enablejsapi?: number;
    playsinline?: number;
    vq?: string;
    listType?: string;
    list?: string;
  };
  events?: {
    onReady?: (event: YouTubeEvent) => void;
    onError?: (event: YouTubeErrorEvent) => void;
  };
}

interface MainVideoMonitorProps {
  mainPlayer: any; // The main YouTube player instance
  videoId: string;
  usePlaylistMode?: boolean;  // Add this prop
  playlistUrl?: string;      // Add this prop
}

const MainVideoMonitor: React.FC<MainVideoMonitorProps> = ({ 
  mainPlayer, 
  videoId, 
  usePlaylistMode = false,
  playlistUrl
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const playerIdRef = useRef<string>(`monitor-${Math.random().toString(36).substr(2, 9)}`);
  const initializedRef = useRef<boolean>(false);
  const syncIntervalRef = useRef<number | null>(null);
  const initAttemptsRef = useRef<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isEnabled, setIsEnabled] = useState<boolean>(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState<boolean>(false);

  // Prebuffer sync state machine
  type SyncPhase = 'idle' | 'prebuffering' | 'waiting' | 'playing';
  const syncPhaseRef = useRef<SyncPhase>('idle');
  const prebufferTimerRef = useRef<number | null>(null);
  const prebufferedPositionRef = useRef<number>(0);
  const playingStartTimeRef = useRef<number>(0);
  const lastMainTimeRef = useRef<number>(0);

  // How far ahead of the main player to seek for prebuffering
  const BUFFER_AHEAD_SECONDS = 4;
  // How long to let the monitor play to fill its buffer before pausing
  const PREBUFFER_PLAY_MS = 3000;
  // Unpause monitor when the main player is within this window of the prebuffered position
  const SYNC_WINDOW = 0.5;
  // After this much drift while playing, trigger a new prebuffer cycle
  const DRIFT_THRESHOLD = 3.0;
  // How long to let the monitor play in sync before proactively prebuffering again
  const RESYNC_INTERVAL_SECONDS = 60;
  // If main player time jumps more than this between polls, treat it as a user seek
  const SEEK_JUMP_THRESHOLD = 2.0;

  const getPlaylistId = useCallback((url: string) => {
    const regex = /[&?]list=([^&]+)/;
    const match = url?.match(regex);
    return match ? match[1] : '';
  }, []);
  
  // Start a prebuffer cycle: seek ahead, play briefly to fill buffer, then pause and wait
  const startPrebuffer = useCallback(() => {
    if (!mainPlayer || !playerRef.current) return;

    try {
      const mainTime = mainPlayer.getCurrentTime();
      const targetTime = mainTime + BUFFER_AHEAD_SECONDS;

      console.log(`[Monitor] Prebuffering: seeking to ${targetTime.toFixed(1)}s (main at ${mainTime.toFixed(1)}s)`);
      syncPhaseRef.current = 'prebuffering';
      prebufferedPositionRef.current = targetTime;

      // Seek ahead and play briefly to fill the buffer
      playerRef.current.seekTo(targetTime, true);
      playerRef.current.playVideo();

      // After a short play duration, pause and enter waiting phase
      if (prebufferTimerRef.current) {
        window.clearTimeout(prebufferTimerRef.current);
      }
      prebufferTimerRef.current = window.setTimeout(() => {
        prebufferTimerRef.current = null;
        if (playerRef.current && syncPhaseRef.current === 'prebuffering') {
          // Re-read where the monitor actually is now (it may have advanced during prebuffer)
          prebufferedPositionRef.current = playerRef.current.getCurrentTime();
          playerRef.current.pauseVideo();
          syncPhaseRef.current = 'waiting';
          console.log(`[Monitor] Prebuffer done, paused at ${prebufferedPositionRef.current.toFixed(1)}s, waiting for main player`);
        }
      }, PREBUFFER_PLAY_MS);
    } catch (error) {
      console.error('[Monitor] Error starting prebuffer:', error);
    }
  }, [mainPlayer, BUFFER_AHEAD_SECONDS, PREBUFFER_PLAY_MS]);

  // Main sync loop using prebuffer strategy
  const startSyncWithMainPlayer = useCallback(() => {
    // Clear any existing sync interval
    if (syncIntervalRef.current) {
      window.clearInterval(syncIntervalRef.current);
    }
    if (prebufferTimerRef.current) {
      window.clearTimeout(prebufferTimerRef.current);
      prebufferTimerRef.current = null;
    }

    if (!mainPlayer || !playerRef.current) return;

    // If the main player is paused, just match its position and pause
    const mainState = mainPlayer.getPlayerState();
    if (mainState !== 1) {
      const mainTime = mainPlayer.getCurrentTime();
      playerRef.current.seekTo(mainTime, true);
      playerRef.current.pauseVideo();
      setCurrentTime(mainTime);
      syncPhaseRef.current = 'idle';
    } else {
      // Main player is playing — kick off a prebuffer cycle
      startPrebuffer();
    }

    // Set up the polling loop
    syncIntervalRef.current = window.setInterval(() => {
      if (!mainPlayer || !playerRef.current) return;

      try {
        const mainPlayerState = mainPlayer.getPlayerState();
        const mainTime = mainPlayer.getCurrentTime();
        setCurrentTime(mainTime);

        const phase = syncPhaseRef.current;
        const prevMainTime = lastMainTimeRef.current;
        lastMainTimeRef.current = mainTime;

        // Main player paused — match and idle, but track position changes
        if (mainPlayerState !== 1) {
          if (phase !== 'idle') {
            playerRef.current.pauseVideo();
            syncPhaseRef.current = 'idle';
            if (prebufferTimerRef.current) {
              window.clearTimeout(prebufferTimerRef.current);
              prebufferTimerRef.current = null;
            }
          }

          // While paused, if the main player's position changed (skip fwd/back),
          // seek the monitor so it shows the correct still frame
          if (prevMainTime > 0 && Math.abs(mainTime - prevMainTime) > 0.5) {
            console.log(`[Monitor] Paused position changed to ${mainTime.toFixed(1)}s, updating still frame`);
            playerRef.current.seekTo(mainTime, true);
          }
          return;
        }

        // Detect user-initiated seek (time jumped more than normal playback)
        const timeJump = Math.abs(mainTime - prevMainTime);
        if (prevMainTime > 0 && timeJump > SEEK_JUMP_THRESHOLD && phase !== 'idle') {
          // Immediate sync: seek monitor directly to main position and play
          console.log(`[Monitor] Seek detected (jump: ${timeJump.toFixed(1)}s), immediate sync to ${mainTime.toFixed(1)}s`);
          if (prebufferTimerRef.current) {
            window.clearTimeout(prebufferTimerRef.current);
            prebufferTimerRef.current = null;
          }
          playerRef.current.seekTo(mainTime, true);
          playerRef.current.playVideo();
          syncPhaseRef.current = 'playing';
          playingStartTimeRef.current = mainTime;
          return;
        }

        // Main player is playing — normal state machine
        switch (phase) {
          case 'idle':
            // Main just started playing — begin prebuffer
            startPrebuffer();
            break;

          case 'prebuffering':
            // Still filling buffer, nothing to do (timer handles transition to waiting)
            break;

          case 'waiting': {
            // Monitor is paused at prebuffered position, waiting for main to catch up
            const distanceToTarget = prebufferedPositionRef.current - mainTime;

            if (distanceToTarget <= SYNC_WINDOW) {
              // Main player has arrived — unpause the monitor
              console.log(`[Monitor] Main player arrived at prebuffered position, unpausing (distance: ${distanceToTarget.toFixed(2)}s)`);
              playerRef.current.playVideo();
              syncPhaseRef.current = 'playing';
              playingStartTimeRef.current = mainTime;
            } else if (distanceToTarget < 0) {
              // Main player overshot (e.g., a seek happened) — re-prebuffer
              console.log(`[Monitor] Main player overshot prebuffered position, re-prebuffering`);
              startPrebuffer();
            }
            break;
          }

          case 'playing': {
            // Both playing — check drift and proactively resync
            const monitorTime = playerRef.current.getCurrentTime();
            const drift = Math.abs(mainTime - monitorTime);
            const playingDuration = mainTime - playingStartTimeRef.current;

            if (drift > DRIFT_THRESHOLD) {
              // Drift too large — prebuffer again
              console.log(`[Monitor] Drift of ${drift.toFixed(1)}s exceeded threshold, re-prebuffering`);
              startPrebuffer();
            } else if (playingDuration > RESYNC_INTERVAL_SECONDS) {
              // Proactively resync before drift becomes visible
              console.log(`[Monitor] Proactive resync after ${playingDuration.toFixed(0)}s of playback`);
              startPrebuffer();
            }
            break;
          }
        }
      } catch (error) {
        console.error('[Monitor] Error during sync:', error);
      }
    }, 500);
  }, [mainPlayer, startPrebuffer, SYNC_WINDOW, DRIFT_THRESHOLD, RESYNC_INTERVAL_SECONDS, SEEK_JUMP_THRESHOLD]);

  const initPlayer = useCallback(() => {
    if (!containerRef.current || (!videoId && !usePlaylistMode)) return;

    if (window.YT && window.YT.Player) {
      try {
        // Clear existing player if it exists
        if (playerRef.current) {
          try { playerRef.current.destroy(); } catch (e) { /* iframe may already be gone */ }
          playerRef.current = null;
        }

        // Create new player div
        const playerDiv = document.createElement('div');
        playerDiv.id = playerIdRef.current;
        containerRef.current.innerHTML = ''; // Clear container
        containerRef.current.appendChild(playerDiv);

        const playerConfig: YouTubePlayerConfig = {
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
            vq: 'small',
            ...(usePlaylistMode && playlistUrl && {
              listType: 'playlist',
              list: getPlaylistId(playlistUrl)
            })
          },
          events: {
            onReady: (event: YouTubeEvent) => {
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
                enableStorageAccess(event.target);
              }
              
              // Start sync process if main player exists
              if (mainPlayer) {
                startSyncWithMainPlayer();
              }
            },
            onError: (event: YouTubeErrorEvent) => {
              console.error('Monitor player error:', event);
              if (initAttemptsRef.current < 3) {
                initAttemptsRef.current++;
                setTimeout(initPlayer, 1000);
              }
            }
          }
        };

        // Add videoId only when not in playlist mode
        if (!usePlaylistMode) {
          playerConfig.videoId = videoId;
        }

        playerRef.current = new window.YT.Player(playerIdRef.current, playerConfig);
      } catch (error) {
        console.error('Error initializing YouTube player:', error);
        if (initAttemptsRef.current < 3) {
          initAttemptsRef.current++;
          setTimeout(initPlayer, 1000);
        }
      }
    } else {
      setTimeout(initPlayer, 100);
    }
  }, [videoId, usePlaylistMode, getPlaylistId, playlistUrl, mainPlayer, startSyncWithMainPlayer]);

  useEffect(() => {
    if (!isEnabled) return;

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
        try { playerRef.current.destroy(); } catch (e) { /* iframe may already be gone */ }
        playerRef.current = null;
      }

      if (syncIntervalRef.current) {
        window.clearInterval(syncIntervalRef.current);
      }

      if (prebufferTimerRef.current) {
        window.clearTimeout(prebufferTimerRef.current);
      }

      syncPhaseRef.current = 'idle';
    };
  }, [isEnabled, videoId, initPlayer]);

  // Add new effect to handle mainPlayer changes
  useEffect(() => {
    if (!isEnabled) return;
    if (mainPlayer && playerRef.current) {
      startSyncWithMainPlayer();
    }
  }, [isEnabled, mainPlayer, startSyncWithMainPlayer]);

  const handleEnableClick = () => {
    setShowConfirmDialog(true);
  };

  const handleConfirmEnable = () => {
    setShowConfirmDialog(false);
    setIsEnabled(true);
  };

  const handleCancelEnable = () => {
    setShowConfirmDialog(false);
  };

  const dialogStyle = {
    '& .MuiPaper-root': {
      backgroundColor: 'var(--dark-surface)',
      border: '1px solid var(--dark-border)',
      borderRadius: '8px',
      color: 'var(--dark-text)',
      boxShadow: '0 8px 24px rgba(0,0,0,0.4)'
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
          backgroundColor: 'var(--dark-accent)',
          fontWeight: 500,
          letterSpacing: '0.5px'
        }}
      >
        Video Monitor
      </Typography>

      {isEnabled ? (
        <>
          <Box
            ref={containerRef}
            onClick={(e) => e.preventDefault()}
            sx={{ flex: 1, width: '100%', position: 'relative' }}
          />
          <VideoTimeDisplay
            currentTimeInSeconds={currentTime}
            position="bottom-left"
            size="medium"
          />
        </>
      ) : (
        <Box
          sx={{
            flex: 1,
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 2,
            padding: 3,
          }}
        >
          <OndemandVideoOutlinedIcon sx={{ fontSize: 64, color: 'var(--dark-text-secondary, #888)' }} />
          <Typography
            variant="body1"
            sx={{ color: 'var(--dark-text-secondary, #888)', textAlign: 'center' }}
          >
            Monitor is disabled to conserve resources
          </Typography>
          <Button
            variant="contained"
            onClick={handleEnableClick}
            sx={{
              backgroundColor: 'var(--accent-color)',
              '&:hover': { backgroundColor: 'var(--accent-hover)' },
              textTransform: 'none',
              fontWeight: 500,
            }}
          >
            Enable Monitor
          </Button>
        </Box>
      )}

      <Dialog
        open={showConfirmDialog}
        onClose={handleCancelEnable}
        sx={dialogStyle}
      >
        <DialogContent>
          <DialogContentText sx={{ color: 'var(--dark-text)' }}>
            The video monitor creates a second YouTube player that continuously syncs
            with the main display. This uses additional bandwidth, memory, and CPU resources,
            which may affect playback performance on lower-end devices.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelEnable} sx={{ color: 'var(--accent-color)' }}>
            Cancel
          </Button>
          <Button onClick={handleConfirmEnable} sx={{ color: 'var(--accent-color)' }} autoFocus>
            Enable
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MainVideoMonitor; 