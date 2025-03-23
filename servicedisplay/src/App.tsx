import React, { useState, FormEvent, useRef, useEffect, useCallback } from 'react';
import './App.css';
import VideoFadeFrame from './components/VideoFadeFrame';
import VideoConfigurationForm from './components/VideoConfigurationForm';
import VideoList from './components/VideoList';
import VideoControls from './components/VideoControls';
import PianoControls from './components/PianoControls';
import GifFrameDisplay from './components/GifFrameDisplay';
import ChromaticTuner from './components/ChromaticTuner';
import VideoMonitor from './components/VideoMonitor';
import { Layout, Model, TabNode, Actions, IJsonModel } from 'flexlayout-react';
import 'flexlayout-react/style/light.css';
import { Box, Tabs, Tab } from '@mui/material';
import { YouTubeProvider, useYouTube } from './contexts/YouTubeContext';
import BackgroundPlayer from './components/BackgroundPlayer';
import VideoTimeEvents from './components/VideoTimeEvents';
import ReactDOM from 'react-dom';

const flexlayout_json: IJsonModel = {
  global: {
    tabEnableClose: false,
    tabSetEnableClose: false,
    tabSetEnableMaximize: true,
  },
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
            weight: 65,
            enableClose: false,
            children: [
              {
                type: "tab",
                name: "Videos",
                component: "videoList",
                enableClose: false,
              },
              {
                type: "tab",
                name: "Slides",
                component: "slides",
                enableClose: false,
              },
              {
                type: "tab",
                name: "Settings",
                component: "form",
                enableClose: false,
              }
            ]
          },
          {
            type: "tabset",
            weight: 35,
            enableClose: false,
            children: [
              {
                type: "tab",
                name: "Music",
                component: "background",
                enableClose: false,
              },
              {
                type: "tab",
                name: "Keys",
                component: "piano",
                enableClose: false,
              },
              {
                type: "tab",
                name: "Tuner",
                component: "tuner",
                enableClose: false,
              }
            ]
          }
        ]
      },
      {
        type: "column",
        weight: 75,
        children: [
          {
            type: "tabset",
            weight: 85,
            enableClose: false,
            children: [
              {
                type: "tab",
                name: "Display",
                component: "video",
                enablePopout: true,
                enableClose: false,
              },
              {
                type: "tab",
                name: "Monitor",
                component: "videoMonitor",
                enableClose: false,
              }
            ]
          },
          {
            type: "tabset",
            weight: 15,
            enableClose: false,
            children: [
              {
                type: "tab",
                name: "Controls",
                component: "controls",
                enableClose: false,
              }
            ]
          }
        ]
      }
    ]
  }
};

const model = Model.fromJson(flexlayout_json);

const AppContent: React.FC = () => {
  const [video, setVideo] = useState<string>('oQYRNeM-awo');
  const [startTimeInSeconds, setStartTimeInSeconds] = useState<string>('0');
  const [overlaySlide, setOverlaySlide] = useState<string>();
  const [playlistUrl, setPlaylistUrl] = useState<string>('https://www.youtube.com/playlist?list=PLFgcIA8Y9FMBC0J45C3f4izrHSPCiYirL');
  const videoPlayerRef = useRef<HTMLDivElement>(null);
  const [player, setPlayer] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isPlayerReady, setIsPlayerReady] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [gifPath, setGifPath] = useState<string>('/default_content/ONLslideloop2025.gif');
  const [isSlideTransitionsEnabled, setIsSlideTransitionsEnabled] = useState<boolean>(false);
  const slideAnimationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [currentFrameIndex, setCurrentFrameIndex] = useState<number>(0);
  const framesRef = useRef<string[]>([]);
  const [isPipMode, setIsPipMode] = useState<boolean>(false);
  const [tabValue, setTabValue] = useState<number>(0);
  const [videoMonitorPlayer, setVideoMonitorPlayer] = useState<any>(null);
  const [videoVolume, setVideoVolume] = useState<number>(100);
  const [isDucking, setIsDucking] = useState<boolean>(false);
  const preDuckVolume = useRef<number>(100);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const previousVolumeRef = useRef<number>(100);
  const [backgroundPlaylistUrl, setBackgroundPlaylistUrl] = useState<string>('https://www.youtube.com/watch?v=xN054GdfAG4&list=PLZ5F0jn_D3gIbiGiPWzhjQX9AA-emzi2n');
  const { setIsPlayEnabled } = useYouTube();
  const [usePlaylistMode, setUsePlaylistMode] = useState<boolean>(false);
  const [isAutomaticEventsEnabled, setIsAutomaticEventsEnabled] = useState<boolean>(true);
  const timeEventsRef = useRef<any>(null);
  const slidesInitializedRef = useRef<boolean>(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
  };

  const handlePlayPause = useCallback(() => {
    if (isPlayerReady) {
      const newPlayState = !isPlaying;
      setIsPlaying(newPlayState);
      setIsPlayEnabled(newPlayState);
    }
  }, [isPlayerReady, isPlaying]);

  const handleSkipForward = useCallback(() => {
    if (player && isPlayerReady) {
      const currentTime = player.getCurrentTime();
      player.seekTo(currentTime + 15, true);
      
      if (videoMonitorPlayer) {
        videoMonitorPlayer.seekTo(currentTime + 15, true);
      }
    }
  }, [player, isPlayerReady, videoMonitorPlayer]);

  const handleSkipBack = useCallback(() => {
    if (player && isPlayerReady) {
      const currentTime = player.getCurrentTime();
      player.seekTo(currentTime - 5, true);
      
      if (videoMonitorPlayer) {
        videoMonitorPlayer.seekTo(currentTime - 5, true);
      }
    }
  }, [player, isPlayerReady, videoMonitorPlayer]);

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

  const handleSlideTransitionsToggle = useCallback(() => {
    setIsSlideTransitionsEnabled(prev => !prev);
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
      // Enable slide transitions when frames are first loaded
      setIsSlideTransitionsEnabled(true);
    }
  }, []);

  const handlePipToggle = useCallback(() => {
    setIsPipMode(prev => !prev);
  }, []);

  const handleEnablePip = useCallback(() => {
    if (!isPipMode) {
      console.log('[App] Enabling PiP mode (current state:', isPipMode, ')');
      setIsPipMode(true);
      console.log('[App] PiP mode state after enable:', true);
    } else {
      console.log('[App] PiP mode already enabled, skipping enable');
    }
  }, [isPipMode]);

  const handleDisablePip = useCallback(() => {
    if (isPipMode) {
      console.log('[App] Disabling PiP mode (current state:', isPipMode, ')');
      setIsPipMode(false);
      console.log('[App] PiP mode state after disable:', false);
    } else {
      console.log('[App] PiP mode already disabled, skipping disable');
    }
  }, [isPipMode]);

  const handleRestart = useCallback(() => {
    if (player && isPlayerReady) {
      player.seekTo(0, true);
      if (!isPlaying) {
        setIsPlaying(true);
      }
      
      if (videoMonitorPlayer) {
        videoMonitorPlayer.seekTo(0, true);
        if (!isPlaying) {
          videoMonitorPlayer.playVideo();
        }
      }
    }
  }, [player, isPlayerReady, isPlaying, videoMonitorPlayer]);

  const handleMonitorPlayerReady = useCallback((playerInstance: any) => {
    setVideoMonitorPlayer(playerInstance);
  }, []);

  const handleDuckingToggle = useCallback(() => {
    if (!isDucking) {
      // Instant duck down to 66%
      preDuckVolume.current = videoVolume;
      setVideoVolume(Math.round(videoVolume * 0.66));
      setIsDucking(true);
    } else {
      // Fade back to original volume over 3 seconds
      const startVolume = videoVolume;
      const targetVolume = preDuckVolume.current;
      const steps = 25;
      const stepDuration = 3000 / steps;
      let currentStep = 0;

      const fadeInterval = setInterval(() => {
        currentStep++;
        const progress = currentStep / steps;
        const newVolume = Math.round(startVolume + (targetVolume - startVolume) * progress);
        setVideoVolume(newVolume);

        if (currentStep >= steps) {
          clearInterval(fadeInterval);
          setIsDucking(false);
        }
      }, stepDuration);
    }
  }, [isDucking, videoVolume]);

  const handleToggleMute = useCallback(() => {
    if (!isMuted) {
      previousVolumeRef.current = videoVolume;
      setVideoVolume(0);
      setIsMuted(true);
    } else {
      const targetVolume = previousVolumeRef.current || 25;
      setIsMuted(false);
      setVideoVolume(targetVolume);
    }
  }, [isMuted, videoVolume]);

  const handleVideoListError = useCallback((hasError: boolean) => {
    setUsePlaylistMode(hasError);
  }, []);

  // Keyboard controls for video and slides
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Space' && !event.repeat && isPlayerReady) {
        event.preventDefault();
        handlePlayPause();
      } else if (event.code === 'KeyF' && !event.repeat) {
        event.preventDefault();
        handleFullscreen();
      } else if (event.code === 'ArrowDown' && !event.repeat) {
        event.preventDefault();
        if (framesRef.current.length > 0) {
          const nextIndex = (currentFrameIndex + 1) % framesRef.current.length;
          handleFrameSelect(framesRef.current[nextIndex], nextIndex);
        }
      } else if (event.code === 'ArrowUp' && !event.repeat) {
        event.preventDefault();
        if (framesRef.current.length > 0) {
          const prevIndex = currentFrameIndex <= 0 ? framesRef.current.length - 1 : currentFrameIndex - 1;
          handleFrameSelect(framesRef.current[prevIndex], prevIndex);
        }
      } else if (event.code === 'KeyT' && !event.repeat) {
        event.preventDefault();
        handleSlideTransitionsToggle();
      } else if (event.code === 'KeyD' && !event.repeat && !isMuted) {
        event.preventDefault();
        handleDuckingToggle();
      } else if (event.code === 'KeyP' && !event.repeat) {
        event.preventDefault();
        if (isPipMode) {
          handleDisablePip();
        } else {
          handleEnablePip();
        }
      } else if (event.code === 'KeyM' && !event.repeat) {
        event.preventDefault();
        handleToggleMute();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handlePlayPause, isPlayerReady, handleFullscreen, currentFrameIndex, handleFrameSelect, 
      handleSlideTransitionsToggle, handleDuckingToggle, handleEnablePip, handleDisablePip, handleToggleMute, isMuted, isPipMode]);

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

  // Reset animation when loading new GIF
  useEffect(() => {
    setIsSlideTransitionsEnabled(false);
    setCurrentFrameIndex(0);
    framesRef.current = [];
    if (slideAnimationTimerRef.current) {
      clearInterval(slideAnimationTimerRef.current);
      slideAnimationTimerRef.current = null;
    }
  }, [gifPath]);

  // Handle slide animation
  useEffect(() => {
    if (isSlideTransitionsEnabled && framesRef.current.length > 0) {
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
  }, [isSlideTransitionsEnabled]);

  useEffect(() => {
    if (isPlayerReady && player && timeEventsRef.current) {
      console.log('[App] Setting up time events');
      // Clear existing events
      timeEventsRef.current.clearEvents();

      // Only register events if automatic events are enabled
      if (isAutomaticEventsEnabled) {
        const currentTime = player.getCurrentTime();
        console.log('[App] Automatic events are enabled, registering events (current time:', currentTime, 's)');

        // Register fullscreen enable event at 1 second
        if (currentTime < 1) {
          console.log('[App] Registering fullscreen enable event for 1s');
          timeEventsRef.current.registerEvent(1, () => {
            console.log(`[App] Checking fullscreen enable event at 1s (current fullscreen state: ${isFullscreen})`);
            if (!isFullscreen) {
              console.log('[App] Auto-enabling fullscreen at 1s');
              handleFullscreen();
            } else {
              console.log('[App] Fullscreen already enabled, skipping enable event');
            }
          });
        } else {
          console.log('[App] Skipping fullscreen enable event registration (current time > 1s)');
        }

        // Only register enable event if we're before 5 seconds
        if (currentTime < 5) {
          console.log('[App] Registering PiP enable event for 5s');
          timeEventsRef.current.registerEvent(5, () => {
            console.log(`[App] Checking PiP enable event at 5s (current PiP state: ${isPipMode})`);
            if (!isPipMode) {
              console.log('[App] Auto-enabling PiP mode at 5s');
              handleEnablePip();
            } else {
              console.log('[App] PiP mode already enabled, skipping enable event');
            }
          });
        } else {
          console.log('[App] Skipping PiP enable event registration (current time > 5s)');
        }

        // Only register disable event if we're before 8 minutes
        if (currentTime < 480) {
          console.log('[App] Registering PiP disable event for 8 minutes');
          timeEventsRef.current.registerEvent(480, () => {
            console.log(`[App] Checking PiP disable event at 8 minutes (current PiP state: ${isPipMode})`);
            if (isPipMode) {
              console.log('[App] Auto-disabling PiP mode at 8 minutes');
              handleDisablePip();
            } else {
              console.log('[App] PiP mode already disabled, skipping disable event');
            }
          });
        } else {
          console.log('[App] Skipping PiP disable event registration (current time > 8 minutes)');
        }
      } else {
        console.log('[App] Automatic events are disabled, not registering events');
      }
    } else {
      console.log('[App] Player not ready or timeEventsRef not available, skipping event setup');
    }
  }, [isPlayerReady, player, isAutomaticEventsEnabled, handleEnablePip, handleDisablePip, handleFullscreen, isFullscreen]);

  // Add a new effect to monitor PiP state changes
  useEffect(() => {
    console.log('[App] PiP mode state changed:', isPipMode);
  }, [isPipMode]);

  useEffect(() => {
    return () => {
      // Clean up any running fade intervals when component unmounts
      const fadeIntervals = window.setInterval(() => {}, 0);
      for (let i = 1; i < fadeIntervals; i++) {
        window.clearInterval(i);
      }
    };
  }, []);

  // Initialize slides when app loads
  useEffect(() => {
    if (!slidesInitializedRef.current) {
      console.log('[App] Initializing slides');
      const slidesComponent = document.createElement('div');
      const slidesInstance = (
        <GifFrameDisplay 
          gifPath={gifPath} 
          onFrameSelect={handleFrameSelect} 
          onFramesUpdate={handleFramesUpdate}
          currentFrameIndex={currentFrameIndex}
          isAnimationEnabled={isSlideTransitionsEnabled}
          setGifPath={setGifPath}
          onAnimationToggle={setIsSlideTransitionsEnabled}
        />
      );
      // @ts-ignore - ReactDOM is available in the browser
      ReactDOM.render(slidesInstance, slidesComponent);
      slidesInitializedRef.current = true;
    }
  }, [gifPath, handleFrameSelect, handleFramesUpdate, currentFrameIndex, isSlideTransitionsEnabled]);

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
          backgroundPlaylistUrl={backgroundPlaylistUrl}
          setBackgroundPlaylistUrl={setBackgroundPlaylistUrl}
          isAutomaticEventsEnabled={isAutomaticEventsEnabled}
          onAutomaticEventsToggle={setIsAutomaticEventsEnabled}
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
            isPipMode={isPipMode}
            isSlideTransitionsEnabled={isSlideTransitionsEnabled}
            volume={videoVolume}
            playlistUrl={playlistUrl}
            usePlaylistMode={usePlaylistMode}
          />
          <VideoTimeEvents
            ref={timeEventsRef}
            player={player}
            isPlaying={isPlaying}
          />
        </div>
      );
    } else if (component === "background") {
      return (
        <BackgroundPlayer
          playlistUrl={backgroundPlaylistUrl}
          volume={15}
        />
      );
    } else if (component === "videoList") {
      return (
        <VideoList 
          setVideo={setVideo} 
          playlistUrl={playlistUrl} 
          currentVideo={video}
          onError={handleVideoListError}
        />
      );
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
              onSkipForward={handleSkipForward}
              onSkipBack={handleSkipBack}
              onFullscreen={handleFullscreen}
              onSlideTransitionsToggle={handleSlideTransitionsToggle}
              onPipToggle={handlePipToggle}
              onEnablePip={handleEnablePip}
              onDisablePip={handleDisablePip}
              onRestart={handleRestart}
              onVolumeChange={setVideoVolume}
              onDuckingToggle={handleDuckingToggle}
              onToggleMute={handleToggleMute}
              isPlaying={isPlaying}
              isSlideTransitionsEnabled={isSlideTransitionsEnabled}
              isPipMode={isPipMode}
              isDucking={isDucking}
              isMuted={isMuted}
              volume={videoVolume}
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
    } else if (component === "tuner") {
      return <ChromaticTuner />;
    } else if (component === "slides") {
      return (
        <GifFrameDisplay 
          gifPath={gifPath} 
          onFrameSelect={handleFrameSelect} 
          onFramesUpdate={handleFramesUpdate}
          currentFrameIndex={currentFrameIndex}
          isAnimationEnabled={isSlideTransitionsEnabled}
          setGifPath={setGifPath}
          onAnimationToggle={setIsSlideTransitionsEnabled}
        />
      );
    } else if (component === "videoMonitor") {
      return (
        <VideoMonitor 
          mainPlayer={player}
          videoId={video}
          usePlaylistMode={usePlaylistMode}
          playlistUrl={playlistUrl}
        />
      );
    }
  };

  return (
    <Box sx={{ height: '100vh' }}>
      <Layout 
        model={model} 
        factory={factory}
        onModelChange={(model: Model) => {
          if (window.opener && document.fullscreenElement) {
            document.exitFullscreen().catch((e: Error) => {
              console.log('Error exiting fullscreen:', e);
            });
          }
        }}
      />
    </Box>
  );
}

const App: React.FC = () => {
  return (
    <YouTubeProvider>
      <AppContent />
    </YouTubeProvider>
  );
};

export default App;
