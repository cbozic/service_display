import React from 'react';
import { Box, IconButton, Tooltip, Slider } from '@mui/material';
import { SkipNext, PlayArrow, Pause } from '@mui/icons-material';

interface BackgroundPlayerControlsProps {
  volume: number;
  displayVolume: number;
  isPlaying: boolean;
  onPlayPauseToggle: () => void;
  onVolumeChange: (event: Event, value: number | number[]) => void;
  onSkipNext: () => void;
  size?: 'small' | 'medium';
}

const BackgroundPlayerControls: React.FC<BackgroundPlayerControlsProps> = ({
  volume,
  displayVolume,
  isPlaying,
  onPlayPauseToggle,
  onVolumeChange,
  onSkipNext,
  size = 'medium'
}) => {
  const handleVolumeChange = (_event: Event, newValue: number | number[]) => {
    // Ensure volume never goes below 0.1
    const minVolume = 0.1;
    let adjustedValue = newValue;
    
    if (Array.isArray(newValue)) {
      adjustedValue = newValue.map(v => Math.max(v, minVolume));
    } else {
      adjustedValue = Math.max(newValue, minVolume);
    }
    
    onVolumeChange(_event, adjustedValue);
  };

  const buttonSize = size === 'small' ? 'small' : 'medium';
  const sliderWidth = size === 'small' ? 100 : 120;

  // Custom PopperProps for tooltips to ensure high z-index
  const tooltipPopperProps = {
    sx: {
      zIndex: 20000, // Higher than the overlay's z-index (9999)
    }
  };

  // Custom tooltip styling
  const tooltipSx = {
    fontSize: '0.95rem', // Larger font size
    fontWeight: 500,     // Slightly bolder 
    py: 1,               // More padding
    px: 1.5,
    backgroundColor: '#333333'  // Lighter background
  };

  // Calculate the adjusted display volume
  // This ensures the Slider shows 0 when at the minimum volume of 0.1
  const adjustedDisplayVolume = Math.max(displayVolume, 0.1);

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
        <Tooltip 
          title={isPlaying ? "Pause background music" : "Play background music"} 
          arrow 
          placement="top"
          PopperProps={tooltipPopperProps}
          componentsProps={{
            tooltip: {
              sx: tooltipSx
            }
          }}
        >
          <IconButton 
            onClick={onPlayPauseToggle} 
            size={buttonSize}
            sx={{
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.1)'
              }
            }}
          >
            {isPlaying ? <Pause /> : <PlayArrow />}
          </IconButton>
        </Tooltip>
        <Tooltip 
          title="Adjust background music volume (< and > keys adjust by 5%, minimum 0.1%)" 
          arrow 
          placement="top"
          PopperProps={tooltipPopperProps}
          componentsProps={{
            tooltip: {
              sx: tooltipSx
            }
          }}
        >
          <Slider
            value={adjustedDisplayVolume}
            onChange={handleVolumeChange}
            min={0.1}
            max={100}
            aria-label="Volume"
            sx={{ width: sliderWidth }}
          />
        </Tooltip>
        <Tooltip 
          title="Skip to another track" 
          arrow 
          placement="top"
          PopperProps={tooltipPopperProps}
          componentsProps={{
            tooltip: {
              sx: tooltipSx
            }
          }}
        >
          <IconButton 
            onClick={(e) => {
              console.log('Skip button clicked');
              // Prevent event bubbling
              e.preventDefault();
              e.stopPropagation();
              // Call the skip function
              onSkipNext();
            }} 
            size={buttonSize}
            sx={{
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.1)'
              }
            }}
          >
            <SkipNext />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );
};

export default BackgroundPlayerControls;