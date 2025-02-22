import React, { useState } from 'react';
import './App.css';
import VideoJsFrame from './components/VideoJsFrame';

function App() {
  const [video, setVideo] = useState('');
  const [startTimeInSeconds, setStartTimeInSeconds] = useState('0');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="App">
      {!submitted && (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <label>
            Video ID:
            <input
              type="text"
              value={video}
              onChange={(e) => setVideo(e.target.value)}
            />
          </label>
          <label>
            Start Time (seconds):
            <input
              type="text"
              value={startTimeInSeconds}
              onChange={(e) => setStartTimeInSeconds(e.target.value)}
            />
          </label>
          <button type="submit">Submit</button>
        </form>
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
