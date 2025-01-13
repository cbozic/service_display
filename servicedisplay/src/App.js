import React, { useState } from 'react';
import './App.css';
import VideoJsFrame from './components/VideoJsFrame';

function App() {
  const [video, setVideo] = useState('VkIrcKoA98A');
  const [startTimeInSeconds, setStartTimeInSeconds] = useState('539');

  return (
    <div className="App">
      <div style={{ position: 'relative' }}>
        <VideoJsFrame video={video} start={startTimeInSeconds}/>
      </div>
    </div>
  );
}

export default App;
