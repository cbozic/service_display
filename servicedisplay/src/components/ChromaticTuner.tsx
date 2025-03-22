import React, { useEffect, useRef, useState } from 'react';
import * as pitchy from 'pitchy';
import { Box, Typography, IconButton, Tooltip } from '@mui/material';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';

const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const getNoteFromFrequency = (frequency: number) => {
  const noteNum = 12 * (Math.log2(frequency / 440) + 4.75);
  const note = Math.round(noteNum);
  const cents = Math.round((noteNum - note) * 100);
  const octave = Math.floor(note / 12);
  const noteName = noteNames[note % 12];
  return { noteName, octave, cents };
};

const ChromaticTuner: React.FC = () => {
  const [pitch, setPitch] = useState<number | null>(null);
  const [note, setNote] = useState<string>('-');
  const [cents, setCents] = useState<number>(0);
  const [isListening, setIsListening] = useState(false);
  const [isMicEnabled, setIsMicEnabled] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startListening = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      audioContextRef.current = new AudioContext();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      source.connect(analyserRef.current);

      const detector = pitchy.PitchDetector.forFloat32Array(analyserRef.current.fftSize);
      const input = new Float32Array(detector.inputLength);

      const updatePitch = () => {
        analyserRef.current!.getFloatTimeDomainData(input);
        const [pitch, clarity] = detector.findPitch(input, audioContextRef.current!.sampleRate);

        if (clarity > 0.8 && pitch > 20) {
          setPitch(pitch);
          const { noteName, octave, cents: detectedCents } = getNoteFromFrequency(pitch);
          setNote(`${noteName}${octave}`);
          setCents(detectedCents);
        }

        rafIdRef.current = requestAnimationFrame(updatePitch);
      };

      updatePitch();
      setIsListening(true);
    } catch (error) {
      console.error('Error accessing microphone:', error);
    }
  };

  const stopListening = () => {
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsListening(false);
    setPitch(null);
    setNote('-');
    setCents(0);
  };

  const toggleMicrophone = () => {
    if (isMicEnabled) {
      stopListening();
    } else {
      startListening();
    }
    setIsMicEnabled(!isMicEnabled);
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopListening();
    };
  }, []);

  const tunerStyle = {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: '12px',
    color: 'white',
    gap: '10px'
  };

  const noteStyle = {
    fontSize: '48px',
    fontWeight: 'bold',
    fontFamily: 'monospace'
  };

  const centsStyle = {
    width: '200px',
    height: '4px',
    backgroundColor: '#333',
    borderRadius: '2px',
    position: 'relative' as const,
    marginTop: '10px'
  };

  const centsIndicatorStyle = {
    width: '4px',
    height: '20px',
    backgroundColor: Math.abs(cents) < 5 ? '#4CAF50' : '#FF9800',
    position: 'absolute' as const,
    left: `${50 + (cents / 2)}%`,
    top: '-8px',
    transform: 'translateX(-2px)',
    transition: 'all 0.1s ease-out'
  };

  const micButtonStyle = {
    color: isMicEnabled ? '#ffffff' : 'var(--dark-text)',
    backgroundColor: isMicEnabled ? '#4CAF50' : 'transparent',
    '&:hover': {
      backgroundColor: isMicEnabled 
        ? '#388E3C'
        : 'rgba(255, 255, 255, 0.1)'
    },
    transition: 'all 0.2s ease',
    borderRadius: '8px',
    padding: '8px',
    border: isMicEnabled 
      ? '2px solid #4CAF50'
      : '2px solid transparent',
  };

  return (
    <Box sx={{ 
      height: '100%',
      backgroundColor: '#282c34',  // Match BackgroundPlayer color
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 2
    }}>
      <Box sx={tunerStyle}>
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 2, 
          marginBottom: 2 
        }}>
          <Typography variant="h6" sx={{ opacity: 0.7 }}>
            {isListening ? 'Listening...' : 'Microphone Off'}
          </Typography>
          <Tooltip title={isMicEnabled ? "Disable Microphone" : "Enable Microphone"}>
            <IconButton onClick={toggleMicrophone} sx={micButtonStyle}>
              {isMicEnabled ? <MicIcon /> : <MicOffIcon />}
            </IconButton>
          </Tooltip>
        </Box>
        <Typography sx={noteStyle}>
          {note}
        </Typography>
        {pitch && (
          <Typography variant="body2" sx={{ opacity: 0.7 }}>
            {Math.round(pitch)}Hz
          </Typography>
        )}
        <Box sx={centsStyle}>
          <Box sx={centsIndicatorStyle} />
        </Box>
        <Typography variant="body2" sx={{ opacity: 0.7 }}>
          {cents > 0 ? '+' : ''}{cents} cents
        </Typography>
      </Box>
    </Box>
  );
};

export default ChromaticTuner; 