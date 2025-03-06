import React, { useState, FormEvent, useRef } from 'react';
import './App.css';
import VideoFadeFrame from './components/VideoFadeFrame';
import VideoConfigurationForm from './components/VideoConfigurationForm';
import VideoList from './components/VideoList';
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
        weight: 50,
        children: [
          {
            type: "tab",
            name: "Video Configuration",
            component: "form"
          }
        ]
      },
      {
        type: "column",
        weight: 75,
        children: [
          {
            type: "row",
            weight: 50,
            children: [
              {
                type: "tabset",
                weight: 50,
                children: [
                  {
                    type: "tab",
                    name: "Video List",
                    component: "videoList"
                  }
                ]
              }
            ]
          },
          {
            type: "row",
            weight: 50,
            children: [
              {
                type: "tabset",
                weight: 50,
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
        ]
      }
    ]
  }
};

const model = Model.fromJson(flexlayout_json);

const App: React.FC = () => {
  const [video, setVideo] = useState<string>('ickhkAaLtis');
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
        <VideoConfigurationForm
          video={video}
          setVideo={setVideo}
          startTimeInSeconds={startTimeInSeconds}
          setStartTimeInSeconds={setStartTimeInSeconds}
          overlaySlide={overlaySlide}
          setOverlaySlide={setOverlaySlide}
          handleSubmit={handleSubmit}
        />
      );
    } else if (component === "video") {
      return (
        <div ref={videoPlayerRef} style={{ position: 'relative', height: '100%' }}>
          <VideoFadeFrame video={video} startSeconds={parseInt(startTimeInSeconds)} overlaySlide={overlaySlide} />
        </div>
      );
    } else if (component === "videoList") {
      return <VideoList setVideo={setVideo} />;
    }
  };

  return (
    <div className='App' style={{ height: '100vh' }}>
      <Layout model={model} factory={factory} />
    </div>
  );
}

export default App;
