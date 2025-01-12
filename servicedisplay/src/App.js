import React, { useState, useEffect } from 'react';
import './App.css';
import VideoJsFrame from './components/VideoJsFrame';

function App() {
  const [video, setVideo] = useState('VkIrcKoA98A');
  const [startTimeInSeconds, setStartTimeInSeconds] = useState('540');

  return (
    <div className="App">
      <div style={{ position: 'relative' }}>
        <VideoJsFrame video={video} start={startTimeInSeconds}/>
      </div>
    </div>
  );
}

export default App;
