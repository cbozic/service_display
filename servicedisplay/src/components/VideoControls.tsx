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
import { VolumeUp, VolumeOff } from '@mui/icons-material';
import VolumeDownIcon from '@mui/icons-material/VolumeDown';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import VolumeMuteIcon from '@mui/icons-material/VolumeMute';

interface VideoControlsProps {
  onPlayPause: () => void;
  onSkipForward: () => void;
  onSkipBack: () => void;
  onFullscreen: () => void;
  onSlideTransitionsToggle: () => void;
  onPipToggle: () => void;
  onRestart: () => void;
  onVolumeChange: (volume: number) => void;
  onDuckingToggle: () => void;
  onToggleMute: () => void;
  isPlaying: boolean;
  isSlideTransitionsEnabled: boolean;
  isPipMode: boolean;
  volume: number;
  isDucking: boolean;
  isMuted: boolean;
}

const VideoControls: React.FC<VideoControlsProps> = ({
  onPlayPause,
  onSkipForward,
  onSkipBack,
  onFullscreen,
  onSlideTransitionsToggle,
  onPipToggle,
  onRestart,
  onVolumeChange,
  onDuckingToggle,
  onToggleMute,
  isPlaying,
  isSlideTransitionsEnabled,
  isPipMode,
  volume,
  isDucking,
  isMuted,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const [controlSize, setControlSize] = useState({
    iconSize: 24,
    padding: 8,
  });

  useEffect(() => {
    const updateControlSizes = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        const containerHeight = containerRef.current.clientHeight;

        // Calculate sizes based on container dimensions
        const minDimension = Math.min(containerWidth / 5, containerHeight / 2);
        const iconSize = Math.max(20, Math.min(36, minDimension * 0.5));
        const padding = Math.max(6, Math.min(12, minDimension * 0.25));

        setControlSize({
          iconSize: Math.round(iconSize),
          padding: Math.round(padding),
        });
      }
    };

    resizeObserverRef.current = new ResizeObserver(() => {
      window.requestAnimationFrame(updateControlSizes);
    });

    if (containerRef.current) {
      resizeObserverRef.current.observe(containerRef.current);
    }

    updateControlSizes();

    return () => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      }
    };
  }, []);

  const handleVolumeChange = (_event: Event, newValue: number | number[]) => {
    const value = Array.isArray(newValue) ? newValue[0] : newValue;
    onVolumeChange(value);
  };

  const containerStyle = {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: `${controlSize.padding}px`,
    padding: `${controlSize.padding}px`,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: '12px',
  };

  const spacerStyle = {
    flexGrow: 1,
    minWidth: `${controlSize.padding}px`, // Match the gap size
  };

  const buttonStyle = {
    color: 'var(--dark-text)',
    transition: 'all 0.2s ease',
    '&:hover': {
      backgroundColor: 'rgba(255, 255, 255, 0.1)'
    },
    '& .MuiSvgIcon-root': {
      fontSize: `${controlSize.iconSize}px`,
      transition: 'font-size 0.2s ease',
    },
    padding: `${controlSize.padding * 0.75}px`,
    borderRadius: '8px',
    border: '2px solid transparent',
  };

  const volumeButtonStyle = {
    ...buttonStyle,
    color: isMuted ? '#ffffff' : 'var(--dark-text)',
    backgroundColor: isMuted ? '#ef5350' : 'transparent',
    '&:hover': {
      backgroundColor: isMuted 
        ? '#d32f2f'  // Darker red on hover
        : 'rgba(255, 255, 255, 0.1)'
    },
    border: isMuted 
      ? '2px solid #ef5350'
      : '2px solid transparent',
  };

  const slideTransitionsButtonStyle = {
    ...buttonStyle,
    color: isSlideTransitionsEnabled ? '#ffffff' : 'var(--dark-text)',
    backgroundColor: isSlideTransitionsEnabled ? '#4CAF50' : 'transparent',
    '&:hover': {
      backgroundColor: isSlideTransitionsEnabled 
        ? '#388E3C'
        : 'rgba(255, 255, 255, 0.1)'
    },
    '& .MuiSvgIcon-root': {
      fontSize: `${controlSize.iconSize}px`,
      transition: 'all 0.2s ease',
    },
    transition: 'all 0.2s ease',
    borderRadius: '8px',
    padding: `${controlSize.padding * 0.75}px`,
    border: isSlideTransitionsEnabled 
      ? '2px solid #4CAF50'
      : '2px solid transparent',
  };

  const pipButtonStyle = {
    ...buttonStyle,
    color: isPipMode ? '#ffffff' : 'var(--dark-text)',
    backgroundColor: isPipMode ? '#2196F3' : 'transparent',
    '&:hover': {
      backgroundColor: isPipMode 
        ? '#1976D2'
        : 'rgba(255, 255, 255, 0.1)'
    },
    '& .MuiSvgIcon-root': {
      fontSize: `${controlSize.iconSize}px`,
      transition: 'all 0.2s ease',
    },
    transition: 'all 0.2s ease',
    borderRadius: '8px',
    padding: `${controlSize.padding * 0.75}px`,
    border: isPipMode 
      ? '2px solid #2196F3'
      : '2px solid transparent',
  };

  const sliderStyle = {
    width: '120px',
    color: 'var(--dark-text)',
    '& .MuiSlider-thumb': {
      color: 'var(--dark-text)',
    },
    '& .MuiSlider-track': {
      color: 'var(--dark-text)',
    },
    '& .MuiSlider-rail': {
      color: 'rgba(255, 255, 255, 0.3)',
    },
  };

  const duckingButtonStyle = {
    ...buttonStyle,
    color: isDucking ? '#ffffff' : 'var(--dark-text)',
    backgroundColor: isDucking ? '#FFA726' : 'transparent',
    '&:hover': {
      backgroundColor: isDucking 
        ? '#FF9800'  // Darker orange on hover
        : 'rgba(255, 255, 255, 0.1)'
    },
    '& .MuiSvgIcon-root': {
      fontSize: `${controlSize.iconSize}px`,
      transition: 'all 0.2s ease',
    },
    transition: 'all 0.2s ease',
    borderRadius: '8px',
    padding: `${controlSize.padding * 0.75}px`,
    border: isDucking 
      ? '2px solid #FFA726'  // Back to orange border
      : '2px solid transparent',
    '&.Mui-disabled': {
      backgroundColor: 'rgba(255, 255, 255, 0.12)',
      color: 'rgba(255, 255, 255, 0.3)',
    }
  };

  return (
    <Box ref={containerRef} sx={containerStyle}>
      <Tooltip title="Restart Video" placement="top">
        <IconButton onClick={onRestart} sx={buttonStyle}>
          <RestartAltIcon />
        </IconButton>
      </Tooltip>

      <Tooltip title="Skip Back 5s (Left Arrow)" placement="top">
        <IconButton onClick={onSkipBack} sx={buttonStyle}>
          <FastRewindIcon />
        </IconButton>
      </Tooltip>
      
      <Tooltip title={isPlaying ? "Pause (Space)" : "Play (Space)"} placement="top">
        <IconButton onClick={onPlayPause} sx={buttonStyle}>
          {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
        </IconButton>
      </Tooltip>
      
      <Tooltip title="Skip Forward 15s (Right Arrow)" placement="top">
        <IconButton onClick={onSkipForward} sx={buttonStyle}>
          <FastForwardIcon />
        </IconButton>
      </Tooltip>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Tooltip title={isMuted ? 'Unmute (M)' : 'Mute (M)'}>
          <IconButton onClick={onToggleMute} sx={volumeButtonStyle}>
            {isMuted ? <VolumeOffIcon /> : <VolumeUp />}
          </IconButton>
        </Tooltip>
        <Slider
          value={isMuted ? 0 : volume}
          onChange={handleVolumeChange}
          aria-label="Volume"
          min={0}
          max={100}
          sx={sliderStyle}
        />
        <Tooltip title={isDucking ? "Disable Volume Ducking (D)" : "Enable Volume Ducking (D)"}>
          <span>
            <IconButton 
              onClick={onDuckingToggle} 
              sx={duckingButtonStyle}
              disabled={isMuted}
            >
              <VolumeDownIcon />
            </IconButton>
          </span>
        </Tooltip>
      </Box>

      <Tooltip title={isSlideTransitionsEnabled ? "Disable Slide Transitions (T)" : "Enable Slide Transitions (T)"}>
        <IconButton onClick={onSlideTransitionsToggle} sx={slideTransitionsButtonStyle}>
          {isSlideTransitionsEnabled ? <StopIcon /> : <SlideshowOutlinedIcon />}
        </IconButton>
      </Tooltip>

      <Tooltip title={isPipMode ? "Exit Picture-in-Picture (P)" : "Enter Picture-in-Picture (P)"}>
        <IconButton onClick={onPipToggle} sx={pipButtonStyle}>
          {isPipMode ? <PictureInPictureAltIcon /> : <PictureInPictureIcon />}
        </IconButton>
      </Tooltip>

      <Tooltip title="Toggle Fullscreen (F)" placement="top">
        <IconButton onClick={onFullscreen} sx={buttonStyle}>
          <FullscreenIcon />
        </IconButton>
      </Tooltip>
    </Box>
  );
};

export default VideoControls; 