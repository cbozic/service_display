import React, { useState, useRef, useEffect, useCallback } from 'react';
import YouTube, { YouTubeProps, YouTubeEvent } from 'react-youtube';
import { Box, IconButton, Tooltip, Slider } from '@mui/material';
import { VolumeUp, VolumeOff, SkipNext, Shuffle } from '@mui/icons-material';
import { useYouTube } from '../contexts/YouTubeContext';
import { loadYouTubeAPI } from '../utils/youtubeAPI';
import { FADE_STEPS } from '../App';

interface BackgroundPlayerProps {
  playlistUrl?: string;
  volume?: number;
}

const BackgroundPlayer: React.FC<BackgroundPlayerProps> = ({
  playlistUrl = '',
  volume: propVolume
}): JSX.Element | null => {
  const [player, setPlayer] = useState<any>(null);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [isApiReady, setIsApiReady] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const { mainPlayersReady, isPlayEnabled, backgroundPlayerRef, backgroundVolume, setBackgroundVolume, backgroundMuted, setBackgroundMuted, isManualVolumeChange, setManualVolumeChange } = useYouTube();
  const fadeTimeoutRef = useRef<number | null>(null);
  const initialVolumeSetRef = useRef<boolean>(false);
  const previousVolumeRef = useRef<number>(backgroundVolume);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [currentState, setCurrentState] = useState<number | null>(null);

  // Add effect to update volume when initialVolume changes - but only once on initial mount
  useEffect(() => {
    // Only set the initial volume if it hasn't been set before
    if (!initialVolumeSetRef.current && player && isPlayerReady) {
      const initialVolume = propVolume !== undefined ? propVolume : backgroundVolume;
      console.log('[BackgroundPlayer] Setting initial volume:', initialVolume);
      
      try {
        player.setVolume(initialVolume);
        // Only update context if we're using the prop volume
        if (propVolume !== undefined && propVolume !== backgroundVolume) {
          setBackgroundVolume(initialVolume);
        }
        previousVolumeRef.current = initialVolume;
        initialVolumeSetRef.current = true;
      } catch (error) {
        console.error('[BackgroundPlayer] Error setting initial volume:', error);
      }
    }
  }, [player, isPlayerReady, propVolume, backgroundVolume, setBackgroundVolume]);

  // Add effect to handle backgroundVolume changes from context
  useEffect(() => {
    console.log('[BackgroundPlayer] Context volume changed:', backgroundVolume, 'Player ready:', isPlayerReady, 'Player exists:', !!player);
    if (player && isPlayerReady && typeof player.setVolume === 'function') {
      try {
        console.log('[BackgroundPlayer] Actually setting player volume to:', backgroundVolume);
        player.setVolume(backgroundVolume);
        // Verify the volume was set
        setTimeout(() => {
          try {
            const currentVolume = player.getVolume();
            console.log('[BackgroundPlayer] Volume verification - requested:', backgroundVolume, 'actual:', currentVolume);
          } catch (error) {
            console.error('[BackgroundPlayer] Error getting volume for verification:', error);
          }
        }, 100);
      } catch (error) {
        console.error('[BackgroundPlayer] Error setting volume from context:', error);
      }
    }
  }, [backgroundVolume, player, isPlayerReady]);

  // Add effect to handle backgroundMuted changes from context
  useEffect(() => {
    if (player && isPlayerReady) {
      try {
        console.log('[BackgroundPlayer] Context muted state changed:', backgroundMuted);
        if (backgroundMuted) {
          player.mute();
        } else {
          player.unMute();
        }
        setIsMuted(backgroundMuted);
      } catch (error) {
        console.error('[BackgroundPlayer] Error setting mute state from context:', error);
      }
    }
  }, [backgroundMuted, player, isPlayerReady]);

  // Initialize YouTube API
  useEffect(() => {
    console.log('[BackgroundPlayer] Checking YouTube API readiness');
    console.log('[BackgroundPlayer] Current window.YT state:', {
      hasYT: !!window.YT,
      hasPlayer: !!(window.YT && window.YT.Player),
      YTType: typeof window.YT
    });

    // Don't initialize if already ready
    if (window.YT && window.YT.Player) {
      console.log('[BackgroundPlayer] YouTube API already ready');
      setIsApiReady(true);
      return;
    }

    // Load the YouTube API
    console.log('[BackgroundPlayer] Loading YouTube API...');
    loadYouTubeAPI()
      .then(() => {
        console.log('[BackgroundPlayer] YouTube API loaded successfully');
        setIsApiReady(true);
      })
      .catch(error => {
        console.error('[BackgroundPlayer] Error loading YouTube API:', error);
      });
  }, []);

  // Log when player state changes
  useEffect(() => {
    console.log('[BackgroundPlayer] Player state updated:', {
      hasPlayer: !!player,
      isPlayerReady,
      isApiReady,
      isMuted,
      backgroundVolume,
      isPlayEnabled,
      mainPlayersReady,
      playerState: player?.getPlayerState?.()
    });
  }, [player, isPlayerReady, isApiReady, isMuted, backgroundVolume, isPlayEnabled, mainPlayersReady]);

  // Add effect to handle mainPlayersReady changes
  useEffect(() => {
    console.log('[BackgroundPlayer] Main players ready state changed:', mainPlayersReady);
    if (mainPlayersReady && player && isPlayerReady) {
      console.log('[BackgroundPlayer] All players ready, starting playback');
      if (isPlayEnabled) {
        player.playVideo();
      }
    }
  }, [mainPlayersReady, player, isPlayerReady, isPlayEnabled]);

  const handleVolumeChange = useCallback((_event: Event, newValue: number | number[]) => {
    const volumeValue = Array.isArray(newValue) ? newValue[0] : newValue;
    setBackgroundVolume(volumeValue);
    previousVolumeRef.current = volumeValue;
    
    // Set flag to indicate this is a manual volume change via the slider
    setManualVolumeChange(true);
    
    if (player) {
      try {
        // If we're adjusting volume from 0, unmute and play if main player is paused
        if (isMuted && volumeValue > 0) {
          setBackgroundMuted(false);
          if (!isPlayEnabled) {
            player.unMute();
            player.setVolume(volumeValue);
            player.playVideo();
          }
        } 
        // If we're setting volume to 0, mute and pause
        else if (volumeValue === 0) {
          setBackgroundMuted(true);
          player.mute();
          player.pauseVideo();
        }
        // Normal volume adjustment - directly set volume without fading
        else if (!isMuted && !isPlayEnabled) {
          player.unMute();
          player.setVolume(volumeValue);
        }
      } catch (error) {
        console.error('Error adjusting volume:', error);
      }
    }
  }, [player, isMuted, isPlayEnabled, setBackgroundVolume, setBackgroundMuted, setManualVolumeChange]);

  const handleMuteToggle = useCallback(() => {
    if (player) {
      if (!isMuted) {
        player.mute();
        player.pauseVideo();
      } else {
        if (!isPlayEnabled) {
          player.unMute();
          player.setVolume(backgroundVolume);
          player.playVideo();
        }
      }
    }
    setBackgroundMuted(!isMuted);
  }, [player, isMuted, backgroundVolume, isPlayEnabled, setBackgroundMuted]);

  const handleSkipNext = useCallback(() => {
    if (player && isPlayerReady) {
      try {
        player.nextVideo();
        // If muted, pause the video after skipping
        if (isMuted) {
          // Small delay to ensure the video loads before pausing
          setTimeout(() => {
            player.pauseVideo();
          }, 100);
        }
      } catch (error) {
        console.error('Error skipping to next video:', error);
      }
    }
  }, [player, isPlayerReady, isMuted]);

  const handleSkipToRandom = useCallback(() => {
    if (!player || !isPlayerReady) {
      console.log('Player not ready for random skip');
      return;
    }

    try {
      // Get total number of videos in playlist
      const playlist = player.getPlaylist();
      if (!playlist) {
        console.log('Playlist not available yet');
        return;
      }

      const playlistLength = playlist.length;
      if (playlistLength <= 0) {
        console.log('Playlist is empty');
        return;
      }

      // Generate random index excluding current video
      const currentIndex = player.getPlaylistIndex();
      let randomIndex;
      do {
        randomIndex = Math.floor(Math.random() * playlistLength);
      } while (randomIndex === currentIndex && playlistLength > 1);
      
      console.log(`Skipping to random index ${randomIndex} out of ${playlistLength}`);
      player.playVideoAt(randomIndex);
      
      // If muted, pause the video after skipping
      if (isMuted) {
        setTimeout(() => {
          if (player) {
            player.pauseVideo();
          }
        }, 100);
      }
    } catch (error) {
      console.error('Error in handleSkipToRandom:', error);
    }
  }, [player, isPlayerReady, isMuted]);

  const onPlayerReady = useCallback((event: YouTubeEvent) => {
    try {
      console.log('[BackgroundPlayer] Player ready event triggered');
      const playerInstance = event.target;
      
      // Basic player setup
      console.log('[BackgroundPlayer] Setting up player instance');
      playerInstance.mute(); // Start muted by default
      // Use the volume from context
      const volumeToUse = previousVolumeRef.current || backgroundVolume;
      playerInstance.setVolume(volumeToUse);
      setBackgroundVolume(volumeToUse); // Update the state to match
      playerInstance.setPlaybackQuality('small');
      setPlayer(playerInstance);
      setIsPlayerReady(true);
      setIsMuted(true); // Set local muted state to true
      
      // Store player reference in context
      if (backgroundPlayerRef) {
        console.log('[BackgroundPlayer] Storing player reference in context');
        backgroundPlayerRef.current = playerInstance;
      }
      
      // Initial playback
      const startPlayback = () => {
        try {
          if (!playerInstance) {
            console.log('[BackgroundPlayer] No player instance available');
            return;
          }
          
          console.log('[BackgroundPlayer] Starting initial playback');
          
          // Check if playlist is loaded
          const checkPlaylist = () => {
            try {
              const playlist = playerInstance.getPlaylist();
              console.log('[BackgroundPlayer] Checking playlist:', playlist);
              
              if (playlist && playlist.length > 0) {
                console.log('[BackgroundPlayer] Playlist loaded, length:', playlist.length);
                if (!hasInitialized) {
                  setHasInitialized(true);
                  // Wait a bit before attempting random skip
                  setTimeout(() => {
                    try {
                      console.log('[BackgroundPlayer] Attempting random skip');
                      // Don't unmute automatically
                      if (!backgroundMuted) {
                        playerInstance.unMute();
                      } else {
                        playerInstance.mute();
                      }
                      // Use the synced volume
                      playerInstance.setVolume(volumeToUse);
                      handleSkipToRandom();
                      // Always play initially since main video is unstarted
                      console.log('[BackgroundPlayer] Main video is unstarted, playing after skip');
                      playerInstance.playVideo();
                    } catch (e) {
                      console.error('[BackgroundPlayer] Error during delayed skip:', e);
                    }
                  }, 2000);
                }
              } else {
                console.log('[BackgroundPlayer] Playlist not ready, retrying...');
                setTimeout(checkPlaylist, 1000);
              }
            } catch (e) {
              console.error('[BackgroundPlayer] Error in checkPlaylist:', e);
              setTimeout(checkPlaylist, 1000);
            }
          };
          
          // Start checking for playlist
          checkPlaylist();
        } catch (e) {
          console.error('[BackgroundPlayer] Error in startPlayback:', e);
        }
      };

      // Start the playback process
      startPlayback();
    } catch (error) {
      console.error('[BackgroundPlayer] Error in onPlayerReady:', error);
    }
  }, [backgroundVolume, hasInitialized, handleSkipToRandom, backgroundPlayerRef, previousVolumeRef, backgroundMuted]);

  const onStateChange = useCallback((event: YouTubeEvent) => {
    try {
      const state = event.data;
      console.log('Player state changed:', state);
      
      // -1: unstarted, 0: ended, 1: playing, 2: paused, 3: buffering, 5: video cued
      if (state === 0 && player) { // Video ended
        console.log('Video ended, restarting playlist');
        player.playVideoAt(0);
      }
      setCurrentState(state);
    } catch (error) {
      console.error('Error in onStateChange:', error);
    }
  }, [player]);

  // Move fadeVolume declaration before it's used
  const fadeVolume = useCallback((startVolume: number, targetVolume: number, durationInSeconds: number, onComplete?: () => void) => {
    if (fadeTimeoutRef.current) {
      clearTimeout(fadeTimeoutRef.current);
    }

    if (!player || !isPlayerReady || typeof player.setVolume !== 'function') {
      if (onComplete) onComplete();
      return;
    }

    const steps = FADE_STEPS;
    const stepDuration = (durationInSeconds * 1000) / steps;
    const volumeDifference = targetVolume - startVolume;
    let currentStep = 0;

    const fadeStep = () => {
      if (!player || !isPlayerReady || typeof player.setVolume !== 'function') {
        if (onComplete) onComplete();
        return;
      }

      if (currentStep < steps) {
        const newVolume = startVolume + (volumeDifference * (currentStep / steps));
        try {
          if (newVolume === 0) {
            if (typeof player.mute === 'function') {
              player.mute();
            }
          } else {
            if (typeof player.unMute === 'function') {
              player.unMute();
            }
            player.setVolume(newVolume);
          }
          currentStep++;
          fadeTimeoutRef.current = window.setTimeout(fadeStep, stepDuration);
        } catch (e) {
          console.log('Error in fade step:', e);
          if (onComplete) onComplete();
        }
      } else {
        try {
          if (targetVolume === 0) {
            if (typeof player.mute === 'function') {
              player.mute();
            }
          } else {
            if (typeof player.unMute === 'function') {
              player.unMute();
            }
            player.setVolume(targetVolume);
          }
        } catch (e) {
          console.log('Error setting final volume:', e);
        }
        fadeTimeoutRef.current = null;
        if (onComplete) onComplete();
      }
    };

    fadeStep();
  }, [player, isPlayerReady]);

  // Add effect to handle play state changes
  useEffect(() => {
    console.log('[BackgroundPlayer] Play state effect triggered:', {
      player,
      isPlayerReady,
      isPlayEnabled,
      isMuted,
      currentState,
      backgroundVolume,
      previousVolume: previousVolumeRef.current
    });

    // Skip fade if this is a manual volume change from the slider
    if (isManualVolumeChange.current) {
      return;
    }

    if (player && isPlayerReady && typeof player.playVideo === 'function') {
      try {
        if (isPlayEnabled && !isMuted) {
          console.log('[BackgroundPlayer] Starting playback');
          player.playVideo();
          // Fade in over 1 second
          fadeVolume(0, backgroundVolume, 1);
        } else if (!isPlayEnabled) {
          console.log('[BackgroundPlayer] Stopping playback');
          if (player && typeof player.pauseVideo === 'function') {
            // Fade out over 3 seconds before pausing
            fadeVolume(backgroundVolume, 0, 3, () => {
              if (player && typeof player.pauseVideo === 'function') {
                player.pauseVideo();
              }
            });
          }
        }
      } catch (error) {
        console.error('[BackgroundPlayer] Error controlling player:', error);
      }
    }
  }, [player, isPlayerReady, isPlayEnabled, isMuted, currentState, backgroundVolume, previousVolumeRef, fadeVolume, isManualVolumeChange]);

  const getPlaylistId = useCallback((url: string) => {
    const regex = /[&?]list=([^&]+)/;
    const match = url.match(regex);
    return match ? match[1] : '';
  }, []);

  const opts: YouTubeProps['opts'] = {
    height: '100%',
    width: '100%',
    playerVars: {
      autoplay: 1,
      controls: 0,
      disablekb: 1,
      fs: 0,
      modestbranding: 1,
      list: getPlaylistId(playlistUrl),
      listType: 'playlist',
      loop: 1,
      playsinline: 1,
      origin: window.location.origin,
      enablejsapi: 1,
      mute: 0,
      vq: 'small'
    },
  };

  if (!isApiReady || !playlistUrl) {
    return null;
  }

  return (
    <Box sx={{ 
      height: '100%', 
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: '#282c34',
      justifyContent: 'center',  // Center vertically
      alignItems: 'center'       // Center horizontally
    }}>
      <Box sx={{ 
        width: '80%',           // Limit width to look better centered
        maxWidth: '600px',      // Maximum width
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        alignItems: 'center'    // Center controls horizontally
      }}>
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 2, 
          p: 1,
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <Tooltip 
            title={isMuted ? "Unmute background music" : "Mute background music"} 
            arrow 
            placement="top"
            PopperProps={{
              sx: {
                zIndex: 20000, // Higher than the overlay's z-index (9999)
              }
            }}
            componentsProps={{
              tooltip: {
                sx: {
                  fontSize: '0.95rem', // Larger font size
                  fontWeight: 500,     // Slightly bolder
                  py: 1,               // More padding
                  px: 1.5,
                  backgroundColor: '#333333'  // Lighter background
                }
              }
            }}
          >
            <IconButton 
              onClick={handleMuteToggle} 
              size="small"
              sx={{
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.1)'
                }
              }}
            >
              {isMuted || backgroundVolume === 0 ? <VolumeOff /> : <VolumeUp />}
            </IconButton>
          </Tooltip>
          <Tooltip 
            title="Adjust background music volume (< and > keys adjust by 5%)" 
            arrow 
            placement="top"
            PopperProps={{
              sx: {
                zIndex: 20000, // Higher than the overlay's z-index (9999)
              }
            }}
            componentsProps={{
              tooltip: {
                sx: {
                  fontSize: '0.95rem', // Larger font size
                  fontWeight: 500,     // Slightly bolder
                  py: 1,               // More padding
                  px: 1.5,
                  backgroundColor: '#333333'  // Lighter background
                }
              }
            }}
          >
            <Slider
              value={isMuted ? 0 : backgroundVolume}
              onChange={handleVolumeChange}
              min={0}
              max={100}
              aria-label="Volume"
              sx={{ width: 100 }}
            />
          </Tooltip>
          <Tooltip 
            title="Skip to next track in playlist" 
            arrow 
            placement="top"
            PopperProps={{
              sx: {
                zIndex: 20000, // Higher than the overlay's z-index (9999)
              }
            }}
            componentsProps={{
              tooltip: {
                sx: {
                  fontSize: '0.95rem', // Larger font size
                  fontWeight: 500,     // Slightly bolder
                  py: 1,               // More padding
                  px: 1.5,
                  backgroundColor: '#333333'  // Lighter background
                }
              }
            }}
          >
            <IconButton 
              onClick={handleSkipNext} 
              size="small"
              sx={{
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.1)'
                }
              }}
            >
              <SkipNext />
            </IconButton>
          </Tooltip>
          <Tooltip 
            title="Play a random track from playlist" 
            arrow 
            placement="top"
            PopperProps={{
              sx: {
                zIndex: 20000, // Higher than the overlay's z-index (9999)
              }
            }}
            componentsProps={{
              tooltip: {
                sx: {
                  fontSize: '0.95rem', // Larger font size
                  fontWeight: 500,     // Slightly bolder
                  py: 1,               // More padding
                  px: 1.5,
                  backgroundColor: '#333333'  // Lighter background
                }
              }
            }}
          >
            <IconButton 
              onClick={handleSkipToRandom}
              size="small"
              sx={{
                '&:hover': {
                  backgroundColor: 'rgba(127, 255, 0, 0.12)'
                }
              }}
            >
              <Shuffle />
            </IconButton>
          </Tooltip>
        </Box>
        <Box sx={{ 
          position: 'relative',
          width: '100%',        // Take full width of parent
          aspectRatio: '16/9',  // Maintain video aspect ratio
          pointerEvents: 'none',
          '& iframe': {
            pointerEvents: 'none'
          }
        }}>
          <YouTube
            opts={opts}
            onReady={onPlayerReady}
            onStateChange={onStateChange}
          />
        </Box>
      </Box>
    </Box>
  );
};

export default BackgroundPlayer; 