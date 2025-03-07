import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Box, Card, CardMedia, CardContent, Typography, Grid, Alert } from '@mui/material';

interface VideoListProps {
  setVideo: (videoId: string) => void;
}

interface VideoData {
  title: string;
  videoId: string;
  thumbnailUrl: string;
}

const VideoList: React.FC<VideoListProps> = ({ setVideo }) => {
  const [videos, setVideos] = useState<VideoData[]>([]);
  const [error, setError] = useState<boolean>(false);

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        const response = await axios.get('https://www.youtube.com/playlist?list=PLFgcIA8Y9FMBC0J45C3f4izrHSPCiYirL');
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
      } catch (error) {
        console.error('Error fetching videos:', error);
        setError(true);
      }
    };

    fetchVideos();
  }, []);

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
                sx={cardStyle}
                onClick={() => setVideo(video.videoId)}
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
  );
};

export default VideoList;
