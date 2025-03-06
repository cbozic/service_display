import React, { useState, FormEvent, useRef, useEffect, useCallback } from 'react';
import './App.css';
import VideoFadeFrame from './components/VideoFadeFrame';
import VideoConfigurationForm from './components/VideoConfigurationForm';
import VideoList from './components/VideoList';
import VideoControls from './components/VideoControls';
import { Layout, Model, TabNode, Actions, IJsonModel } from 'flexlayout-react';
import 'flexlayout-react/style/light.css';

const flexlayout_json: IJsonModel = {
  global: {},
  borders: [],
  layout: {
    type: "row",
    children: [
      {
        type: "column",
        weight: 25,
        children: [
          {
            type: "tabset",
            weight: 75,
            children: [
              {
                type: "tab",
                name: "Videos",
                component: "videoList"
              },
              {
                type: "tab",
                name: "Settings",
                component: "form"
              }
            ]
          },
          {
            type: "tabset",
            weight: 25,
            children: [
              {
                type: "tab",
                name: "Controls",
                component: "controls"
              }
            ]
          }
        ]
      },
      {
        type: "tabset",
        weight: 75,
        children: [
          {
            type: "tab",
            name: "Display",
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
  const [video, setVideo] = useState<string>('oQYRNeM-awo');
  const [startTimeInSeconds, setStartTimeInSeconds] = useState<string>('0');
  const [overlaySlide, setOverlaySlide] = useState<string>("https://images.planningcenterusercontent.com/v1/transform?bucket=resources-production&disposition=inline&expires_at=1740812399&key=uploads%2F218466%2Fmaxn6olpajhzg7ty8fdg6fpy4w6h&thumb=960x540%23&signature=05d893630eebbf978d6229fab26240632e7d41d51f0a840b19e90d5a3ab68723");
  const videoPlayerRef = useRef<HTMLDivElement>(null);
  const [player, setPlayer] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isPlayerReady, setIsPlayerReady] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
  };

  const handlePlayPause = useCallback(() => {
    if (isPlayerReady) {
      setIsPlaying(prev => !prev);
    }
  }, [isPlayerReady]);

  const handleFastForward = useCallback(() => {
    if (player && isPlayerReady) {
      const currentTime = player.getCurrentTime();
      player.seekTo(currentTime + 15, true);
    }
  }, [player, isPlayerReady]);

  const handleRewind = useCallback(() => {
    if (player && isPlayerReady) {
      const currentTime = player.getCurrentTime();
      player.seekTo(currentTime - 5, true);
    }
  }, [player, isPlayerReady]);

  const handleFullscreen = useCallback(() => {
    setIsFullscreen(prev => !prev);
  }, []);

  // Handle flexlayout popout state
  const handleTabPopout = useCallback((node: TabNode) => {
    // When a tab is popped out, we want to exit fullscreen if it's active
    if (node.getComponent() === 'video' && document.fullscreenElement) {
      document.exitFullscreen().catch(e => {
        console.log('Error exiting fullscreen:', e);
      });
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Space' && !event.repeat && isPlayerReady) {
        event.preventDefault();
        handlePlayPause();
      } else if (event.code === 'KeyF' && !event.repeat) {
        event.preventDefault();
        handleFullscreen();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handlePlayPause, isPlayerReady, handleFullscreen]);

  // Handle fullscreen changes from external sources
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = Boolean(document.fullscreenElement);
      if (isCurrentlyFullscreen !== isFullscreen) {
        setIsFullscreen(isCurrentlyFullscreen);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, [isFullscreen]);

  const handlePlayerReady = useCallback((playerInstance: any) => {
    setPlayer(playerInstance);
    setIsPlayerReady(true);
  }, []);

  const handleStateChange = useCallback((state: number) => {
    if (!isPlayerReady) return;
    
    // Only update playing state if it's different from current state
    const shouldBePlaying = state === 1;
    if (shouldBePlaying !== isPlaying) {
      setIsPlaying(shouldBePlaying);
    }
  }, [isPlaying, isPlayerReady]);

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
          <VideoFadeFrame 
            video={video} 
            startSeconds={parseInt(startTimeInSeconds)} 
            overlaySlide={overlaySlide}
            onPlayerReady={handlePlayerReady}
            onStateChange={handleStateChange}
            isPlaying={isPlaying}
            isFullscreen={isFullscreen}
          />
        </div>
      );
    } else if (component === "videoList") {
      return <VideoList setVideo={setVideo} />;
    } else if (component === "controls") {
      return (
        <div style={{ 
          height: '100%', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          overflow: 'hidden'
        }}>
          <div style={{ 
            height: '80px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center'
          }}>
            <VideoControls 
              onPlayPause={handlePlayPause}
              onFastForward={handleFastForward}
              onRewind={handleRewind}
              onFullscreen={handleFullscreen}
              isPlaying={isPlaying}
            />
          </div>
        </div>
      );
    }
  };

  return (
    <div className='App' style={{ height: '100vh' }}>
      <Layout 
        model={model} 
        factory={factory}
        onModelChange={(model: Model) => {
          // Check if we're in a popout window
          if (window.opener && document.fullscreenElement) {
            document.exitFullscreen().catch(e => {
              console.log('Error exiting fullscreen:', e);
            });
          }
        }}
      />
    </div>
  );
}

export default App;
