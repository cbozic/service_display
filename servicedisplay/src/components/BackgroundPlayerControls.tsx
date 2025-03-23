import React from 'react';
import { Box, IconButton, Tooltip, Slider } from '@mui/material';
import { VolumeUp, VolumeOff, SkipNext, Shuffle } from '@mui/icons-material';

interface BackgroundPlayerControlsProps {
  isMuted: boolean;
  volume: number;
  onMuteToggle: () => void;
  onVolumeChange: (event: Event, value: number | number[]) => void;
  onSkipNext: () => void;
  onSkipRandom: () => void;
  size?: 'small' | 'medium';
}

const BackgroundPlayerControls: React.FC<BackgroundPlayerControlsProps> = ({
  isMuted,
  volume,
  onMuteToggle,
  onVolumeChange,
  onSkipNext,
  onSkipRandom,
  size = 'medium'
}) => {
  const handleVolumeChange = (_event: Event, newValue: number | number[]) => {
    onVolumeChange(_event, newValue);
  };

  const buttonSize = size === 'small' ? 'small' : 'medium';
  const sliderWidth = size === 'small' ? 100 : 120;

  return (
    <Box sx={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      gap: 2, 
      p: 1,
      borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
      width: '100%'
    }}>
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 2,
        justifyContent: 'center'
      }}>
        <Tooltip title={isMuted ? "Unmute" : "Mute"}>
          <IconButton 
            onClick={onMuteToggle} 
            size={buttonSize}
            sx={{
              borderRadius: 1,
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.1)'
              }
            }}
          >
            {isMuted || volume === 0 ? <VolumeOff /> : <VolumeUp />}
          </IconButton>
        </Tooltip>
        <Slider
          value={isMuted ? 0 : volume}
          onChange={handleVolumeChange}
          min={0}
          max={100}
          aria-label="Volume"
          sx={{ width: sliderWidth }}
        />
        <Tooltip title="Skip to Next">
          <IconButton 
            onClick={onSkipNext} 
            size={buttonSize}
            sx={{
              borderRadius: 1,
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.1)'
              }
            }}
          >
            <SkipNext />
          </IconButton>
        </Tooltip>
        <Tooltip title="Skip to Random">
          <IconButton 
            onClick={onSkipRandom}
            size={buttonSize}
            sx={{
              borderRadius: 1,
              '&:hover': {
                backgroundColor: 'rgba(127, 255, 0, 0.12)'
              }
            }}
          >
            <Shuffle />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );
};

export default BackgroundPlayerControls; 