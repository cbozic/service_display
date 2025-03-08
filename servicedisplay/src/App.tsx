import React, { useState, FormEvent, useRef, useEffect, useCallback } from 'react';
import './App.css';
import VideoFadeFrame from './components/VideoFadeFrame';
import VideoConfigurationForm from './components/VideoConfigurationForm';
import VideoList from './components/VideoList';
import VideoControls from './components/VideoControls';
import PianoControls from './components/PianoControls';
import GifFrameDisplay from './components/GifFrameDisplay';
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
                name: "Slides",
                component: "slides"
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
              },
              {
                type: "tab",
                name: "Keys",
                component: "piano"
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
  const [overlaySlide, setOverlaySlide] = useState<string>();
  const [playlistUrl, setPlaylistUrl] = useState<string>('https://www.youtube.com/playlist?list=PLFgcIA8Y9FMBC0J45C3f4izrHSPCiYirL');
  const videoPlayerRef = useRef<HTMLDivElement>(null);
  const [player, setPlayer] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isPlayerReady, setIsPlayerReady] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [gifPath, setGifPath] = useState<string>('');
  const [isSlideAnimationEnabled, setIsSlideAnimationEnabled] = useState<boolean>(false);
  const slideAnimationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [currentFrameIndex, setCurrentFrameIndex] = useState<number>(0);
  const framesRef = useRef<string[]>([]);
  const [isUnderlayMode, setIsUnderlayMode] = useState<boolean>(false);

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

  // Reset animation when loading new GIF
  useEffect(() => {
    setIsSlideAnimationEnabled(false);
    setCurrentFrameIndex(0);
    framesRef.current = [];
    if (slideAnimationTimerRef.current) {
      clearInterval(slideAnimationTimerRef.current);
      slideAnimationTimerRef.current = null;
    }
  }, [gifPath]);

  // Handle slide animation
  useEffect(() => {
    if (isSlideAnimationEnabled && framesRef.current.length > 0) {
      slideAnimationTimerRef.current = setInterval(() => {
        setCurrentFrameIndex(prevIndex => {
          const nextIndex = (prevIndex + 1) % framesRef.current.length;
          setOverlaySlide(framesRef.current[nextIndex]);
          return nextIndex;
        });
      }, 15000);
    }

    return () => {
      if (slideAnimationTimerRef.current) {
        clearInterval(slideAnimationTimerRef.current);
        slideAnimationTimerRef.current = null;
      }
    };
  }, [isSlideAnimationEnabled]);

  const handleSlideAnimationToggle = useCallback(() => {
    setIsSlideAnimationEnabled(prev => !prev);
  }, []);

  const handleFrameSelect = useCallback((frameUrl: string, index: number) => {
    setOverlaySlide(frameUrl);
    setCurrentFrameIndex(index);
  }, []);

  const handleFramesUpdate = useCallback((frames: string[]) => {
    framesRef.current = frames;
    if (frames.length > 0) {
      setOverlaySlide(frames[0]);
      setCurrentFrameIndex(0);
    }
  }, []);

  const handleUnderlayToggle = useCallback(() => {
    setIsUnderlayMode(prev => !prev);
  }, []);

  const factory = (node: TabNode) => {
    const component = node.getComponent();
    if (component === "form") {
      return (
        <VideoConfigurationForm
          video={video}
          setVideo={setVideo}
          startTimeInSeconds={startTimeInSeconds}
          setStartTimeInSeconds={setStartTimeInSeconds}
          playlistUrl={playlistUrl}
          setPlaylistUrl={setPlaylistUrl}
          gifPath={gifPath}
          setGifPath={setGifPath}
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
            isUnderlayMode={isUnderlayMode}
          />
        </div>
      );
    } else if (component === "videoList") {
      return <VideoList setVideo={setVideo} playlistUrl={playlistUrl} />;
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
              onSlideAnimationToggle={handleSlideAnimationToggle}
              onUnderlayToggle={handleUnderlayToggle}
              isPlaying={isPlaying}
              isSlideAnimationEnabled={isSlideAnimationEnabled}
              isUnderlayMode={isUnderlayMode}
            />
          </div>
        </div>
      );
    } else if (component === "piano") {
      return (
        <div style={{ 
          height: '100%', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          overflow: 'hidden'
        }}>
          <PianoControls 
            onNotePlay={(midiNumber) => console.log('Note played:', midiNumber)}
            onNoteStop={(midiNumber) => console.log('Note stopped:', midiNumber)}
          />
        </div>
      );
    } else if (component === "slides") {
      return (
        <GifFrameDisplay 
          gifPath={gifPath} 
          onFrameSelect={handleFrameSelect} 
          onFramesUpdate={handleFramesUpdate}
          currentFrameIndex={currentFrameIndex}
          isAnimationEnabled={isSlideAnimationEnabled}
        />
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
            document.exitFullscreen().catch((e: Error) => {
              console.log('Error exiting fullscreen:', e);
            });
          }
        }}
      />
    </div>
  );
}

export default App;
