import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Piano, MidiNumbers } from 'react-piano';
import 'react-piano/dist/styles.css';
import HiddenVideoPlayer from './HiddenVideoPlayer';
import { Box, IconButton, Tooltip, Slider, Typography } from '@mui/material';
import { VolumeUp, VolumeOff } from '@mui/icons-material';
import { useYouTube } from '../contexts/YouTubeContext';
import { FADE_STEPS } from '../App';

// Constants for piano configuration
const FIRST_NOTE = MidiNumbers.fromNote('c3');
const LAST_NOTE = MidiNumbers.fromNote('b3');

// Map MIDI numbers to video IDs (replace these with your actual video IDs)
// Videos are from https://www.youtube.com/@VishalBhojane
const VIDEO_MAP: { [key: number]: string } = {
  [FIRST_NOTE]: 'QmZpHmQqpy8',     // C3
  [FIRST_NOTE + 1]: 'l5jjorx4JZU', // C#3
  [FIRST_NOTE + 2]: 'J9P9SNlP-vo', // D3
  [FIRST_NOTE + 3]: 'j-LwL4eYZis', // D#3
  [FIRST_NOTE + 4]: 'eTSQjJJo9-I', // E3
  [FIRST_NOTE + 5]: 'IaCv_Jw4XmY', // F3
  [FIRST_NOTE + 6]: '-6kUyn9seeU', // F#3
  [FIRST_NOTE + 7]: 'Lq-ySCEPkMo', // G3
  [FIRST_NOTE + 8]: 'vLGPxnxAbdI', // G#3
  [FIRST_NOTE + 9]: 'oUoAXDnulN0', // A3
  [FIRST_NOTE + 10]: 'OHwXTiZW9ck', // A#3
  [FIRST_NOTE + 11]: 'd3n8D6nL4T0', // B3
};

interface PianoKeyboardProps {
  onNotePlay?: (midiNumber: number) => void;
  onNoteStop?: (midiNumber: number) => void;
}

const PianoKeyboard: React.FC<PianoKeyboardProps> = ({
  onNotePlay,
  onNoteStop,
}) => {
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(15);
  const [activeNote, setActiveNote] = useState<number | null>(null);
  const [pianoWidth, setPianoWidth] = useState(400);
  const containerRef = useRef<HTMLDivElement>(null);
  const fadeIntervalRef = useRef<number | null>(null);
  const previousVolumeRef = useRef(volume);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const { mainPlayersReady } = useYouTube();

  useEffect(() => {
    if (!mainPlayersReady) return;
    
    const updatePianoSize = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        const containerHeight = containerRef.current.clientHeight;
        
        // Calculate ideal key height (roughly 1/4 of container height)
        const idealKeyHeight = containerHeight * 0.25;
        // Piano width should be about 6 times the key height for good proportions
        const widthFromHeight = idealKeyHeight * 6;
        
        // Also consider width-based calculation (85% of container width)
        const widthFromContainer = containerWidth * 0.85;
        
        // Use the smaller of the two widths to ensure piano fits
        const targetWidth = Math.min(widthFromHeight, widthFromContainer);
        
        // Apply minimum width constraint
        const newWidth = Math.max(200, targetWidth - 32);
        setPianoWidth(newWidth);
      }
    };

    // Set up ResizeObserver
    resizeObserverRef.current = new ResizeObserver((entries) => {
      window.requestAnimationFrame(() => {
        updatePianoSize();
      });
    });

    if (containerRef.current) {
      resizeObserverRef.current.observe(containerRef.current);
    }

    // Initial size update
    updatePianoSize();

    // Cleanup
    return () => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      }
    };
  }, [mainPlayersReady]);

  const containerStyle = {
    backgroundColor: '#282c34',
    borderRadius: '8px',
    padding: '8px',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'flex-start',
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    position: 'relative' as const,
    minHeight: '180px',
  };

  const pianoGroupStyle = {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    padding: '8px',
    borderRadius: '12px',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    maxHeight: '95%',
    width: '100%',
    flex: '1 1 auto',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
  };

  const controlsStyle = {
    display: 'flex',
    gap: '8px',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    padding: '0 8px',
  };

  const pianoWrapperStyle = {
    borderRadius: '4px',
    overflow: 'hidden',
    width: '100%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    flex: '0 0 auto',
    position: 'relative' as const,
    margin: 'auto',
    '& .ReactPiano__Keyboard': {
      height: 'auto',
      maxHeight: '100%',
      position: 'relative',
      left: '50%',
      transform: 'translateX(-50%)',
    },
    '& .ReactPiano__Key--active': {
      backgroundColor: 'var(--accent-color)',
    },
    '& .ReactPiano__Key--accidental': {
      backgroundColor: '#333',
      border: '1px solid #222',
    },
    '& .ReactPiano__Key--natural': {
      backgroundColor: '#fff',
      border: '1px solid #333',
    },
    '& .ReactPiano__Key': {
      transition: 'all 0.1s ease',
    },
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

  const buttonStyle = {
    color: isMuted ? '#ffffff' : 'var(--dark-text)',
    backgroundColor: isMuted ? '#ef5350' : 'transparent',
    '&:hover': {
      backgroundColor: isMuted 
        ? '#d32f2f'  // Darker red on hover
        : 'rgba(255, 255, 255, 0.1)'
    },
    transition: 'all 0.2s ease',
    borderRadius: '8px',
    padding: '8px',
    border: isMuted 
      ? '2px solid #ef5350'
      : '2px solid transparent',
  };

  const fadeVolume = (start: number, end: number, onComplete?: () => void) => {
    if (fadeIntervalRef.current) {
      clearInterval(fadeIntervalRef.current);
    }

    const steps = FADE_STEPS;
    const interval = 3000 / steps; // Total time = 3000ms
    let currentStep = 0;

    setVolume(start);
    fadeIntervalRef.current = window.setInterval(() => {
      currentStep++;
      const fadeProgress = currentStep / steps;
      
      // Use exponential fade for more natural sound decay
      let newVolume;
      if (end > start) {
        // Fade in: inverse exponential curve
        newVolume = start + (end - start) * (1 - Math.pow(1 - fadeProgress, 1.5));
      } else {
        // Fade out: exponential curve
        newVolume = start * Math.pow(1 - fadeProgress, 1.5);
      }
      
      newVolume = Math.max(0, Math.min(100, newVolume));
      setVolume(newVolume);

      if (currentStep >= steps) {
        if (fadeIntervalRef.current) {
          clearInterval(fadeIntervalRef.current);
          fadeIntervalRef.current = null;
        }
        setVolume(end);
        onComplete?.();
      }
    }, interval);
  };

  // Clean up fade interval on unmount
  useEffect(() => {
    return () => {
      if (fadeIntervalRef.current) {
        clearInterval(fadeIntervalRef.current);
      }
    };
  }, []);

  const handleVolumeChange = (_event: Event, newValue: number | number[]) => {
    const value = Array.isArray(newValue) ? newValue[0] : newValue;
    setVolume(value);
    previousVolumeRef.current = value;
    if (value === 0) {
      setIsMuted(true);
    } else if (isMuted) {
      setIsMuted(false);
    }
  };

  const handleToggleMute = () => {
    if (!isMuted) {
      // Fade out to mute
      previousVolumeRef.current = volume;
      fadeVolume(volume, 0, () => setIsMuted(true));
    } else {
      // Fade in to previous volume
      const targetVolume = previousVolumeRef.current || 25;
      setIsMuted(false);
      fadeVolume(0, targetVolume);
    }
  };

  const handleNotePlay = (midiNumber: number) => {
    if (!isMuted) {
      setActiveNote(midiNumber);
      onNotePlay?.(midiNumber);
    }
  };

  const handleNoteStop = (midiNumber: number) => {
    onNoteStop?.(midiNumber);
  };

  const handleVideoEnd = () => {
    setActiveNote(null);
  };

  return (
    <Box ref={containerRef} sx={containerStyle}>
      <Typography
        variant="subtitle1"
        sx={{
          color: '#fff',
          padding: '4px',
          width: '100%',
          textAlign: 'center',
          backgroundColor: 'darkred',
          fontWeight: 500,
          letterSpacing: '0.5px',
          fontSize: '0.875rem',
          marginBottom: '4px'
        }}
      >
        Keys (Experimental)
      </Typography>
      <Box sx={pianoGroupStyle}>
        <Box sx={controlsStyle}>
          <Tooltip 
            title={isMuted ? 'Unmute' : 'Mute'} 
            arrow
            PopperProps={{
              sx: {
                zIndex: 20000, // Higher than the overlay's z-index (9999)
              }
            }}
            componentsProps={{
              tooltip: {
                sx: {
                  fontSize: '0.95rem', // Larger font size
                  fontWeight: 500,     // Slightly bolder
                  py: 1,               // More padding
                  px: 1.5
                }
              }
            }}
          >
            <IconButton
              onClick={handleToggleMute}
              sx={buttonStyle}
            >
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
        <Box sx={pianoWrapperStyle}>
          <Piano
            noteRange={{ first: FIRST_NOTE, last: LAST_NOTE }}
            playNote={handleNotePlay}
            stopNote={handleNoteStop}
            width={pianoWidth}
          />
        </Box>
      </Box>
      {Object.entries(VIDEO_MAP).map(([midiNumber, videoId]) => (
        <HiddenVideoPlayer
          key={midiNumber}
          videoId={videoId}
          isPlaying={parseInt(midiNumber) === activeNote}
          onVideoEnd={handleVideoEnd}
          volume={isMuted ? 0 : volume}
        />
      ))}
    </Box>
  );
};

export default PianoKeyboard; 