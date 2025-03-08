import React, { useRef, useEffect, useState } from 'react';
import { IconButton, Tooltip, Box } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import FastForwardIcon from '@mui/icons-material/FastForward';
import FastRewindIcon from '@mui/icons-material/FastRewind';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import SlideshowOutlinedIcon from '@mui/icons-material/SlideshowOutlined';
import StopIcon from '@mui/icons-material/Stop';
import PictureInPictureIcon from '@mui/icons-material/PictureInPicture';
import PictureInPictureAltIcon from '@mui/icons-material/PictureInPictureAlt';

interface VideoControlsProps {
  onPlayPause: () => void;
  onFastForward: () => void;
  onRewind: () => void;
  onFullscreen: () => void;
  onSlideAnimationToggle: () => void;
  onUnderlayToggle: () => void;
  isPlaying: boolean;
  isSlideAnimationEnabled: boolean;
  isUnderlayMode: boolean;
}

const VideoControls: React.FC<VideoControlsProps> = ({
  onPlayPause,
  onFastForward,
  onRewind,
  onFullscreen,
  onSlideAnimationToggle,
  onUnderlayToggle,
  isPlaying,
  isSlideAnimationEnabled,
  isUnderlayMode
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

  return (
    <Box ref={containerRef} sx={containerStyle}>
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