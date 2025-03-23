import React, { useState, useRef, useEffect, useCallback } from 'react';
import YouTube, { YouTubeProps, YouTubeEvent } from 'react-youtube';
import { Box, IconButton, Tooltip, Slider } from '@mui/material';
import { VolumeUp, VolumeOff, SkipNext, Shuffle } from '@mui/icons-material';
import { useYouTube } from '../contexts/YouTubeContext';
import { loadYouTubeAPI } from '../utils/youtubeAPI';

interface BackgroundPlayerProps {
  playlistUrl?: string;
  volume?: number;
}

const BackgroundPlayer: React.FC<BackgroundPlayerProps> = ({
  playlistUrl = '',
  volume: initialVolume = 2
}) => {
  const [player, setPlayer] = useState<any>(null);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [isApiReady, setIsApiReady] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(initialVolume);
  const { mainPlayersReady, isPlayEnabled, backgroundPlayerRef } = useYouTube();
  const [skipToRandomEnabled, setSkipToRandomEnabled] = useState(false);
  const fadeTimeoutRef = useRef<number | null>(null);
  const previousVolumeRef = useRef<number>(initialVolume);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [currentState, setCurrentState] = useState<number | null>(null);

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
      volume,
      isPlayEnabled,
      mainPlayersReady,
      playerState: player?.getPlayerState?.()
    });
  }, [player, isPlayerReady, isApiReady, isMuted, volume, isPlayEnabled, mainPlayersReady]);

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
    setVolume(volumeValue);
    previousVolumeRef.current = volumeValue; // Update the previous volume ref
    
    if (player) {
      try {
        // If we're adjusting volume from 0, unmute and play if main player is paused
        if (isMuted && volumeValue > 0) {
          setIsMuted(false);
          if (!isPlayEnabled) {
            player.unMute();
            player.setVolume(volumeValue);
            player.playVideo();
          }
        } 
        // If we're setting volume to 0, mute and pause
        else if (volumeValue === 0) {
          setIsMuted(true);
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
  }, [player, isMuted, isPlayEnabled]);

  const handleMuteToggle = useCallback(() => {
    if (player) {
      if (!isMuted) {
        player.mute();
        player.pauseVideo();
      } else {
        if (!isPlayEnabled) {  // Reversed condition
          player.unMute();
          player.setVolume(volume);
          player.playVideo();
        }
      }
    }
    setIsMuted(prev => !prev);
  }, [player, isMuted, volume, isPlayEnabled]);

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
      playerInstance.unMute();
      playerInstance.setVolume(initialVolume);
      playerInstance.setPlaybackQuality('small');
      setPlayer(playerInstance);
      setIsPlayerReady(true);
      
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
                      playerInstance.unMute();
                      playerInstance.setVolume(initialVolume);
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
  }, [initialVolume, hasInitialized, handleSkipToRandom, backgroundPlayerRef]);

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

    const steps = 25;
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

  // Effect to handle play state changes
  useEffect(() => {
    if (!player || !isPlayerReady) return;

    console.log('[BackgroundPlayer] Play state effect triggered:', {
      isPlayEnabled,
      isMuted,
      currentState,
      volume,
      previousVolume: previousVolumeRef.current
    });

    try {
      // If play is enabled and we're not muted, start playing
      if (isPlayEnabled && !isMuted) {
        console.log('[BackgroundPlayer] Starting playback - play enabled and not muted');
        if (player && typeof player.playVideo === 'function') {
          player.playVideo();
        } else {
          console.log('[BackgroundPlayer] Player or playVideo method not available');
        }
      } else {
        console.log('[BackgroundPlayer] Pausing - play disabled or muted');
        if (player && typeof player.pauseVideo === 'function') {
          player.pauseVideo();
        } else {
          console.log('[BackgroundPlayer] Player or pauseVideo method not available');
        }
      }
    } catch (error) {
      console.error('[BackgroundPlayer] Error controlling player:', error);
    }
  }, [player, isPlayerReady, isPlayEnabled, isMuted, currentState, volume, previousVolumeRef]);

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
          <Tooltip title={isMuted ? "Unmute" : "Mute"}>
            <IconButton 
              onClick={handleMuteToggle} 
              size="small"
              sx={{
                borderRadius: 1,
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.1)'
                }
              }}
            >
              {isMuted || volume === 0 ? <VolumeOff /> : <VolumeUp />}
            </IconButton>
          </Tooltip>
          <Slider
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            min={0}
            max={100}
            aria-label="Volume"
            sx={{ width: 100 }}
          />
          <Tooltip title="Skip to Next">
            <IconButton 
              onClick={handleSkipNext} 
              size="small"
              sx={{
                borderRadius: 1,
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.1)'
                }
              }}
            >
              <SkipNext />
            </IconButton>
          </Tooltip>
          <Tooltip title="Skip to Random">
            <IconButton 
              onClick={handleSkipToRandom}
              size="small"
              sx={{
                borderRadius: 1,
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