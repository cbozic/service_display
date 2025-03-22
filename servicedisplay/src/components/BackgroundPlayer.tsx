import React, { useState, useRef, useEffect, useCallback } from 'react';
import YouTube, { YouTubeProps, YouTubeEvent } from 'react-youtube';
import { Box, IconButton, Tooltip, Slider } from '@mui/material';
import { VolumeUp, VolumeOff, SkipNext } from '@mui/icons-material';
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
    if (player) {
      // If we're adjusting volume from 0, unmute and play if main player is paused
      if (isMuted && volumeValue > 0) {
        setIsMuted(false);
        if (!isPlayEnabled) {  // Reversed condition
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
      // Normal volume adjustment
      else if (!isMuted && !isPlayEnabled) {  // Reversed condition
        player.setVolume(volumeValue);
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
      } catch (error) {
        console.error('Error skipping to next video:', error);
      }
    }
  }, [player, isPlayerReady]);

  const onPlayerReady = useCallback((event: YouTubeEvent) => {
    const playerInstance = event.target;
    playerInstance.mute();
    playerInstance.setVolume(0);
    playerInstance.pauseVideo();
    setPlayer(playerInstance);
    setIsPlayerReady(true);
  }, []);

  // Handle play state changes - reversed behavior
  useEffect(() => {
    if (!isPlayerReady || !player || !mainPlayersReady) return;

    try {
      if (!isPlayEnabled) {  // Reversed condition
        if (!isMuted) {  // Only play and set volume if not muted
          player.unMute();
          player.playVideo();
          player.setVolume(volume);
        }
      } else {
        player.pauseVideo();
      }
    } catch (error) {
      console.error('Error controlling background player:', error);
    }
  }, [isPlayEnabled, isPlayerReady, player, mainPlayersReady, volume, isMuted]);

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
          <Tooltip title="Skip to Next">
            <IconButton onClick={handleSkipNext} size="small">
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