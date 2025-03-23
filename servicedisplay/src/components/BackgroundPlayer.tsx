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
  const { mainPlayersReady, isPlayEnabled } = useYouTube();
  const [skipToRandomEnabled, setSkipToRandomEnabled] = useState(false);
  const fadeTimeoutRef = useRef<number | null>(null);
  const previousVolumeRef = useRef<number>(initialVolume);
  const [hasInitialized, setHasInitialized] = useState(false);

  // Initialize YouTube API
  useEffect(() => {
    // Don't initialize if already ready
    if (window.YT && window.YT.Player) {
      setIsApiReady(true);
      return;
    }

    const checkYouTubeAPI = () => {
      if (window.YT && window.YT.Player) {
        setIsApiReady(true);
      } else {
        setTimeout(checkYouTubeAPI, 100);
      }
    };

    checkYouTubeAPI();
  }, []);

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
      const playerInstance = event.target;
      console.log('Player ready event triggered');
      
      // Basic player setup
      playerInstance.unMute();
      playerInstance.setVolume(initialVolume);
      playerInstance.setPlaybackQuality('small');
      setPlayer(playerInstance);
      setIsPlayerReady(true);
      
      // Initial playback
      const startPlayback = () => {
        try {
          if (!playerInstance) return;
          
          console.log('Starting initial playback');
          playerInstance.playVideo();
          
          // Check if playlist is loaded
          const checkPlaylist = () => {
            try {
              const playlist = playerInstance.getPlaylist();
              console.log('Checking playlist:', playlist);
              
              if (playlist && playlist.length > 0) {
                console.log('Playlist loaded, length:', playlist.length);
                if (!hasInitialized) {
                  setHasInitialized(true);
                  // Wait a bit before attempting random skip
                  setTimeout(() => {
                    try {
                      console.log('Attempting random skip');
                      playerInstance.unMute();
                      playerInstance.setVolume(initialVolume);
                      handleSkipToRandom();
                      playerInstance.playVideo();
                    } catch (e) {
                      console.error('Error during delayed skip:', e);
                    }
                  }, 2000);
                }
              } else {
                console.log('Playlist not ready, retrying...');
                setTimeout(checkPlaylist, 1000);
              }
            } catch (e) {
              console.error('Error in checkPlaylist:', e);
              setTimeout(checkPlaylist, 1000);
            }
          };
          
          // Start checking for playlist
          checkPlaylist();
        } catch (e) {
          console.error('Error in startPlayback:', e);
        }
      };

      // Start the playback process
      startPlayback();
    } catch (error) {
      console.error('Error in onPlayerReady:', error);
    }
  }, [initialVolume, hasInitialized, handleSkipToRandom]);

  const onStateChange = useCallback((event: YouTubeEvent) => {
    try {
      const state = event.data;
      console.log('Player state changed:', state);
      
      // -1: unstarted, 0: ended, 1: playing, 2: paused, 3: buffering, 5: video cued
      if (state === 0 && player) { // Video ended
        console.log('Video ended, restarting playlist');
        player.playVideoAt(0);
      }
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

  // Then declare the play state effect that uses fadeVolume
  useEffect(() => {
    if (!isPlayerReady || !player || !mainPlayersReady) return;

    const timer = setTimeout(() => {
      try {
        if (!player || typeof player.getPlayerState !== 'function') {
          console.log('Player not fully initialized yet');
          return;
        }

        if (!isPlayEnabled) {
          if (!isMuted) {
            const currentState = player.getPlayerState();
            console.log('Current player state:', currentState);

            if (currentState !== 1) {
              player.unMute();
              player.playVideo();
            }

            const currentVolume = player.getVolume();
            if (currentVolume === 0) {
              fadeVolume(0, volume, 1);
            }
            previousVolumeRef.current = volume;
          }
        } else {
          const currentVolume = player.getVolume();
          if (!isMuted && currentVolume > 0) {
            fadeVolume(previousVolumeRef.current, 0, 3, () => {
              if (player && typeof player.pauseVideo === 'function') {
                player.pauseVideo();
              }
            });
          } else {
            if (typeof player.pauseVideo === 'function') {
              player.pauseVideo();
            }
          }
        }
      } catch (error) {
        console.error('Error controlling background player:', error);
      }
    }, 1000);

    return () => {
      clearTimeout(timer);
      if (fadeTimeoutRef.current) {
        clearTimeout(fadeTimeoutRef.current);
        fadeTimeoutRef.current = null;
      }
    };
  }, [isPlayEnabled, isPlayerReady, player, mainPlayersReady, isMuted, fadeVolume, volume]);

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