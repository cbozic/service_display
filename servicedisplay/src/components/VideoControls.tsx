import React from 'react';
import { Box, IconButton, Tooltip } from '@mui/material';
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
  return (
    <Box 
      sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        gap: 2, 
        padding: 2,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        borderRadius: 1
      }}
    >
      <Tooltip title="Rewind 5 seconds (Left Arrow)">
        <IconButton 
          onClick={onRewind}
          sx={{ color: 'white' }}
        >
          <FastRewindIcon />
        </IconButton>
      </Tooltip>

      <Tooltip title={isPlaying ? "Pause (Space)" : "Play (Space)"}>
        <IconButton 
          onClick={onPlayPause}
          sx={{ color: 'white' }}
        >
          {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
        </IconButton>
      </Tooltip>

      <Tooltip title="Fast forward 15 seconds (Right Arrow)">
        <IconButton 
          onClick={onFastForward}
          sx={{ color: 'white' }}
        >
          <FastForwardIcon />
        </IconButton>
      </Tooltip>

      <Tooltip title="Toggle Fullscreen (F)">
        <IconButton 
          onClick={onFullscreen}
          sx={{ color: 'white' }}
        >
          <FullscreenIcon />
        </IconButton>
      </Tooltip>
    </Box>
  );
};

export default VideoControls; 