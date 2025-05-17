import React, { useEffect, useState, useRef } from 'react';
import { Box, Card, CardMedia, CardContent, Typography, Grid, Alert, Dialog, DialogContent, DialogActions, Button, DialogContentText, CircularProgress } from '@mui/material';
import YouTube, { YouTubeProps, YouTubeEvent } from 'react-youtube';
import { loadYouTubeAPI } from '../utils/youtubeAPI';

interface MainVideoSelectionListProps {
  setVideo: (videoId: string) => void;
  playlistUrl: string;
  currentVideo: string;
  onError?: (hasError: boolean) => void;
}

interface VideoData {
  title: string;
  videoId: string;
  thumbnailUrl: string;
}

const MainVideoSelectionList: React.FC<MainVideoSelectionListProps> = ({ setVideo, playlistUrl, currentVideo, onError }) => {
  const [videos, setVideos] = useState<VideoData[]>([]);
  const [error, setError] = useState<boolean>(false);
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [pendingVideoId, setPendingVideoId] = useState<string | null>(null);
  const [initialized, setInitialized] = useState<boolean>(false);
  const [isApiReady, setIsApiReady] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const playlistIdsRef = useRef<Set<string>>(new Set());
  const videosCollectedRef = useRef<number>(0);
  const playerRef = useRef<any>(null);
  const playlistLoadingTriesRef = useRef<number>(0);
  const maxLoadingTriesRef = useRef<number>(3);

  // Extract playlist ID from URL
  const getPlaylistId = (url: string): string => {
    const regex = /[&?]list=([^&]+)/;
    const match = url?.match(regex);
    return match ? match[1] : '';
  };

  // Create a video ID from playlist URL - needed to start loading playlist
  const getInitialVideoId = (url: string): string => {
    // First try to extract video ID
    const videoRegex = /(?:v=|\/v\/|\/embed\/|\/watch\?v=|\/watch\?.+&v=)([^&\/\?#]+)/;
    const videoMatch = url?.match(videoRegex);
    if (videoMatch) return videoMatch[1];
    
    // If no video ID, return placeholder (YouTube API will use first playlist item)
    return 'placeholder';
  };

  // Alternative method to load playlist if direct playlist loading doesn't work
  const loadPlaylistManually = async (playlistId: string) => {
    if (!playlistId) return;
    
    console.log('Attempting to load playlist manually:', playlistId);
    setIsLoading(true);
    
    try {
      // First try a direct fetch approach (this will only work if CORS is not an issue)
      // Note: This will likely fail in most environments without a YouTube API key
      const response = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId=${playlistId}`);
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.items && data.items.length > 0) {
          console.log('Successfully loaded playlist via API:', data.items.length, 'videos');
          const videoItems = data.items.map((item: any) => ({
            videoId: item.snippet.resourceId.videoId,
            title: item.snippet.title,
            thumbnailUrl: item.snippet.thumbnails?.high?.url || `https://img.youtube.com/vi/${item.snippet.resourceId.videoId}/maxresdefault.jpg`
          }));
          
          setVideos(videoItems);
          setInitialized(true);
          setIsLoading(false);
          onError?.(false);
          return;
        }
      }
      
      // If the API call fails, fall back to the player method
      console.log('API call failed or no videos returned, falling back to player method');
    } catch (error) {
      console.error('Error loading playlist manually:', error);
      // Continue with the YouTube player approach
    }
  };

  // Initialize YouTube API
  useEffect(() => {
    if (playlistUrl) {
      const playlistId = getPlaylistId(playlistUrl);
      setIsLoading(true);
      
      // Reset state for new playlist
      setVideos([]);
      playlistIdsRef.current = new Set();
      videosCollectedRef.current = 0;
      setError(false);
      setInitialized(false);
      playlistLoadingTriesRef.current = 0;
      
      loadYouTubeAPI().then(() => {
        setIsApiReady(true);
        
        // Try to load playlist manually first
        loadPlaylistManually(playlistId).catch(err => {
          console.error('Error in manual playlist loading:', err);
        });
      });
    } else {
      setError(true);
      onError?.(true);
    }
  }, [playlistUrl, onError]);

  const handleVideoEnd = () => {
    if (videosCollectedRef.current < 10 && playerRef.current) {
      try {
        console.log('Video ended, trying to get next video');
        playerRef.current.nextVideo();
      } catch (error) {
        console.error('Error moving to next video:', error);
      }
    }
  };

  const onPlayerReady = (event: YouTubeEvent) => {
    const player = event.target;
    playerRef.current = player;
    
    // Mute the player and reduce quality to save bandwidth
    player.mute();
    player.setVolume(0);
    player.setPlaybackQuality('small');
    
    console.log('YouTube player initialized for playlist traversal');
    
    // Start playing to trigger loading of the first video
    player.playVideo();
  };

  const onStateChange = (event: YouTubeEvent) => {
    const player = event.target;
    const state = event.data;
    
    try {
      // Log all state changes for debugging
      console.log('Player state changed:', state);
      
      // When video is playing
      if (state === 1) { // YT.PlayerState.PLAYING
        const videoData = player.getVideoData();
        const videoId = videoData.video_id;
        
        console.log('Currently playing video:', videoId, videoData.title);
        
        if (!videoId) {
          console.log('No video ID found, retrying...');
          return;
        }
        
        // Only process new videos
        if (!playlistIdsRef.current.has(videoId)) {
          playlistIdsRef.current.add(videoId);
          videosCollectedRef.current++;
          
          console.log(`Adding video ${videosCollectedRef.current}: ${videoId} - ${videoData.title}`);
          
          // Add video to our list
          setVideos(prevVideos => [
            ...prevVideos,
            {
              videoId: videoId,
              title: videoData.title || `Video ${videosCollectedRef.current}`,
              thumbnailUrl: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
            }
          ]);
          
          // If we've collected enough videos or reached the limit
          if (videosCollectedRef.current >= 60) {
            console.log('Reached video limit, stopping playlist traversal');
            player.pauseVideo();
            setInitialized(true);
            setIsLoading(false);
            onError?.(false);
          } else {
            // After a brief delay, go to the next video
            // This ensures we collect the current video before moving on
            setTimeout(() => {
              try {
                console.log('Moving to next video in playlist');
                player.nextVideo();
              } catch (error) {
                console.error('Error advancing to next video:', error);
              }
            }, 1000); // Increased delay to give more time
          }
        } else if (videosCollectedRef.current < 60) {
          // If we've already seen this video but haven't reached our limit,
          // try to move to the next one
          console.log('Already processed this video, skipping to next');
          setTimeout(() => {
            try {
              player.nextVideo();
            } catch (error) {
              console.error('Error skipping to next video:', error);
            }
          }, 1000);
        }
      }
      
      // When a video ends, go to the next one if we're still collecting
      if (state === 0) { // YT.PlayerState.ENDED
        if (videosCollectedRef.current < 60) {
          console.log('Video ended, moving to next video');
          handleVideoEnd();
        }
      }
      
      // If we encounter an error (state = 2 is paused, often by autoplay restrictions)
      if (state === 5 || state === -1 || state === 2) {
        console.log('Playlist state update:', state);
        
        if (state === -1 && videosCollectedRef.current === 0) {
          // Try to start the playlist again
          playlistLoadingTriesRef.current++;
          
          if (playlistLoadingTriesRef.current < maxLoadingTriesRef.current) {
            console.log(`Retrying playlist start (attempt ${playlistLoadingTriesRef.current})`);
            setTimeout(() => {
              try {
                player.playVideo();
              } catch (error) {
                console.error('Error restarting playlist:', error);
              }
            }, 1500);
          } else if (videos.length === 0) {
            console.log('Failed to load playlist after multiple attempts');
            setError(true);
            setIsLoading(false);
            onError?.(true);
          }
        }
        
        // Set as initialized if we have any videos
        if (videos.length > 0 && !initialized) {
          console.log('Playlist has loaded some videos, marking as initialized');
          setInitialized(true);
          setIsLoading(false);
          onError?.(false);
        }
      }
    } catch (error) {
      console.error('Error in state change handler:', error);
    }
  };

  useEffect(() => {
    // Reset when playlist URL changes
    if (playlistUrl) {
      setVideos([]);
      playlistIdsRef.current = new Set();
      videosCollectedRef.current = 0;
      setError(false);
      setInitialized(false);
    } else {
      setError(true);
      onError?.(true);
    }
  }, [playlistUrl, onError]);

  useEffect(() => {
    if (videos.length > 0 && initialized) {
      // Remove this automatic selection of first video
      // setVideo(videos[0].videoId);
      
      // Just mark as ready but don't select anything
      console.log('Playlist loaded with', videos.length, 'videos, ready for user selection');
    }
  }, [videos, initialized]);

  const handleVideoClick = (videoId: string) => {
    if (currentVideo && currentVideo !== videoId) {
      setPendingVideoId(videoId);
      setDialogOpen(true);
    } else {
      setVideo(videoId);
    }
  };

  const handleConfirm = () => {
    if (pendingVideoId) {
      setVideo(pendingVideoId);
    }
    setDialogOpen(false);
    setPendingVideoId(null);
  };

  const handleCancel = () => {
    setDialogOpen(false);
    setPendingVideoId(null);
  };

  const cardStyle = {
    backgroundColor: 'var(--dark-surface)',
    border: '1px solid var(--dark-border)',
    borderRadius: '8px',
    transition: 'all 0.2s ease',
    cursor: 'pointer',
    '&:hover': {
      transform: 'translateY(-4px)',
      borderColor: 'var(--accent-color)',
      boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
    }
  };

  const selectedCardStyle = {
    ...cardStyle,
    backgroundColor: '#264d3d',
    borderColor: '#4a90e2',
    boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
  };

  const mediaStyle = {
    height: 140,
    backgroundColor: 'var(--darker-bg)'
  };

  const titleStyle = {
    color: 'var(--dark-text)',
    fontSize: '1rem',
    fontWeight: 500,
    marginBottom: 1
  };

  const alertStyle = {
    backgroundColor: 'var(--dark-surface)',
    color: 'var(--dark-text)',
    border: '1px solid var(--dark-border)',
    '& .MuiAlert-icon': {
      color: 'var(--accent-color)'
    },
    '& .MuiAlert-message': {
      textAlign: 'left',
      width: '100%'
    }
  };

  const dialogStyle = {
    '& .MuiPaper-root': {
      backgroundColor: 'var(--dark-surface)',
      border: '1px solid var(--dark-border)',
      borderRadius: '8px',
      color: 'var(--dark-text)',
      boxShadow: '0 8px 24px rgba(0,0,0,0.4)'
    }
  };
  
  const dialogContentStyle = {
    color: 'var(--dark-text)'
  };
  
  const buttonStyle = {
    color: 'var(--accent-color)'
  };

  const playlistId = getPlaylistId(playlistUrl);
  const initialVideoId = getInitialVideoId(playlistUrl);

  // YouTube player options for playlist
  const opts: YouTubeProps['opts'] = {
    height: '1',
    width: '1',
    playerVars: {
      autoplay: 1, // Changed to autoplay=1 to help with playlist loading
      controls: 0,
      disablekb: 1,
      fs: 0,
      modestbranding: 1,
      playsinline: 1,
      origin: window.location.origin,
      enablejsapi: 1,
      mute: 1,
      vq: 'small',
      // Playlist options
      ...(playlistId && {
        listType: 'playlist',
        list: playlistId,
        // Additional options to help with playlist loading
        loop: 0,
        rel: 0,
        showinfo: 0
      })
    },
  };

  return (
    <Box sx={{ 
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      width: '100%'
    }}>
      {/* Hidden player to load playlist data */}
      {playlistUrl && isApiReady && (
        <div style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', zIndex: -1 }}>
          <YouTube
            videoId={initialVideoId}
            opts={opts}
            onReady={onPlayerReady}
            onStateChange={onStateChange}
          />
        </div>
      )}
      
      <Box sx={{ padding: 2, flex: '1 1 auto', overflowY: 'auto' }}>
        {error ? (
          <Alert severity="info" sx={alertStyle}>
            <Typography variant="body1" sx={{ textAlign: 'left' }}>
              Unable to load playlist data. Please check the URL and try again.
            </Typography>
          </Alert>
        ) : isLoading || videos.length === 0 ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={40} sx={{ color: 'var(--accent-color)', mb: 2 }} />
            <Typography variant="body1" sx={{ textAlign: 'center', color: 'var(--dark-text)' }}>
              Loading playlist videos...
            </Typography>
          </Box>
        ) : (
          <Grid container spacing={2}>
            {videos.map((video) => (
              <Grid item xs={12} key={video.videoId}>
                <Card 
                  sx={video.videoId === currentVideo ? selectedCardStyle : cardStyle}
                  onClick={() => handleVideoClick(video.videoId)}
                >
                  <CardMedia
                    component="img"
                    sx={mediaStyle}
                    image={video.thumbnailUrl}
                    alt={video.title}
                    onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                      e.currentTarget.src = `https://img.youtube.com/vi/${video.videoId}/mqdefault.jpg`;
                    }}
                  />
                  <CardContent>
                    <Typography sx={titleStyle}>
                      {video.title}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Box>
      
      <Dialog
        open={dialogOpen}
        onClose={handleCancel}
        aria-describedby="alert-dialog-description"
        sx={dialogStyle}
      >
        <DialogContent>
          <DialogContentText id="alert-dialog-description" sx={dialogContentStyle}>
            Selecting a new video will replace the currently selected one.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancel} sx={buttonStyle}>
            Nevermind
          </Button>
          <Button onClick={handleConfirm} sx={buttonStyle} autoFocus>
            Continue
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MainVideoSelectionList;
