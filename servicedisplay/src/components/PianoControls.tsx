import React, { useState, useRef, useEffect } from 'react';
import { Piano, KeyboardShortcuts, MidiNumbers } from 'react-piano';
import 'react-piano/dist/styles.css';
import HiddenVideoPlayer from './HiddenVideoPlayer';
import { Box, IconButton, Tooltip, Slider } from '@mui/material';
import { VolumeUp, VolumeOff } from '@mui/icons-material';

// Constants for piano configuration
const FIRST_NOTE = MidiNumbers.fromNote('c3');
const LAST_NOTE = MidiNumbers.fromNote('b3');
const keyboardShortcuts = KeyboardShortcuts.create({
  firstNote: FIRST_NOTE,
  lastNote: LAST_NOTE,
  keyboardConfig: KeyboardShortcuts.HOME_ROW,
});

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

interface PianoControlsProps {
  onNotePlay?: (midiNumber: number) => void;
  onNoteStop?: (midiNumber: number) => void;
}

const PianoControls: React.FC<PianoControlsProps> = ({
  onNotePlay,
  onNoteStop,
}) => {
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(25);
  const [activeNote, setActiveNote] = useState<number | null>(null);
  const [pianoWidth, setPianoWidth] = useState(400);
  const containerRef = useRef<HTMLDivElement>(null);
  const fadeIntervalRef = useRef<number | null>(null);
  const previousVolumeRef = useRef(volume);

  useEffect(() => {
    const updatePianoSize = () => {
      if (containerRef.current) {
        // Leave some padding on the sides
        const newWidth = containerRef.current.clientWidth - 32;
        setPianoWidth(Math.max(200, newWidth)); // Minimum width of 200px
      }
    };

    updatePianoSize();
    window.addEventListener('resize', updatePianoSize);
    return () => window.removeEventListener('resize', updatePianoSize);
  }, []);

  const containerStyle = {
    backgroundColor: 'rgba(42, 43, 61, 0.8)',
    backdropFilter: 'blur(8px)',
    borderRadius: '8px',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    gap: '16px',
    width: '100%',
    height: '100%',
  };

  const pianoWrapperStyle = {
    borderRadius: '4px',
    overflow: 'hidden',
    width: '100%',
    display: 'flex',
    justifyContent: 'center',
    '& .ReactPiano__Keyboard': {
      height: 'auto',
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

  const controlsStyle = {
    display: 'flex',
    gap: '8px',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
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
    color: 'var(--dark-text)',
    backgroundColor: 'transparent',
    '&:hover': {
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
  };

  const fadeVolume = (start: number, end: number, onComplete?: () => void) => {
    if (fadeIntervalRef.current) {
      clearInterval(fadeIntervalRef.current);
    }

    const steps = 20; // Number of steps in the fade
    const interval = 2000 / steps; // Total time = 2000ms
    const volumeStep = (end - start) / steps;
    let currentStep = 0;

    setVolume(start);
    fadeIntervalRef.current = window.setInterval(() => {
      currentStep++;
      const newVolume = Math.max(0, Math.min(100, start + (volumeStep * currentStep)));
      
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
      <Box sx={controlsStyle}>
        <Tooltip title={isMuted ? 'Unmute' : 'Mute'}>
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
          keyboardShortcuts={keyboardShortcuts}
        />
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

export default PianoControls; 