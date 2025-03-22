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
  volume: initialVolume = 15
}) => {
  const [player, setPlayer] = useState<any>(null);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [isApiReady, setIsApiReady] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [volume, setVolume] = useState(initialVolume);
  const { mainPlayersReady, isPlayEnabled } = useYouTube();
  const [isRandomMode, setIsRandomMode] = useState(false);
  const fadeTimeoutRef = useRef<number | null>(null);
  const previousVolumeRef = useRef<number>(initialVolume);

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
        if (isRandomMode) {
          // Get total number of videos in playlist
          const playlistLength = player.getPlaylist()?.length;
          if (playlistLength) {
            // Generate random index excluding current video
            const currentIndex = player.getPlaylistIndex();
            let randomIndex;
            do {
              randomIndex = Math.floor(Math.random() * playlistLength);
            } while (randomIndex === currentIndex && playlistLength > 1);
            
            player.playVideoAt(randomIndex);
            // If muted, pause the video after skipping
            if (isMuted) {
              // Small delay to ensure the video loads before pausing
              setTimeout(() => {
                player.pauseVideo();
              }, 100);
            }
          } else {
            player.nextVideo();
          }
        } else {
          player.nextVideo();
          // If muted, pause the video after skipping
          if (isMuted) {
            // Small delay to ensure the video loads before pausing
            setTimeout(() => {
              player.pauseVideo();
            }, 100);
          }
        }
      } catch (error) {
        console.error('Error skipping to next video:', error);
      }
    }
  }, [player, isPlayerReady, isRandomMode, isMuted]);

  const onPlayerReady = useCallback((event: YouTubeEvent) => {
    const playerInstance = event.target;
    playerInstance.mute();
    playerInstance.setVolume(0);
    playerInstance.pauseVideo();
    // Set lower quality for background player
    playerInstance.setPlaybackQuality('small');
    setPlayer(playerInstance);
    setIsPlayerReady(true);
  }, []);

  // Add fade function
  const fadeVolume = useCallback((startVolume: number, targetVolume: number, durationInSeconds: number, onComplete?: () => void) => {
    if (fadeTimeoutRef.current) {
      clearTimeout(fadeTimeoutRef.current);
    }

    if (!player || !isPlayerReady) {
      if (onComplete) onComplete();
      return;
    }

    const steps = 25;
    const stepDuration = (durationInSeconds * 1000) / steps;
    const volumeDifference = targetVolume - startVolume;
    let currentStep = 0;

    const fadeStep = () => {
      if (!player || !isPlayerReady) {
        if (onComplete) onComplete();
        return;
      }

      if (currentStep < steps) {
        const newVolume = startVolume + (volumeDifference * (currentStep / steps));
        try {
          if (newVolume === 0) {
            player.mute();
          } else {
            player.unMute();
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
            player.mute();
          } else {
            player.unMute();
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

  // Update the play state effect
  useEffect(() => {
    if (!isPlayerReady || !player || !mainPlayersReady) return;

    try {
      if (!isPlayEnabled) {  // When main player is paused, we play background
        if (!isMuted) {
          player.unMute();
          player.playVideo();
          // Only fade if we're transitioning from main player being enabled
          if (player.getVolume() === 0) {
            fadeVolume(0, volume, 1); // Fade in over 1 second
          }
          previousVolumeRef.current = volume;
        }
      } else {
        // Only fade out if we were actually playing
        if (!isMuted && player.getVolume() > 0) {
          fadeVolume(previousVolumeRef.current, 0, 3, () => {
            player.pauseVideo();
          });
        } else {
          player.pauseVideo();
        }
      }
    } catch (error) {
      console.error('Error controlling background player:', error);
    }

    // Cleanup
    return () => {
      if (fadeTimeoutRef.current) {
        clearTimeout(fadeTimeoutRef.current);
        fadeTimeoutRef.current = null;
      }
    };
  }, [isPlayEnabled, isPlayerReady, player, mainPlayersReady, isMuted, fadeVolume]); // Remove volume from dependencies

  // Effect to trigger skip ONLY when random mode is first enabled
  useEffect(() => {
    if (isRandomMode && player && isPlayerReady) {
      const wasJustEnabled = true; // Only skip when random mode is first enabled
      if (wasJustEnabled) {
        handleSkipNext();
      }
    }
  }, [isRandomMode]); // Only depend on isRandomMode changing

  const getPlaylistId = useCallback((url: string) => {
    const regex = /[&?]list=([^&]+)/;
    const match = url.match(regex);
    return match ? match[1] : '';
  }, []);

  const opts: YouTubeProps['opts'] = {
    height: '100%',
    width: '100%',
    playerVars: {
      autoplay: 0,
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
      mute: 1,
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
            <IconButton onClick={handleMuteToggle} size="small">
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
          <Tooltip title={isRandomMode ? "Skip to Random" : "Skip to Next"}>
            <IconButton 
              onClick={handleSkipNext} 
              size="small"
              sx={{
                backgroundColor: isRandomMode ? 'rgba(127, 255, 0, 0.08)' : 'transparent',
                borderRadius: 1,
                '&:hover': {
                  backgroundColor: isRandomMode ? 'rgba(127, 255, 0, 0.12)' : 'rgba(255, 255, 255, 0.08)'
                }
              }}
            >
              <SkipNext />
            </IconButton>
          </Tooltip>
          <Tooltip title={isRandomMode ? "Disable Random" : "Enable Random"}>
            <IconButton 
              onClick={() => setIsRandomMode(prev => !prev)} 
              size="small"
              sx={{
                backgroundColor: isRandomMode ? 'rgba(127, 255, 0, 0.08)' : 'transparent',
                borderRadius: 1, // Makes it square like other buttons
                color: isRandomMode ? 'chartreuse' : 'inherit',
                '&:hover': {
                  backgroundColor: isRandomMode ? 'rgba(127, 255, 0, 0.12)' : 'rgba(255, 255, 255, 0.08)'
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
            onStateChange={(event: YouTubeEvent) => {
              if (event.data === 0 && player) { // Video ended
                player.playVideoAt(0); // Restart playlist
              }
            }}
          />
        </Box>
      </Box>
    </Box>
  );
};

export default BackgroundPlayer; 