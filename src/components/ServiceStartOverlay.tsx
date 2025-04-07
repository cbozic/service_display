import React, { useState, useEffect, useRef } from 'react';
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
  const [animationPhase, setAnimationPhase] = useState<'hidden' | 'expanding' | 'showing'>('hidden');
  const animationTimeout = useRef<NodeJS.Timeout | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [displayVolume, setDisplayVolume] = useState<number>(0);
  const { 
    backgroundPlayerRef, 
    mainPlayersReady, 
    backgroundVolume, 
    backgroundMuted,
    setBackgroundVolume,
    setBackgroundMuted,
    setManualVolumeChange
  } = useYouTube();
  const [isReady, setIsReady] = useState<boolean>(false);
  const [showBypassButton, setShowBypassButton] = useState<boolean>(false);
  const [isMobileDevice, setIsMobileDevice] = useState<boolean>(false);

  // Check if device is mobile
  useEffect(() => {
    const checkMobileDevice = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      
      // Check for specific mobile devices
      const isMobileUA = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
      
      // Check if it's a tablet (iPad or Android tablet)
      const isTablet = /ipad|tablet|playbook|silk/i.test(userAgent) || 
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      
      // Consider it mobile if it's a mobile UA or a tablet
      const isMobile = isMobileUA || isTablet;
      
      setIsMobileDevice(isMobile);
    };

    checkMobileDevice();
    window.addEventListener('resize', checkMobileDevice);
    return () => window.removeEventListener('resize', checkMobileDevice);
  }, []);

  // Update clock every second
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours % 12 || 12;
      
      setCurrentTime(
        `${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm}`
      );
    };

    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Add keyboard event handlers for volume control in overlay
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle keys when music is enabled
      if (!isMusicEnabled) return;

      if (event.code === 'Comma' && !event.repeat) {
        event.preventDefault();
        
        if (backgroundMuted && backgroundPlayerRef?.current) {
          // If player is muted, unmute it first
          console.log('< key pressed in overlay, unmuting background player');
          backgroundPlayerRef.current.unMute();
          setBackgroundMuted(false);
          // Make sure we keep the current volume
          backgroundPlayerRef.current.setVolume(backgroundVolume);
          setDisplayVolume(backgroundVolume);
        } else {
          // Decrease background volume by 5% of total (5 out of 100)
          const newVolume = Math.max(0, backgroundVolume - 5);
          console.log('< key pressed in overlay, decreasing background volume from', backgroundVolume, 'to', newVolume);
          setBackgroundVolume(newVolume);
          setDisplayVolume(newVolume);
          
          // Update the actual player volume
          if (backgroundPlayerRef.current) {
            backgroundPlayerRef.current.setVolume(newVolume);
          }
        }
      } else if (event.code === 'Period' && !event.repeat) {
        event.preventDefault();
        
        if (backgroundMuted && backgroundPlayerRef?.current) {
          // If player is muted, unmute it first
          console.log('> key pressed in overlay, unmuting background player');
          backgroundPlayerRef.current.unMute();
          setBackgroundMuted(false);
          // Make sure we keep the current volume
          backgroundPlayerRef.current.setVolume(backgroundVolume);
          setDisplayVolume(backgroundVolume);
        } else {
          // Increase background volume by 5% of total (5 out of 100)
          const newVolume = Math.min(100, backgroundVolume + 5);
          console.log('> key pressed in overlay, increasing background volume from', backgroundVolume, 'to', newVolume);
          setBackgroundVolume(newVolume);
          setDisplayVolume(newVolume);
          
          // Update the actual player volume
          if (backgroundPlayerRef.current) {
            backgroundPlayerRef.current.setVolume(newVolume);
          }
        }
      } else if (event.code === 'KeyN' && !event.repeat) {
        event.preventDefault();
        console.log('n key pressed in overlay, skipping to next track');
        // Skip to next track in background player
        if (backgroundPlayerRef?.current) {
          backgroundPlayerRef.current.nextVideo();
        }
      } else if (event.code === 'Slash' && !event.repeat) {
        event.preventDefault();
        console.log('/ key pressed in overlay, skipping to random track');
        // Skip to random track in background player
        if (backgroundPlayerRef?.current) {
          const playlist = backgroundPlayerRef.current.getPlaylist();
          if (playlist && playlist.length > 0) {
            const randomIndex = Math.floor(Math.random() * playlist.length);
            backgroundPlayerRef.current.playVideoAt(randomIndex);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [backgroundMuted, backgroundVolume, backgroundPlayerRef, setBackgroundMuted, setBackgroundVolume, isMusicEnabled]);

  // Check if all players are ready
  useEffect(() => {
    if (mainPlayersReady && backgroundPlayerRef.current) {
      const timer = setTimeout(() => {
        setIsReady(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [mainPlayersReady, backgroundPlayerRef]);
  
  // Add a fallback timer to show bypass button after 10 seconds
  useEffect(() => {
    const bypassTimer = setTimeout(() => {
      console.log('Bypass timer triggered - showing bypass button');
      setShowBypassButton(true);
    }, 10000);
    
    return () => clearTimeout(bypassTimer);
  }, []);

  const handleMuteToggle = () => {
    if (backgroundPlayerRef.current) {
      if (!backgroundMuted) {
        backgroundPlayerRef.current.mute();
        setDisplayVolume(0);
      } else {
        backgroundPlayerRef.current.unMute();
        const volume = backgroundVolume;
        setDisplayVolume(volume);
      }
      setBackgroundMuted(!backgroundMuted);
    }
  };

  const handlePlayPauseToggle = () => {
    if (backgroundPlayerRef.current) {
      if (isPlaying) {
        backgroundPlayerRef.current.pauseVideo();
        setIsPlaying(false);
      } else {
        backgroundPlayerRef.current.playVideo();
        setIsPlaying(true);
      }
    }
  };

  const handleVolumeChange = (_event: Event, newValue: number | number[]) => {
    const volumeValue = Array.isArray(newValue) ? newValue[0] : newValue;
    
    // Set flag to indicate this is a manual volume change via the slider
    setManualVolumeChange(true);
    
    if (backgroundPlayerRef.current) {
      backgroundPlayerRef.current.setVolume(volumeValue);
      setBackgroundVolume(volumeValue);
      setDisplayVolume(volumeValue);
      
      // If volume is 0, mute the player
      if (volumeValue === 0) {
        backgroundPlayerRef.current.mute();
        setBackgroundMuted(true);
      } 
      // If we're adjusting from 0, unmute
      else if (backgroundMuted) {
        backgroundPlayerRef.current.unMute();
        setBackgroundMuted(false);
      }
    }
  };

  const handleSkipNext = () => {
    if (backgroundPlayerRef.current) {
      // Instead of going to the next track, pick a random track
      const playlist = backgroundPlayerRef.current.getPlaylist();
      if (playlist && playlist.length > 0) {
        const currentIndex = backgroundPlayerRef.current.getPlaylistIndex();
        let randomIndex;
        do {
          randomIndex = Math.floor(Math.random() * playlist.length);
        } while (randomIndex === currentIndex && playlist.length > 1);
        
        backgroundPlayerRef.current.playVideoAt(randomIndex);
      }
    }
  };

  // Handle music toggle
  const handleMusicToggle = () => {
    setIsMusicEnabled(!isMusicEnabled);
    
    // Clear any existing animation timeouts
    if (animationTimeout.current) {
      clearTimeout(animationTimeout.current);
    }
    
    if (!isMusicEnabled) {
      // Start animation sequence when enabling music
      setAnimationPhase('expanding');
      
      // After container expansion, show the content
      animationTimeout.current = setTimeout(() => {
        setAnimationPhase('showing');
      }, 300); // Timing should match the container expansion animation
      
      // Handle music playback
      if (backgroundPlayerRef.current) {
        // When enabling music
        backgroundPlayerRef.current.unMute();
        backgroundPlayerRef.current.setVolume(backgroundVolume);
        setBackgroundMuted(false);
        setDisplayVolume(backgroundVolume);
        // Skip to a random video and play it
        const playlist = backgroundPlayerRef.current.getPlaylist();
        if (playlist && playlist.length > 0) {
          const randomIndex = Math.floor(Math.random() * playlist.length);
          backgroundPlayerRef.current.playVideoAt(randomIndex);
          // Start playing and update state
          backgroundPlayerRef.current.playVideo();
          setIsPlaying(true);
        }
      }
    } else {
      // Reset animation phase when disabling music
      setAnimationPhase('hidden');
      
      // Handle music playback
      if (backgroundPlayerRef.current) {
        // When disabling music
        backgroundPlayerRef.current.mute(); // Mute the player when disabling music
        setBackgroundMuted(true); // Update the muted state in context
        setDisplayVolume(0);
        backgroundPlayerRef.current.pauseVideo();
        setIsPlaying(false);
      }
    }
  };

  // Clean up timeouts
  useEffect(() => {
    return () => {
      if (animationTimeout.current) {
        clearTimeout(animationTimeout.current);
      }
    };
  }, []);

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
      onKeyDown={(e) => {
        // Don't stop propagation for these keys
        if (e.code !== 'Comma' && e.code !== 'Period' && e.code !== 'KeyN' && e.code !== 'Slash') {
          e.stopPropagation();
        }
      }}
    >
      <GlobalStyles
        styles={{
          '@keyframes pulse': {
            '0%': { transform: 'scale(1)', opacity: 0.5 },
            '50%': { transform: 'scale(1.05)', opacity: 0.8 },
            '100%': { transform: 'scale(1)', opacity: 0.5 },
          },
          '@keyframes expandContainer': {
            '0%': { maxHeight: '0px', opacity: 0 },
            '100%': { maxHeight: '250px', opacity: 1 },
          },
          '@keyframes fadeInContent': {
            '0%': { opacity: 0, transform: 'translateY(10px)' },
            '100%': { opacity: 1, transform: 'translateY(0)' },
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
            
            {/* Add bypass button after timeout */}
            {showBypassButton && (
              <Button
                variant="outlined"
                onClick={handleStartServiceClick}
                sx={{
                  mt: 2,
                  color: 'white',
                  borderColor: 'red',
                  '&:hover': {
                    borderColor: 'red',
                    backgroundColor: 'rgba(255, 0, 0, 0.1)'
                  }
                }}
              >
                Force Start (Bypass Loading)
              </Button>
            )}
          </Box>
        ) : (
          <>
            <Typography 
              variant="h5" 
              component="h2" 
              gutterBottom
              sx={{ 
                color: isMobileDevice ? 'pink' : 'var(--accent-color)',
                fontWeight: isMobileDevice ? 'bold' : 'normal'
              }}
            >
              {isMobileDevice ? "You will experience buggy behavior if you continue on a mobile device." : "Ready when you are!"}
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
              <Box 
                sx={{ 
                  mt: 2, 
                  mb: 3,
                  position: 'relative',
                  zIndex: 10000,
                  overflow: 'hidden',
                  animation: animationPhase !== 'hidden' ? 'expandContainer 300ms ease-out forwards' : 'none',
                }}
              >
                <Box
                  sx={{
                    opacity: 0,
                    animation: animationPhase === 'showing' ? 'fadeInContent 400ms ease-out 100ms forwards' : 'none',
                  }}
                >
                  <BackgroundPlayerControls
                    displayVolume={displayVolume}
                    volume={backgroundVolume}
                    isPlaying={isPlaying}
                    onPlayPauseToggle={handlePlayPauseToggle}
                    onVolumeChange={handleVolumeChange}
                    onSkipNext={handleSkipNext}
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
                    TIP: There may be YouTube commercials initially. Set your TV or PC volume where you normally would for the service and adjust the above slider so the background music would be soft enough to not be a distraction during prayer or fellowship. The main service will be louder!
                  </Typography>
                </Box>
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