import React, { useRef, useEffect, useState } from 'react';
import { Box, TextField, Typography, Card, CardContent, Button } from '@mui/material';

interface VideoConfigurationFormProps {
  video: string;
  setVideo: (value: string) => void;
  startTimeInSeconds: string;
  setStartTimeInSeconds: (value: string) => void;
  playlistUrl: string;
  setPlaylistUrl: (value: string) => void;
}

const VideoConfigurationForm: React.FC<VideoConfigurationFormProps> = ({
  video,
  setVideo,
  startTimeInSeconds,
  setStartTimeInSeconds,
  playlistUrl,
  setPlaylistUrl
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const [formWidth, setFormWidth] = useState('100%');

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
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default VideoConfigurationForm;
