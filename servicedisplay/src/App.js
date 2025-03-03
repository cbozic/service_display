import React, { useState } from 'react';
import './App.css';
import VideoFadeFrame from './components/VideoFadeFrame';
import { TextField, Button, Container, Box } from '@mui/material';

function App() {
  const [video, setVideo] = useState('xkroW79ssOk');
  const [startTimeInSeconds, setStartTimeInSeconds] = useState('0');
  const [overlaySlide, setOverlaySlide] = useState("https://images.planningcenterusercontent.com/v1/transform?bucket=resources-production&disposition=inline&expires_at=1740812399&key=uploads%2F218466%2Fmaxn6olpajhzg7ty8fdg6fpy4w6h&thumb=960x540%23&signature=05d893630eebbf978d6229fab26240632e7d41d51f0a840b19e90d5a3ab68723");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className='App'>
    {!submitted && (
        <Container>
        <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
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
        </Container>
      )}
      {submitted && (
        <div style={{ position: 'relative' }}>
          <VideoFadeFrame video={video} startSeconds={startTimeInSeconds} overlaySlide={overlaySlide} />
        </div>
      )}
      </div>
  );
}

export default App;
