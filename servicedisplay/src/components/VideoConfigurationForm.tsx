import React, { FormEvent } from 'react';
import { TextField, Button, Box } from '@mui/material';

interface VideoConfigurationFormProps {
  video: string;
  startTimeInSeconds: string;
  overlaySlide: string;
  setVideo: (value: string) => void;
  setStartTimeInSeconds: (value: string) => void;
  setOverlaySlide: (value: string) => void;
  handleSubmit: (e: FormEvent) => void;
}

const VideoConfigurationForm: React.FC<VideoConfigurationFormProps> = ({
  video,
  startTimeInSeconds,
  overlaySlide,
  setVideo,
  setStartTimeInSeconds,
  setOverlaySlide,
  handleSubmit
}) => {
  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2, padding: 2 }}>
      <h1>Video Configuration</h1>
      <TextField
        label="Video ID"
        variant="outlined"
        value={video}
        onChange={(e) => setVideo(e.target.value)}
      />
      <TextField
        label="Start Time (seconds)"
        variant="outlined"
        value={startTimeInSeconds}
        onChange={(e) => setStartTimeInSeconds(e.target.value)}
      />
      <TextField
        label="Overlay Slide URL"
        variant="outlined"
        value={overlaySlide}
        onChange={(e) => setOverlaySlide(e.target.value)}
      />
      <Button type="submit" variant="contained" color="primary">
        Submit
      </Button>
    </Box>
  );
};

export default VideoConfigurationForm;
