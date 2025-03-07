import React from 'react';
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
}) => {
  const cardStyle = {
    backgroundColor: 'var(--dark-surface)',
    border: '1px solid var(--dark-border)',
    borderRadius: '8px',
    transition: 'all 0.2s ease',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
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
    marginBottom: 2,
  };

  return (
    <Box sx={{ padding: 2 }}>
      <Card sx={cardStyle}>
        <CardContent>
          <div>
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
          </div>
        </CardContent>
      </Card>
    </Box>
  );
};

export default VideoConfigurationForm;
