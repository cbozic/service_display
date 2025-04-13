import React from 'react';
import { Slider, Box } from '@mui/material';
import { styled } from '@mui/material/styles';

interface VideoTimelineProps {
  currentTime: number;
  duration: number;
  onTimeChange: (newTime: number) => void;
}

// Custom styled slider for the timeline with minimal height
const CustomSlider = styled(Slider)(({ theme }) => ({
  color: '#1976d2', // More visible blue color
  height: 8, // Increase height for better visibility
  padding: '8px 0',
  '& .MuiSlider-thumb': {
    height: 16,
    width: 16,
    backgroundColor: '#fff',
    boxShadow: '0 0 3px rgba(0, 0, 0, 0.4)',
    '&:hover, &.Mui-focusVisible': {
      boxShadow: `0px 0px 0px 8px rgba(25, 118, 210, 0.16)`
    }
  },
  '& .MuiSlider-rail': {
    height: 8,
    opacity: 0.4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  '& .MuiSlider-track': {
    height: 8,
    backgroundColor: '#1976d2',
  },
  '& .MuiSlider-mark': {
    backgroundColor: '#878787',
    height: 8,
    width: 2,
    marginTop: 0,
  },
  '& .MuiSlider-markLabel': {
    fontSize: '0.7rem',
    color: 'rgba(255, 255, 255, 0.7)',
    transform: 'translateX(-50%)',
    marginTop: 4,
  },
}));

const VideoTimeline: React.FC<VideoTimelineProps> = ({
  currentTime,
  duration,
  onTimeChange,
}) => {
  // Log render info
  console.log('[VideoTimeline] Rendering with:', { currentTime, duration });

  // Create marks for 5-minute intervals
  const marks = React.useMemo(() => {
    const marks = [];
    // Only show marks if duration is valid
    if (duration > 0) {
      const interval = duration > 1800 ? 600 : 300; // 10 min or 5 min intervals depending on length
      for (let i = 0; i <= duration; i += interval) {
        marks.push({
          value: i,
          label: `${Math.floor(i / 60)}:${(i % 60).toString().padStart(2, '0')}`,
        });
      }
    }
    return marks;
  }, [duration]);

  // Use a simpler scale that just emphasizes the first 15 seconds
  const valueTransform = (value: number) => {
    if (value <= 15) {
      // More granular control in first 15 seconds (2x)
      return value * 2; 
    } else {
      // Linear scale for the rest
      return 30 + (value - 15);
    }
  };

  // Inverse transform for display
  const inverseTransform = (value: number) => {
    if (value <= 30) {
      return value / 2; // Scale down the first 30 transformed units
    } else {
      return 15 + (value - 30);
    }
  };

  const handleChange = (_event: Event, newValue: number | number[]) => {
    const value = Array.isArray(newValue) ? newValue[0] : newValue;
    onTimeChange(inverseTransform(value));
  };

  // Protect against invalid duration values
  const safeDuration = duration > 0 ? duration : 1;

  return (
    <Box sx={{ width: '100%', px: 1, py: 1 }}>
      <CustomSlider
        value={valueTransform(Math.min(currentTime, safeDuration))}
        min={0}
        max={valueTransform(safeDuration)}
        onChange={handleChange}
        marks={marks.length > 8 ? marks.filter((_, i) => i % 2 === 0) : marks} // Reduce density if too many marks
        aria-label="Video timeline"
        valueLabelDisplay="auto"
        valueLabelFormat={(value) => {
          const time = inverseTransform(value);
          const minutes = Math.floor(time / 60);
          const seconds = Math.floor(time % 60);
          return `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }}
      />
    </Box>
  );
};

export default VideoTimeline; 