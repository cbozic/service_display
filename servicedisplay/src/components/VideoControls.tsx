import React from 'react';
import { IconButton, Tooltip } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import FastForwardIcon from '@mui/icons-material/FastForward';
import FastRewindIcon from '@mui/icons-material/FastRewind';
import FullscreenIcon from '@mui/icons-material/Fullscreen';

interface VideoControlsProps {
  onPlayPause: () => void;
  onFastForward: () => void;
  onRewind: () => void;
  onFullscreen: () => void;
  isPlaying: boolean;
}

const VideoControls: React.FC<VideoControlsProps> = ({
  onPlayPause,
  onFastForward,
  onRewind,
  onFullscreen,
  isPlaying
}) => {
  const buttonStyle = {
    color: 'var(--dark-text)',
    '&:hover': {
      backgroundColor: 'rgba(255, 255, 255, 0.1)'
    }
  };

  return (
    <div className="video-controls">
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
    </div>
  );
};

export default VideoControls; 