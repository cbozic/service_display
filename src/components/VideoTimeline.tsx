import React, { useState, useRef, useEffect } from 'react';
import { Slider, Box, Tooltip } from '@mui/material';
import { styled } from '@mui/material/styles';
import { useTimeEvents } from '../contexts/TimeEventsContext';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import PictureInPictureIcon from '@mui/icons-material/PictureInPicture';
import PictureInPictureAltIcon from '@mui/icons-material/PictureInPictureAlt';
import VolumeDownIcon from '@mui/icons-material/VolumeDown';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import PauseIcon from '@mui/icons-material/Pause';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import InfoIcon from '@mui/icons-material/Info';

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

// Container for event markers that will be positioned above the timeline
const MarkerContainer = styled(Box)(({ theme }) => ({
  position: 'absolute',
  top: -8, // Positioned extremely close to the slider
  left: 0,
  right: 0,
  height: 10, // Minimal height
  display: 'flex',
  alignItems: 'center',
  pointerEvents: 'none',
}));

const EventMarker = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'left' && prop !== 'actionType'
})<{ left: string, actionType: 'enable' | 'disable' | 'one-time' }>(
  ({ left, actionType }) => ({
    position: 'absolute',
    left,
    transform: 'translateX(-50%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 16, // Smaller
    height: 16, // Smaller
    borderRadius: '50%',
    backgroundColor: actionType === 'enable' ? 'rgba(76, 175, 80, 0.25)' : 
                    actionType === 'disable' ? 'rgba(244, 67, 54, 0.25)' : 
                    'rgba(255, 152, 0, 0.25)',
    border: actionType === 'enable' ? '1px solid rgba(76, 175, 80, 0.6)' : 
            actionType === 'disable' ? '1px solid rgba(244, 67, 54, 0.6)' : 
            '1px solid rgba(255, 152, 0, 0.6)',
    pointerEvents: 'auto',
    zIndex: 10,
    boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
    '&:hover': {
      backgroundColor: actionType === 'enable' ? 'rgba(76, 175, 80, 0.4)' : 
                       actionType === 'disable' ? 'rgba(244, 67, 54, 0.4)' : 
                       'rgba(255, 152, 0, 0.4)',
      boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
    },
    '& svg': {
      width: 9, // Even smaller icons
      height: 9, // Even smaller icons
      color: actionType === 'enable' ? '#4caf50' : 
             actionType === 'disable' ? '#f44336' : 
             '#ff9800',
    }
  })
);

const VideoTimeline: React.FC<VideoTimelineProps> = ({
  currentTime,
  duration,
  onTimeChange,
}) => {
  // Get time events from context
  const { events } = useTimeEvents();
  
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
  // Ref for the slider container to calculate marker positions
  const sliderContainerRef = useRef<HTMLDivElement>(null);
  
  // Log render info
  console.log('[VideoTimeline] Rendering with:', { currentTime, duration, events: events.length });

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

  // Use a non-linear scale that emphasizes the first 5 seconds
  const valueTransform = (value: number) => {
    if (value <= 5) {
      // More granular control in first 5 seconds (50x)
      return value * 50; 
    } else {
      // Linear scale for the rest
      return 250 + (value - 5);
    }
  };

  // Inverse transform for display
  const inverseTransform = (value: number) => {
    if (value <= 250) {
      return value / 50; // Scale down the first 250 transformed units
    } else {
      return 5 + (value - 250);
    }
  };

  // Create marks for 5-minute intervals
  const marks = React.useMemo(() => {
    const marks = [];
    // Only show marks if duration is valid
    if (duration > 0) {
      // Add marks every 5 minutes (300 seconds)
      const interval = 300; // Always use 5-minute intervals
      for (let i = 0; i <= duration; i += interval) {
        marks.push({
          value: valueTransform(i),
          label: `${Math.floor(i / 60)}:${(i % 60).toString().padStart(2, '0')}`,
        });
      }
    }
    return marks;
  }, [duration, valueTransform]);

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
    
  // Calculate the percentage position for each event marker
  const getEventMarkerPosition = (time: number) => {
    const transformedTime = valueTransform(time);
    const maxValue = valueTransform(safeDuration);
    return `${(transformedTime / maxValue) * 100}%`;
  };
  
  // Helper function to get the appropriate icon based on event type and action
  const getEventIcon = (eventType: string, actionType: string) => {
    switch (eventType) {
      case 'fullscreen':
        return actionType === 'enable' ? <FullscreenIcon /> : <FullscreenExitIcon />;
      case 'pip':
        return actionType === 'enable' ? <PictureInPictureIcon /> : <PictureInPictureAltIcon />;
      case 'ducking':
        return actionType === 'enable' ? <VolumeDownIcon /> : <VolumeUpIcon />;
      case 'pause':
        return <PauseIcon />;
      case 'unpause':
        return <PlayArrowIcon />;
      default:
        return <InfoIcon />;
    }
  };
  
  // Generate tooltip text for each event
  const getEventTooltipText = (eventType: string, actionType: string, time: number) => {
    const timeStr = `${Math.floor(time / 60)}:${(time % 60).toString().padStart(2, '0')}`;
    
    switch (eventType) {
      case 'fullscreen':
        return actionType === 'enable' ? `Enable fullscreen at ${timeStr}` : `Exit fullscreen at ${timeStr}`;
      case 'pip':
        return actionType === 'enable' ? `Enable picture-in-picture at ${timeStr}` : `Disable picture-in-picture at ${timeStr}`;
      case 'ducking':
        return actionType === 'enable' ? `Enable audio ducking at ${timeStr}` : `Disable audio ducking at ${timeStr}`;
      case 'pause':
        return `Pause background players at ${timeStr}`;
      case 'unpause':
        return `Resume background players at ${timeStr}`;
      default:
        return `Event at ${timeStr}`;
    }
  };

  return (
    <Box sx={{ width: '100%', px: 1, py: 1, mt: 1, position: 'relative' }} ref={sliderContainerRef}>
      {/* Event markers positioned above the slider */}
      <MarkerContainer>
        {events
          .filter(event => event.time <= duration) // Only show events within duration
          .map((event, index) => (
            <Tooltip
              key={`${event.time}-${event.eventType}-${index}`}
              title={getEventTooltipText(event.eventType, event.actionType, event.time)}
              placement="top"
              arrow
            >
              <EventMarker
                left={getEventMarkerPosition(event.time)}
                actionType={event.actionType}
                onClick={() => onTimeChange(event.time)}
              >
                {getEventIcon(event.eventType, event.actionType)}
              </EventMarker>
            </Tooltip>
          ))}
      </MarkerContainer>
      
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