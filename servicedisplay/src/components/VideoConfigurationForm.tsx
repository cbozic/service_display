import React, { useRef, useEffect, useState } from 'react';
import { Box, TextField, Typography, Card, CardContent, Button } from '@mui/material';

interface VideoConfigurationFormProps {
  video: string;
  setVideo: (value: string) => void;
  startTimeInSeconds: string;
  setStartTimeInSeconds: (value: string) => void;
  overlaySlide: string;
  setOverlaySlide: (value: string) => void;
  playlistUrl: string;
  setPlaylistUrl: (value: string) => void;
}

const VideoConfigurationForm: React.FC<VideoConfigurationFormProps> = ({
  video,
  setVideo,
  startTimeInSeconds,
  setStartTimeInSeconds,
  overlaySlide,
  setOverlaySlide,
  playlistUrl,
  setPlaylistUrl,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const [formWidth, setFormWidth] = useState('100%');

  useEffect(() => {
    const updateFormSize = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        const containerHeight = containerRef.current.clientHeight;
        
        // Calculate ideal form width based on container dimensions
        const maxWidth = Math.min(
          containerWidth * 0.9, // 90% of container width
          600 // Maximum width in pixels
        );
        
        // Ensure form isn't too wide relative to height
        const heightBasedWidth = containerHeight * 1.5;
        const targetWidth = Math.min(maxWidth, heightBasedWidth);
        
        setFormWidth(`${Math.max(280, targetWidth)}px`); // Minimum width of 280px
      }
    };

    resizeObserverRef.current = new ResizeObserver(() => {
      window.requestAnimationFrame(updateFormSize);
    });

    if (containerRef.current) {
      resizeObserverRef.current.observe(containerRef.current);
    }

    updateFormSize();

    return () => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      }
    };
  }, []);

  const containerStyle = {
    height: '100%',
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
  };

  const cardStyle = {
    width: formWidth,
    backgroundColor: 'var(--dark-surface)',
    border: '1px solid var(--dark-border)',
    borderRadius: '8px',
    transition: 'all 0.2s ease',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  };

  const formStyle = {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 2,
  };

  const inputStyle = {
    '& .MuiOutlinedInput-root': {
      backgroundColor: 'var(--darker-bg)',
      '& fieldset': {
        borderColor: 'var(--dark-border)',
      },
      '&:hover fieldset': {
        borderColor: 'var(--accent-color)',
      },
      '&.Mui-focused fieldset': {
        borderColor: 'var(--accent-color)',
      },
    },
    '& .MuiInputLabel-root': {
      color: 'var(--dark-text-secondary)',
    },
    '& .MuiOutlinedInput-input': {
      color: 'var(--dark-text)',
    },
  };

  return (
    <Box ref={containerRef} sx={containerStyle}>
      <Card sx={cardStyle}>
        <CardContent>
          <Box sx={formStyle}>
            <TextField
              fullWidth
              label="Video ID"
              value={video}
              onChange={(e) => setVideo(e.target.value)}
              variant="outlined"
              sx={inputStyle}
            />
            <TextField
              fullWidth
              label="Start Time (seconds)"
              value={startTimeInSeconds}
              onChange={(e) => setStartTimeInSeconds(e.target.value)}
              variant="outlined"
              type="number"
              sx={inputStyle}
            />
            <TextField
              fullWidth
              label="Overlay Slide URL"
              value={overlaySlide}
              onChange={(e) => setOverlaySlide(e.target.value)}
              variant="outlined"
              sx={inputStyle}
            />
            <TextField
              fullWidth
              label="Playlist URL"
              value={playlistUrl}
              onChange={(e) => setPlaylistUrl(e.target.value)}
              variant="outlined"
              sx={inputStyle}
              placeholder="https://www.youtube.com/playlist?list=..."
            />
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default VideoConfigurationForm;
