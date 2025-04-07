import React, { useState, useRef, useEffect, useCallback } from 'react';
import YouTube, { YouTubeProps, YouTubeEvent } from 'react-youtube';
import { Box, IconButton, Tooltip, Slider } from '@mui/material';
import { VolumeUp, VolumeOff, SkipNext, PlayArrow, Pause } from '@mui/icons-material';
import { useYouTube } from '../contexts/YouTubeContext';
import { loadYouTubeAPI } from '../utils/youtubeAPI';
import { FADE_STEPS } from '../App';
import { fadeToVolume } from '../utils/audioUtils';

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
  const [isPlaying, setIsPlaying] = useState(false);
  const [displayVolume, setDisplayVolume] = useState<number>(0);
  const { mainPlayersReady, isMainPlayerPlaying, backgroundPlayerRef, backgroundVolume, setBackgroundVolume, backgroundMuted, setBackgroundMuted, isManualVolumeChange, setManualVolumeChange } = useYouTube();
  const fadeTimeoutRef = useRef<number | null>(null);
  const initialVolumeSetRef = useRef<boolean>(false);
  const previousVolumeRef = useRef<number>(backgroundVolume);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [currentState, setCurrentState] = useState<number | null>(null);
  const effectiveVolumeRef = useRef<number>(backgroundVolume);
  const fadeIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [playlist, setPlaylist] = useState<any[]>([]);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);

  // Custom version of fadeToVolume that updates display volume during transition
  const fadeToVolumeWithDisplay = useCallback((targetVolume: number, durationInSeconds: number, onComplete?: () => void) => {
    if (!player) return () => {};
    
    // Clear any existing fade interval
    if (fadeIntervalRef.current) {
      clearInterval(fadeIntervalRef.current);
      fadeIntervalRef.current = null;
    }
    
    try {
      // Get current volume from player
      const startVolume = player.getVolume();
      setDisplayVolume(startVolume);
      
      if (startVolume === targetVolume) {
        if (onComplete) onComplete();
        return () => {};
      }
      
      const steps = FADE_STEPS;
      const stepDuration = (durationInSeconds * 1000) / steps;
      let currentStep = 0;
      
      fadeIntervalRef.current = setInterval(() => {
        if (!player) {
          if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
          return;
        }
        
        currentStep++;
        const progress = currentStep / steps;
        const newVolume = Math.round(startVolume + (targetVolume - startVolume) * progress);
        
        try {
          player.setVolume(newVolume);
          setDisplayVolume(newVolume);
          
          if (currentStep >= steps) {
            if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
            if (onComplete) onComplete();
          }
        } catch (error) {
          console.error('Error in fade interval:', error);
          if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
        }
      }, stepDuration);
      
      // Return cleanup function
      return () => {
        if (fadeIntervalRef.current) {
          clearInterval(fadeIntervalRef.current);
          fadeIntervalRef.current = null;
        }
      };
    } catch (error) {
      console.error('Error starting volume fade:', error);
      return () => {};
    }
  }, [player]);

  // Add effect to update volume when initialVolume changes - but only once on initial mount
  useEffect(() => {
    // Only set the initial volume if it hasn't been set before
    if (!initialVolumeSetRef.current && player && isPlayerReady) {
      const initialVolume = propVolume !== undefined ? propVolume : backgroundVolume;
      console.log('[BackgroundPlayer] Setting initial volume:', initialVolume);
      
      try {
        player.setVolume(initialVolume);
        setDisplayVolume(initialVolume);
        // Only update context if we're using the prop volume
        if (propVolume !== undefined && propVolume !== backgroundVolume) {
          setBackgroundVolume(initialVolume);
        }
        previousVolumeRef.current = initialVolume;
        effectiveVolumeRef.current = initialVolume;
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
        
        // Only directly set volume if we're not in a fade transition
        if (!fadeIntervalRef.current) {
          player.setVolume(backgroundVolume);
          setDisplayVolume(backgroundVolume);
          effectiveVolumeRef.current = backgroundVolume;
          
          // Verify the volume was set
          setTimeout(() => {
            try {
              const currentVolume = player.getVolume();
              console.log('[BackgroundPlayer] Volume verification - requested:', backgroundVolume, 'actual:', currentVolume);
              setDisplayVolume(currentVolume);
            } catch (error) {
              console.error('[BackgroundPlayer] Error getting volume for verification:', error);
            }
          }, 100);
        }
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
          setDisplayVolume(0);
        } else {
          player.unMute();
          // After unmuting, get and display the actual volume
          setTimeout(() => {
            try {
              const currentVolume = player.getVolume();
              setDisplayVolume(currentVolume);
            } catch (error) {
              console.error('[BackgroundPlayer] Error getting volume after unmute:', error);
            }
          }, 50);
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
      isMainPlayerPlaying,
      mainPlayersReady,
      playerState: player?.getPlayerState?.()
    });
  }, [player, isPlayerReady, isApiReady, isMuted, backgroundVolume, isMainPlayerPlaying, mainPlayersReady]);

  // Effect to handle main video playing/paused state changes 
  // This controls background volume fading but not play state
  useEffect(() => {
    if (!player || !isPlayerReady || !isPlaying) return;
    
    console.log('[BackgroundPlayer] Main player state changed. Main is playing:', isMainPlayerPlaying);
    
    // Skip fade if this is a manual volume change from the slider
    if (isManualVolumeChange.current) {
      isManualVolumeChange.current = false;
      return;
    }

    try {
      if (isMainPlayerPlaying) {
        // Main video is playing, fade out background music
        console.log('[BackgroundPlayer] Main video is playing, fading out background to 0');
        fadeToVolumeWithDisplay(0, 2);
      } else {
        // Main video is paused, fade in background music
        console.log('[BackgroundPlayer] Main video is paused, fading in background to', backgroundVolume);
        fadeToVolumeWithDisplay(backgroundVolume, 1);
      }
    } catch (error) {
      console.error('[BackgroundPlayer] Error in main player state effect:', error);
    }
  }, [isMainPlayerPlaying, player, isPlayerReady, backgroundVolume, isPlaying, isManualVolumeChange, fadeToVolumeWithDisplay]);

  // Periodically update the display volume to match actual player volume
  useEffect(() => {
    if (!player || !isPlayerReady) return;
    
    const volumeUpdateInterval = setInterval(() => {
      try {
        // Only update if we're not in a manual volume change
        if (!isManualVolumeChange.current && !fadeIntervalRef.current) {
          const actualVolume = player.getVolume();
          if (backgroundMuted) {
            setDisplayVolume(0);
          } else {
            setDisplayVolume(actualVolume);
          }
        }
      } catch (error) {
        console.error('[BackgroundPlayer] Error in volume update interval:', error);
      }
    }, 1000); // Check once per second
    
    return () => clearInterval(volumeUpdateInterval);
  }, [player, isPlayerReady, backgroundMuted]);

  const handleVolumeChange = useCallback((_event: Event, newValue: number | number[]) => {
    const volumeValue = Array.isArray(newValue) ? newValue[0] : newValue;
    setBackgroundVolume(volumeValue);
    previousVolumeRef.current = volumeValue;
    effectiveVolumeRef.current = volumeValue;
    setDisplayVolume(volumeValue);
    
    // Set flag to indicate this is a manual volume change via the slider
    setManualVolumeChange(true);
    
    if (player) {
      try {
        // If we're adjusting volume from 0, unmute
        if (isMuted && volumeValue > 0) {
          setBackgroundMuted(false);
          player.unMute();
          player.setVolume(volumeValue);
        } 
        // If we're setting volume to 0, mute but don't pause
        else if (volumeValue === 0) {
          setBackgroundMuted(true);
          player.mute();
        }
        // Normal volume adjustment
        else if (!isMuted) {
          player.setVolume(volumeValue);
        }
      } catch (error) {
        console.error('Error adjusting volume:', error);
      }
    }
  }, [player, isMuted, setBackgroundVolume, setBackgroundMuted, setManualVolumeChange]);

  const handleMuteToggle = useCallback(() => {
    if (player) {
      if (!isMuted) {
        player.mute();
        setDisplayVolume(0);
      } else {
        player.unMute();
        const volume = backgroundVolume;
        player.setVolume(volume);
        setDisplayVolume(volume);
      }
    }
    setBackgroundMuted(!isMuted);
  }, [player, isMuted, backgroundVolume, setBackgroundMuted]);

  const handlePlayPauseToggle = useCallback(() => {
    if (player && isPlayerReady) {
      try {
        if (isPlaying) {
          player.pauseVideo();
          setIsPlaying(false);
        } else {
          player.playVideo();
          setIsPlaying(true);
          
          // If main video is playing, keep background volume at 0
          if (isMainPlayerPlaying) {
            player.setVolume(0);
            setDisplayVolume(0);
          } else {
            // If main video is paused, set to regular volume
            const volume = effectiveVolumeRef.current;
            player.setVolume(volume);
            setDisplayVolume(volume);
          }
        }
      } catch (error) {
        console.error('Error toggling play/pause:', error);
      }
    }
  }, [player, isPlayerReady, isPlaying, isMainPlayerPlaying]);

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
    } catch (error) {
      console.error('Error in handleSkipToRandom:', error);
    }
  }, [player, isPlayerReady]);

  const handleSkipNext = useCallback(() => {
    if (player && isPlayerReady) {
      try {
        // Instead of going to the next track, pick a random one
        handleSkipToRandom();
      } catch (error) {
        console.error('Error skipping to next track:', error);
      }
    }
  }, [player, isPlayerReady, handleSkipToRandom]);

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
      setDisplayVolume(0); // Start with display showing 0 since we're muted
      effectiveVolumeRef.current = volumeToUse;
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
                        // Get the actual volume
                        setTimeout(() => {
                          const actualVolume = playerInstance.getVolume();
                          setDisplayVolume(actualVolume);
                        }, 50);
                      } else {
                        playerInstance.mute();
                        setDisplayVolume(0);
                      }
                      // Use the synced volume
                      playerInstance.setVolume(volumeToUse);
                      handleSkipToRandom();
                      // Always play initially since it's more expected behavior
                      console.log('[BackgroundPlayer] Playing after skip');
                      playerInstance.playVideo();
                      setIsPlaying(true);
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
      
      // Update playing state based on player state
      // 1: playing, 2: paused
      if (state === 1) {
        setIsPlaying(true);
        setIsVideoLoaded(true);
        
        // If player started playing, check and update the display volume
        setTimeout(() => {
          if (player) {
            const actualVolume = player.getVolume();
            setDisplayVolume(isMuted ? 0 : actualVolume);
          }
        }, 50);
      } else if (state === 2) {
        setIsPlaying(false);
      } else if (state === 5) { // Video cued
        setIsVideoLoaded(true);
      }
      
      // -1: unstarted, 0: ended, 1: playing, 2: paused, 3: buffering, 5: video cued
      if (state === 0 && player) { // Video ended
        console.log('Video ended, restarting playlist');
        player.playVideoAt(0);
      }
      setCurrentState(state);
    } catch (error) {
      console.error('Error in onStateChange:', error);
    }
  }, [player, isMuted]);

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

  // Add function to update our playlist state with the YouTube player's playlist
  useEffect(() => {
    if (player && isPlayerReady) {
      try {
        const ytPlaylist = player.getPlaylist();
        if (ytPlaylist && ytPlaylist.length > 0) {
          // Convert to our expected format
          const formattedPlaylist = ytPlaylist.map((videoId: string, index: number) => ({
            videoId,
            title: `Track ${index + 1}` // We don't have titles from the API
          }));
          setPlaylist(formattedPlaylist);
        }
      } catch (error) {
        console.error('Error getting playlist:', error);
      }
    }
  }, [player, isPlayerReady]);

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
            title={isPlaying ? "Pause background music" : "Play background music"} 
            arrow 
            placement="top"
            PopperProps={{
              sx: {
                zIndex: 20000,
              }
            }}
            componentsProps={{
              tooltip: {
                sx: {
                  fontSize: '0.95rem',
                  fontWeight: 500,
                  py: 1,
                  px: 1.5,
                  backgroundColor: '#333333'
                }
              }
            }}
          >
            <IconButton 
              onClick={handlePlayPauseToggle} 
              size="small"
              sx={{
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.1)'
                }
              }}
            >
              {isPlaying ? <Pause /> : <PlayArrow />}
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
              value={displayVolume}
              onChange={handleVolumeChange}
              min={0}
              max={100}
              aria-label="Volume"
              sx={{ width: 100 }}
            />
          </Tooltip>
          <Tooltip 
            title="Skip to another track" 
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