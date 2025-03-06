import React from 'react';
import { Box, TextField, Typography, Card, CardContent, Button } from '@mui/material';

interface VideoConfigurationFormProps {
  video: string;
  setVideo: (value: string) => void;
  startTimeInSeconds: string;
  setStartTimeInSeconds: (value: string) => void;
  overlaySlide: string;
  setOverlaySlide: (value: string) => void;
  handleSubmit: (e: React.FormEvent) => void;
}

const VideoConfigurationForm: React.FC<VideoConfigurationFormProps> = ({
  video,
  setVideo,
  startTimeInSeconds,
  setStartTimeInSeconds,
  overlaySlide,
  setOverlaySlide,
  handleSubmit,
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

  const buttonStyle = {
    backgroundColor: 'var(--accent-color)',
    color: 'var(--dark-text)',
    '&:hover': {
      backgroundColor: 'var(--accent-hover)',
    },
    padding: '10px 24px',
  };

  return (
    <Box sx={{ padding: 2 }}>
      <Typography variant="h5" sx={{ color: 'var(--dark-text)', marginBottom: 3 }}>
        Video Configuration
      </Typography>
      <Card sx={cardStyle}>
        <CardContent>
          <form onSubmit={handleSubmit}>
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
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
              <Button
                type="submit"
                variant="contained"
                sx={buttonStyle}
              >
                Apply Changes
              </Button>
            </Box>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
};

export default VideoConfigurationForm;
