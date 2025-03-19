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

interface VideoControlsProps {
  onPlayPause: () => void;
  onFastForward: () => void;
  onRewind: () => void;
  onFullscreen: () => void;
  onSlideAnimationToggle: () => void;
  onUnderlayToggle: () => void;
  onRestart: () => void;
  onVolumeChange: (volume: number) => void;
  isPlaying: boolean;
  isSlideAnimationEnabled: boolean;
  isUnderlayMode: boolean;
  volume: number;
}

const VideoControls: React.FC<VideoControlsProps> = ({
  onPlayPause,
  onFastForward,
  onRewind,
  onFullscreen,
  onSlideAnimationToggle,
  onUnderlayToggle,
  onRestart,
  onVolumeChange,
  isPlaying,
  isSlideAnimationEnabled,
  isUnderlayMode,
  volume
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const previousVolumeRef = useRef(volume);
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
    previousVolumeRef.current = value;
    if (value === 0) {
      setIsMuted(true);
    } else if (isMuted) {
      setIsMuted(false);
    }
  };

  const handleToggleMute = () => {
    if (!isMuted) {
      previousVolumeRef.current = volume;
      onVolumeChange(0);
      setIsMuted(true);
    } else {
      const targetVolume = previousVolumeRef.current || 25;
      setIsMuted(false);
      onVolumeChange(targetVolume);
    }
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

  const buttonStyle = {
    color: 'var(--dark-text)',
    padding: `${controlSize.padding}px`,
    transition: 'all 0.2s ease',
    '&:hover': {
      backgroundColor: 'rgba(255, 255, 255, 0.1)'
    },
    '& .MuiSvgIcon-root': {
      fontSize: `${controlSize.iconSize}px`,
      transition: 'font-size 0.2s ease',
    }
  };

  const slideshowButtonStyle = {
    ...buttonStyle,
    color: isSlideAnimationEnabled ? '#4CAF50' : 'var(--dark-text)',
    '&:hover': {
      backgroundColor: isSlideAnimationEnabled 
        ? 'rgba(76, 175, 80, 0.1)' 
        : 'rgba(255, 255, 255, 0.1)'
    },
    '& .MuiSvgIcon-root': {
      fontSize: `${controlSize.iconSize}px`,
      transition: 'all 0.2s ease',
      color: isSlideAnimationEnabled ? '#4CAF50' : 'var(--dark-text)',
    }
  };

  const underlayButtonStyle = {
    ...buttonStyle,
    color: isUnderlayMode ? '#2196F3' : 'var(--dark-text)',
    '&:hover': {
      backgroundColor: isUnderlayMode 
        ? 'rgba(33, 150, 243, 0.1)' 
        : 'rgba(255, 255, 255, 0.1)'
    },
    '& .MuiSvgIcon-root': {
      fontSize: `${controlSize.iconSize}px`,
      transition: 'all 0.2s ease',
      color: isUnderlayMode ? '#2196F3' : 'var(--dark-text)',
    }
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

  return (
    <Box ref={containerRef} sx={containerStyle}>
      <Tooltip title="Restart Video" placement="top">
        <IconButton onClick={onRestart} sx={buttonStyle}>
          <RestartAltIcon />
        </IconButton>
      </Tooltip>

      <Tooltip title="Rewind 5s (Left Arrow)" placement="top">
        <IconButton onClick={onRewind} sx={buttonStyle}>
          <FastRewindIcon />
        </IconButton>
      </Tooltip>
      
      <Tooltip title={isPlaying ? "Pause (Space)" : "Play (Space)"} placement="top">
        <IconButton onClick={onPlayPause} sx={buttonStyle}>
          {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
        </IconButton>
      </Tooltip>
      
      <Tooltip title="Fast Forward 15s (Right Arrow)" placement="top">
        <IconButton onClick={onFastForward} sx={buttonStyle}>
          <FastForwardIcon />
        </IconButton>
      </Tooltip>

      <Tooltip title="Toggle Fullscreen (F)" placement="top">
        <IconButton onClick={onFullscreen} sx={buttonStyle}>
          <FullscreenIcon />
        </IconButton>
      </Tooltip>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Tooltip title={isMuted ? 'Unmute' : 'Mute'}>
          <IconButton onClick={handleToggleMute} sx={buttonStyle}>
            {isMuted ? <VolumeOff /> : <VolumeUp />}
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
      </Box>

      <Tooltip title={isSlideAnimationEnabled ? "Disable Slide Animation" : "Enable Slide Animation"}>
        <IconButton onClick={onSlideAnimationToggle} sx={slideshowButtonStyle}>
          {isSlideAnimationEnabled ? <StopIcon /> : <SlideshowOutlinedIcon />}
        </IconButton>
      </Tooltip>

      <Tooltip title={isUnderlayMode ? "Return to Overlay Mode" : "Switch to Underlay Mode"}>
        <IconButton onClick={onUnderlayToggle} sx={underlayButtonStyle}>
          {isUnderlayMode ? <PictureInPictureAltIcon /> : <PictureInPictureIcon />}
        </IconButton>
      </Tooltip>
    </Box>
  );
};

export default VideoControls; 