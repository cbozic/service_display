import React, { useState, useEffect } from 'react';
import { Box, Typography, Switch, FormControlLabel, Button, Paper } from '@mui/material';
import { useYouTube } from '../contexts/YouTubeContext';
import BackgroundPlayerControls from './BackgroundPlayerControls';

interface ServiceStartOverlayProps {
  onStartService: () => void;
}

const ServiceStartOverlay: React.FC<ServiceStartOverlayProps> = ({ onStartService }) => {
  const [currentTime, setCurrentTime] = useState<string>('');
  const [isMusicEnabled, setIsMusicEnabled] = useState<boolean>(false);
  const { 
    backgroundPlayerRef, 
    mainPlayersReady, 
    backgroundVolume, 
    backgroundMuted,
    setBackgroundVolume,
    setBackgroundMuted,
    setIsPlayEnabled
  } = useYouTube();
  const [isReady, setIsReady] = useState<boolean>(false);

  // Update clock every second
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();
      const seconds = now.getSeconds();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours % 12 || 12;
      
      setCurrentTime(
        `${displayHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')} ${ampm}`
      );
    };

    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Check if all players are ready
  useEffect(() => {
    if (mainPlayersReady && backgroundPlayerRef.current) {
      const timer = setTimeout(() => {
        setIsReady(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [mainPlayersReady, backgroundPlayerRef]);

  const handleMuteToggle = () => {
    if (backgroundPlayerRef.current) {
      if (!backgroundMuted) {
        backgroundPlayerRef.current.mute();
      } else {
        backgroundPlayerRef.current.unMute();
      }
      setBackgroundMuted(!backgroundMuted);
    }
  };

  const handleVolumeChange = (_event: Event, newValue: number | number[]) => {
    const volumeValue = Array.isArray(newValue) ? newValue[0] : newValue;
    if (backgroundPlayerRef.current) {
      backgroundPlayerRef.current.setVolume(volumeValue);
      setBackgroundVolume(volumeValue);
    }
  };

  const handleSkipNext = () => {
    if (backgroundPlayerRef.current) {
      backgroundPlayerRef.current.nextVideo();
    }
  };

  const handleSkipRandom = () => {
    if (backgroundPlayerRef.current) {
      const playlist = backgroundPlayerRef.current.getPlaylist();
      if (playlist && playlist.length > 0) {
        const randomIndex = Math.floor(Math.random() * playlist.length);
        backgroundPlayerRef.current.playVideoAt(randomIndex);
      }
    }
  };

  // Handle music toggle
  const handleMusicToggle = () => {
    setIsMusicEnabled(!isMusicEnabled);
    if (backgroundPlayerRef.current) {
      if (!isMusicEnabled) {
        // When enabling music
        backgroundPlayerRef.current.unMute();
        backgroundPlayerRef.current.setVolume(backgroundVolume);
        setBackgroundMuted(false);
        setIsPlayEnabled(true); // Enable background playback
        // Skip to a random video and play it
        const playlist = backgroundPlayerRef.current.getPlaylist();
        if (playlist && playlist.length > 0) {
          const randomIndex = Math.floor(Math.random() * playlist.length);
          backgroundPlayerRef.current.playVideoAt(randomIndex);
        }
      } else {
        // When disabling music
        setIsPlayEnabled(false); // Disable background playback
        backgroundPlayerRef.current.pauseVideo();
      }
    }
  };

  // Handle start service button click
  const handleStartServiceClick = () => {
    onStartService();
  };

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        zIndex: 9999,
      }}
    >
      <Paper
        elevation={3}
        sx={{
          p: 4,
          maxWidth: 400,
          width: '90%',
          textAlign: 'center',
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
        }}
      >
        {!isReady ? (
          <Typography variant="h4" component="h1" gutterBottom>
            Loading...
          </Typography>
        ) : (
          <>
            <Typography variant="h4" component="h1" gutterBottom>
              Getting ready!
            </Typography>
            <Typography 
              variant="h2" 
              component="div" 
              sx={{ 
                fontFamily: 'monospace',
                fontWeight: 'bold',
                mb: 3
              }}
            >
              {currentTime}
            </Typography>
            <Box sx={{ mt: 3, mb: 2 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={isMusicEnabled}
                    onChange={handleMusicToggle}
                    color="primary"
                  />
                }
                label="Background Music"
              />
            </Box>
            {isMusicEnabled && (
              <Box sx={{ 
                mt: 2, 
                mb: 3,
                position: 'relative',
                zIndex: 10000
              }}>
                <BackgroundPlayerControls
                  isMuted={backgroundMuted}
                  volume={backgroundVolume}
                  onMuteToggle={handleMuteToggle}
                  onVolumeChange={handleVolumeChange}
                  onSkipNext={handleSkipNext}
                  onSkipRandom={handleSkipRandom}
                  size="small"
                />
              </Box>
            )}
            <Button
              variant="contained"
              color="primary"
              size="large"
              onClick={handleStartServiceClick}
              sx={{ mt: 2 }}
            >
              Start the Service
            </Button>
          </>
        )}
      </Paper>
    </Box>
  );
};

export default ServiceStartOverlay; 