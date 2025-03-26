import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, Paper, CircularProgress, GlobalStyles } from '@mui/material';
import { useYouTube } from '../contexts/YouTubeContext';
import BackgroundPlayerControls from './BackgroundPlayerControls';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import MusicOffIcon from '@mui/icons-material/MusicOff';

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
    setIsPlayEnabled,
    setManualVolumeChange
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
    
    // Set flag to indicate this is a manual volume change via the slider
    setManualVolumeChange(true);
    
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
        backgroundPlayerRef.current.mute(); // Mute the player when disabling music
        setBackgroundMuted(true); // Update the muted state in context
        setIsPlayEnabled(false); // Disable background playback
        backgroundPlayerRef.current.pauseVideo();
      }
    }
  };

  // Add a new function to handle fancy controls option
  const handleOpenFancyControls = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Preserve background music settings - don't mute or pause if music is enabled
    // Use a custom event to signal this is just opening controls without starting media
    const customEvent = new CustomEvent('openControlsOnly', { 
      detail: { 
        startMedia: false,
        preserveBackgroundMusic: isMusicEnabled 
      } 
    });
    window.dispatchEvent(customEvent);
    
    // Still close the overlay
    onStartService();
  };

  // Handle start service button click
  const handleStartServiceClick = () => {
    // Signal this is a full service start
    const customEvent = new CustomEvent('openControlsOnly', { 
      detail: { 
        startMedia: true,
        preserveBackgroundMusic: isMusicEnabled  
      } 
    });
    window.dispatchEvent(customEvent);
    
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
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        zIndex: 9999,
        pointerEvents: 'auto',
        touchAction: 'none',
        userSelect: 'none',
      }}
      tabIndex={0}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <GlobalStyles
        styles={{
          '@keyframes pulse': {
            '0%': { transform: 'scale(1)', opacity: 0.5 },
            '50%': { transform: 'scale(1.05)', opacity: 0.8 },
            '100%': { transform: 'scale(1)', opacity: 0.5 },
          }
        }}
      />
      <Paper
        elevation={5}
        sx={{
          p: 4,
          maxWidth: 400,
          width: '90%',
          textAlign: 'center',
          backgroundColor: 'var(--dark-surface)',
          color: 'var(--dark-text)',
          border: '1px solid var(--dark-border)',
          borderRadius: '8px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
          pointerEvents: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {!isReady ? (
          <Box 
            sx={{ 
              minHeight: '300px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 3
            }}
          >
            <CircularProgress 
              size={60} 
              thickness={4} 
              color="primary"
              sx={{ 
                mb: 2,
                '& .MuiCircularProgress-circle': {
                  strokeLinecap: 'round',
                }
              }}
            />
            <Typography 
              variant="h5" 
              component="h2" 
              gutterBottom
              sx={{ color: 'var(--accent-color)' }}
            >
              Service Display
            </Typography>
            <Typography 
              variant="body1" 
              sx={{ 
                color: 'rgba(255, 255, 255, 0.7)',
                maxWidth: '80%'
              }}
            >
              Loading media players and content...
            </Typography>
          </Box>
        ) : (
          <>
            <Typography 
              variant="h5" 
              component="h2" 
              gutterBottom
              sx={{ color: 'var(--accent-color)' }}
            >
              Ready when you are!
            </Typography>
            <Typography 
              variant="h2" 
              component="div" 
              sx={{ 
                fontFamily: 'monospace',
                fontWeight: 'bold',
                mb: 3,
                color: '#fff'
              }}
            >
              {currentTime}
            </Typography>
            <Box sx={{ 
              mt: 3, 
              mb: 2,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}>
              <Button
                onClick={handleMusicToggle}
                variant="contained"
                color={isMusicEnabled ? "primary" : "inherit"}
                startIcon={isMusicEnabled ? <MusicNoteIcon /> : <MusicOffIcon />}
                sx={{
                  borderRadius: '20px',
                  px: 3,
                  py: 1,
                  backgroundColor: isMusicEnabled ? 'var(--accent-color)' : 'rgba(255, 255, 255, 0.15)',
                  color: 'white',
                  border: '1px solid',
                  borderColor: isMusicEnabled ? 'transparent' : 'rgba(255, 255, 255, 0.3)',
                  transition: 'all 0.3s ease',
                  position: 'relative',
                  overflow: 'visible',
                  boxShadow: isMusicEnabled ? '0 0 10px var(--accent-color)' : 'none',
                  '&:hover': {
                    backgroundColor: isMusicEnabled ? 'var(--accent-hover)' : 'rgba(255, 255, 255, 0.25)',
                    transform: 'scale(1.05)',
                  },
                  '&::after': isMusicEnabled ? {
                    content: '""',
                    position: 'absolute',
                    top: '-4px',
                    left: '-4px',
                    right: '-4px',
                    bottom: '-4px',
                    borderRadius: '24px',
                    border: '2px solid var(--accent-color)',
                    opacity: 0.5,
                    animation: 'pulse 1.5s infinite'
                  } : {}
                }}
              >
                {isMusicEnabled ? "Background Music On" : "Enable Background Music"}
              </Button>
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
                <Typography 
                  variant="caption" 
                  sx={{ 
                    display: 'block', 
                    mt: 1, 
                    px: 1, 
                    fontSize: '0.85rem',
                    color: 'rgba(255, 255, 255, 0.6)',
                    fontStyle: 'italic',
                    lineHeight: 1.4
                  }}
                >
                  TIP: Set your TV or PC volume where you normally would for the service and adjust the above slider so the background music would be soft enough to not be a distraction during prayer or fellowship. The main service will be louder!
                </Typography>
              </Box>
            )}
            <Button
              variant="contained"
              color="primary"
              size="large"
              onClick={handleStartServiceClick}
              sx={{ 
                mt: 2, 
                fontWeight: 'bold',
                px: 3,
                py: 1,
                fontSize: '1.1rem'
              }}
            >
              Start the Service
            </Button>
            
            {/* Add the subtle text link below the button */}
            <Typography 
              variant="body2" 
              component="div"
              onClick={handleOpenFancyControls}
              sx={{ 
                mt: 2,
                color: 'rgba(255, 255, 255, 0.5)',
                cursor: 'pointer',
                fontSize: '0.9rem',
                transition: 'color 0.2s ease',
                '&:hover': {
                  color: 'rgba(255, 255, 255, 0.8)',
                  textDecoration: 'underline'
                }
              }}
            >
              ...or open all the fancy controls
            </Typography>
          </>
        )}
      </Paper>
    </Box>
  );
};

export default ServiceStartOverlay; 