import React, { useRef, useEffect, useState } from 'react';
import { IconButton, Tooltip, Box, Slider } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import FastForwardIcon from '@mui/icons-material/FastForward';
import FastRewindIcon from '@mui/icons-material/FastRewind';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import SlideshowOutlinedIcon from '@mui/icons-material/SlideshowOutlined';
import StopIcon from '@mui/icons-material/Stop';
import PictureInPictureIcon from '@mui/icons-material/PictureInPicture';
import PictureInPictureAltIcon from '@mui/icons-material/PictureInPictureAlt';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import SkipPreviousIcon from '@mui/icons-material/SkipPrevious';
import { VolumeUp } from '@mui/icons-material';
import VolumeDownIcon from '@mui/icons-material/VolumeDown';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import HelpOutlinedIcon from '@mui/icons-material/HelpOutlined';
import TimerIcon from '@mui/icons-material/Timer';
import VideoTimeDisplay from './VideoTimeDisplay';
import VideoTimeline from './VideoTimeline';

interface VideoControlsProps {
  onPlayPause: () => void;
  onSkipForward: () => void;
  onSkipBack: () => void;
  onFullscreen: () => void;
  onSlideTransitionsToggle: () => void;
  onPipToggle: () => void;
  onEnablePip: () => void;
  onDisablePip: () => void;
  onRestart: () => void;
  onVolumeChange: (volume: number) => void;
  onDuckingToggle: () => void;
  onEnableDucking: () => void;
  onDisableDucking: () => void;
  onToggleMute: () => void;
  onHelpClick?: () => void;
  onTimeChange?: (newTime: number) => void;
  onTimedEventsToggle?: () => void;
  isPlaying: boolean;
  isSlideTransitionsEnabled: boolean;
  isPipMode: boolean;
  volume: number;
  isDucking: boolean;
  isMuted: boolean;
  isTimedEventsEnabled?: boolean;
  currentTime?: number;
  duration?: number;
}

const VideoControls: React.FC<VideoControlsProps> = ({
  onPlayPause,
  onSkipForward,
  onSkipBack,
  onFullscreen,
  onSlideTransitionsToggle,
  onPipToggle,
  onEnablePip,
  onDisablePip,
  onRestart,
  onVolumeChange,
  onDuckingToggle,
  onEnableDucking,
  onDisableDucking,
  onToggleMute,
  onHelpClick,
  onTimeChange,
  onTimedEventsToggle,
  isPlaying,
  isSlideTransitionsEnabled,
  isPipMode,
  volume,
  isDucking,
  isMuted,
  isTimedEventsEnabled = false,
  currentTime = 0,
  duration = 0,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    
    return () => {
      window.removeEventListener('resize', checkScreenSize);
    };
  }, []);

  const handleVolumeChange = (_event: Event, newValue: number | number[]) => {
    const volumeValue = Array.isArray(newValue) ? newValue[0] : newValue;
    onVolumeChange(volumeValue);
  };

  const handleTimeChange = (newTime: number) => {
    if (onTimeChange) {
      onTimeChange(newTime);
    }
  };

  // Custom tooltip styling
  const tooltipSx = {
    fontSize: '0.95rem', // Larger font size
    fontWeight: 500,     // Slightly bolder 
    py: 1,               // More padding
    px: 1.5
  };

  // Custom PopperProps for tooltips to ensure high z-index
  const tooltipPopperProps = {
    sx: {
      zIndex: 20000, // Higher than the overlay's z-index (9999)
    }
  };

  const containerStyle = {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    backdropFilter: 'blur(10px)',
    borderRadius: '10px',
    padding: '12px 8px', // Increased vertical padding
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 1, // Increased gap for more spacing
    transition: 'all 0.3s ease',
    width: '100%',
    maxWidth: '100%',
    height: 'auto',
  };

  const buttonStyle = {
    color: 'white',
    '&:hover': {
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
    }
  };
  
  const volumeButtonStyle = {
    ...buttonStyle,
    ...(isMuted && {
      color: 'rgba(255, 255, 255, 0.5)'
    })
  };
  
  const duckingButtonStyle = {
    ...buttonStyle,
    ...(isDucking && {
      color: 'rgba(127, 255, 0, 0.8)',
      backgroundColor: 'rgba(127, 255, 0, 0.1)',
      transform: 'scale(0.9)', // Slightly smaller when active
    }),
    ...(isMuted && {
      color: 'rgba(255, 255, 255, 0.3)',
      pointerEvents: 'none'
    })
  };

  const slideTransitionsButtonStyle = {
    ...buttonStyle,
    ...(isSlideTransitionsEnabled && {
      color: 'rgba(127, 255, 0, 0.8)',
      backgroundColor: 'rgba(127, 255, 0, 0.1)'
    })
  };

  const pipButtonStyle = {
    ...buttonStyle,
    ...(isPipMode && {
      color: 'rgba(127, 255, 0, 0.8)',
      backgroundColor: 'rgba(127, 255, 0, 0.1)'
    })
  };
  
  const sliderStyle = {
    width: isMobile ? 60 : 100,
    color: 'white',
    '& .MuiSlider-thumb': {
      width: 12,
      height: 12,
      '&:hover, &.Mui-focusVisible': {
        boxShadow: '0px 0px 0px 8px rgba(255, 255, 255, 0.16)',
      }
    },
    '& .MuiSlider-rail': {
      opacity: 0.4,
    }
  };

  const timedEventsButtonStyle = {
    ...buttonStyle,
    ...(isTimedEventsEnabled && {
      color: 'rgba(127, 255, 0, 0.8)',
      backgroundColor: 'rgba(127, 255, 0, 0.1)'
    })
  };

  return (
    <Box ref={containerRef} sx={containerStyle}>
      {/* Debug info for timeline */}
      {(() => {
        console.log('[VideoControls] Timeline render conditions:', { duration, hasTimeChange: !!onTimeChange });
        return null;
      })()}

      {/* Timeline */}
      {duration > 0 && onTimeChange && (
        <Box sx={{ width: '100%', mb: 1.5, mt: 0.5 }}> {/* Adjusted margins */}
          <VideoTimeline 
            currentTime={currentTime} 
            duration={duration} 
            onTimeChange={handleTimeChange} 
          />
        </Box>
      )}
      
      {/* Main controls container */}
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        flexGrow: 1,
        flexWrap: 'wrap',
        gap: 0.5,
        width: '100%',
      }}>
        {/* Time Display */}
        {currentTime !== undefined && (
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            marginRight: '10px',
            borderRight: '1px solid rgba(255, 255, 255, 0.3)',
            paddingRight: 1,
          }}>
            <VideoTimeDisplay 
              currentTimeInSeconds={currentTime} 
              position="left" 
              size="small"
            />
          </Box>
        )}

        {/* Left side controls - Display and Mode controls */}
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 1,
          borderRight: '1px solid rgba(255, 255, 255, 0.3)',
          paddingRight: 1,
        }}>
          <Tooltip 
            title="Toggle Fullscreen (F)" 
            placement="top" 
            arrow
            componentsProps={{
              tooltip: {
                sx: tooltipSx
              }
            }}
            PopperProps={tooltipPopperProps}
          >
            <IconButton onClick={onFullscreen} sx={buttonStyle}>
              <FullscreenIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip 
            title="Toggle Picture-in-Picture (P)" 
            placement="top" 
            arrow
            componentsProps={{
              tooltip: {
                sx: tooltipSx
              }
            }}
            PopperProps={tooltipPopperProps}
          >
            <IconButton onClick={onPipToggle} sx={pipButtonStyle}>
              {isPipMode ? <PictureInPictureAltIcon /> : <PictureInPictureIcon />}
            </IconButton>
          </Tooltip>

          <Tooltip 
            title={isSlideTransitionsEnabled ? "Disable Slide Transitions (T)" : "Enable Slide Transitions (T)"} 
            placement="top" 
            arrow
            componentsProps={{
              tooltip: {
                sx: tooltipSx
              }
            }}
            PopperProps={tooltipPopperProps}
          >
            <IconButton 
              onClick={onSlideTransitionsToggle} 
              sx={slideTransitionsButtonStyle}
            >
              <SlideshowOutlinedIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip 
            title={isTimedEventsEnabled ? "Disable Timed Events" : "Enable Timed Events"} 
            placement="top" 
            arrow
            componentsProps={{
              tooltip: {
                sx: tooltipSx
              }
            }}
            PopperProps={tooltipPopperProps}
          >
            <IconButton 
              onClick={onTimedEventsToggle} 
              sx={timedEventsButtonStyle}
              disabled={!onTimedEventsToggle}
            >
              <TimerIcon />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Center controls - Playback controls */}
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 1,
          borderRight: '1px solid rgba(255, 255, 255, 0.3)',
          paddingRight: 1,
        }}>
          <Tooltip 
            title="Restart Video (Alt+R)" 
            placement="top" 
            arrow
            componentsProps={{
              tooltip: {
                sx: tooltipSx
              }
            }}
            PopperProps={tooltipPopperProps}
          >
            <IconButton onClick={onRestart} sx={buttonStyle}>
              <SkipPreviousIcon />
            </IconButton>
          </Tooltip>

          <Tooltip 
            title="Skip Back 5s (Left Arrow)" 
            placement="top" 
            arrow
            componentsProps={{
              tooltip: {
                sx: tooltipSx
              }
            }}
            PopperProps={tooltipPopperProps}
          >
            <IconButton onClick={onSkipBack} sx={buttonStyle}>
              <FastRewindIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip 
            title={isPlaying ? "Pause (Space)" : "Play (Space)"} 
            placement="top" 
            arrow
            componentsProps={{
              tooltip: {
                sx: tooltipSx
              }
            }}
            PopperProps={tooltipPopperProps}
          >
            <IconButton onClick={onPlayPause} sx={buttonStyle}>
              {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
            </IconButton>
          </Tooltip>
          
          <Tooltip 
            title="Skip Forward 15s (Right Arrow)" 
            placement="top" 
            arrow
            componentsProps={{
              tooltip: {
                sx: tooltipSx
              }
            }}
            PopperProps={tooltipPopperProps}
          >
            <IconButton onClick={onSkipForward} sx={buttonStyle}>
              <FastForwardIcon />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Right side controls - Audio controls */}
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 1,
        }}>
          <Tooltip 
            title="Toggle Ducking (D)" 
            placement="top" 
            arrow
            componentsProps={{
              tooltip: {
                sx: tooltipSx
              }
            }}
            PopperProps={tooltipPopperProps}
          >
            <IconButton 
              onClick={onDuckingToggle} 
              sx={duckingButtonStyle}
            >
              <VolumeDownIcon />
            </IconButton>
          </Tooltip>

          <Tooltip 
            title={isMuted ? 'Unmute (M)' : 'Mute (M)'} 
            placement="top" 
            arrow
            componentsProps={{
              tooltip: {
                sx: tooltipSx
              }
            }}
            PopperProps={tooltipPopperProps}
          >
            <IconButton onClick={onToggleMute} sx={volumeButtonStyle}>
              {isMuted ? <VolumeOffIcon /> : 
                (volume < 50 ? <VolumeDownIcon /> : <VolumeUp />)
              }
            </IconButton>
          </Tooltip>
          
          <Tooltip
            title="Adjust volume (use [ to decrease, ] to increase)"
            arrow
            placement="top"
            componentsProps={{
              tooltip: {
                sx: tooltipSx
              }
            }}
            PopperProps={tooltipPopperProps}
          >
            <Slider
              value={volume}
              onChange={handleVolumeChange}
              aria-labelledby="volume-slider"
              min={0}
              max={100}
              sx={sliderStyle}
            />
          </Tooltip>
        </Box>
        
        {/* Help button - separated with divider */}
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center',
          marginLeft: 'auto', // Push to the right
          borderLeft: '1px solid rgba(255, 255, 255, 0.3)',
          paddingLeft: 1,
        }}>
          <Tooltip 
            title="Help (?)" 
            placement="top" 
            arrow
            componentsProps={{
              tooltip: {
                sx: tooltipSx
              }
            }}
            PopperProps={tooltipPopperProps}
          >
            <IconButton 
              onClick={onHelpClick} 
              sx={buttonStyle}
            >
              <HelpOutlinedIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
    </Box>
  );
};

export default VideoControls; 