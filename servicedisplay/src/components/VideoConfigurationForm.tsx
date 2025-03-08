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
  gifPath: string;
  setGifPath: (value: string) => void;
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
  gifPath,
  setGifPath
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const [formWidth, setFormWidth] = useState('100%');

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Create a blob URL for the file
      const blobUrl = URL.createObjectURL(file);
      setGifPath(blobUrl);

      // Store the blob URL to revoke it later
      if (gifPath && gifPath.startsWith('blob:')) {
        URL.revokeObjectURL(gifPath);
      }
    }
  };

  // Clean up blob URLs when component unmounts
  useEffect(() => {
    return () => {
      if (gifPath && gifPath.startsWith('blob:')) {
        URL.revokeObjectURL(gifPath);
      }
    };
  }, []);

  useEffect(() => {
    const updateFormSize = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        const containerHeight = containerRef.current.clientHeight;
        
        // Calculate ideal form width based on container dimensions
        // Use a more conservative width calculation to prevent scrollbars
        const maxWidth = Math.min(
          containerWidth - 32, // Account for padding
          500 // Slightly reduced maximum width for better fit
        );
        
        // Ensure form has good proportions relative to height
        const heightBasedWidth = containerHeight * 1.2; // Reduced multiplier
        const targetWidth = Math.min(maxWidth, heightBasedWidth);
        
        // Set width with a minimum of 250px (reduced from 280px)
        setFormWidth(`${Math.max(250, targetWidth)}px`);
      }
    };

    // Debounce the resize updates for better performance
    let timeoutId: number;
    const debouncedUpdateSize = () => {
      clearTimeout(timeoutId);
      timeoutId = window.setTimeout(updateFormSize, 100);
    };

    resizeObserverRef.current = new ResizeObserver(() => {
      window.requestAnimationFrame(debouncedUpdateSize);
    });

    if (containerRef.current) {
      resizeObserverRef.current.observe(containerRef.current);
    }

    updateFormSize();

    return () => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      }
      clearTimeout(timeoutId);
    };
  }, []);

  const containerStyle = {
    height: '100%',
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px',
    overflow: 'hidden', // Prevent scrollbars
    boxSizing: 'border-box' as const,
  };

  const cardStyle = {
    width: formWidth,
    maxWidth: '100%', // Ensure card never exceeds container
    backgroundColor: 'var(--dark-surface)',
    border: '1px solid var(--dark-border)',
    borderRadius: '8px',
    transition: 'width 0.2s ease',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  };

  const formStyle = {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 2,
    width: '100%', // Ensure form takes full width of card
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
        <CardContent sx={{ padding: '16px' }}>
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
            <Typography variant="h6" sx={{ color: 'white', marginTop: 4, marginBottom: 2 }}>
              Slides Configuration
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <input
                type="file"
                accept=".gif"
                style={{ display: 'none' }}
                ref={fileInputRef}
                onChange={handleFileSelect}
              />
              <Button
                variant="contained"
                onClick={() => fileInputRef.current?.click()}
                sx={{
                  backgroundColor: '#1e1e1e',
                  color: 'white',
                  '&:hover': {
                    backgroundColor: '#2c2c2c'
                  }
                }}
              >
                Choose GIF File
              </Button>
              {gifPath && (
                <Typography sx={{ color: 'white', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {gifPath.startsWith('blob:') ? 'Local file selected' : gifPath}
                </Typography>
              )}
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default VideoConfigurationForm;
