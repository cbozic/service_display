import React, { useState, useEffect, useRef } from 'react';
import { Box, List, ListItem, Paper, CircularProgress, Typography, Button, IconButton, Tooltip } from '@mui/material';
import { parseGIF, decompressFrames } from 'gifuct-js';
import CountdownOverlay from './CountdownOverlay';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import SlideshowOutlinedIcon from '@mui/icons-material/SlideshowOutlined';

interface SlideOverlayControlProps {
  gifPath: string;
  onFrameSelect?: (frameUrl: string, index: number) => void;
  onFramesUpdate?: (frames: string[]) => void;
  currentFrameIndex?: number;
  isAnimationEnabled?: boolean;
  setGifPath: (path: string) => void;
  onAnimationToggle?: (enabled: boolean) => void;
  onError?: () => void;
}

const SlideOverlayControl: React.FC<SlideOverlayControlProps> = ({ 
  gifPath, 
  onFrameSelect,
  onFramesUpdate,
  currentFrameIndex = -1,
  isAnimationEnabled = false,
  setGifPath,
  onAnimationToggle,
  onError
}) => {
  const [frames, setFrames] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const selectedFrameRef = useRef<HTMLLIElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-scroll to selected frame
  useEffect(() => {
    if (selectedFrameRef.current && containerRef.current && currentFrameIndex >= 0) {
      selectedFrameRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
  }, [currentFrameIndex]);

  useEffect(() => {
    const loadGif = async () => {
      if (!gifPath) return;

      setLoading(true);
      setError(null);
      setFrames([]);
      
      console.log(`Attempting to load GIF from path: ${gifPath}`);

      // Set a timeout to clear loading state if it gets stuck
      loadingTimeoutRef.current = setTimeout(() => {
        console.log('Loading timeout reached - forcing loading state to false');
        setLoading(false);
        setError('Loading timed out. Please try again or use a different GIF file.');
      }, 15000); // 15 second timeout

      try {
        const response = await fetch(gifPath);
        
        // Check if the response is successful
        if (!response.ok) {
          throw new Error(`Failed to fetch GIF: ${response.status} ${response.statusText}`);
        }
        
        console.log('GIF fetch successful, processing...');
        const buffer = await response.arrayBuffer();
        console.log(`GIF buffer size: ${buffer.byteLength} bytes`);
        const gif = parseGIF(buffer);
        const frames = decompressFrames(gif, true);
        console.log(`GIF frames parsed: ${frames.length} frames`);
        
        // Create canvas for frame rendering
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Could not get canvas context');

        // Check if frames array is empty
        if (!frames || frames.length === 0) {
          throw new Error('No frames found in the GIF');
        }

        // Set canvas size to first frame dimensions
        canvas.width = frames[0].dims.width;
        canvas.height = frames[0].dims.height;

        // Convert frames to data URLs
        const frameUrls = frames.map(frame => {
          try {
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
          } catch (frameErr) {
            console.error('Error processing frame:', frameErr);
            // Return a placeholder for the error frame
            return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
          }
        });

        setFrames(frameUrls);
        onFramesUpdate?.(frameUrls);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load GIF');
        console.error('Error loading GIF:', err);
        // Call the onError callback if provided
        if (onError) {
          onError();
        }
      } finally {
        // Clear the timeout and set loading to false
        if (loadingTimeoutRef.current) {
          clearTimeout(loadingTimeoutRef.current);
          loadingTimeoutRef.current = null;
        }
        setLoading(false);
      }
    };

    loadGif();

    // Clean up the timeout if the component unmounts or gifPath changes
    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
    };
  }, [gifPath, onFramesUpdate, onError]);

  const handleFrameClick = (index: number, frameUrl: string) => {
    onFrameSelect?.(frameUrl, index);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setGifPath(result);
        // Disable transitions after loading new slides
        onAnimationToggle?.(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnimationToggle = () => {
    onAnimationToggle?.(!isAnimationEnabled);
  };

  // Clean up blob URLs when component unmounts
  useEffect(() => {
    return () => {
      if (gifPath && gifPath.startsWith('blob:')) {
        URL.revokeObjectURL(gifPath);
      }
    };
  }, [gifPath]);

  // Custom tooltip styling
  const tooltipSx = {
    fontSize: '0.95rem', // Larger font size
    fontWeight: 500,     // Slightly bolder 
    py: 1,               // More padding
    px: 1.5,
    backgroundColor: '#333333'  // Lighter background
  };

  // Custom PopperProps for tooltips to ensure high z-index
  const tooltipPopperProps = {
    sx: {
      zIndex: 20000, // Higher than the overlay's z-index (9999)
    }
  };

  const buttonStyle = {
    color: 'white',
    '&:hover': {
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
    }
  };

  const slideTransitionsButtonStyle = {
    ...buttonStyle,
    ...(isAnimationEnabled && {
      color: 'rgba(127, 255, 0, 0.8)',
      backgroundColor: 'rgba(127, 255, 0, 0.1)'
    })
  };

  if (loading) {
    return (
      <Box sx={{ 
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#111111'
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
        backgroundColor: '#111111',
        color: 'red'
      }}>
        {error}
      </Box>
    );
  }

  return (
    <div style={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      backgroundColor: '#111111',
      transition: 'background-color 0.3s ease'
    }}>
      <div style={{ 
        padding: '20px', 
        display: 'flex', 
        flexDirection: 'row', 
        justifyContent: 'center',
        gap: '20px',
        backgroundColor: '#111111',
        transition: 'background-color 0.3s ease'
      }}>
        <div style={{ 
          display: 'flex', 
          gap: '10px', 
          alignItems: 'center',
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(10px)',
          borderRadius: '10px',
          padding: '10px',
          transition: 'background-color 0.3s ease'
        }}>
          <input
            type="file"
            accept="image/gif"
            onChange={handleFileChange}
            style={{ display: 'none' }}
            id="gif-upload"
          />
          <Tooltip 
            title="Load New Slides" 
            placement="top" 
            arrow
            componentsProps={{
              tooltip: {
                sx: tooltipSx
              }
            }}
            PopperProps={tooltipPopperProps}
          >
            <label htmlFor="gif-upload">
              <IconButton
                component="span"
                sx={buttonStyle}
              >
                <FolderOpenIcon />
              </IconButton>
            </label>
          </Tooltip>
          <Tooltip 
            title={isAnimationEnabled ? "Disable Slide Transitions (T)" : "Enable Slide Transitions (T)"} 
            arrow
            placement="top"
            componentsProps={{
              tooltip: {
                sx: tooltipSx
              }
            }}
            PopperProps={tooltipPopperProps}
          >
            <IconButton 
              onClick={handleAnimationToggle} 
              sx={slideTransitionsButtonStyle}
            >
              <SlideshowOutlinedIcon />
            </IconButton>
          </Tooltip>
        </div>
      </div>
      <Box 
        ref={containerRef}
        sx={{ 
          height: '100%',
          backgroundColor: '#111111',
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: 2,
          boxSizing: 'border-box',
          transition: 'background-color 0.3s ease'
        }}
      >
        {!gifPath ? (
          <Box sx={{ 
            height: 'calc(100% - 60px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            backgroundColor: '#111111'
          }}>
            <Typography>Select a GIF file to view frames</Typography>
          </Box>
        ) : (
          <List sx={{ 
            width: '100%',
            padding: 0,
            backgroundColor: '#111111',
            transition: 'background-color 0.3s ease',
            '& > *:last-child': {
              marginBottom: 0
            }
          }}>
            {frames.map((frameUrl, index) => (
              <ListItem 
                key={index}
                ref={currentFrameIndex === index ? selectedFrameRef : undefined}
                sx={{ 
                  mb: 2,
                  p: 0,
                  width: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'stretch',
                  cursor: 'pointer',
                  backgroundColor: '#111111',
                }}
                onClick={() => handleFrameClick(index, frameUrl)}
              >
                <Paper 
                  sx={{ 
                    width: '100%',
                    p: 2,
                    backgroundColor: currentFrameIndex === index 
                      ? (isAnimationEnabled ? '#264d3d' : '#2c2c2c')
                      : '#1e1e1e',
                    color: 'white',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 2,
                    border: currentFrameIndex === index ? '2px solid #4a90e2' : 'none',
                    transition: 'all 0.2s ease',
                    boxSizing: 'border-box',
                    '&:hover': {
                      backgroundColor: currentFrameIndex === index && isAnimationEnabled 
                        ? '#264d3d' 
                        : '#2c2c2c',
                      transform: 'scale(1.01)'
                    }
                  }}
                >
                  <Typography variant="body2" sx={{ 
                    color: 'white',
                    width: '100%',
                    textAlign: 'center',
                    wordBreak: 'break-word',
                    fontSize: '0.8rem',
                    opacity: 0.8
                  }}>
                    Slide {index + 1} {currentFrameIndex === index ? '(Selected)' : ''}
                  </Typography>
                  <Box 
                    sx={{ 
                      width: '100%',
                      display: 'flex',
                      justifyContent: 'center',
                      borderRadius: 1,
                      overflow: 'hidden',
                      backgroundColor: '#000000',
                      position: 'relative'
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
                    {currentFrameIndex === index && (
                      <CountdownOverlay 
                        isVisible={isAnimationEnabled}
                        intervalDuration={10000}
                      />
                    )}
                  </Box>
                </Paper>
              </ListItem>
            ))}
          </List>
        )}
      </Box>
    </div>
  );
};

export default SlideOverlayControl;