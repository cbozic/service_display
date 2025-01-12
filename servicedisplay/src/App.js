import React, { useState, useEffect } from 'react';
import './App.css';
import VideoFrame from './components/VideoFrame';
import Overlay from './components/Overlay';
import slide from './This_Is_The_Way.png';

function App() {
  const [showOverlay, setShowOverlay] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event) => {
      console.log(event.code)
      if (event.code === 'Space') {
        if (showOverlay) {
          setShowOverlay(false);
        }
        else {
          setShowOverlay(true);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showOverlay]);

  return (
    <div className="App">
      <div style={{ position: 'relative' }}>
        <VideoFrame />
        <Overlay showOverlay={showOverlay} slide={slide}/>
      </div>
    </div>
  );
}

export default App;
