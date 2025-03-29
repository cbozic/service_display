import React, { useState, FormEvent, useRef, useEffect, useCallback, FC } from 'react';
import './App.css';
import VideoFadeFrame from './components/VideoFadeFrame';
import VideoConfigurationForm from './components/VideoConfigurationForm';
import VideoList from './components/VideoList';
import VideoControls from './components/VideoControls';
import PianoControls from './components/PianoControls';
import GifFrameDisplay from './components/GifFrameDisplay';
import ChromaticTuner from './components/ChromaticTuner';
import VideoMonitor from './components/VideoMonitor';
import { Layout, Model, TabNode, IJsonModel } from 'flexlayout-react';
import 'flexlayout-react/style/light.css';
import { Box, IconButton, Dialog, DialogContent, DialogTitle, useMediaQuery, useTheme } from '@mui/material';
import { YouTubeProvider, useYouTube } from './contexts/YouTubeContext';
import BackgroundPlayer from './components/BackgroundPlayer';
import VideoTimeEvents from './components/VideoTimeEvents';
import ReactDOM from 'react-dom';
import ServiceStartOverlay from './components/ServiceStartOverlay';
import { Fullscreen, FullscreenExit, PlayArrow, Pause, VolumeUp, VolumeOff, SkipNext } from '@mui/icons-material';
import YouTube, { YouTubeProps, YouTubeEvent } from 'react-youtube';
import { Typography, Button, TextField, Grid, Avatar } from '@mui/material';
import { HotkeyProvider } from './contexts/HotkeyContext';
import { useHotkeys } from './contexts/HotkeyContext';
import { fetchPlaylistVideos } from './utils/playlistUtils';
import SettingsIcon from '@mui/icons-material/Settings';
import CloseIcon from '@mui/icons-material/Close';

// Create a function to generate the flexlayout json based on experimental features flag and screen size
const createLayoutJson = (showExperimental: boolean, isMobile: boolean = false): IJsonModel => {
  return {
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
          weight: isMobile ? 0 : 25,  // Hide settings column completely on mobile
          children: [
            {
              type: "tabset",
              weight: 65,
              enableClose: false,
              children: [
                {
                  type: "tab",
                  name: "Slides",
                  component: "slides",
                  enableClose: false,
                },
                // Include Video List only if experimental features are enabled
                ...(showExperimental ? [
                  {
                    type: "tab",
                    name: "Videos",
                    component: "videoList",
                    enableClose: false,
                  }
                ] : []),
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
                // Include experimental Keys and Tuner only if enabled
                ...(showExperimental ? [
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
                ] : [])
              ]
            }
          ]
        },
        {
          type: "column",
          weight: isMobile ? 100 : 75,  // Take full width on mobile
          children: [
            {
              type: "tabset",
              weight: isMobile ? 90 : 85,  // Slightly more space for video on mobile
              enableClose: false,
              children: [
                {
                  type: "tab",
                  name: "Display",
                  component: "video",
                  enablePopout: true,
                  enableClose: false,
                },
                // Include Monitor only if experimental features are enabled
                ...(showExperimental ? [
                  {
                    type: "tab",
                    name: "Monitor",
                    component: "videoMonitor",
                    enableClose: false,
                  }
                ] : [])
              ]
            },
            {
              type: "tabset",
              weight: isMobile ? 10 : 15,  // Slightly less space for controls on mobile
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
};

// Use a function to create model based on the stored experimental features preference
const getInitialLayoutModel = () => {
  const storedExperimental = localStorage.getItem('experimentalFeaturesEnabled');
  const showExperimental = storedExperimental ? JSON.parse(storedExperimental) : false;
  const isMobile = window.innerWidth < 768;
  return Model.fromJson(createLayoutJson(showExperimental, isMobile));
};

let model = getInitialLayoutModel();

const AppContent: FC = () => {
  const [video, setVideo] = useState<string>('');
  const [startSeconds, setStartSeconds] = useState<number>(0);
  const [overlaySlide, setOverlaySlide] = useState<string | undefined>();
  const [playlistUrl, setPlaylistUrl] = useState<string>('https://www.youtube.com/playlist?list=PLFgcIA8Y9FMBC0J45C3f4izrHSPCiYirL');
  const videoPlayerRef = useRef<HTMLDivElement>(null);
  const [player, setPlayer] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isPlayerReady, setIsPlayerReady] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [userExitedFullscreen, setUserExitedFullscreen] = useState<boolean>(false);
  
  // State to track experimental features
  const [isExperimentalFeaturesEnabled, setIsExperimentalFeaturesEnabled] = useState<boolean>(() => {
    // Load from localStorage or default to false
    const saved = localStorage.getItem('experimentalFeaturesEnabled');
    return saved ? JSON.parse(saved) : false;
  });
  
  // Save to localStorage when changed
  useEffect(() => {
    localStorage.setItem('experimentalFeaturesEnabled', JSON.stringify(isExperimentalFeaturesEnabled));
  }, [isExperimentalFeaturesEnabled]);
  
  // Determine appropriate base path for assets
  const getBasePath = () => {
    // For GitHub Pages, use a format that works with the repo structure
    if (window.location.hostname.includes('github.io')) {
      const pathParts = window.location.pathname.split('/');
      // If pathname has more than one part (e.g., /repo-name/), use it
      if (pathParts.length > 2 && pathParts[1]) {
        return `/${pathParts[1]}`;
      }
    }
    // Default to process.env.PUBLIC_URL or empty string
    return process.env.PUBLIC_URL || '';
  };
  
  const [gifPath, setGifPath] = useState<string>(`${getBasePath()}/default_content/ONLslideloop2025.gif`);
  
  const [isSlideTransitionsEnabled, setIsSlideTransitionsEnabled] = useState<boolean>(false);
  const slideAnimationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [currentFrameIndex, setCurrentFrameIndex] = useState<number>(0);
  const framesRef = useRef<string[]>([]);
  const [isPipMode, setIsPipMode] = useState<boolean>(false);
  const [videoMonitorPlayer, setVideoMonitorPlayer] = useState<any>(null);
  const [videoVolume, setVideoVolume] = useState<number>(100);
  const [isDucking, setIsDucking] = useState<boolean>(false);
  const preDuckVolume = useRef<number>(100);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const previousVolumeRef = useRef<number>(100);
  const [backgroundPlaylistUrl, setBackgroundPlaylistUrl] = useState<string>('https://www.youtube.com/watch?v=xN054GdfAG4&list=PLZ5F0jn_D3gIbiGiPWzhjQX9AA-emzi2n');
  const { setIsPlayEnabled, isPlayEnabled, backgroundVolume, setBackgroundVolume, backgroundPlayerRef, setBackgroundMuted, backgroundMuted } = useYouTube();
  const [usePlaylistMode, setUsePlaylistMode] = useState<boolean>(false);
  const [isAutomaticEventsEnabled, setIsAutomaticEventsEnabled] = useState<boolean>(true);
  const timeEventsRef = useRef<any>(null);
  const slidesInitializedRef = useRef<boolean>(false);
  const videoListInitializedRef = useRef<boolean>(false);
  const [showStartOverlay, setShowStartOverlay] = useState<boolean>(true);
  const [currentVideoTime, setCurrentVideoTime] = useState<number>(0);
  const videoTimeUpdateIntervalRef = useRef<number | null>(null);
  const { registerHotkey, unregisterHotkey } = useHotkeys();
  const [isMainPlayerPlaying, setIsMainPlayerPlaying] = useState<boolean>(false);
  const [mainPlayersReady, setMainPlayersReady] = useState<boolean>(false);
  
  // Add state to track screen size and settings dialog
  const [isMobile, setIsMobile] = useState<boolean>(window.innerWidth < 768);
  const [showSettingsDialog, setShowSettingsDialog] = useState<boolean>(false);
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  
  // Handle screen resize
  useEffect(() => {
    const handleResize = () => {
      const newIsMobile = window.innerWidth < 768;
      if (newIsMobile !== isMobile) {
        setIsMobile(newIsMobile);
        // Update the layout model when screen size changes category
        model = Model.fromJson(createLayoutJson(isExperimentalFeaturesEnabled, newIsMobile));
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [isMobile, isExperimentalFeaturesEnabled]);
  
  const handlePlayPause = useCallback(() => {
    if (isPlayerReady) {
      const newPlayState = !isPlaying;
      setIsPlaying(newPlayState);
      setIsPlayEnabled(!newPlayState);
      
      // Directly control the background player if it exists
      if (backgroundPlayerRef?.current) {
        try {
          if (newPlayState) {
            // Main video is playing, pause background
            backgroundPlayerRef.current.pauseVideo();
          } else {
            // Main video is paused, play background
            backgroundPlayerRef.current.playVideo();
          }
        } catch (error) {
          console.error('[App] Error controlling background player:', error);
        }
      }
    }
  }, [isPlayerReady, isPlaying, backgroundPlayerRef, setIsPlayEnabled]);

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
    console.log('[App] Manually toggling fullscreen, resetting userExitedFullscreen flag');
    setUserExitedFullscreen(false);
    setIsFullscreen(prev => !prev);
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
      setIsPlayEnabled(!shouldBePlaying);
    }
  }, [isPlaying, isPlayerReady, setIsPlayEnabled]);

  const handleSlideTransitionsToggle = useCallback(() => {
    setIsSlideTransitionsEnabled(prev => !prev);
  }, []);

  const handleFrameSelect = useCallback((frameUrl: string, index: number) => {
    setOverlaySlide(frameUrl);
    setCurrentFrameIndex(index);
    // Disable slide transitions when manually selecting frames
    if (isSlideTransitionsEnabled) {
      setIsSlideTransitionsEnabled(false);
    }
  }, [isSlideTransitionsEnabled]);

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

  // Add a resetTimeEvents function outside of handleRestart
  const resetTimeEvents = useCallback(() => {
    if (isPlayerReady && player && timeEventsRef.current) {
      console.log('[App] Resetting time events');
      // Clear existing events
      timeEventsRef.current.clearEvents();

      // Only register events if automatic events are enabled
      if (isAutomaticEventsEnabled) {
        const currentTime = player.getCurrentTime();
        console.log('[App] Automatic events are enabled, re-registering events (current time:', currentTime, 's)');

        // Register fullscreen enable event at 1 second
        if (currentTime < 1) {
          console.log('[App] Re-registering fullscreen enable event for 1s');
          timeEventsRef.current.registerEvent(1, () => {
            console.log(`[App] Checking fullscreen enable event at 1s (current fullscreen state: ${isFullscreen}, user exited: ${userExitedFullscreen})`);
            // Only auto-enable fullscreen if the user hasn't manually exited it
            if (!isFullscreen && !userExitedFullscreen) {
              console.log('[App] Auto-enabling fullscreen at 1s');
              handleFullscreen();
            } else {
              console.log('[App] Fullscreen already enabled or user manually exited, skipping enable event');
            }
          });
          
          // Register ducking enable event at 1 second
          console.log('[App] Re-registering ducking enable event for 1s');
          timeEventsRef.current.registerEvent(1, () => {
            console.log(`[App] Checking ducking enable event at 1s (current ducking state: ${isDucking})`);
            if (!isDucking && !isMuted) {
              console.log('[App] Auto-enabling ducking at 1s');
              handleEnableDucking();
            } else {
              console.log('[App] Ducking already enabled or audio is muted, skipping enable event');
            }
          });
        } else {
          console.log('[App] Skipping fullscreen enable event registration (current time > 1s)');
          console.log('[App] Skipping ducking enable event registration (current time > 1s)');
        }

        // Check if current time is eligible for PiP events
        // Saturday is day 6, Sunday is day 0
        const now = new Date();
        const day = now.getDay();
        const hours = now.getHours();
        const minutes = now.getMinutes();
        const isPipTimeAllowed = (
          // Saturday (day 6) after or at 2:00 PM (14:00)
          (day === 6 && hours >= 14) || 
          // Sunday (day 0) before 11:45 PM (23:45)
          (day === 0 && (hours < 23 || (hours === 23 && minutes < 45)))
        );

        if (isPipTimeAllowed) {
          // Only register enable event if we're before 5 seconds
          if (currentTime < 5) {
            console.log('[App] Re-registering PiP enable event for 5s');
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
            console.log('[App] Re-registering PiP disable event for 8 minutes');
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
          console.log('[App] PiP events not re-registered - not within allowed time window (Sat after 2pm or Sun before 11:45pm)');
        }
      } else {
        console.log('[App] Automatic events are disabled, not re-registering events');
      }
    } else {
      console.log('[App] Player not ready or timeEventsRef not available, skipping event reset');
    }
  }, [isPlayerReady, player, isAutomaticEventsEnabled, handleEnablePip, handleDisablePip, handleFullscreen, isFullscreen, timeEventsRef, isPipMode, isDucking, isMuted, userExitedFullscreen]);

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
      
      // Reset the user exited fullscreen flag when restarting
      setUserExitedFullscreen(false);
      
      // Reset time events when restarting so they will trigger again
      console.log('[App] Calling resetTimeEvents after restart');
      resetTimeEvents();
    }
  }, [player, isPlayerReady, isPlaying, videoMonitorPlayer, resetTimeEvents]);

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

  const handleEnableDucking = useCallback(() => {
    if (!isDucking && !isMuted) {
      console.log('[App] Enabling audio ducking (current state:', isDucking, ')');
      // Instant duck down to 66%
      preDuckVolume.current = videoVolume;
      setVideoVolume(Math.round(videoVolume * 0.66));
      setIsDucking(true);
      console.log('[App] Audio ducking state after enable:', true);
    } else {
      console.log('[App] Audio ducking already enabled or audio is muted, skipping enable');
    }
  }, [isDucking, isMuted, videoVolume]);

  const handleDisableDucking = useCallback(() => {
    if (isDucking) {
      console.log('[App] Disabling audio ducking (current state:', isDucking, ')');
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
          console.log('[App] Audio ducking state after disable:', false);
        }
      }, stepDuration);
    } else {
      console.log('[App] Audio ducking already disabled, skipping disable');
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
        if (isDucking) {
          handleDisableDucking();
        } else {
          handleEnableDucking();
        }
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
      } else if (event.code === 'KeyN' && !event.repeat) {
        event.preventDefault();
        // Skip to next track in background player
        if (backgroundPlayerRef?.current) {
          try {
            backgroundPlayerRef.current.nextVideo();
          } catch (error) {
            console.error('[App] Error skipping to next track:', error);
          }
        }
      } else if (event.code === 'Comma' && !event.repeat) {
        event.preventDefault();
        
        if (backgroundMuted && backgroundPlayerRef?.current) {
          // If player is muted, unmute it first
          console.log('< key pressed, unmuting background player');
          backgroundPlayerRef.current.unMute();
          setBackgroundMuted(false);
          // Make sure we keep the current volume
          backgroundPlayerRef.current.setVolume(backgroundVolume);
        } else {
          // Decrease background volume by 5% of total (5 out of 100)
          const newVolume = Math.max(0, backgroundVolume - 5);
          console.log('< key pressed, decreasing background volume from', backgroundVolume, 'to', newVolume);
          setBackgroundVolume(newVolume);
        }
      } else if (event.code === 'Period' && !event.repeat) {
        event.preventDefault();
        
        if (backgroundMuted && backgroundPlayerRef?.current) {
          // If player is muted, unmute it first
          console.log('> key pressed, unmuting background player');
          backgroundPlayerRef.current.unMute();
          setBackgroundMuted(false);
          // Make sure we keep the current volume
          backgroundPlayerRef.current.setVolume(backgroundVolume);
        } else {
          // Increase background volume by 5% of total (5 out of 100)
          const newVolume = Math.min(100, backgroundVolume + 5);
          console.log('> key pressed, increasing background volume from', backgroundVolume, 'to', newVolume);
          setBackgroundVolume(newVolume);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handlePlayPause, isPlayerReady, handleFullscreen, currentFrameIndex, handleFrameSelect, 
      handleSlideTransitionsToggle, handleEnableDucking, handleDisableDucking, handleEnablePip, handleDisablePip, handleToggleMute, isMuted, isPipMode, isDucking, videoVolume, backgroundVolume, setBackgroundVolume, backgroundMuted, setBackgroundMuted, backgroundPlayerRef]);

  // Handle fullscreen changes from external sources
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = Boolean(document.fullscreenElement);
      
      // If user exited fullscreen manually (e.g., pressing Escape)
      if (!isCurrentlyFullscreen && isFullscreen) {
        console.log('[App] Detected fullscreen exit via browser (likely Escape key)');
        setUserExitedFullscreen(true);
      }
      
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
    // Set up time events when player becomes ready or other dependencies change
    resetTimeEvents();
  }, [resetTimeEvents]);

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

  // Initialize video list when app loads
  useEffect(() => {
    if (!videoListInitializedRef.current) {
      console.log('[App] Initializing video list');
      const videoListComponent = document.createElement('div');
      const videoListInstance = (
        <VideoList 
          setVideo={setVideo} 
          playlistUrl={playlistUrl} 
          currentVideo={video}
          onError={handleVideoListError}
        />
      );
      // @ts-ignore - ReactDOM is available in the browser
      ReactDOM.render(videoListInstance, videoListComponent);
      videoListInitializedRef.current = true;
    }
  }, [handleVideoListError, playlistUrl, setVideo, video]);

  useEffect(() => {
    const handleOpenControlsOnly = (e: CustomEvent) => {
      const shouldStartMedia = e.detail?.startMedia;
      const preserveBackgroundMusic = e.detail?.preserveBackgroundMusic;
      
      if (!shouldStartMedia) {
        // Just opening controls, don't start media
        if (player) {
          player.pauseVideo();
        }
        setIsPlaying(false);
        
        // Only affect background player if preserveBackgroundMusic is false
        if (!preserveBackgroundMusic && backgroundPlayerRef?.current) {
          backgroundPlayerRef.current.pauseVideo();
          backgroundPlayerRef.current.mute();
          setBackgroundMuted(true);
          setIsPlayEnabled(false);
        }
      } else {
        // Start the service - restart and play the video
        if (player) {
          player.seekTo(0, true);
          player.playVideo();
        }
        setIsPlaying(true);
        
        // Also restart monitor player if it exists
        if (videoMonitorPlayer) {
          videoMonitorPlayer.seekTo(0, true);
          videoMonitorPlayer.playVideo();
        }
      }
    };

    // Add event listener
    window.addEventListener('openControlsOnly', handleOpenControlsOnly as EventListener);
    
    // Clean up
    return () => {
      window.removeEventListener('openControlsOnly', handleOpenControlsOnly as EventListener);
    };
  }, [player, videoMonitorPlayer, backgroundPlayerRef, setBackgroundMuted, setIsPlayEnabled]);

  const handleStartService = () => {
    setShowStartOverlay(false);
    
    // The rest of the function will now be controlled by the custom event
    // so we can just close the overlay here
  };

  // Add listener for user exited fullscreen event with improved logging and debugging
  useEffect(() => {
    const handleUserExitedFullscreen = (e: Event) => {
      const customEvent = e as CustomEvent;
      console.log('[App] User manually exited fullscreen, details:', customEvent.detail);
      
      // Set the flag to prevent auto re-entering fullscreen
      setUserExitedFullscreen(true);
      
      // If we were in fullscreen mode, update our state
      if (isFullscreen) {
        setIsFullscreen(false);
      }
    };

    // Add listeners for both our custom event and the native fullscreenchange event
    window.addEventListener('userExitedFullscreen', handleUserExitedFullscreen);
    
    return () => {
      window.removeEventListener('userExitedFullscreen', handleUserExitedFullscreen);
    };
  }, [isFullscreen]);

  // Set up video time update interval
  useEffect(() => {
    if (player && isPlayerReady) {
      // Clear any previous interval
      if (videoTimeUpdateIntervalRef.current) {
        window.clearInterval(videoTimeUpdateIntervalRef.current);
      }
      
      // Set up interval to update current time
      videoTimeUpdateIntervalRef.current = window.setInterval(() => {
        try {
          const time = player.getCurrentTime();
          setCurrentVideoTime(time);
        } catch (error) {
          console.error('Error getting current time:', error);
        }
      }, 1000);
    }
    
    return () => {
      if (videoTimeUpdateIntervalRef.current) {
        window.clearInterval(videoTimeUpdateIntervalRef.current);
      }
    };
  }, [player, isPlayerReady]);

  useEffect(() => {
    // Register global hotkeys
    registerHotkey({
      key: 'Space',
      description: 'Play/Pause video',
      handler: () => {
        if (isPlayerReady) {
          handlePlayPause();
        }
      },
      enabled: isPlayerReady
    });

    registerHotkey({
      key: 'KeyD',
      description: 'Toggle ducking',
      handler: () => {
        if (!isMuted) {
          if (isDucking) {
            handleDisableDucking();
          } else {
            handleEnableDucking();
          }
        }
      }
    });

    registerHotkey({
      key: 'KeyP',
      description: 'Toggle Picture-in-Picture',
      handler: () => {
        if (isPipMode) {
          handleDisablePip();
        } else {
          handleEnablePip();
        }
      }
    });

    registerHotkey({
      key: 'KeyM',
      description: 'Toggle mute',
      handler: () => {
        handleToggleMute();
      }
    });

    registerHotkey({
      key: 'KeyT',
      description: 'Toggle slide transitions',
      handler: () => {
        handleSlideTransitionsToggle();
      }
    });

    // Remove the Slash hotkey from here since it's now handled by the help menu
    // The background music random track feature will be handled by the ServiceStartOverlay component

    // Cleanup hotkeys on unmount
    return () => {
      unregisterHotkey('Space');
      unregisterHotkey('KeyD');
      unregisterHotkey('KeyP');
      unregisterHotkey('KeyM');
      unregisterHotkey('KeyT');
    };
  }, [
    isPlayerReady,
    isMuted,
    isDucking,
    isPipMode,
    handlePlayPause,
    handleDisableDucking,
    handleEnableDucking,
    handleDisablePip,
    handleEnablePip,
    handleToggleMute,
    handleSlideTransitionsToggle,
    registerHotkey,
    unregisterHotkey
  ]);

  // Add effect to handle playlist URL changes
  useEffect(() => {
    const initializePlaylist = async () => {
      if (playlistUrl && usePlaylistMode) {
        try {
          const videoData = await fetchPlaylistVideos(playlistUrl);
          if (videoData.length > 0) {
            setVideo(videoData[0].videoId);
          }
        } catch (error) {
          console.error('Error initializing playlist:', error);
          handleVideoListError(true);
        }
      }
    };

    initializePlaylist();
  }, [playlistUrl, usePlaylistMode, setVideo, handleVideoListError]);

  const factory = (node: TabNode) => {
    const component = node.getComponent();
    if (component === "form") {
      return (
        <VideoConfigurationForm
          video={video}
          setVideo={setVideo}
          startTimeInSeconds={startSeconds.toString()}
          setStartTimeInSeconds={(seconds: string) => setStartSeconds(parseInt(seconds))}
          playlistUrl={playlistUrl}
          setPlaylistUrl={setPlaylistUrl}
          backgroundPlaylistUrl={backgroundPlaylistUrl}
          setBackgroundPlaylistUrl={setBackgroundPlaylistUrl}
          isAutomaticEventsEnabled={isAutomaticEventsEnabled}
          onAutomaticEventsToggle={setIsAutomaticEventsEnabled}
          isExperimentalFeaturesEnabled={isExperimentalFeaturesEnabled}
          onExperimentalFeaturesToggle={(enabled) => {
            setIsExperimentalFeaturesEnabled(enabled);
            // Prompt user to refresh the page to apply changes
            if (enabled !== isExperimentalFeaturesEnabled) {
              if (window.confirm("Changing experimental features requires a page refresh. Refresh now?")) {
                window.location.reload();
              }
            }
          }}
        />
      );
    } else if (component === "video") {
      return (
        <VideoFadeFrame
          video={video}
          startSeconds={startSeconds}
          overlaySlide={overlaySlide}
          onPlayerReady={handlePlayerReady}
          onStateChange={handleStateChange}
          isPlaying={isPlaying && !showStartOverlay}
          isFullscreen={isFullscreen}
          isPipMode={isPipMode}
          isSlideTransitionsEnabled={isSlideTransitionsEnabled}
          volume={videoVolume}
          playlistUrl={playlistUrl}
          usePlaylistMode={usePlaylistMode}
          isPlayEnabled={isPlayEnabled}
          onFullscreenChange={setIsFullscreen}
          isMainPlayerPlaying={isMainPlayerPlaying}
          setIsMainPlayerPlaying={setIsMainPlayerPlaying}
          setIsPlayEnabled={(value: boolean | ((prev: boolean) => boolean)) => {
            if (typeof value === 'function') {
              setIsPlayEnabled(value(isPlayEnabled));
            } else {
              setIsPlayEnabled(value);
            }
          }}
          setMainPlayersReady={setMainPlayersReady}
        />
      );
    } else if (component === "background") {
      return (
        <BackgroundPlayer
          playlistUrl={backgroundPlaylistUrl}
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
              onEnableDucking={handleEnableDucking}
              onDisableDucking={handleDisableDucking}
              onToggleMute={handleToggleMute}
              isPlaying={isPlaying}
              isSlideTransitionsEnabled={isSlideTransitionsEnabled}
              isPipMode={isPipMode}
              isDucking={isDucking}
              isMuted={isMuted}
              volume={videoVolume}
              currentTime={currentVideoTime}
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

  // Mobile settings dialog component
  const MobileSettingsDialog: FC = () => (
    <Dialog
      open={showSettingsDialog}
      onClose={() => setShowSettingsDialog(false)}
      fullScreen={fullScreen}
      aria-labelledby="settings-dialog-title"
      PaperProps={{
        sx: {
          backgroundColor: 'var(--dark-bg, #1a1a1a)',
          color: 'var(--dark-text, #ffffff)',
          borderRadius: '8px',
          overflow: 'hidden',
          maxWidth: '100%',
          maxHeight: '100%',
        }
      }}
    >
      <DialogTitle 
        id="settings-dialog-title"
        sx={{ 
          backgroundColor: 'var(--dark-surface, #222222)', 
          color: 'var(--dark-text, #ffffff)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px'
        }}
      >
        Settings
        <IconButton 
          edge="end" 
          color="inherit" 
          onClick={() => setShowSettingsDialog(false)}
          aria-label="close"
          sx={{ color: 'var(--dark-text, #ffffff)' }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ padding: '16px', backgroundColor: 'var(--dark-bg, #1a1a1a)' }}>
        <VideoConfigurationForm
          video={video}
          setVideo={setVideo}
          startTimeInSeconds={startSeconds.toString()}
          setStartTimeInSeconds={(seconds: string) => setStartSeconds(parseInt(seconds))}
          playlistUrl={playlistUrl}
          setPlaylistUrl={setPlaylistUrl}
          backgroundPlaylistUrl={backgroundPlaylistUrl}
          setBackgroundPlaylistUrl={setBackgroundPlaylistUrl}
          isAutomaticEventsEnabled={isAutomaticEventsEnabled}
          onAutomaticEventsToggle={setIsAutomaticEventsEnabled}
          isExperimentalFeaturesEnabled={isExperimentalFeaturesEnabled}
          onExperimentalFeaturesToggle={(enabled) => {
            setIsExperimentalFeaturesEnabled(enabled);
            // Prompt user to refresh the page to apply changes
            if (enabled !== isExperimentalFeaturesEnabled) {
              if (window.confirm("Changing experimental features requires a page refresh. Refresh now?")) {
                window.location.reload();
              }
            }
          }}
        />
      </DialogContent>
    </Dialog>
  );

  return (
    <Box sx={{ height: '100vh', width: '100vw', overflow: 'hidden' }}>
      {showStartOverlay && <ServiceStartOverlay onStartService={handleStartService} />}
      {/* Mobile Settings Button (fixed position) */}
      {isMobile && (
        <Box 
          sx={{ 
            position: 'fixed', 
            top: '10px', 
            right: '10px', 
            zIndex: 9999,
            pointerEvents: showStartOverlay ? 'none' : 'auto'
          }}
        >
          <IconButton 
            onClick={() => setShowSettingsDialog(true)}
            sx={{
              backgroundColor: 'var(--dark-surface, rgba(0, 0, 0, 0.7))',
              backdropFilter: 'blur(10px)',
              color: 'var(--dark-text, #ffffff)',
              border: '1px solid var(--dark-border, #333333)',
              '&:hover': {
                backgroundColor: 'var(--accent-color, #3d84f7)',
              }
            }}
          >
            <SettingsIcon />
          </IconButton>
        </Box>
      )}
      {/* Mobile Settings Dialog */}
      {isMobile && <MobileSettingsDialog />}
      <Box 
        sx={{ 
          height: '100%',
          pointerEvents: showStartOverlay ? 'none' : 'auto' // Disable ALL interactions with app content when overlay is shown
        }}
      >
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
    </Box>
  );
}

const App: FC = () => {
  return (
    <HotkeyProvider>
      <YouTubeProvider>
        <AppContent />
      </YouTubeProvider>
    </HotkeyProvider>
  );
};

export default App;
