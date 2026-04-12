import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Slider, Box, Tooltip, Typography } from '@mui/material';
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
import { VideoClip } from '../types/clipPlaylist';
import { computeSequentialTimeData, getCumulativeElapsedTime } from '../utils/clipTimeUtils';

interface VideoTimelineProps {
  currentTime: number;
  duration: number;
  onTimeChange: (newTime: number) => void;
  clips?: VideoClip[];
  currentClipIndex?: number;
  isClipModeActive?: boolean;
  currentVideoId?: string;
  isPlaybackMode?: boolean;
  videoTitles?: Record<string, string>;
  onSequentialSeek?: (clipIndex: number, seekTime: number) => void;
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

// Styled component for clip range visualization on the timeline
const ClipRegion = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'leftPos' && prop !== 'widthPct' && prop !== 'isCurrent'
})<{ leftPos: string; widthPct: string; isCurrent: boolean }>(
  ({ leftPos, widthPct, isCurrent }) => ({
    position: 'absolute',
    left: leftPos,
    width: widthPct,
    top: 0,
    bottom: 0,
    backgroundColor: isCurrent ? 'rgba(25, 118, 210, 0.3)' : 'rgba(25, 118, 210, 0.12)',
    border: isCurrent ? '1px solid rgba(25, 118, 210, 0.6)' : '1px solid rgba(25, 118, 210, 0.25)',
    borderRadius: 2,
    pointerEvents: 'none',
    zIndex: 0,
  })
);

// Palette of subtle colors for different videos in sequential timeline
const videoColors = [
  { bg: 'rgba(25, 118, 210, 0.2)', border: 'rgba(25, 118, 210, 0.5)', activeBg: 'rgba(25, 118, 210, 0.35)' },
  { bg: 'rgba(76, 175, 80, 0.2)', border: 'rgba(76, 175, 80, 0.5)', activeBg: 'rgba(76, 175, 80, 0.35)' },
  { bg: 'rgba(255, 152, 0, 0.2)', border: 'rgba(255, 152, 0, 0.5)', activeBg: 'rgba(255, 152, 0, 0.35)' },
  { bg: 'rgba(156, 39, 176, 0.2)', border: 'rgba(156, 39, 176, 0.5)', activeBg: 'rgba(156, 39, 176, 0.35)' },
];

const VideoTimeline: React.FC<VideoTimelineProps> = ({
  currentTime,
  duration,
  onTimeChange,
  clips,
  currentClipIndex,
  isClipModeActive,
  currentVideoId,
  isPlaybackMode,
  videoTitles,
  onSequentialSeek,
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

  // Log render info with useful debugging
  console.log('[VideoTimeline] Rendering with:', {
    currentTime,
    duration,
    eventCount: events.length,
    containerWidth: sliderContainerRef.current?.clientWidth
  });

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

  // More debugging for the container size
  useEffect(() => {
    if (sliderContainerRef.current) {
      console.log('[VideoTimeline] Container size:', {
        width: sliderContainerRef.current.clientWidth,
        height: sliderContainerRef.current.clientHeight
      });
    }
  }, []);

  // Compute sequential timeline data for playback mode
  const sequentialData = useMemo(() => {
    if (!isPlaybackMode || !clips || clips.length === 0) return null;

    const timeData = computeSequentialTimeData(clips);
    if (!timeData) return null;

    // Assign a color index per unique videoId
    const uniqueVideoIds = Array.from(new Set(clips.map(c => c.videoId)));
    const videoColorMap: Record<string, number> = {};
    uniqueVideoIds.forEach((vid, i) => {
      videoColorMap[vid] = i % videoColors.length;
    });

    return { ...timeData, videoColorMap };
  }, [isPlaybackMode, clips]);

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

  // Sequential timeline handlers
  const handleSequentialChange = (_event: Event, newValue: number | number[]) => {
    const value = Array.isArray(newValue) ? newValue[0] : newValue;
    setHoverPosition(value);
    setIsInteracting(true);
    sliderValueRef.current = value;
  };

  const handleSequentialChangeCommitted = (_event: Event | React.SyntheticEvent, newValue: number | number[]) => {
    if (!sequentialData || !clips) return;
    const virtualPos = Array.isArray(newValue) ? newValue[0] : newValue;

    lastCommittedValueRef.current = virtualPos;
    setIsTransitioning(true);
    setHoverPosition(null);
    setIsInteracting(false);

    // Find which clip this virtual position falls into
    const { cumulativeOffsets, clipDurations } = sequentialData;
    let targetClipIndex = clips.length - 1;
    for (let i = 0; i < clips.length; i++) {
      if (virtualPos < cumulativeOffsets[i] + clipDurations[i]) {
        targetClipIndex = i;
        break;
      }
    }

    // Calculate the actual time within that clip
    const offsetInClip = virtualPos - cumulativeOffsets[targetClipIndex];
    const actualTime = clips[targetClipIndex].startTime + offsetInClip;

    if (onSequentialSeek) {
      onSequentialSeek(targetClipIndex, actualTime);
    } else {
      onTimeChange(actualTime);
    }
  };

  // Format time for display
  const formatTime = (value: number) => {
    const time = inverseTransform(value);
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Format seconds directly
  const formatSeconds = (time: number) => {
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

  // Compute virtual position for sequential timeline
  const sequentialSliderValue = useMemo(() => {
    if (!sequentialData || !clips || currentClipIndex == null || currentClipIndex < 0) return 0;
    if ((isInteracting || isTransitioning) && sliderValueRef.current !== null) return sliderValueRef.current;

    const clipIndex = Math.min(currentClipIndex, clips.length - 1);
    return getCumulativeElapsedTime(currentTime, clipIndex, clips, sequentialData);
  }, [sequentialData, clips, currentClipIndex, currentTime, isInteracting, isTransitioning]);

  // Calculate the percentage position for each event marker
  const getEventMarkerPosition = (time: number) => {
    // We need to use the same transformation as the slider
    const transformedTime = valueTransform(Math.min(time, safeDuration));
    const maxValue = valueTransform(safeDuration);
    const percentPosition = (transformedTime / maxValue) * 100;

    console.log(`[Timeline Debug] Event at ${time}s: transformed=${transformedTime}, maxValue=${maxValue}, position=${percentPosition}%`);

    return `${percentPosition}%`;
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

  // --- Sequential Playback Mode Timeline ---
  if (isPlaybackMode && sequentialData && clips && clips.length > 0) {
    const { totalDuration, cumulativeOffsets, clipDurations, videoColorMap } = sequentialData;

    // Generate marks for the sequential timeline
    const seqMarks: { value: number; label: string }[] = [];
    const markInterval = totalDuration > 600 ? 300 : totalDuration > 120 ? 60 : 30;
    for (let t = 0; t <= totalDuration; t += markInterval) {
      seqMarks.push({ value: t, label: formatSeconds(t) });
    }

    return (
      <Box sx={{ width: '100%', px: 1, py: 1, mt: 1, position: 'relative' }} ref={sliderContainerRef}>
        {/* Clip indicator */}
        <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)', mb: 0.5, display: 'block' }}>
          Clip {(currentClipIndex ?? 0) + 1} of {clips.length}
          {currentClipIndex != null && currentClipIndex >= 0 && currentClipIndex < clips.length && (
            <Typography component="span" variant="caption" sx={{ ml: 1, color: 'rgba(144, 202, 249, 0.8)' }}>
              {videoTitles?.[clips[currentClipIndex].videoId]
                ? `- ${videoTitles[clips[currentClipIndex].videoId]}`
                : ''}
            </Typography>
          )}
        </Typography>

        <Box sx={{ position: 'relative' }}>
          {/* Sequential clip segments */}
          {clips.map((clip, index) => {
            const leftPct = (cumulativeOffsets[index] / totalDuration) * 100;
            const widthPct = (clipDurations[index] / totalDuration) * 100;
            const colorIdx = videoColorMap[clip.videoId];
            const colors = videoColors[colorIdx];
            const isCurrent = index === currentClipIndex;

            return (
              <Tooltip
                key={clip.id}
                title={`#${index + 1}: ${formatSeconds(clip.startTime)}-${formatSeconds(clip.endTime)} ${videoTitles?.[clip.videoId] || clip.videoId}`}
              >
                <Box
                  sx={{
                    position: 'absolute',
                    left: `${leftPct}%`,
                    width: `${widthPct}%`,
                    top: 0,
                    bottom: 0,
                    backgroundColor: isCurrent ? colors.activeBg : colors.bg,
                    border: `1px solid ${colors.border}`,
                    borderRadius: '2px',
                    pointerEvents: 'none',
                    zIndex: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                  }}
                >
                  {widthPct > 5 && (
                    <Typography
                      variant="caption"
                      sx={{
                        fontSize: '0.6rem',
                        color: 'rgba(255, 255, 255, 0.6)',
                        pointerEvents: 'none',
                        userSelect: 'none',
                      }}
                    >
                      {index + 1}
                    </Typography>
                  )}
                </Box>
              </Tooltip>
            );
          })}

          <CustomSlider
            value={sequentialSliderValue}
            min={0}
            max={totalDuration}
            onChange={handleSequentialChange}
            onChangeCommitted={handleSequentialChangeCommitted}
            marks={seqMarks.length > 8 ? seqMarks.filter((_, i) => i % 2 === 0) : seqMarks}
            aria-label="Clip playlist timeline"
            valueLabelDisplay="off"
          />

          {/* Hover tooltip */}
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
              {formatSeconds(hoverPosition)}
            </Box>
          )}
        </Box>
      </Box>
    );
  }

  // --- Standard Video Timeline (Find Clips mode or no clips) ---

  // Filter clips to only show those from the currently loaded video
  const filteredClips = (clips && currentVideoId)
    ? clips.filter(c => c.videoId === currentVideoId)
    : clips;

  return (
    <Box sx={{ width: '100%', px: 1, py: 1, mt: 1, position: 'relative' }} ref={sliderContainerRef}>
      {/* Event markers positioned above the slider */}
      <MarkerContainer>
        {(() => {
          console.log('[VideoTimeline] Rendering markers for events:', events.length, 'duration:', duration);
          return events
            .filter(event => {
              // Only show events within duration and log the ones we're filtering out
              const inRange = event.time <= duration;
              if (!inRange) {
                console.log(`[VideoTimeline] Filtering out event at ${event.time}s as it exceeds duration ${duration}s`);
              }
              return inRange;
            })
            .map((event, index) => {
              const position = getEventMarkerPosition(event.time);
              return (
                <Tooltip
                  key={`${event.time}-${event.eventType}-${index}`}
                  title={getEventTooltipText(event.eventType, event.actionType, event.time)}
                  placement="top"
                  arrow
                >
                  <EventMarker
                    left={position}
                    actionType={event.actionType}
                    onClick={() => onTimeChange(event.time)}
                  >
                    {getEventIcon(event.eventType, event.actionType)}
                  </EventMarker>
                </Tooltip>
              );
            });
        })()}
      </MarkerContainer>

      <Box sx={{ position: 'relative' }}>
        {/* Clip range indicators — filtered to current video */}
        {isClipModeActive && filteredClips && filteredClips.map((clip, filteredIndex) => {
          const maxValue = valueTransform(safeDuration);
          const leftTransformed = valueTransform(Math.min(clip.startTime, safeDuration));
          const rightTransformed = valueTransform(Math.min(clip.endTime, safeDuration));
          const leftPct = (leftTransformed / maxValue) * 100;
          const widthPct = ((rightTransformed - leftTransformed) / maxValue) * 100;
          // Find the real index of this clip in the full clips array
          const realIndex = clips ? clips.findIndex(c => c.id === clip.id) : filteredIndex;
          return (
            <ClipRegion
              key={clip.id}
              leftPos={`${leftPct}%`}
              widthPct={`${widthPct}%`}
              isCurrent={realIndex === currentClipIndex}
            />
          );
        })}
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
