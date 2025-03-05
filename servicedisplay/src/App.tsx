import React, { useState, FormEvent, useRef } from 'react';
import './App.css';
import VideoFadeFrame from './components/VideoFadeFrame';
import { TextField, Button, Box } from '@mui/material';
import { Layout, Model, TabNode } from 'flexlayout-react';
import 'flexlayout-react/style/light.css';

const flexlayout_json = {
  global: {},
  borders: [],
  layout: {
    type: "row",
    children: [
      {
        type: "tabset",
        weight: 25,
        children: [
          {
            type: "tab",
            name: "Video Configuration",
            component: "form"
          }
        ]
      },
      {
        type: "tabset",
        weight: 75,
        children: [
          {
            type: "tab",
            name: "Video Display",
            component: "video",
            enablePopout: true,
          }
        ]
      }
    ]
  }
};

const model = Model.fromJson(flexlayout_json);

const App: React.FC = () => {
  const [video, setVideo] = useState<string>('xkroW79ssOk');
  const [startTimeInSeconds, setStartTimeInSeconds] = useState<string>('0');
  const [overlaySlide, setOverlaySlide] = useState<string>("https://images.planningcenterusercontent.com/v1/transform?bucket=resources-production&disposition=inline&expires_at=1740812399&key=uploads%2F218466%2Fmaxn6olpajhzg7ty8fdg6fpy4w6h&thumb=960x540%23&signature=05d893630eebbf978d6229fab26240632e7d41d51f0a840b19e90d5a3ab68723");
  const videoPlayerRef = useRef(null);


  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
  };

  const factory = (node: TabNode) => {
    const component = node.getComponent();
    if (component === "form") {
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
    } else if (component === "video") {
      return (
        <div ref={videoPlayerRef} style={{ position: 'relative', height: '100%' }}>
          <VideoFadeFrame video={video} startSeconds={parseInt(startTimeInSeconds)} overlaySlide={overlaySlide} />
        </div>
      );
    }
  };

  return (
    <div className='App' style={{ height: '100vh' }}>
      <Layout model={model} factory={factory} />
    </div>
  );
}

export default App;
