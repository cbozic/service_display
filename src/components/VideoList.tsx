import React, { useEffect, useState } from 'react';
import { Box, Card, CardMedia, CardContent, Typography, Grid, Alert, Dialog, DialogContent, DialogActions, Button, DialogContentText } from '@mui/material';
import { VideoData, fetchPlaylistVideos } from '../utils/playlistUtils';

interface VideoListProps {
  setVideo: (videoId: string) => void;
  playlistUrl: string;
  currentVideo: string;
  onError?: (hasError: boolean) => void;
}

const VideoList: React.FC<VideoListProps> = ({ setVideo, playlistUrl, currentVideo, onError }) => {
  const [videos, setVideos] = useState<VideoData[]>([]);
  const [error, setError] = useState<boolean>(false);
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [pendingVideoId, setPendingVideoId] = useState<string | null>(null);
  const [initialized, setInitialized] = useState<boolean>(false);

  useEffect(() => {
    const loadVideos = async () => {
      try {
        const videoData = await fetchPlaylistVideos(playlistUrl);
        setVideos(videoData);
        setInitialized(true);
        onError?.(false);
      } catch (error) {
        console.error('Error loading videos:', error);
        setError(true);
        onError?.(true);
      }
    };

    loadVideos();
  }, [playlistUrl, onError]);

  useEffect(() => {
    if (videos.length > 0 && initialized) {
      setVideo(videos[0].videoId);
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

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Dialog
        open={dialogOpen}
        onClose={handleCancel}
        PaperProps={{
          sx: {
            backgroundColor: 'var(--dark-surface)',
            color: 'var(--dark-text)',
            border: '1px solid var(--dark-border)'
          }
        }}
      >
        <DialogContent>
          <DialogContentText sx={{ color: 'var(--dark-text)' }}>
            Are you sure you want to switch videos? This will restart the current video.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancel} sx={{ color: 'var(--dark-text)' }}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} sx={{ color: 'var(--accent-color)' }}>
            Switch
          </Button>
        </DialogActions>
      </Dialog>

      <Box sx={{ padding: 2, flex: '1 1 auto', overflowY: 'auto' }}>
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
      </Box>
    </Box>
  );
};

export default VideoList;
