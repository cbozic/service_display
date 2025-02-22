import React, { useState } from 'react';
import './App.css';
import VideoJsFrame from './components/VideoJsFrame';
import { TextField, Button, Container, Box } from '@mui/material';

function App() {
  const [video, setVideo] = useState('');
  const [startTimeInSeconds, setStartTimeInSeconds] = useState('0');
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
          <Button type="submit" variant="contained" color="primary">
            Submit
          </Button>
        </Box>
        </Container>
      )}
      {submitted && (
        <div style={{ position: 'relative' }}>
          <VideoJsFrame video={video} start={startTimeInSeconds} />
        </div>
      )}
      </div>
  );
}

export default App;
