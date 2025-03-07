import React, { useState, useEffect, useCallback } from 'react';
import { Piano, KeyboardShortcuts, MidiNumbers } from 'react-piano';
import 'react-piano/dist/styles.css';
import SoundfontProvider from './SoundfontProvider';
import { Box, IconButton, Tooltip } from '@mui/material';
import { VolumeUp, VolumeOff } from '@mui/icons-material';

// Constants for piano configuration
const FIRST_NOTE = MidiNumbers.fromNote('c3');
const LAST_NOTE = MidiNumbers.fromNote('f4');
const keyboardShortcuts = KeyboardShortcuts.create({
  firstNote: FIRST_NOTE,
  lastNote: LAST_NOTE,
  keyboardConfig: KeyboardShortcuts.HOME_ROW,
});

interface PianoControlsProps {
  onNotePlay?: (midiNumber: number) => void;
  onNoteStop?: (midiNumber: number) => void;
}

const PianoControls: React.FC<PianoControlsProps> = ({
  onNotePlay,
  onNoteStop,
}) => {
  const [isMuted, setIsMuted] = useState(false);

  const containerStyle = {
    backgroundColor: 'rgba(42, 43, 61, 0.8)',
    backdropFilter: 'blur(8px)',
    borderRadius: '8px',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '16px',
  };

  const pianoWrapperStyle = {
    borderRadius: '4px',
    overflow: 'hidden',
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
    width: '100%',
  };

  const buttonStyle = {
    color: 'var(--dark-text)',
    backgroundColor: 'transparent',
    '&:hover': {
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
  };

  const handleToggleMute = () => {
    setIsMuted(!isMuted);
  };

  return (
    <Box sx={containerStyle}>
      <Box sx={controlsStyle}>
        <Tooltip title={isMuted ? 'Unmute' : 'Mute'}>
          <IconButton
            onClick={handleToggleMute}
            sx={buttonStyle}
          >
            {isMuted ? <VolumeOff /> : <VolumeUp />}
          </IconButton>
        </Tooltip>
      </Box>
      <Box sx={pianoWrapperStyle}>
        <SoundfontProvider
          instrumentName="acoustic_grand_piano"
          hostname="https://d1pzp51pvbm36p.cloudfront.net"
          format="mp3"
          soundfont="MusyngKite"
          audioContext={new (window.AudioContext || (window as any).webkitAudioContext)()}
          render={({ playNote, stopNote }) => (
            <Piano
              noteRange={{ first: FIRST_NOTE, last: LAST_NOTE }}
              playNote={(midiNumber) => {
                if (!isMuted) {
                  playNote(midiNumber);
                  onNotePlay?.(midiNumber);
                }
              }}
              stopNote={(midiNumber) => {
                stopNote(midiNumber);
                onNoteStop?.(midiNumber);
              }}
              width={400}
              keyboardShortcuts={keyboardShortcuts}
            />
          )}
        />
      </Box>
    </Box>
  );
};

export default PianoControls; 