import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Box, Card, CardMedia, CardContent, Typography, Grid, Alert, Dialog, DialogContent, DialogActions, Button, DialogContentText } from '@mui/material';

interface VideoListProps {
  setVideo: (videoId: string) => void;
  playlistUrl: string;
  currentVideo: string;
}

interface VideoData {
  title: string;
  videoId: string;
  thumbnailUrl: string;
}

const VideoList: React.FC<VideoListProps> = ({ setVideo, playlistUrl, currentVideo }) => {
  const [videos, setVideos] = useState<VideoData[]>([]);
  const [error, setError] = useState<boolean>(false);
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [pendingVideoId, setPendingVideoId] = useState<string | null>(null);
  const [initialized, setInitialized] = useState<boolean>(false);

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        if (!playlistUrl) {
          setError(true);
          return;
        }

        const response = await axios.get(playlistUrl);
        const html = response.data as string;
        const videoMatches = Array.from(html.matchAll(/\{".*?videoRenderer":\{"videoId":"(.*?)"/gi));
        const titleMatches = Array.from(html.matchAll(/"title":{"runs":\[{"text":"(.*?)"/g));
        
        const videoIds = videoMatches.map(match => match[1]);
        const titles = titleMatches.map(match => match[1]);
        
        if (!videoIds.length || !titles.length) {
          setError(true);
          return;
        }

        const videoDataMap = new Map<string, { title: string; thumbnailUrl: string }>();
        videoIds.forEach((videoId, index) => {
          if (index < titles.length && !videoDataMap.has(videoId)) {
            videoDataMap.set(videoId, {
              title: titles[index],
              thumbnailUrl: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
            });
          }
        });
        
        const videoData = Array.from(videoDataMap.entries()).map(([videoId, data]) => ({
          videoId,
          title: data.title,
          thumbnailUrl: data.thumbnailUrl
        }));
        
        setVideos(videoData);
        
        // Mark that we've loaded video data
        setInitialized(true);
      } catch (error) {
        console.error('Error fetching videos:', error);
        setError(true);
      }
    };

    fetchVideos();
  }, [playlistUrl]);

  // This useEffect runs only once after videos are loaded successfully
  useEffect(() => {
    // Only run if we have videos and we're now initialized
    if (videos.length > 0 && initialized) {
      // Force select the first video regardless of currentVideo state
      setVideo(videos[0].videoId);
      
      // We've run this effect, no need to run it again
      setInitialized(false);
    }
  }, [videos, initialized, setVideo]);

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

  // Add styles for the dialog components
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

  return (
    <Box sx={{ padding: 2 }}>
      {error ? (
        <Alert severity="info" sx={alertStyle}>
          <Typography variant="body1" sx={{ textAlign: 'left' }}>
            Unable to fetch video data. You may need to:
          </Typography>
          <Typography variant="body2" sx={{ mt: 1, textAlign: 'left' }}>
            1. Enable Developer Mode in your browser's settings
          </Typography>
          <Typography variant="body2" sx={{ textAlign: 'left' }}>
            2. Disable CORS or "cross-origin restrictions" in Advanced Developer Settings
          </Typography>
          <Typography variant="body2" sx={{ textAlign: 'left' }}>
            3. Refresh the page
          </Typography>
        </Alert>
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

export default VideoList;
