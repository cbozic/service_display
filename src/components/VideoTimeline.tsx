import React, { useState, useRef, useEffect } from 'react';
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
  // State to track if the slider is being interacted with
  const [isInteracting, setIsInteracting] = useState(false);
  // State to track the current hover position
  const [hoverPosition, setHoverPosition] = useState<number | null>(null);
  // Ref to store the slider value during dragging
  const sliderValueRef = useRef<number | null>(null);
  // Ref to store the last committed value
  const lastCommittedValueRef = useRef<number | null>(null);
  // State to track if we're in the transition period after releasing
  const [isTransitioning, setIsTransitioning] = useState(false);
  // Ref to track the previous currentTime value
  const prevCurrentTimeRef = useRef<number>(0);
  
  // Log render info
  console.log('[VideoTimeline] Rendering with:', { currentTime, duration });

  // Effect to detect when currentTime changes after a commit
  useEffect(() => {
    // If we're transitioning and currentTime has changed from the previous value
    if (isTransitioning && currentTime !== prevCurrentTimeRef.current) {
      // We can now safely clear the transitioning state
      setIsTransitioning(false);
      sliderValueRef.current = null;
    }
    
    // Update the previous currentTime ref
    prevCurrentTimeRef.current = currentTime;
  }, [currentTime, isTransitioning]);

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
    // Update the hover position during dragging
    const value = Array.isArray(newValue) ? newValue[0] : newValue;
    setHoverPosition(value);
    setIsInteracting(true);
    // Store the current slider value
    sliderValueRef.current = value;
  };

  const handleChangeCommitted = (_event: Event | React.SyntheticEvent, newValue: number | number[]) => {
    // This will be called when the user releases the mouse button
    const value = Array.isArray(newValue) ? newValue[0] : newValue;
    
    // Store the last committed value
    lastCommittedValueRef.current = value;
    
    // Set transitioning state to true
    setIsTransitioning(true);
    
    // Update the video time to the new position
    onTimeChange(inverseTransform(value));
    
    // Clear interaction state but keep the slider at the released position
    setHoverPosition(null);
    setIsInteracting(false);
  };

  // Format time for display
  const formatTime = (value: number) => {
    const time = inverseTransform(value);
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Protect against invalid duration values
  const safeDuration = duration > 0 ? duration : 1;

  // Determine the current slider value
  // If we're interacting or transitioning, use the stored value, otherwise use the video's current time
  const currentSliderValue = (isInteracting || isTransitioning) && sliderValueRef.current !== null
    ? sliderValueRef.current
    : valueTransform(Math.min(currentTime, safeDuration));

  return (
    <Box sx={{ width: '100%', px: 1, py: 1 }}>
      <Box sx={{ position: 'relative' }}>
        <CustomSlider
          value={currentSliderValue}
          min={0}
          max={valueTransform(safeDuration)}
          onChange={handleChange}
          onChangeCommitted={handleChangeCommitted}
          marks={marks.length > 8 ? marks.filter((_, i) => i % 2 === 0) : marks} // Reduce density if too many marks
          aria-label="Video timeline"
          valueLabelDisplay="off" // Disable the built-in tooltip
        />
        
        {/* Simple fixed-position tooltip below the slider */}
        {isInteracting && hoverPosition !== null && (
          <Box
            sx={{
              position: 'absolute',
              bottom: -30,
              left: '50%',
              transform: 'translateX(-50%)',
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              color: 'white',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '0.95rem',
              fontWeight: 500,
              zIndex: 99999,
              pointerEvents: 'none',
              textAlign: 'center',
              width: 'auto',
              minWidth: '60px',
            }}
          >
            {formatTime(hoverPosition)}
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default VideoTimeline; 