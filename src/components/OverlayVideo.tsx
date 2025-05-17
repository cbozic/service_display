import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Box, 
  TextField, 
  Typography, 
  Checkbox, 
  FormControlLabel, 
  Paper,
  CircularProgress,
  Button,
  IconButton,
  Tooltip
} from '@mui/material';
import YouTube, { YouTubeProps, YouTubeEvent } from 'react-youtube';
import RefreshIcon from '@mui/icons-material/Refresh';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';

interface OverlayVideoProps {
  onVideoConfigChange: (config: {
    videoUrl: string;
    autoStartVideo: boolean;
    videoPlayer: any | null;
    isPlaying?: boolean;
  }) => void;
  isOverlayVisible?: boolean;
}

// Function to extract YouTube video ID from URL
const extractVideoId = (url: string): string | null => {
  if (!url) return null;
  
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  
  return (match && match[2].length === 11) ? match[2] : null;
};

// Function to format duration in seconds to MM:SS format
const formatDuration = (seconds: number): string => {
  if (!seconds || isNaN(seconds)) return '00:00';
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
};

const OverlayVideo: React.FC<OverlayVideoProps> = ({ onVideoConfigChange, isOverlayVisible = false }) => {
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [videoId, setVideoId] = useState<string | null>(null);
  const [autoStartVideo, setAutoStartVideo] = useState<boolean>(false);
  const [player, setPlayer] = useState<YouTubeEvent['target'] | null>(null);
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [thumbnailUrl, setThumbnailUrl] = useState<string>('');
  const [videoTitle, setVideoTitle] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const loadTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const configUpdatedRef = useRef<boolean>(false);
  const playerInstanceRef = useRef<HTMLDivElement>(null);
  const [isPlayerVisible, setIsPlayerVisible] = useState<boolean>(false);
  
  // When URL changes, extract video ID
  useEffect(() => {
    const newVideoId = extractVideoId(videoUrl);
    
    // Only process if the video ID has actually changed
    if (newVideoId !== videoId) {
      setVideoId(newVideoId);
      setError('');
      
      if (newVideoId) {
        // Set loading state and thumbnail
        setIsLoading(true);
        setThumbnailUrl(`https://img.youtube.com/vi/${newVideoId}/0.jpg`);
        
        // Clear any previous timeout
        if (loadTimeoutRef.current) {
          clearTimeout(loadTimeoutRef.current);
        }
        
        // Set a timeout to clear loading state if it gets stuck - use a longer timeout (30 seconds)
        loadTimeoutRef.current = setTimeout(() => {
          setIsLoading(false);
          setError('Loading timed out. This may be due to network issues or YouTube API restrictions. Try refreshing or using a different URL.');
        }, 30000);
        
        // Make the player visible to load data
        setIsPlayerVisible(true);
      } else if (videoUrl) {
        setError('Invalid YouTube URL');
        setThumbnailUrl('');
        setVideoTitle('');
        setVideoDuration(0);
        setIsPlayerVisible(false);
      } else {
        // Clear everything if URL is empty
        setThumbnailUrl('');
        setVideoTitle('');
        setVideoDuration(0);
        setIsPlayerVisible(false);
      }

      // Mark that we need to update the config
      configUpdatedRef.current = true;
      
      // Reset playing state when URL changes
      setIsPlaying(false);
    }
  }, [videoUrl, videoId]);

  // Separate effect to notify parent of changes, with debounce
  useEffect(() => {
    if (configUpdatedRef.current) {
      // Update parent component with the current state
      onVideoConfigChange({
        videoUrl,
        autoStartVideo,
        videoPlayer: player,
        isPlaying
      });
      
      // Reset the flag
      configUpdatedRef.current = false;
    }
  }, [videoUrl, autoStartVideo, player, onVideoConfigChange, isPlaying]);

  // Handle player changes separately
  useEffect(() => {
    if (player) {
      configUpdatedRef.current = true;
    }
  }, [player]);

  // Handle auto start changes separately
  useEffect(() => {
    configUpdatedRef.current = true;
  }, [autoStartVideo]);

  // Handle play state changes separately
  useEffect(() => {
    configUpdatedRef.current = true;
  }, [isPlaying]);

  // Handle overlay visibility changes
  useEffect(() => {
    if (!isOverlayVisible && isPlaying) {
      // If overlay becomes hidden while playing, stop playback
      setIsPlaying(false);
    }
  }, [isOverlayVisible, isPlaying]);

  // Add event listener for play state changes from MainVideoOverlay
  useEffect(() => {
    const handleOverlayVideoStateChange = (e: CustomEvent) => {
      const newIsPlaying = e.detail?.isPlaying;
      if (newIsPlaying !== undefined && newIsPlaying !== isPlaying) {
        console.log('Received overlay video state change event:', newIsPlaying);
        setIsPlaying(newIsPlaying);
      }
    };
    
    window.addEventListener('overlayVideoStateChange', handleOverlayVideoStateChange as EventListener);
    return () => {
      window.removeEventListener('overlayVideoStateChange', handleOverlayVideoStateChange as EventListener);
    };
  }, [isPlaying]);

  // Handle player ready event
  const handleReady = useCallback((event: YouTubeEvent) => {
    console.log('YouTube player ready');
    
    // Clear timeout if it exists
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current);
      loadTimeoutRef.current = null;
    }
    
    setIsLoading(false);
    setPlayer(event.target);
    
    try {
      // Get video duration
      const duration = event.target.getDuration();
      setVideoDuration(duration);
      
      // Get video title
      const videoData = event.target.getVideoData();
      if (videoData && videoData.title) {
        setVideoTitle(videoData.title);
      }
      
      // Player loaded successfully, clear any errors
      setError('');
    } catch (error) {
      console.error('Error getting video data:', error);
      setError('Error loading video details. Please try a different video.');
    }
  }, []);

  // Handle player errors
  const handleError = useCallback((event: YouTubeEvent) => {
    console.error('YouTube player error:', event.data);
    
    // Clear the loading state
    setIsLoading(false);
    
    // Clear timeout if it exists
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current);
      loadTimeoutRef.current = null;
    }
    
    // Set appropriate error message based on the error code
    // YouTube error codes: https://developers.google.com/youtube/iframe_api_reference#onError
    switch (event.data) {
      case 2:
        setError('Invalid YouTube video ID. Please check the URL and try again.');
        break;
      case 5:
        setError('HTML5 player error. Please try a different video.');
        break;
      case 100:
        setError('Video not found. It may have been removed or set to private.');
        break;
      case 101:
      case 150:
        setError('Video cannot be played in an embedded player.');
        break;
      default:
        setError('Error loading video. Please try a different URL.');
    }
  }, []);

  // Handle URL input change
  const handleUrlChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setVideoUrl(event.target.value);
  }, []);

  // Handle auto start checkbox change
  const handleAutoStartChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setAutoStartVideo(event.target.checked);
  }, []);

  // Update the handlePlayPauseClick function to be more robust
  const handlePlayPauseClick = useCallback(() => {
    if (player && videoId && isOverlayVisible) {
      const newIsPlaying = !isPlaying;
      console.log(`Setting overlay video isPlaying to ${newIsPlaying}`);
      setIsPlaying(newIsPlaying);
      
      // The actual play/pause action will be handled by MainVideoOverlay
      // when it receives the updated overlayVideo prop
    }
  }, [player, videoId, isOverlayVisible, isPlaying]);

  // Add a manual refresh function to retry loading if it fails
  const handleRefresh = useCallback(() => {
    if (videoId) {
      // Clear error and set loading state
      setError('');
      setIsLoading(true);
      
      // Reset player instance
      setPlayer(null);
      
      // Clear any previous timeout
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
      }
      
      // Set a new timeout
      loadTimeoutRef.current = setTimeout(() => {
        setIsLoading(false);
        setError('Loading timed out. This may be due to network issues or YouTube API restrictions. Try again later.');
      }, 30000);
      
      // Force a reload by toggling player visibility
      setIsPlayerVisible(false);
      setTimeout(() => setIsPlayerVisible(true), 50);
    }
  }, [videoId]);

  // Clean up timeouts when component unmounts
  useEffect(() => {
    return () => {
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
      }
    };
  }, []);

  // YouTube player options
  const opts: YouTubeProps['opts'] = {
    height: '360',
    width: '640',
    playerVars: {
      playsinline: 1,
      controls: 0,
      disablekb: 1,
      iv_load_policy: 3,
      fs: 0,
      modestbranding: 1,
      rel: 0,
      enablejsapi: 1,
    },
  };

  return (
    <Box sx={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      backgroundColor: '#111111',
      p: 2,
      gap: 2
    }}>
      <TextField
        fullWidth
        variant="outlined"
        label="YouTube Video URL"
        value={videoUrl}
        onChange={handleUrlChange}
        placeholder="https://www.youtube.com/watch?v=..."
        sx={{
          '& .MuiOutlinedInput-root': {
            color: 'white',
            '& fieldset': {
              borderColor: 'rgba(255, 255, 255, 0.3)',
            },
            '&:hover fieldset': {
              borderColor: 'rgba(255, 255, 255, 0.5)',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#4a90e2',
            },
          },
          '& .MuiInputLabel-root': {
            color: 'rgba(255, 255, 255, 0.7)',
          },
        }}
      />
      
      {error && (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 1 }}>
          <Typography variant="body2" sx={{ color: 'red' }}>
            {error}
          </Typography>
          {videoId && (
            <Button 
              variant="text" 
              color="primary" 
              onClick={handleRefresh}
              startIcon={<RefreshIcon />}
              size="small"
            >
              Retry
            </Button>
          )}
        </Box>
      )}
      
      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
          <CircularProgress size={40} />
        </Box>
      )}
      
      {videoId && !isLoading && (
        <>
          <Paper 
            elevation={3}
            sx={{ 
              width: '100%', 
              backgroundColor: '#1e1e1e',
              p: 2,
              borderRadius: 1,
              mt: 2
            }}
          >
            <Box sx={{ position: 'relative', width: '100%', pt: '56.25%' /* 16:9 Aspect Ratio */ }}>
              <img 
                src={thumbnailUrl}
                alt="Video thumbnail"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  borderRadius: '4px'
                }}
              />
              
              {/* Play/Pause Button Overlay */}
              <Box 
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'rgba(0, 0, 0, 0.3)',
                  borderRadius: '4px'
                }}
              >
                <Tooltip title={isOverlayVisible ? (isPlaying ? "Pause" : "Play") : "Overlay must be visible to play video"}>
                  <span>
                    <IconButton
                      onClick={handlePlayPauseClick}
                      disabled={!isOverlayVisible}
                      size="large"
                      sx={{
                        backgroundColor: 'rgba(0, 0, 0, 0.5)',
                        color: 'white',
                        '&:hover': {
                          backgroundColor: 'rgba(0, 0, 0, 0.7)',
                        },
                        '&.Mui-disabled': {
                          backgroundColor: 'rgba(0, 0, 0, 0.3)',
                          color: 'rgba(255, 255, 255, 0.3)',
                        }
                      }}
                    >
                      {isPlaying ? <PauseIcon fontSize="large" /> : <PlayArrowIcon fontSize="large" />}
                    </IconButton>
                  </span>
                </Tooltip>
              </Box>
            </Box>
            
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              mt: 2
            }}>
              <Typography 
                variant="subtitle1" 
                sx={{ 
                  color: 'white',
                  fontWeight: 'medium',
                  flexGrow: 1,
                  textAlign: 'center',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
              >
                {videoTitle}
              </Typography>
              
              <Typography 
                variant="body2" 
                sx={{ 
                  color: 'rgba(255, 255, 255, 0.7)',
                  ml: 1,
                  whiteSpace: 'nowrap'
                }}
              >
                {formatDuration(videoDuration)}
              </Typography>
            </Box>
            
            <Typography 
              variant="body2" 
              sx={{ 
                color: isPlaying ? '#4caf50' : 'rgba(255, 255, 255, 0.5)', 
                mt: 1,
                textAlign: 'center',
                fontWeight: isPlaying ? 'bold' : 'normal'
              }}
            >
              {isPlaying ? "Video is playing in overlay" : "Video is not playing"}
            </Typography>
          </Paper>
          
          <FormControlLabel
            control={
              <Checkbox 
                checked={autoStartVideo}
                onChange={handleAutoStartChange}
                sx={{
                  color: 'rgba(255, 255, 255, 0.7)',
                  '&.Mui-checked': {
                    color: '#4a90e2',
                  },
                }}
              />
            }
            label="Automatically start when overlay appears"
            sx={{
              color: 'white',
              mt: 1
            }}
          />
        </>
      )}
      
      {/* Hidden YouTube player for loading video data */}
      <div ref={playerInstanceRef} style={{ 
        position: 'absolute', 
        opacity: 0.01,
        pointerEvents: 'none', 
        height: '360px',
        width: '640px',
        overflow: 'hidden',
        zIndex: -1,
        visibility: 'visible'
      }}>
        {isPlayerVisible && videoId && (
          <YouTube
            videoId={videoId}
            opts={opts}
            onReady={handleReady}
            onError={handleError}
            className="hidden-youtube-player"
          />
        )}
      </div>
    </Box>
  );
};

export default OverlayVideo; 