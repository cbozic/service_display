import React, { useState, FormEvent, useRef, useEffect, useCallback } from 'react';
import './App.css';
import MainVideoFrame from './components/MainVideoFrame';
import SettingsForm from './components/SettingsForm';
import MainVideoSelectionList from './components/MainVideoSelectionList';
import VideoControls from './components/VideoControls';
import PianoKeyboard from './components/PianoKeyboard';
import SlideOverlayControl from './components/SlideOverlayControl';
import ChromaticTuner from './components/ChromaticTuner';
import MainVideoMonitor from './components/MainVideoMonitor';
import DisplayWindowPlaceholder from './components/DisplayWindowPlaceholder';
import { Layout, Model, TabNode, IJsonModel, Actions } from 'flexlayout-react';
import 'flexlayout-react/style/light.css';
import { Box } from '@mui/material';
import { YouTubeProvider, useYouTube } from './contexts/YouTubeContext';
import BackgroundVideoPlayer from './components/BackgroundVideoPlayer';
import BackgroundMusicPlayer from './components/BackgroundMusicPlayer';
import VideoTimeEvents from './components/VideoTimeEvents';
import { createRoot } from 'react-dom/client';
import EasyStartPopup from './components/EasyStartPopup';
import { Fullscreen, FullscreenExit, PlayArrow, Pause, VolumeUp, VolumeOff, SkipNext } from '@mui/icons-material';
import YouTube, { YouTubeProps, YouTubeEvent } from 'react-youtube';
import { Typography, Button, TextField, Grid, Avatar, Dialog, DialogTitle, DialogContent, DialogActions, IconButton } from '@mui/material';
import OnlineHelp from './components/OnlineHelp';
import { TimeEventsProvider } from './contexts/TimeEventsContext';

// System-wide constants
export const FADE_STEPS = 30; // Default fade steps for volume transitions

// Create a function to generate the flexlayout json based on experimental features flag
const createLayoutJson = (showExperimental: boolean, useBackgroundVideo: boolean = false): IJsonModel => {
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
          weight: 25,
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
                {
                  type: "tab",
                  name: "Videos",
                  component: "videoList",
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
                  name: useBackgroundVideo ? "Background Video" : "Background Music",
                  component: useBackgroundVideo ? "backgroundVideo" : "backgroundMusic",
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
          weight: 75,
          children: [
            {
              type: "tabset",
              weight: 65,
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
              weight: 35,
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
  
  // We no longer need different layouts for music vs video
  // We'll handle the toggle with conditional rendering instead
  return Model.fromJson(createLayoutJson(showExperimental));
};

const model = getInitialLayoutModel();

const AppContent: React.FC = () => {
  const [video, setVideo] = useState<string>('oQYRNeM-awo');
  const [startTimeInSeconds, setStartTimeInSeconds] = useState<string>('0');
  const [overlaySlide, setOverlaySlide] = useState<string>();
  const [playlistUrl, setPlaylistUrl] = useState<string>('https://www.youtube.com/playlist?list=PLFgcIA8Y9FMBC0J45C3f4izrHSPCiYirL');
  const videoPlayerRef = useRef<HTMLDivElement>(null);
  const [player, setPlayer] = useState<YouTubeEvent['target'] | null>(null);
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
  
  const [gifPath, setGifPath] = useState<string>(`${getBasePath()}/default_content/slides/default_slides.gif`);
  
  const [isSlideTransitionsEnabled, setIsSlideTransitionsEnabled] = useState<boolean>(false);
  const slideAnimationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [currentFrameIndex, setCurrentFrameIndex] = useState<number>(0);
  const framesRef = useRef<string[]>([]);
  const [isPipMode, setIsPipMode] = useState<boolean>(false);
  const [videoMonitorPlayer, setVideoMonitorPlayer] = useState<YouTubeEvent['target'] | null>(null);
  const [videoVolume, setVideoVolume] = useState<number>(100);
  const [isDucking, setIsDucking] = useState<boolean>(false);
  const preDuckVolume = useRef<number>(100);
  const [audioDuckingPercentage, setAudioDuckingPercentage] = useState<number>(66);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const previousVolumeRef = useRef<number>(100);
  const [backgroundPlaylistUrl, setBackgroundPlaylistUrl] = useState<string>('https://www.youtube.com/watch?v=xN054GdfAG4&list=PLZ5F0jn_D3gIbiGiPWzhjQX9AA-emzi2n');
  const { backgroundVolume, setBackgroundVolume, backgroundPlayerRef, setBackgroundMuted, backgroundMuted } = useYouTube();
  const [usePlaylistMode, setUsePlaylistMode] = useState<boolean>(false);
  const [useBackgroundVideo, setUseBackgroundVideo] = useState<boolean>(false);
  const [isAutomaticEventsEnabled, setIsAutomaticEventsEnabled] = useState<boolean>(true);
  const timeEventsRef = useRef<any>(null);
  const slidesInitializedRef = useRef<boolean>(false);
  const videoListInitializedRef = useRef<boolean>(false);
  const [showStartOverlay, setShowStartOverlay] = useState<boolean>(true);
  const [currentVideoTime, setCurrentVideoTime] = useState<number>(0);
  const videoTimeUpdateIntervalRef = useRef<number | null>(null);
  const [isHelpOpen, setIsHelpOpen] = useState<boolean>(false);
  const [videoDuration, setVideoDuration] = useState<number>(0);
  
  // Display window state
  const [isDisplayWindowOpen, setIsDisplayWindowOpen] = useState<boolean>(false);
  const [isInDisplayWindow, setIsInDisplayWindow] = useState<boolean>(false);
  const [isDisplayWindowPlayerReady, setIsDisplayWindowPlayerReady] = useState<boolean>(false);
  const displayWindowSyncIntervalRef = useRef<number | null>(null);
  const displayCommandQueueRef = useRef<Array<{command: string, args?: any[]}>>([]);

  // Check if we're running in Electron and if this is the display window
  useEffect(() => {
    if (window.electron && window.electron.isDisplayWindow) {
      const isDisplay = window.electron.isDisplayWindow();
      console.log('[App] Electron - isDisplayWindow:', isDisplay);
      setIsInDisplayWindow(isDisplay);
    } else {
      // Check URL params for web version
      const urlParams = new URLSearchParams(window.location.search);
      const isDisplay = urlParams.get('displayWindow') === 'true';
      console.log('[App] Web - isDisplayWindow:', isDisplay, 'URL:', window.location.href);
      setIsInDisplayWindow(isDisplay);
    }
  }, []);

  const handleOpenDisplayWindow = useCallback(() => {
    if (window.electron) {
      window.electron.send('toMain', { action: 'openDisplayWindow' });
      setIsDisplayWindowOpen(true);
      // Switch to Monitor tab when display window opens
      switchToMonitorTab();
      
      // Start syncing state to display window
      if (displayWindowSyncIntervalRef.current) {
        clearInterval(displayWindowSyncIntervalRef.current);
      }
      
      displayWindowSyncIntervalRef.current = window.setInterval(() => {
        syncToDisplayWindow();
      }, 100);
    } else {
      // Web-based pop-out
      const displayWindow = window.open(
        `${window.location.origin}${window.location.pathname}?displayWindow=true`,
        'ServiceDisplayWindow',
        'width=1024,height=768,menubar=no,toolbar=no,location=no,status=no'
      );
      
      if (displayWindow) {
        setIsDisplayWindowOpen(true);
        switchToMonitorTab();
        
        // Store reference to the window
        (window as any).displayWindow = displayWindow;
        
        // Set up message passing for web-based sync
        const syncInterval = window.setInterval(() => {
          if (!displayWindow.closed) {
            syncToDisplayWindow();
          } else {
            clearInterval(syncInterval);
            setIsDisplayWindowOpen(false);
            delete (window as any).displayWindow;
          }
        }, 100);
        
        // Store the interval reference
        displayWindowSyncIntervalRef.current = syncInterval;
      }
    }
  }, [video, isPlaying, overlaySlide, isPipMode, isSlideTransitionsEnabled, videoVolume, player, startTimeInSeconds, playlistUrl, usePlaylistMode, isMuted, isDucking, currentFrameIndex, isAutomaticEventsEnabled]);

  const handleCloseDisplayWindow = useCallback(() => {
    if (window.electron) {
      window.electron.send('toMain', { action: 'closeDisplayWindow' });
      setIsDisplayWindowOpen(false);
      
      // Stop syncing
      if (displayWindowSyncIntervalRef.current) {
        clearInterval(displayWindowSyncIntervalRef.current);
        displayWindowSyncIntervalRef.current = null;
      }
    } else {
      // Web-based close
      if ((window as any).displayWindow && !(window as any).displayWindow.closed) {
        (window as any).displayWindow.close();
      }
      setIsDisplayWindowOpen(false);
    }
  }, []);

  const syncToDisplayWindow = useCallback(() => {
    const syncData = {
      video,
      isPlaying,
      overlaySlide,
      isPipMode,
      isSlideTransitionsEnabled,
      videoVolume,
      currentTime: player?.getCurrentTime() || 0,
      startTimeInSeconds,
      playlistUrl,
      usePlaylistMode,
      isMuted,
      isDucking,
      currentFrameIndex,
      isAutomaticEventsEnabled
    };
    
    // Only log periodically to avoid spam
    if (Math.random() < 0.01) { // Log 1% of the time
      console.log('[Main Window] Syncing to display window:', syncData);
    }
    
    if (window.electron && isDisplayWindowOpen) {
      window.electron.send('toMain', { 
        action: 'syncToDisplay', 
        syncData 
      });
    } else if (!window.electron && (window as any).displayWindow && !(window as any).displayWindow.closed) {
      // Web-based sync
      (window as any).displayWindow.postMessage({ 
        action: 'syncToDisplay', 
        syncData 
      }, window.location.origin);
    }
  }, [video, isPlaying, overlaySlide, isPipMode, isSlideTransitionsEnabled, videoVolume, player, startTimeInSeconds, playlistUrl, usePlaylistMode, isDisplayWindowOpen, isMuted, isDucking, currentFrameIndex, isAutomaticEventsEnabled]);

  const sendDisplayPlayerCommand = useCallback((command: string, args?: any[]) => {
    if (window.electron && isDisplayWindowOpen) {
      console.log('[Main Window] Sending player command to display:', command, args);
      
      if (isDisplayWindowPlayerReady) {
        // Send command immediately if player is ready
        window.electron.send('toMain', {
          action: 'controlDisplayPlayer',
          command,
          args
        });
      } else {
        // Queue command if player is not ready
        console.log('[Main Window] Queueing command for display window:', command);
        displayCommandQueueRef.current.push({ command, args });
      }
    }
  }, [isDisplayWindowOpen, isDisplayWindowPlayerReady]);

  const handleSyncData = useCallback((syncData: any) => {
    console.log('[Display Window] Received sync data:', syncData);
    
    // Update state based on sync data
    if (syncData.video !== video) setVideo(syncData.video);
    if (syncData.isPlaying !== isPlaying) setIsPlaying(syncData.isPlaying);
    if (syncData.overlaySlide !== overlaySlide) setOverlaySlide(syncData.overlaySlide);
    if (syncData.isPipMode !== isPipMode) setIsPipMode(syncData.isPipMode);
    if (syncData.isSlideTransitionsEnabled !== isSlideTransitionsEnabled) {
      setIsSlideTransitionsEnabled(syncData.isSlideTransitionsEnabled);
    }
    if (syncData.videoVolume !== videoVolume) setVideoVolume(syncData.videoVolume);
    if (syncData.startTimeInSeconds !== startTimeInSeconds) {
      setStartTimeInSeconds(syncData.startTimeInSeconds);
    }
    if (syncData.playlistUrl !== playlistUrl) setPlaylistUrl(syncData.playlistUrl);
    if (syncData.usePlaylistMode !== usePlaylistMode) setUsePlaylistMode(syncData.usePlaylistMode);
    if (syncData.isMuted !== isMuted) setIsMuted(syncData.isMuted);
    if (syncData.isDucking !== isDucking) setIsDucking(syncData.isDucking);
    if (syncData.currentFrameIndex !== currentFrameIndex) setCurrentFrameIndex(syncData.currentFrameIndex);
    if (syncData.isAutomaticEventsEnabled !== isAutomaticEventsEnabled) {
      setIsAutomaticEventsEnabled(syncData.isAutomaticEventsEnabled);
    }
    
    // Sync player time if needed - only in display window
    if (isInDisplayWindow && player && Math.abs(player.getCurrentTime() - syncData.currentTime) > 1) {
      player.seekTo(syncData.currentTime, true);
    }
  }, [video, isPlaying, overlaySlide, isPipMode, isSlideTransitionsEnabled, videoVolume, player, startTimeInSeconds, playlistUrl, usePlaylistMode, isMuted, isDucking, currentFrameIndex, isAutomaticEventsEnabled, isInDisplayWindow]);

  const switchToMonitorTab = useCallback(() => {
    if (!model) return;
    
    // Find the Monitor tab and select it
    model.visitNodes((node: any) => {
      if (node.getType() === "tab" && node.getName() === "Monitor") {
        model.doAction(Actions.selectTab(node.getId()));
      }
    });
  }, []);

  const handlePlayPause = useCallback(() => {
    if (isPlayerReady) {
      const newPlayState = !isPlaying;
      setIsPlaying(newPlayState);
      
      // Send direct command to display window
      if (isDisplayWindowOpen) {
        sendDisplayPlayerCommand(newPlayState ? 'playVideo' : 'pauseVideo');
      }
      
      // No longer directly control background player here
      // The background player will respond to isMainPlayerPlaying state changes
    }
  }, [isPlayerReady, isPlaying, isDisplayWindowOpen, sendDisplayPlayerCommand]);

  const handleSkipForward = useCallback(() => {
    console.log('[Main Window] Skip forward requested');
    
    // Always get the current time from the main window player first
    let currentTime = 0;
    if (player && isPlayerReady) {
      try {
        currentTime = player.getCurrentTime();
        console.log('[Main Window] Got current time from player:', currentTime);
      } catch (error) {
        console.error('[Main Window] Error getting current time from player:', error);
        currentTime = currentVideoTime;
      }
    } else {
      currentTime = currentVideoTime;
      console.log('[Main Window] Using fallback current time:', currentTime);
    }
    
    const newTime = currentTime + 15;
    console.log('[Main Window] Calculated skip forward time:', currentTime, '->', newTime);
    
    // Apply to main window player if not in display mode
    if (player && isPlayerReady && !isDisplayWindowOpen) {
      console.log('[Main Window] Applying skip forward to main player');
      player.seekTo(newTime, true);
      
      if (videoMonitorPlayer) {
        videoMonitorPlayer.seekTo(newTime, true);
      }
    }
    
    // Always send command to display window if it's open
    if (isDisplayWindowOpen) {
      console.log('[Main Window] Sending skip forward command to display window:', newTime);
      sendDisplayPlayerCommand('seekTo', [newTime, true]);
    }
  }, [player, isPlayerReady, videoMonitorPlayer, isDisplayWindowOpen, sendDisplayPlayerCommand, currentVideoTime]);

  const handleSkipBack = useCallback(() => {
    console.log('[Main Window] Skip back requested');
    
    // Always get the current time from the main window player first
    let currentTime = 0;
    if (player && isPlayerReady) {
      try {
        currentTime = player.getCurrentTime();
        console.log('[Main Window] Got current time from player:', currentTime);
      } catch (error) {
        console.error('[Main Window] Error getting current time from player:', error);
        currentTime = currentVideoTime;
      }
    } else {
      currentTime = currentVideoTime;
      console.log('[Main Window] Using fallback current time:', currentTime);
    }
    
    const newTime = Math.max(0, currentTime - 5);
    console.log('[Main Window] Calculated skip back time:', currentTime, '->', newTime);
    
    // Apply to main window player if not in display mode
    if (player && isPlayerReady && !isDisplayWindowOpen) {
      console.log('[Main Window] Applying skip back to main player');
      player.seekTo(newTime, true);
      
      if (videoMonitorPlayer) {
        videoMonitorPlayer.seekTo(newTime, true);
      }
    }
    
    // Always send command to display window if it's open
    if (isDisplayWindowOpen) {
      console.log('[Main Window] Sending skip back command to display window:', newTime);
      sendDisplayPlayerCommand('seekTo', [newTime, true]);
    }
  }, [player, isPlayerReady, videoMonitorPlayer, isDisplayWindowOpen, sendDisplayPlayerCommand, currentVideoTime]);

  const handleFullscreen = useCallback(() => {
    console.log('[App] Manually toggling fullscreen, resetting userExitedFullscreen flag');
    setUserExitedFullscreen(false);
    setIsFullscreen(prev => !prev);
  }, []);

  const handlePlayerReady = useCallback((playerInstance: YouTubeEvent['target']) => {
    console.log('[App] Player ready in', isInDisplayWindow ? 'DISPLAY WINDOW' : 'MAIN WINDOW');
    setPlayer(playerInstance);
    setIsPlayerReady(true);
    
    // If this is the display window, notify the main window that the player is ready
    if (isInDisplayWindow && window.electron) {
      console.log('[Display Window] Notifying main window that player is ready');
      window.electron.send('toMain', { action: 'displayPlayerReady' });
    }
    
    // Get initial duration immediately
    try {
      const duration = playerInstance.getDuration();
      if (duration && duration > 0) {
        setVideoDuration(duration);
        console.log('[App] Initial video duration:', duration);
      }
    } catch (error) {
      console.error('[App] Error getting initial video duration:', error);
    }
  }, [isInDisplayWindow]);

  const handleStateChange = useCallback((state: number | { data: number, videoId: string }) => {
    if (!isPlayerReady) return;
    
    // Extract state data
    let stateNumber: number;
    let videoId: string | undefined;
    
    // Check if we received a custom event with videoId
    if (typeof state === 'object' && 'videoId' in state) {
      // Direct update of video ID from the player
      videoId = state.videoId;
      if (videoId !== video) {
        console.log(`[App] Updating video ID from player event: ${videoId}`);
        setVideo(videoId);
      }
      
      // Continue with regular state handling using the data property
      stateNumber = state.data;
    } else {
      // Handle the numeric state
      stateNumber = state;
    }
    
    // Update duration when video is cued or begins playing
    if (stateNumber === 1 || stateNumber === 5) {
      try {
        if (player) {
          const duration = player.getDuration();
          if (duration && duration > 0) {
            setVideoDuration(duration);
            console.log('[App] Updated video duration:', duration);
          }
        }
      } catch (error) {
        console.error('[App] Error getting video duration:', error);
      }
    }
    
    // Only update playing state if it's different from current state
    const shouldBePlaying = stateNumber === 1;
    if (shouldBePlaying !== isPlaying) {
      setIsPlaying(shouldBePlaying);
    }
  }, [isPlaying, isPlayerReady, video, player]);

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
      
      // Send immediate sync to display window to update PiP state
      if (isDisplayWindowOpen) {
        console.log('[Main Window] Sending immediate PiP enable sync to display window');
        const syncData = {
          video,
          isPlaying,
          overlaySlide,
          isPipMode: true, // Use the new state
          isSlideTransitionsEnabled,
          videoVolume,
          currentTime: player?.getCurrentTime() || 0,
          startTimeInSeconds,
          playlistUrl,
          usePlaylistMode,
          isMuted,
          isDucking,
          currentFrameIndex,
          isAutomaticEventsEnabled
        };
        
        if (window.electron) {
          window.electron.send('toMain', { 
            action: 'syncToDisplay', 
            syncData 
          });
        }
      }
      
      console.log('[App] PiP mode state after enable:', true);
    } else {
      console.log('[App] PiP mode already enabled, skipping enable');
    }
  }, [isPipMode, isDisplayWindowOpen, video, isPlaying, overlaySlide, isSlideTransitionsEnabled, videoVolume, player, startTimeInSeconds, playlistUrl, usePlaylistMode, isMuted, isDucking, currentFrameIndex, isAutomaticEventsEnabled]);

  const handleDisablePip = useCallback(() => {
    if (isPipMode) {
      console.log('[App] Disabling PiP mode (current state:', isPipMode, ')');
      setIsPipMode(false);
      
      // Send immediate sync to display window to update PiP state
      if (isDisplayWindowOpen) {
        console.log('[Main Window] Sending immediate PiP disable sync to display window');
        const syncData = {
          video,
          isPlaying,
          overlaySlide,
          isPipMode: false, // Use the new state
          isSlideTransitionsEnabled,
          videoVolume,
          currentTime: player?.getCurrentTime() || 0,
          startTimeInSeconds,
          playlistUrl,
          usePlaylistMode,
          isMuted,
          isDucking,
          currentFrameIndex,
          isAutomaticEventsEnabled
        };
        
        if (window.electron) {
          window.electron.send('toMain', { 
            action: 'syncToDisplay', 
            syncData 
          });
        }
      }
      
      console.log('[App] PiP mode state after disable:', false);
    } else {
      console.log('[App] PiP mode already disabled, skipping disable');
    }
  }, [isPipMode, isDisplayWindowOpen, video, isPlaying, overlaySlide, isSlideTransitionsEnabled, videoVolume, player, startTimeInSeconds, playlistUrl, usePlaylistMode, isMuted, isDucking, currentFrameIndex, isAutomaticEventsEnabled]);

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
        } else {
          console.log('[App] Skipping fullscreen enable event registration (current time > 1s)');
        }

        // Register background players pause event at 15 minutes (900 seconds)
        if (currentTime < 900) {
          console.log('[App] Registering background players pause event for 15 minutes');
          timeEventsRef.current.registerEvent(900, () => {
            console.log('[App] Pausing background players at 15 minutes');
            
            // Pause background video player
            if (backgroundPlayerRef?.current) {
              try {
                console.log('[App] Pausing background video player');
                backgroundPlayerRef.current.pauseVideo();
              } catch (error) {
                console.error('[App] Error pausing background video player:', error);
              }
            }
            
            // Pause background music player (audio elements)
            try {
              const audioElements = document.getElementsByTagName('audio');
              console.log('[App] Found', audioElements.length, 'audio elements to pause');
              for (let i = 0; i < audioElements.length; i++) {
                console.log('[App] Pausing audio element', i);
                audioElements[i].pause();
              }
            } catch (error) {
              console.error('[App] Error pausing audio elements:', error);
            }
          });
        }
        
        // Register background players unpause event at 65 minutes (3900 seconds)
        if (currentTime < 3900) {
          console.log('[App] Registering background players unpause event for 65 minutes');
          timeEventsRef.current.registerEvent(3900, () => {
            console.log('[App] Unpausing background players at 65 minutes');
            
            // Create a retry mechanism for background video player unpause
            const attemptBackgroundVideoUnpause = (attempts = 0, maxAttempts = 3) => {
              if (attempts >= maxAttempts) {
                console.error('[App] Failed to unpause background video player after', maxAttempts, 'attempts');
                return;
              }
              
              if (backgroundPlayerRef?.current) {
                try {
                  console.log(`[App] Attempting to unpause background video player (attempt ${attempts + 1})`);
                  
                  // First check if player is still accessible and in a valid state
                  try {
                    const playerState = backgroundPlayerRef.current.getPlayerState?.();
                    console.log('[App] Background player state before unpause:', playerState);
                    
                    // Make sure player is ready for playing
                    if (playerState === -1) { // unstarted
                      console.log('[App] Player unstarted, attempting to load video first');
                      backgroundPlayerRef.current.loadVideoById?.(backgroundPlayerRef.current.getVideoData?.().video_id);
                      setTimeout(() => attemptBackgroundVideoUnpause(attempts + 1, maxAttempts), 1000);
                      return;
                    }
                  } catch (stateError) {
                    console.warn('[App] Could not check player state:', stateError);
                  }
                  
                  // First ensure player is unmuted and volume is set
                  backgroundPlayerRef.current.unMute?.();
                  
                  // Then attempt to play video
                  backgroundPlayerRef.current.playVideo();
                  console.log('[App] Background video player unpause command sent');
                  
                  // Verify playback actually started
                  setTimeout(() => {
                    try {
                      const newState = backgroundPlayerRef.current.getPlayerState?.();
                      console.log('[App] Background player state after unpause attempt:', newState);
                      if (newState !== 1) { // not playing
                        console.log('[App] Player not playing after unpause attempt, retrying...');
                        attemptBackgroundVideoUnpause(attempts + 1, maxAttempts);
                      } else {
                        console.log('[App] Background video player successfully unpaused');
                      }
                    } catch (verifyError) {
                      console.error('[App] Error verifying video playback state:', verifyError);
                      attemptBackgroundVideoUnpause(attempts + 1, maxAttempts);
                    }
                  }, 1000);
                } catch (error) {
                  console.error(`[App] Error unpausing background video player (attempt ${attempts + 1}):`, error);
                  setTimeout(() => attemptBackgroundVideoUnpause(attempts + 1, maxAttempts), 1000);
                }
              }
            };
            
            // Create a retry mechanism for background audio elements
            const attemptBackgroundAudioUnpause = (attempts = 0, maxAttempts = 3) => {
              try {
                const audioElements = document.getElementsByTagName('audio');
                console.log(`[App] Found ${audioElements.length} audio elements to unpause (attempt ${attempts + 1})`);
                
                if (audioElements.length === 0) {
                  console.log('[App] No audio elements found, skipping audio unpause');
                  return;
                }
                
                let successCount = 0;
                let failCount = 0;
                
                // Try to unpause each audio element
                for (let i = 0; i < audioElements.length; i++) {
                  try {
                    console.log(`[App] Prepping audio element ${i} for playback`);
                    
                    // First set volume and unmute to ensure it can play
                    audioElements[i].volume = 0.5; // Set to a reasonable volume
                    audioElements[i].muted = false;
                    
                    // Then attempt to play with promise handling
                    const playPromise = audioElements[i].play();
                    
                    if (playPromise !== undefined) {
                      playPromise.then(() => {
                        console.log(`[App] Successfully unpaused audio element ${i}`);
                        successCount++;
                      }).catch(error => {
                        console.error(`[App] Error playing audio element ${i}:`, error);
                        failCount++;
                        
                        // If all elements failed, retry the whole batch
                        if (failCount === audioElements.length && attempts < maxAttempts) {
                          console.log('[App] All audio elements failed to play, retrying...');
                          setTimeout(() => attemptBackgroundAudioUnpause(attempts + 1, maxAttempts), 1000);
                        }
                      });
                    }
                  } catch (elementError) {
                    console.error(`[App] Error preparing audio element ${i}:`, elementError);
                    failCount++;
                  }
                }
                
                // If we couldn't get the audio to play and have attempts left, try again
                if (successCount === 0 && attempts < maxAttempts) {
                  console.log('[App] No audio elements successfully played, retrying...');
                  setTimeout(() => attemptBackgroundAudioUnpause(attempts + 1, maxAttempts), 1000);
                }
              } catch (error) {
                console.error(`[App] Error in audio unpause attempt ${attempts + 1}:`, error);
                if (attempts < maxAttempts) {
                  setTimeout(() => attemptBackgroundAudioUnpause(attempts + 1, maxAttempts), 1000);
                }
              }
            };
            
            // Dispatch a synthetic user interaction event to help with autoplay restrictions
            try {
              const userInteractionEvent = new MouseEvent('click', {
                view: window,
                bubbles: true,
                cancelable: true
              });
              document.dispatchEvent(userInteractionEvent);
              console.log('[App] Dispatched synthetic user interaction event to help with autoplay');
            } catch (error) {
              console.error('[App] Error creating synthetic event:', error);
            }
            
            // Start both retry mechanisms
            attemptBackgroundVideoUnpause();
            attemptBackgroundAudioUnpause();
          });
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

        // Only register PiP events if video duration is over 65 minutes
        if (isPipTimeAllowed && videoDuration > 3900) {
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

          // Only register disable event if we're before 6.5 minutes
          if (currentTime < 390) {
            console.log('[App] Re-registering PiP disable event for 6.5 minutes');
            timeEventsRef.current.registerEvent(390, () => {
              console.log(`[App] Checking PiP disable event at 6.5 minutes (current PiP state: ${isPipMode})`);
              if (isPipMode) {
                console.log('[App] Auto-disabling PiP mode at 6.5 minutes');
                handleDisablePip();
              } else {
                console.log('[App] PiP mode already disabled, skipping disable event');
              }
            });
          } else {
            console.log('[App] Skipping PiP disable event registration (current time > 6.5 minutes)');
          }
        } else {
          if (!isPipTimeAllowed) {
            console.log('[App] PiP events not re-registered - not within allowed time window (Sat after 2pm or Sun before 11:45pm)');
          } else {
            console.log('[App] PiP events not re-registered - video duration is not over 65 minutes');
          }
        }
      } else {
        console.log('[App] Automatic events are disabled, not re-registering events');
      }
    } else {
      console.log('[App] Player not ready or timeEventsRef not available, skipping event reset');
    }
  }, [isPlayerReady, player, isAutomaticEventsEnabled, handleEnablePip, handleDisablePip, handleFullscreen, isFullscreen, timeEventsRef, isPipMode, isDucking, isMuted, userExitedFullscreen, backgroundPlayerRef, videoDuration]);

  const handleRestart = useCallback(() => {
    if (player && isPlayerReady && !isDisplayWindowOpen) {
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
      
      // Reset the user exited fullscreen flag when restarting
      setUserExitedFullscreen(false);
      
      // Reset time events when restarting so they will trigger again
      console.log('[App] Calling resetTimeEvents after restart');
      resetTimeEvents();
    
    // Send direct commands to display window
    if (isDisplayWindowOpen) {
      sendDisplayPlayerCommand('seekTo', [0, true]);
      if (!isPlaying) {
        sendDisplayPlayerCommand('playVideo');
        setIsPlaying(true);
      }
    }
  }, [player, isPlayerReady, isPlaying, videoMonitorPlayer, resetTimeEvents, isDisplayWindowOpen, sendDisplayPlayerCommand]);

  const handleMonitorPlayerReady = useCallback((playerInstance: YouTubeEvent['target']) => {
    setVideoMonitorPlayer(playerInstance);
  }, []);

  const handleDuckingToggle = useCallback(() => {
    if (!isDucking) {
      // Instant duck down to the specified percentage
      preDuckVolume.current = videoVolume;
      const duckedVolume = Math.round(videoVolume * (audioDuckingPercentage / 100));
      setVideoVolume(duckedVolume);
      setIsDucking(true);
      
      // Send commands to display window if it's open
      if (isDisplayWindowOpen) {
        console.log('[Main Window] Sending ducking enable commands to display window, new volume:', duckedVolume);
        sendDisplayPlayerCommand('setVolume', [duckedVolume]);
        
        // Send sync data to display window with updated ducking state
        const syncData = {
          video,
          isPlaying,
          overlaySlide,
          isPipMode,
          isSlideTransitionsEnabled,
          videoVolume: duckedVolume,
          currentTime: player?.getCurrentTime() || 0,
          startTimeInSeconds,
          playlistUrl,
          usePlaylistMode,
          isMuted,
          isDucking: true,
          currentFrameIndex,
          isAutomaticEventsEnabled
        };
        
        if (window.electron) {
          window.electron.send('toMain', { 
            action: 'syncToDisplay', 
            syncData 
          });
        }
      }
    } else {
      // Fade back to original volume over 3 seconds
      const startVolume = videoVolume;
      const targetVolume = preDuckVolume.current;
      const steps = FADE_STEPS;
      const stepDuration = 3000 / steps;
      let currentStep = 0;

      const fadeInterval = setInterval(() => {
        currentStep++;
        const progress = currentStep / steps;
        const newVolume = Math.round(startVolume + (targetVolume - startVolume) * progress);
        setVideoVolume(newVolume);

        // Send volume updates to display window during fade
        if (isDisplayWindowOpen) {
          sendDisplayPlayerCommand('setVolume', [newVolume]);
        }

        if (currentStep >= steps) {
          clearInterval(fadeInterval);
          setIsDucking(false);
          
          // Send final sync data to display window with updated ducking state
          if (isDisplayWindowOpen) {
            console.log('[Main Window] Sending final ducking disable sync to display window');
            const syncData = {
              video,
              isPlaying,
              overlaySlide,
              isPipMode,
              isSlideTransitionsEnabled,
              videoVolume: newVolume,
              currentTime: player?.getCurrentTime() || 0,
              startTimeInSeconds,
              playlistUrl,
              usePlaylistMode,
              isMuted,
              isDucking: false,
              currentFrameIndex,
              isAutomaticEventsEnabled
            };
            
            if (window.electron) {
              window.electron.send('toMain', { 
                action: 'syncToDisplay', 
                syncData 
              });
            }
          }
        }
      }, stepDuration);
    }
  }, [isDucking, videoVolume, audioDuckingPercentage, isDisplayWindowOpen, sendDisplayPlayerCommand, video, isPlaying, overlaySlide, isPipMode, isSlideTransitionsEnabled, player, startTimeInSeconds, playlistUrl, usePlaylistMode, isMuted, currentFrameIndex, isAutomaticEventsEnabled]);

  const handleEnableDucking = useCallback(() => {
    if (!isDucking && !isMuted) {
      console.log('[App] Enabling audio ducking (current state:', isDucking, ')');
      // Instant duck down to the specified percentage
      preDuckVolume.current = videoVolume;
      const duckedVolume = Math.round(videoVolume * (audioDuckingPercentage / 100));
      setVideoVolume(duckedVolume);
      setIsDucking(true);
      
      // Send direct command to display window
      if (isDisplayWindowOpen) {
        console.log('[Main Window] Sending ducking enable command to display window, new volume:', duckedVolume);
        sendDisplayPlayerCommand('setVolume', [duckedVolume]);
        
        // Send immediate sync data to display window with updated ducking state
        const syncData = {
          video,
          isPlaying,
          overlaySlide,
          isPipMode,
          isSlideTransitionsEnabled,
          videoVolume: duckedVolume,
          currentTime: player?.getCurrentTime() || 0,
          startTimeInSeconds,
          playlistUrl,
          usePlaylistMode,
          isMuted,
          isDucking: true, // Use the new state
          currentFrameIndex,
          isAutomaticEventsEnabled
        };
        
        if (window.electron) {
          window.electron.send('toMain', { 
            action: 'syncToDisplay', 
            syncData 
          });
        }
      }
      
      console.log('[App] Audio ducking state after enable:', true);
    } else {
      console.log('[App] Audio ducking already enabled or audio is muted, skipping enable');
    }
  }, [isDucking, isMuted, videoVolume, audioDuckingPercentage, isDisplayWindowOpen, sendDisplayPlayerCommand, video, isPlaying, overlaySlide, isPipMode, isSlideTransitionsEnabled, player, startTimeInSeconds, playlistUrl, usePlaylistMode, currentFrameIndex, isAutomaticEventsEnabled]);

  const handleDisableDucking = useCallback(() => {
    if (isDucking) {
      console.log('[App] Disabling audio ducking (current state:', isDucking, ')');
      // Fade back to original volume over 3 seconds
      const startVolume = videoVolume;
      const targetVolume = preDuckVolume.current;
      const steps = FADE_STEPS;
      const stepDuration = 3000 / steps;
      let currentStep = 0;

      const fadeInterval = setInterval(() => {
        currentStep++;
        const progress = currentStep / steps;
        const newVolume = Math.round(startVolume + (targetVolume - startVolume) * progress);
        setVideoVolume(newVolume);

        // Send volume updates to display window during fade
        if (isDisplayWindowOpen) {
          sendDisplayPlayerCommand('setVolume', [newVolume]);
        }

        if (currentStep >= steps) {
          clearInterval(fadeInterval);
          setIsDucking(false);
          
          // Send final sync data to display window with updated ducking state
          if (isDisplayWindowOpen) {
            console.log('[Main Window] Sending final ducking disable sync to display window');
            const syncData = {
              video,
              isPlaying,
              overlaySlide,
              isPipMode,
              isSlideTransitionsEnabled,
              videoVolume: newVolume,
              currentTime: player?.getCurrentTime() || 0,
              startTimeInSeconds,
              playlistUrl,
              usePlaylistMode,
              isMuted,
              isDucking: false, // Use the new state
              currentFrameIndex,
              isAutomaticEventsEnabled
            };
            
            if (window.electron) {
              window.electron.send('toMain', { 
                action: 'syncToDisplay', 
                syncData 
              });
            }
          }
          
          console.log('[App] Audio ducking state after disable:', false);
        }
      }, stepDuration);
    } else {
      console.log('[App] Audio ducking already disabled, skipping disable');
    }
  }, [isDucking, videoVolume, isDisplayWindowOpen, sendDisplayPlayerCommand, video, isPlaying, overlaySlide, isPipMode, isSlideTransitionsEnabled, player, startTimeInSeconds, playlistUrl, usePlaylistMode, isMuted, currentFrameIndex, isAutomaticEventsEnabled]);

  const handleToggleMute = useCallback(() => {
    if (!isMuted) {
      previousVolumeRef.current = videoVolume;
      setVideoVolume(0);
      setIsMuted(true);
      
      // Send direct command to display window
      if (isDisplayWindowOpen) {
        sendDisplayPlayerCommand('mute');
      }
    } else {
      const targetVolume = previousVolumeRef.current || 25;
      setIsMuted(false);
      setVideoVolume(targetVolume);
      
      // Send direct commands to display window
      if (isDisplayWindowOpen) {
        sendDisplayPlayerCommand('unMute');
        sendDisplayPlayerCommand('setVolume', [targetVolume]);
      }
    }
  }, [isMuted, videoVolume, isDisplayWindowOpen, sendDisplayPlayerCommand]);

  const handleVolumeChange = useCallback((newVolume: number) => {
    console.log('[Main Window] Volume change requested:', newVolume);
    setVideoVolume(newVolume);
    
    // Send direct command to display window
    if (isDisplayWindowOpen) {
      console.log('[Main Window] Sending volume command to display window');
      sendDisplayPlayerCommand('setVolume', [newVolume]);
    }
  }, [isDisplayWindowOpen, sendDisplayPlayerCommand]);

  const handleVideoListError = useCallback((hasError: boolean) => {
    setUsePlaylistMode(hasError);
  }, []);

  const handleToggleHelp = useCallback(() => {
    setIsHelpOpen(prev => !prev);
  }, []);

  // Add these methods after other handler functions like handleToggleHelp, etc.
  
  const handleQuickSeekResync = useCallback(() => {
    if (player && isPlayerReady) {
      console.log('[App] Attempting Quick Seek Resync (Option 1)');
      try {
        const currentTime = player.getCurrentTime();
        player.seekTo(currentTime);
        
        // Also sync the monitor player if it exists
        if (videoMonitorPlayer) {
          videoMonitorPlayer.seekTo(currentTime);
        }
      } catch (error) {
        console.error('[App] Error during Quick Seek Resync:', error);
      }
    }
  }, [player, isPlayerReady, videoMonitorPlayer]);

  const handleRapidPausePlay = useCallback(() => {
    if (player && isPlayerReady) {
      console.log('[App] Attempting Rapid Pause/Play Resync (Option 2)');
      try {
        // Store current play state
        const wasPlaying = isPlaying;
        
        // Force pause
        player.pauseVideo();
        
        // Resume after a brief delay (50ms)
        setTimeout(() => {
          if (wasPlaying) {
            player.playVideo();
          }
        }, 50);
        
        // Do the same for monitor player if it exists
        if (videoMonitorPlayer) {
          videoMonitorPlayer.pauseVideo();
          if (wasPlaying) {
            setTimeout(() => videoMonitorPlayer.playVideo(), 50);
          }
        }
      } catch (error) {
        console.error('[App] Error during Rapid Pause/Play Resync:', error);
      }
    }
  }, [player, isPlayerReady, isPlaying, videoMonitorPlayer]);

  const handleQualityToggleResync = useCallback(() => {
    if (player && isPlayerReady) {
      console.log('[App] Attempting Quality Toggle Resync (Option 3)');
      try {
        // Get current quality
        const currentQuality = player.getPlaybackQuality();
        console.log(`[App] Current playback quality: ${currentQuality}`);
        
        // Force to a lower quality (small)
        player.setPlaybackQuality('small');
        
        // Return to original quality after a short delay
        setTimeout(() => {
          if (currentQuality !== 'small') {
            player.setPlaybackQuality(currentQuality);
          } else {
            // If it was already small, try to set it to a higher quality
            player.setPlaybackQuality('hd720');
          }
        }, 10000); // 10 seconds
      } catch (error) {
        console.error('[App] Error during Quality Toggle Resync:', error);
      }
    }
  }, [player, isPlayerReady]);

  const handlePlayerReload = useCallback(() => {
    if (player && isPlayerReady) {
      console.log('[App] Attempting Player Reload Resync (Option 4)');
      try {
        // Store current state
        const currentTime = player.getCurrentTime() - 2; // Subtract 2 seconds to account for the fade delay
        const wasPlaying = player.getPlayerState() === 1; // 1 is YT.PlayerState.PLAYING
        
        // Stop and reload the video
        player.stopVideo();
        
        // Reload the same video and restore position
        setTimeout(() => {
          player.cueVideoById({
            videoId: video,
            startSeconds: currentTime
          });
          
          // Also handle the monitor player if it exists
          if (videoMonitorPlayer) {
            videoMonitorPlayer.stopVideo();
            videoMonitorPlayer.cueVideoById({
              videoId: video, 
              startSeconds: currentTime
            });
          }

          // Resume playback if it was playing
          if (wasPlaying) {
            setTimeout(() => player.playVideo(), 1000);
          }
        }, 200);
      } catch (error) {
        console.error('[App] Error during Player Reload Resync:', error);
      }
    }
  }, [player, isPlayerReady, video, videoMonitorPlayer]);

  const handleTimeChange = useCallback((newTime: number) => {
    if (player && isPlayerReady && !isDisplayWindowOpen) {
      player.seekTo(newTime, true);
      
      if (videoMonitorPlayer) {
        videoMonitorPlayer.seekTo(newTime, true);
      }
    }
    
    // Send direct command to display window
    if (isDisplayWindowOpen) {
      sendDisplayPlayerCommand('seekTo', [newTime, true]);
    }
  }, [player, isPlayerReady, videoMonitorPlayer, isDisplayWindowOpen, sendDisplayPlayerCommand]);

  const handleTimedEventsToggle = useCallback(() => {
    const newTimedEventsState = !isAutomaticEventsEnabled;
    setIsAutomaticEventsEnabled(newTimedEventsState);
    console.log('[App] Timed events toggled:', newTimedEventsState);
    
    // Send immediate sync to display window to update timed events state
    if (isDisplayWindowOpen) {
      console.log('[Main Window] Sending immediate timed events sync to display window');
      const syncData = {
        video,
        isPlaying,
        overlaySlide,
        isPipMode,
        isSlideTransitionsEnabled,
        videoVolume,
        currentTime: player?.getCurrentTime() || 0,
        startTimeInSeconds,
        playlistUrl,
        usePlaylistMode,
        isMuted,
        isDucking,
        currentFrameIndex,
        isAutomaticEventsEnabled: newTimedEventsState // Use the new state
      };
      
      if (window.electron) {
        window.electron.send('toMain', { 
          action: 'syncToDisplay', 
          syncData 
        });
      }
    }
  }, [isAutomaticEventsEnabled, isDisplayWindowOpen, video, isPlaying, overlaySlide, isPipMode, isSlideTransitionsEnabled, videoVolume, player, startTimeInSeconds, playlistUrl, usePlaylistMode, isMuted, isDucking, currentFrameIndex]);

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
      } else if (event.code === 'Slash' && event.shiftKey && !event.repeat) {
        // Question mark key (Shift + /)
        event.preventDefault();
        handleToggleHelp();
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
      } else if (event.code === 'Slash' && !event.shiftKey && !event.repeat) {
        event.preventDefault();
        // Skip to random track in background player
        if (backgroundPlayerRef?.current) {
          try {
            const playlist = backgroundPlayerRef.current.getPlaylist();
            if (playlist && playlist.length > 0) {
              const randomIndex = Math.floor(Math.random() * playlist.length);
              backgroundPlayerRef.current.playVideoAt(randomIndex);
            }
          } catch (error) {
            console.error('[App] Error skipping to random track:', error);
          }
        }
      } else if (event.code === 'BracketLeft' && !event.repeat && !isMuted) {
        event.preventDefault();
        // Decrease volume by 5% of total (5 out of 100)
        const newVolume = Math.max(0, videoVolume - 5);
        setVideoVolume(newVolume);
      } else if (event.code === 'BracketRight' && !event.repeat && !isMuted) {
        event.preventDefault();
        // Increase volume by 5% of total (5 out of 100)
        const newVolume = Math.min(100, videoVolume + 5);
        setVideoVolume(newVolume);
      } else if (event.code === 'KeyR' && event.altKey && !event.repeat) {
        event.preventDefault();
        handleRestart();
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
      
      // Add these new key handlers for sync recovery options
      else if (event.code === 'Digit1' && !event.repeat && isPlayerReady) {
        event.preventDefault();
        handleQualityToggleResync();
      }
      else if (event.code === 'Digit2' && !event.repeat && isPlayerReady) {
        event.preventDefault();
        handleQuickSeekResync();
      }
      else if (event.code === 'Digit3' && !event.repeat && isPlayerReady) {
        event.preventDefault();
        handleRapidPausePlay();
      }
      else if (event.code === 'Digit4' && !event.repeat && isPlayerReady) {
        event.preventDefault();
        handlePlayerReload();
      }
      else if (event.code === 'KeyE' && !event.repeat) {
        event.preventDefault();
        handleTimedEventsToggle();
      } else if (event.code === 'KeyD' && event.ctrlKey && !event.repeat) {
        event.preventDefault();
        // Toggle display pop-out window
        if (window.electron) {
          if (isDisplayWindowOpen) {
            handleCloseDisplayWindow();
          } else {
            handleOpenDisplayWindow();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handlePlayPause, isPlayerReady, handleFullscreen, currentFrameIndex, handleFrameSelect, 
      handleSlideTransitionsToggle, handleEnableDucking, handleDisableDucking, handleEnablePip, 
      handleDisablePip, handleToggleMute, isMuted, isPipMode, isDucking, videoVolume, backgroundVolume, 
      setBackgroundVolume, backgroundMuted, setBackgroundMuted, backgroundPlayerRef, handleRestart, handleToggleHelp,
      // Add these new dependencies:
      handleQuickSeekResync, handleRapidPausePlay, handleQualityToggleResync, handlePlayerReload, handleTimedEventsToggle,
      isDisplayWindowOpen, handleOpenDisplayWindow, handleCloseDisplayWindow
  ]);

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
      }, 10000);
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
        <SlideOverlayControl 
          gifPath={gifPath} 
          onFrameSelect={handleFrameSelect} 
          onFramesUpdate={handleFramesUpdate}
          currentFrameIndex={currentFrameIndex}
          isAnimationEnabled={isSlideTransitionsEnabled}
          setGifPath={setGifPath}
          onAnimationToggle={setIsSlideTransitionsEnabled}
        />
      );
      const root = createRoot(slidesComponent);
      root.render(slidesInstance);
      slidesInitializedRef.current = true;
    }
  }, [gifPath, handleFrameSelect, handleFramesUpdate, currentFrameIndex, isSlideTransitionsEnabled]);

  // Initialize video list when app loads
  useEffect(() => {
    if (!videoListInitializedRef.current) {
      console.log('[App] Initializing video list');
      const videoListComponent = document.createElement('div');
      const videoListInstance = (
        <MainVideoSelectionList 
          setVideo={setVideo} 
          playlistUrl={playlistUrl} 
          currentVideo={video}
          onError={handleVideoListError}
        />
      );
      const root = createRoot(videoListComponent);
      root.render(videoListInstance);
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
        }
      } else {
        // Start the service - restart and play the video
        handleRestart(); // Call the restart handler directly
        
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
  }, [player, videoMonitorPlayer, backgroundPlayerRef, setBackgroundMuted, handleRestart]);

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
      
      // Get initial duration
      try {
        const duration = player.getDuration();
        if (duration && duration > 0) {
          setVideoDuration(duration);
        }
      } catch (error) {
        console.error('Error getting video duration:', error);
      }
      
      // Set up interval to update current time and check duration
      videoTimeUpdateIntervalRef.current = window.setInterval(() => {
        try {
          const time = player.getCurrentTime();
          setCurrentVideoTime(time);
          
          // Also check for duration updates
          const currentDuration = player.getDuration();
          if (currentDuration && currentDuration > 0 && currentDuration !== videoDuration) {
            setVideoDuration(currentDuration);
            console.log('[App] Updated video duration:', currentDuration);
          }
        } catch (error) {
          console.error('Error getting current time or duration:', error);
        }
      }, 1000);
    }
    
    return () => {
      if (videoTimeUpdateIntervalRef.current) {
        window.clearInterval(videoTimeUpdateIntervalRef.current);
      }
    };
  }, [player, isPlayerReady, videoDuration]);

  // Update the layout when background player type changes
  useEffect(() => {
    // Save the preference to localStorage
    localStorage.setItem('useBackgroundVideo', JSON.stringify(useBackgroundVideo));
    
    // Get the current experimental features setting
    const storedExperimental = localStorage.getItem('experimentalFeaturesEnabled');
    const showExperimental = storedExperimental ? JSON.parse(storedExperimental) : false;
    
    // Create a completely new model with the updated configuration
    // This ensures a clean state each time we toggle
    const newModel = Model.fromJson(createLayoutJson(showExperimental, useBackgroundVideo));
    
    // Copy the model to the existing model
    if (model) {
      // First, get the ID of the background player tabset
      let backgroundTabsetId: string | null = null;
      model.visitNodes((node: any) => {
        if (node.getType() === "tabset") {
          const tabs = node.getChildren();
          const hasBackgroundTab = tabs.some((tab: any) => 
            tab.getComponent() === "backgroundMusic" || 
            tab.getComponent() === "backgroundVideo"
          );
          
          if (hasBackgroundTab) {
            backgroundTabsetId = node.getId();
          }
        }
      });

      if (backgroundTabsetId) {
        try {
          // Use doAction to explicitly select the background tab
          // which ensures it's visible after the toggle
          const newTabset = newModel.getNodeById(backgroundTabsetId);
          if (newTabset) {
            // Find the background player tab in the new model
            const tabs = newTabset.getChildren();
            for (const tab of tabs) {
              // Cast tab to any to access the getComponent method
              const tabNode = tab as any;
              if (tabNode.getComponent() === "backgroundMusic" || tabNode.getComponent() === "backgroundVideo") {
                // Select this tab
                model.doAction(Actions.selectTab(tabNode.getId()));
                break;
              }
            }
          }
        } catch (error) {
          console.error('[App] Error selecting background tab:', error);
        }
      }
      
      // Use updateModelAttributes to update the global model configuration
      // This is more reliable than trying to update individual nodes
      model.doAction(Actions.updateModelAttributes({
        // Copy global attributes from new model to ensure consistency
        ...newModel.toJson().global,
      }));
      
      // Force a re-render of the layout
      window.dispatchEvent(new Event('resize'));
    }
  }, [useBackgroundVideo, model]);

  // Handle IPC messages from Electron
  useEffect(() => {
    if (!window.electron) return;

    const handleIpcMessage = (data: any) => {
      console.log('[App] Received IPC message:', data);
      
      if (data.action === 'toggleDisplayPopout') {
        if (isDisplayWindowOpen) {
          handleCloseDisplayWindow();
        } else {
          handleOpenDisplayWindow();
        }
      } else if (data.action === 'displayWindowClosed') {
        setIsDisplayWindowOpen(false);
        setIsDisplayWindowPlayerReady(false);
        displayCommandQueueRef.current = [];
        // Switch to Monitor tab when display window is closed
        switchToMonitorTab();
      } else if (data.action === 'syncToDisplay' && isInDisplayWindow) {
        // Handle sync data in display window
        handleSyncData(data.syncData);
      } else if (data.action === 'syncToMain' && !isInDisplayWindow) {
        // Handle sync data in main window
        handleSyncData(data.syncData);
      } else if (data.action === 'displayPlayerReady' && !isInDisplayWindow) {
        // Display window player is ready
        console.log('[Main Window] Display window player is ready');
        setIsDisplayWindowPlayerReady(true);
        
        // Process queued commands
        if (displayCommandQueueRef.current.length > 0) {
          console.log('[Main Window] Processing queued commands:', displayCommandQueueRef.current.length);
          displayCommandQueueRef.current.forEach(({ command, args }) => {
            window.electron!.send('toMain', {
              action: 'controlDisplayPlayer',
              command,
              args
            });
          });
          displayCommandQueueRef.current = [];
        }
      } else if (data.action === 'controlPlayer' && isInDisplayWindow && player && isPlayerReady) {
        // Handle direct player control commands in display window
        console.log('[Display Window] Received player command:', data.command, data.args);
        console.log('[Display Window] Player available:', !!player, 'Player ready:', isPlayerReady);
        console.log('[Display Window] isInDisplayWindow:', isInDisplayWindow);
        console.log('[Display Window] Player object:', player);
        
        try {
          const command = data.command as keyof typeof player;
          console.log('[Display Window] Command type check:', typeof player[command]);
          
          if (typeof player[command] === 'function') {
            console.log('[Display Window] Executing command:', command);
            if (data.args && data.args.length > 0) {
              // Call player method with arguments
              (player[command] as Function)(...data.args);
            } else {
              // Call player method without arguments
              (player[command] as Function)();
            }
            console.log('[Display Window] Command executed successfully');
          } else {
            console.error('[Display Window] Command is not a function:', command);
          }
        } catch (error) {
          console.error('[Display Window] Error executing player command:', error);
        }
      } else if (data.action === 'controlPlayer') {
        // Log why the command wasn't handled
        console.log('[Display Window] Command not handled:', {
          action: data.action,
          isInDisplayWindow,
          hasPlayer: !!player,
          isPlayerReady
        });
      }
    };

    window.electron.receive('fromMain', handleIpcMessage);

    return () => {
      // Clean up listener
      if (window.electron && window.electron.removeAllListeners) {
        window.electron.removeAllListeners('fromMain');
      }
    };
  }, [isDisplayWindowOpen, isInDisplayWindow, handleCloseDisplayWindow, handleOpenDisplayWindow, switchToMonitorTab, handleSyncData, player, isPlayerReady]);

  // Handle web-based message passing for display window sync
  useEffect(() => {
    if (window.electron) return; // Skip if using Electron
    
    const handleMessage = (event: MessageEvent) => {
      // Only accept messages from same origin
      if (event.origin !== window.location.origin) return;
      
      const data = event.data;
      if (data.action === 'syncToDisplay' && isInDisplayWindow) {
        // Handle sync data in display window
        handleSyncData(data.syncData);
      }
    };
    
    window.addEventListener('message', handleMessage);
    
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [isInDisplayWindow, handleSyncData]);

  // Ensure sync interval is updated when dependencies change
  useEffect(() => {
    if (isDisplayWindowOpen && displayWindowSyncIntervalRef.current) {
      // Clear existing interval
      clearInterval(displayWindowSyncIntervalRef.current);
      
      // Create new interval with updated dependencies
      displayWindowSyncIntervalRef.current = window.setInterval(() => {
        syncToDisplayWindow();
      }, 100);
    }
    
    return () => {
      if (displayWindowSyncIntervalRef.current) {
        clearInterval(displayWindowSyncIntervalRef.current);
        displayWindowSyncIntervalRef.current = null;
      }
    };
  }, [isDisplayWindowOpen, syncToDisplayWindow]);

  const factory = (node: TabNode) => {
    const component = node.getComponent();
    if (component === "form") {
      return (
        <SettingsForm
          video={video}
          setVideo={setVideo}
          startTimeInSeconds={startTimeInSeconds}
          setStartTimeInSeconds={setStartTimeInSeconds}
          playlistUrl={playlistUrl}
          setPlaylistUrl={setPlaylistUrl}
          backgroundPlaylistUrl={backgroundPlaylistUrl}
          setBackgroundPlaylistUrl={setBackgroundPlaylistUrl}
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
          useBackgroundVideo={useBackgroundVideo}
          onBackgroundTypeToggle={setUseBackgroundVideo}
          audioDuckingPercentage={audioDuckingPercentage}
          setAudioDuckingPercentage={setAudioDuckingPercentage}
        />
      );
    } else if (component === "video") {
      // If we're in the display window, always show the video
      // If we're in the main window and display is popped out, show placeholder
      if (isInDisplayWindow || (!isInDisplayWindow && !isDisplayWindowOpen)) {
      return (
        <div ref={videoPlayerRef} style={{ position: 'relative', height: '100%' }}>
          <MainVideoFrame 
            video={video} 
            startSeconds={parseInt(startTimeInSeconds)} 
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
            onFullscreenChange={setIsFullscreen}
          />
          <VideoTimeEvents
            ref={timeEventsRef}
            player={player}
            isPlaying={isPlaying && !showStartOverlay}
          />
          {showStartOverlay && (
            <div style={{ 
              width: '100%', 
              height: '100%', 
              backgroundColor: 'rgba(0, 0, 0, 0.5)', 
              position: 'absolute',
              top: 0,
              left: 0,
              zIndex: 5000,
              pointerEvents: 'all'
            }}></div>
          )}
        </div>
      );
      } else {
        // Show placeholder in main window when display is popped out
        return <DisplayWindowPlaceholder onCloseDisplayWindow={handleCloseDisplayWindow} />;
      }
    } else if (component === "backgroundMusic" || component === "backgroundVideo") {
      // Render either the music or video player based on useBackgroundVideo state
      // regardless of what the tab component is set to
      return useBackgroundVideo ? (
        <BackgroundVideoPlayer 
          playlistUrl={backgroundPlaylistUrl} 
          // Set an initialPaused prop to ensure the player starts paused on toggle
          initialPaused={true} 
        />
      ) : (
        <BackgroundMusicPlayer 
          // Set an initialPaused prop to ensure the player starts paused on toggle
          initialPaused={true} 
        />
      );
    } else if (component === "videoList") {
      return (
        <MainVideoSelectionList 
          setVideo={setVideo} 
          playlistUrl={playlistUrl} 
          currentVideo={video}
          onError={handleVideoListError}
        />
      );
    } else if (component === "controls") {
      return (
        <Box sx={{ 
          p: 1, 
          height: '100%', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          overflow: 'visible' // Ensure content isn't clipped
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
            onVolumeChange={handleVolumeChange}
            onDuckingToggle={handleDuckingToggle}
            onEnableDucking={handleEnableDucking}
            onDisableDucking={handleDisableDucking}
            onToggleMute={handleToggleMute}
            onHelpClick={() => setIsHelpOpen(true)}
            onTimeChange={handleTimeChange}
            onTimedEventsToggle={handleTimedEventsToggle}
            onPopOutDisplay={handleOpenDisplayWindow}
            isPlaying={isPlaying}
            isSlideTransitionsEnabled={isSlideTransitionsEnabled}
            isPipMode={isPipMode}
            volume={videoVolume}
            isDucking={isDucking}
            isMuted={isMuted}
            isTimedEventsEnabled={isAutomaticEventsEnabled}
            currentTime={currentVideoTime}
            duration={videoDuration}
            isDisplayPoppedOut={isDisplayWindowOpen}
          />
        </Box>
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
          <PianoKeyboard 
            onNotePlay={(midiNumber) => console.log('Note played:', midiNumber)}
            onNoteStop={(midiNumber) => console.log('Note stopped:', midiNumber)}
          />
        </div>
      );
    } else if (component === "tuner") {
      return <ChromaticTuner />;
    } else if (component === "slides") {
      return (
        <SlideOverlayControl 
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
        <MainVideoMonitor 
          mainPlayer={player}
          videoId={video}
          usePlaylistMode={usePlaylistMode}
          playlistUrl={playlistUrl}
        />
      );
    }
  };

  return (
    <React.Fragment>
      {/* If we're in the display window, only show the video display */}
      {isInDisplayWindow ? (
        <Box sx={{ width: '100%', height: '100vh', backgroundColor: '#000' }}>
          <MainVideoFrame 
            video={video} 
            startSeconds={parseInt(startTimeInSeconds)} 
            overlaySlide={overlaySlide}
            onPlayerReady={handlePlayerReady}
            onStateChange={handleStateChange}
            isPlaying={isPlaying}
            isFullscreen={false}
            isPipMode={isPipMode}
            isSlideTransitionsEnabled={isSlideTransitionsEnabled}
            volume={videoVolume}
            playlistUrl={playlistUrl}
            usePlaylistMode={usePlaylistMode}
            onFullscreenChange={setIsFullscreen}
          />
          <VideoTimeEvents
            ref={timeEventsRef}
            player={player}
            isPlaying={isPlaying}
          />
        </Box>
      ) : (
        <>
      {showStartOverlay && <EasyStartPopup onStartService={handleStartService} />}
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
      
      {/* Help Dialog */}
      <OnlineHelp 
        open={isHelpOpen} 
        onClose={() => setIsHelpOpen(false)}
      />
        </>
      )}
    </React.Fragment>
  );
}

const App: React.FC = () => {
  return (
    <TimeEventsProvider>
      <YouTubeProvider>
        <AppContent />
      </YouTubeProvider>
    </TimeEventsProvider>
  );
};

export default App;
