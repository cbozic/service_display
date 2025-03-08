import React, { useState, useEffect, useRef } from 'react';
import { Box, List, ListItem, Paper, CircularProgress, Typography } from '@mui/material';
import { parseGIF, decompressFrames } from 'gifuct-js';

interface GifFrameDisplayProps {
  gifPath: string;
  onFrameSelect?: (frameUrl: string) => void;
}

const GifFrameDisplay: React.FC<GifFrameDisplayProps> = ({ gifPath, onFrameSelect }) => {
  const [frames, setFrames] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFrame, setSelectedFrame] = useState<number | null>(null);

  useEffect(() => {
    const loadGif = async () => {
      if (!gifPath) return;

      setLoading(true);
      setError(null);
      setFrames([]);
      setSelectedFrame(null);

      try {
        const response = await fetch(gifPath);
        const buffer = await response.arrayBuffer();
        const gif = parseGIF(buffer);
        const frames = decompressFrames(gif, true);
        
        // Create canvas for frame rendering
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Could not get canvas context');

        // Set canvas size to first frame dimensions
        canvas.width = frames[0].dims.width;
        canvas.height = frames[0].dims.height;

        // Convert frames to data URLs
        const frameUrls = frames.map(frame => {
          // Clear canvas
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          // Create ImageData from pixel array
          const imageData = new ImageData(
            new Uint8ClampedArray(frame.patch),
            frame.dims.width,
            frame.dims.height
          );

          // Draw frame
          ctx.putImageData(imageData, frame.dims.left, frame.dims.top);

          // Convert to data URL
          return canvas.toDataURL('image/png');
        });

        setFrames(frameUrls);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load GIF');
        console.error('Error loading GIF:', err);
      } finally {
        setLoading(false);
      }
    };

    loadGif();
  }, [gifPath]);

  const handleFrameClick = (index: number, frameUrl: string) => {
    setSelectedFrame(index);
    onFrameSelect?.(frameUrl);
  };

  if (!gifPath) {
    return (
      <Box sx={{ 
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#282c34',
        color: 'white'
      }}>
        <Typography>Select a GIF file to view frames</Typography>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box sx={{ 
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#282c34'
      }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ 
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#282c34',
        color: 'red'
      }}>
        {error}
      </Box>
    );
  }

  return (
    <Box sx={{ 
      height: '100%',
      backgroundColor: '#282c34',
      overflowY: 'auto',
      overflowX: 'hidden',
      padding: 2,
      boxSizing: 'border-box'
    }}>
      <List sx={{ 
        width: '100%',
        padding: 0,
        '& > *:last-child': {
          marginBottom: 0
        }
      }}>
        {frames.map((frameUrl, index) => (
          <ListItem 
            key={index}
            sx={{ 
              mb: 2,
              p: 0,
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'stretch',
              cursor: 'pointer'
            }}
            onClick={() => handleFrameClick(index, frameUrl)}
          >
            <Paper 
              sx={{ 
                width: '100%',
                p: 2,
                backgroundColor: selectedFrame === index ? '#2c2c2c' : '#1e1e1e',
                color: 'white',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2,
                border: selectedFrame === index ? '2px solid #4a90e2' : 'none',
                transition: 'all 0.2s ease',
                boxSizing: 'border-box',
                '&:hover': {
                  backgroundColor: '#2c2c2c',
                  transform: 'scale(1.01)'
                }
              }}
            >
              <Typography variant="h6" sx={{ 
                color: 'white',
                width: '100%',
                textAlign: 'center',
                wordBreak: 'break-word'
              }}>
                Frame {index + 1} {selectedFrame === index ? '(Selected)' : ''}
              </Typography>
              <Box 
                sx={{ 
                  width: '100%',
                  display: 'flex',
                  justifyContent: 'center',
                  borderRadius: 1,
                  overflow: 'hidden',
                  backgroundColor: '#000000'
                }}
              >
                <img 
                  src={frameUrl} 
                  alt={`Frame ${index + 1}`}
                  style={{
                    width: '100%',
                    height: 'auto',
                    objectFit: 'contain',
                    maxHeight: '50vh'
                  }}
                />
              </Box>
            </Paper>
          </ListItem>
        ))}
      </List>
    </Box>
  );
};

export default GifFrameDisplay; 