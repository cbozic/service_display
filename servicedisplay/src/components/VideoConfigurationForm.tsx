import React, { useRef, useEffect, useState } from 'react';
import { Box, TextField, Typography, Card, CardContent, Button } from '@mui/material';

interface VideoConfigurationFormProps {
  video: string;
  setVideo: (value: string) => void;
  startTimeInSeconds: string;
  setStartTimeInSeconds: (value: string) => void;
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

  // Handle container resizing
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        const width = containerRef.current.offsetWidth;
        setFormWidth(`${width}px`);
      }
    };

    resizeObserverRef.current = new ResizeObserver(updateWidth);
    if (containerRef.current) {
      resizeObserverRef.current.observe(containerRef.current);
    }

    return () => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      }
    };
  }, []);

  return (
    <Box 
      ref={containerRef}
      sx={{ 
        height: '100%',
        backgroundColor: '#282c34',
        padding: 2,
        boxSizing: 'border-box',
        overflowY: 'auto'
      }}
    >
      <Card sx={{ 
        backgroundColor: '#1e1e1e',
        color: 'white',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        <CardContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Typography variant="h6" sx={{ color: 'white' }}>
              Video Configuration
            </Typography>

            <Box>
              <Typography sx={{ color: 'white', mb: 1 }}>
                YouTube Video ID
              </Typography>
              <TextField
                fullWidth
                value={video}
                onChange={(e) => setVideo(e.target.value)}
                sx={{
                  backgroundColor: '#282c34',
                  input: { color: 'white' },
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': {
                      borderColor: '#404040',
                    },
                    '&:hover fieldset': {
                      borderColor: '#4a4a4a',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#4a90e2',
                    },
                  },
                }}
              />
            </Box>

            <Box>
              <Typography sx={{ color: 'white', mb: 1 }}>
                Start Time (seconds)
              </Typography>
              <TextField
                fullWidth
                value={startTimeInSeconds}
                onChange={(e) => setStartTimeInSeconds(e.target.value)}
                sx={{
                  backgroundColor: '#282c34',
                  input: { color: 'white' },
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': {
                      borderColor: '#404040',
                    },
                    '&:hover fieldset': {
                      borderColor: '#4a4a4a',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#4a90e2',
                    },
                  },
                }}
              />
            </Box>

            <Box>
              <Typography sx={{ color: 'white', mb: 1 }}>
                YouTube Playlist URL
              </Typography>
              <TextField
                fullWidth
                value={playlistUrl}
                onChange={(e) => setPlaylistUrl(e.target.value)}
                sx={{
                  backgroundColor: '#282c34',
                  input: { color: 'white' },
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': {
                      borderColor: '#404040',
                    },
                    '&:hover fieldset': {
                      borderColor: '#4a4a4a',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#4a90e2',
                    },
                  },
                }}
              />
            </Box>

            <Box>
              <Typography sx={{ color: 'white', mb: 1 }}>
                GIF File
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
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default VideoConfigurationForm;
