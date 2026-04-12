import React, { useState, useMemo, FormEvent, useRef, useEffect, useCallback } from 'react';
import './App.css';
import MainVideoFrame from './components/MainVideoFrame';
import SettingsForm from './components/SettingsForm';
import MainVideoSelectionList from './components/MainVideoSelectionList';
import VideoControls from './components/VideoControls';
import PianoKeyboard from './components/PianoKeyboard';
import SlideOverlayControl from './components/SlideOverlayControl';
import ChromaticTuner from './components/ChromaticTuner';
import MainVideoMonitor from './components/MainVideoMonitor';
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
import ClipEditor from './components/ClipEditor';
import ClipBoundaryMonitor from './components/ClipBoundaryMonitor';
import { TimeEventsProvider } from './contexts/TimeEventsContext';
import { ClipPlaylistProvider, useClipPlaylist } from './contexts/ClipPlaylistContext';
import { computeSequentialTimeData, getCumulativeElapsedTime } from './utils/clipTimeUtils';

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
                  name: "Clips",
                  component: "clips",
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
    // Default to Vite's BASE_URL (trim trailing slash to match prior CRA PUBLIC_URL shape)
    return import.meta.env.BASE_URL.replace(/\/$/, '');
  };
  
  const [gifPath, setGifPath] = useState<string>(`${getBasePath()}/default_content/slides/default_slides.gif`);
  
  const [isSlideTransitionsEnabled, setIsSlideTransitionsEnabled] = useState<boolean>(false);
  const slideAnimationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [currentFrameIndex, setCurrentFrameIndex] = useState<number>(0);
  const framesRef = useRef<string[]>([]);
  const [isPipMode, setIsPipMode] = useState<boolean>(false);
  const [videoVolume, setVideoVolume] = useState<number>(100);
  const [isDucking, setIsDucking] = useState<boolean>(false);
  const preDuckVolume = useRef<number>(100);
  const [audioDuckingPercentage, setAudioDuckingPercentage] = useState<number>(50);
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
  const [isLiveStream, setIsLiveStream] = useState<boolean>(false);

  // Clip playlist state
  const { clips, currentClipIndex, isClipModeActive, isPlaybackMode, setIsPlaybackMode, setCurrentClipIndex, importClips, registerVideoTitle, registerVideoTitles, videoTitles, isTransitioningBetweenClips, setIsTransitioningBetweenClips } = useClipPlaylist();
  const pendingSeekOnUnpauseRef = useRef<number | null>(null);
  const clipModeFirstPlayRef = useRef<boolean>(true);
  const loadedFromShareLinkRef = useRef<boolean>(false);
  const pendingCrossVideoSeekRef = useRef<{ videoId: string; startTime: number; autoResume: boolean } | null>(null);
  const clipFadingRef = useRef(false);

  // Compute cumulative time data for clip playlists
  const sequentialTimeData = useMemo(
    () => (isPlaybackMode && clips.length > 0) ? computeSequentialTimeData(clips) : null,
    [isPlaybackMode, clips]
  );

  // Returns cumulative elapsed time across all clips (for timed events in playlist mode)
  const getElapsedTime = useCallback((): number => {
    if (!player || !sequentialTimeData) return player?.getCurrentTime?.() ?? 0;
    return getCumulativeElapsedTime(
      player.getCurrentTime(),
      currentClipIndex,
      clips,
      sequentialTimeData
    );
  }, [player, sequentialTimeData, currentClipIndex, clips]);

  // Parse URL parameters on startup for shared clip links
  // Legacy format: ?v=VIDEO_ID&c=start.end,start.end.0
  // Multi-video format: ?v=INITIAL_VID&c=VID:start.end,VID:start.end.0
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlVideo = params.get('v');
    const urlClips = params.get('c');

    if (urlVideo) {
      setVideo(urlVideo);
    }

    if (urlClips) {
      try {
        const parsedClips = urlClips.split(',').map((segment, i) => {
          const colonIndex = segment.indexOf(':');

          if (colonIndex !== -1) {
            // Multi-video format: VID:start.end[.0]
            const clipVideoId = segment.substring(0, colonIndex);
            const timePart = segment.substring(colonIndex + 1);
            const parts = timePart.split('.');
            const startTime = parseInt(parts[0], 10);
            const endTime = parseInt(parts[1], 10);
            const pauseAtEnd = parts[2] !== '0';
            return { id: `u${i}`, videoId: clipVideoId, startTime, endTime, pauseAtEnd };
          } else {
            // Legacy format: start.end[.0] — all clips use ?v= video
            const parts = segment.split('.');
            const startTime = parseInt(parts[0], 10);
            const endTime = parseInt(parts[1], 10);
            const pauseAtEnd = parts[2] !== '0';
            return { id: `u${i}`, videoId: urlVideo || video, startTime, endTime, pauseAtEnd };
          }
        });

        if (parsedClips.every(c => !isNaN(c.startTime) && !isNaN(c.endTime) && c.endTime > c.startTime && c.videoId)) {
          const playlist = JSON.stringify({ version: 2, clips: parsedClips });
          importClips(playlist);
          setIsPlaybackMode(true);
          setCurrentClipIndex(0);
          loadedFromShareLinkRef.current = true;

          // If first clip is a different video than urlVideo, switch to it
          if (parsedClips.length > 0 && parsedClips[0].videoId !== (urlVideo || video)) {
            setVideo(parsedClips[0].videoId);
          }
        }
      } catch (e) {
        console.error('[App] Failed to parse clip URL parameters:', e);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reset first-play flag when clips change or entering playback mode
  useEffect(() => {
    clipModeFirstPlayRef.current = true;
    pendingSeekOnUnpauseRef.current = null;
  }, [clips, isPlaybackMode]);

  const [needsLiveStreamSeekToStart, setNeedsLiveStreamSeekToStart] = useState<boolean>(false);
  const lastLiveStreamSeekVideoIdRef = useRef<string | null>(null); // Track which video we've set the seek flag for

  const handlePlayPause = useCallback(() => {
    if (isPlayerReady) {
      const newPlayState = !isPlaying;

      // If user is explicitly resuming, clear any clip fade guard
      if (newPlayState) {
        clipFadingRef.current = false;
      }

      // When unpausing, check if we need to seek to a clip position
      if (newPlayState && player) {
        if (pendingSeekOnUnpauseRef.current !== null) {
          // Seek to the pending clip position before resuming
          const seekTime = pendingSeekOnUnpauseRef.current;
          pendingSeekOnUnpauseRef.current = null;
          player.seekTo(seekTime, true);
        } else if (isPlaybackMode && clipModeFirstPlayRef.current && clips.length > 0) {
          // First play in clip playback mode: seek to first clip's start
          clipModeFirstPlayRef.current = false;
          const firstClip = clips[0];
          if (firstClip.videoId !== video) {
            // First clip is on a different video — load it, then auto-seek+play
            setIsTransitioningBetweenClips(true);
            pendingCrossVideoSeekRef.current = { videoId: firstClip.videoId, startTime: firstClip.startTime, autoResume: true };
            setVideo(firstClip.videoId);
            return; // Don't toggle play yet — the cross-video handler will resume
          }
          player.seekTo(firstClip.startTime, true);
        }
      }

      setIsPlaying(newPlayState);
      // No longer directly control background player here
      // The background player will respond to isMainPlayerPlaying state changes
    }
  }, [isPlayerReady, isPlaying, player, isPlaybackMode, clips, video]);

  // Force-pause for clip boundary monitor — not a toggle, and guards against
  // handleStateChange re-enabling isPlaying while the fade is in progress
  const handleClipPause = useCallback(() => {
    clipFadingRef.current = true;
    setIsPlaying(false);
  }, []);

  const handleFullscreen = useCallback(() => {
    console.log('[App] Manually toggling fullscreen, resetting userExitedFullscreen flag');
    setUserExitedFullscreen(false);
    setIsFullscreen(prev => !prev);
  }, []);

  const handlePlayerReady = useCallback((playerInstance: YouTubeEvent['target']) => {
    setPlayer(playerInstance);
    setIsPlayerReady(true);

    // Check if this is a live stream
    try {
      const videoData = playerInstance.getVideoData();
      const isLive = videoData?.isLive || false;
      const currentVideoId = videoData?.video_id || video;
      setIsLiveStream(isLive);
      console.log('[App] Video is live stream:', isLive, 'video ID:', currentVideoId);

      // Set flag so live streams start from beginning on first play
      // Only if this is a different video than we last set the flag for
      if (isLive && lastLiveStreamSeekVideoIdRef.current !== currentVideoId) {
        setNeedsLiveStreamSeekToStart(true);
        lastLiveStreamSeekVideoIdRef.current = currentVideoId;
        console.log('[App] Setting needsLiveStreamSeekToStart for live stream (new video)');
      }
    } catch (error) {
      console.error('[App] Error checking if video is live:', error);
      setIsLiveStream(false);
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
  }, [video]);

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
    
    // Track if we should seek to start (local variable to handle async state updates)
    let shouldSeekToStart = needsLiveStreamSeekToStart;
    let currentIsLive = isLiveStream;

    // Update duration and check live stream status when video is cued or begins playing
    if (stateNumber === 1 || stateNumber === 5) {
      try {
        if (player) {
          // Check if this video is a live stream (re-check on each video change)
          const videoData = player.getVideoData();
          const isLive = videoData?.isLive || false;
          const currentVideoId = videoData?.video_id || video;
          currentIsLive = isLive;

          // Capture video title for clip playlist dropdown
          if (videoData?.title && currentVideoId) {
            registerVideoTitle(currentVideoId, videoData.title);
          }

          // If live stream status changed to live, update state and set seek flag
          // Only set flag if this is a different video than we last set the flag for
          if (isLive !== isLiveStream) {
            console.log('[App] Live stream status changed:', isLive);
            setIsLiveStream(isLive);
          }

          if (isLive && lastLiveStreamSeekVideoIdRef.current !== currentVideoId) {
            setNeedsLiveStreamSeekToStart(true);
            shouldSeekToStart = true; // Set local variable for immediate use
            lastLiveStreamSeekVideoIdRef.current = currentVideoId;
            console.log('[App] Video changed to live stream - setting needsLiveStreamSeekToStart for:', currentVideoId);
          }

          const duration = player.getDuration();
          const currentTime = player.getCurrentTime();

          // For live streams, use the maximum of getDuration() and current time + 60 seconds
          // This ensures the timeline extends beyond the DVR window
          if (isLive && currentTime > 0) {
            const effectiveDuration = Math.max(duration, currentTime + 60);
            setVideoDuration(effectiveDuration);
            console.log('[App] Updated live stream duration:', effectiveDuration, '(API duration:', duration, ', current time:', currentTime, ')');
          } else if (duration && duration > 0) {
            setVideoDuration(duration);
            console.log('[App] Updated video duration:', duration);
          }
        }
      } catch (error) {
        console.error('[App] Error getting video duration:', error);
      }
    }

    // For live streams, seek to beginning on first play
    if (stateNumber === 1 && shouldSeekToStart && currentIsLive) {
      console.log('[App] Live stream starting - seeking to beginning');
      player?.seekTo(0, true);
      setNeedsLiveStreamSeekToStart(false);
    } else if (stateNumber === 1) {
      console.log('[App] State 1 but NOT seeking. shouldSeekToStart:', shouldSeekToStart, 'currentIsLive:', currentIsLive);
    }

    // Handle pending cross-video clip seek
    if ((stateNumber === 1 || stateNumber === 5) && pendingCrossVideoSeekRef.current) {
      try {
        const pendingVideoId = videoId || (player ? player.getVideoData()?.video_id : null);
        if (pendingVideoId && pendingCrossVideoSeekRef.current.videoId === pendingVideoId) {
          const { startTime, autoResume } = pendingCrossVideoSeekRef.current;
          pendingCrossVideoSeekRef.current = null;
          console.log(`[App] Cross-video seek: seeking to ${startTime}s, autoResume=${autoResume}`);
          player?.seekTo(startTime, true);
          setIsTransitioningBetweenClips(false);
          if (autoResume) {
            setIsPlaying(true);
            return; // Skip the normal isPlaying update below
          }
        }
      } catch (error) {
        console.error('[App] Error handling cross-video seek:', error);
      }
    }

    // Clear clip fading flag once the player actually pauses
    if (stateNumber === 2 && clipFadingRef.current) {
      clipFadingRef.current = false;
    }

    // Only update playing state if it's different from current state.
    // Skip sync while a clip fade-to-pause is in progress — the YouTube player
    // is still in state 1 (playing) during the fade, but we've intentionally
    // set isPlaying=false to trigger the overlay/volume fade.
    // Also skip sync during cross-video transitions (pending seek not yet applied)
    // and for transient states like buffering (3) or cued (5) which would
    // incorrectly toggle isPlaying and fight with programmatic play commands.
    if (!clipFadingRef.current && !pendingCrossVideoSeekRef.current) {
      if (stateNumber === 1 || stateNumber === 2) {
        const shouldBePlaying = stateNumber === 1;
        if (shouldBePlaying !== isPlaying) {
          console.log('[App] Updating isPlaying from', isPlaying, 'to', shouldBePlaying);
          setIsPlaying(shouldBePlaying);
        }
      }
    }
  }, [isPlaying, isPlayerReady, video, player, isLiveStream, needsLiveStreamSeekToStart, registerVideoTitle, setIsTransitioningBetweenClips]);

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
        const currentTime = sequentialTimeData
          ? getCumulativeElapsedTime(player.getCurrentTime(), currentClipIndex, clips, sequentialTimeData)
          : player.getCurrentTime();
        console.log('[App] Automatic events are enabled, re-registering events (current time:', currentTime, 's', sequentialTimeData ? '(cumulative)' : '', ')');

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
      } else {
        console.log('[App] Automatic events are disabled, not re-registering events');
      }
    } else {
      console.log('[App] Player not ready or timeEventsRef not available, skipping event reset');
    }
  }, [isPlayerReady, player, isAutomaticEventsEnabled, handleFullscreen, isFullscreen, timeEventsRef, userExitedFullscreen, backgroundPlayerRef, currentClipIndex, clips, sequentialTimeData]);

  const handleRestart = useCallback(() => {
    if (player && isPlayerReady) {
      // In clip playback mode, restart to first clip's start time
      const seekTarget = (isPlaybackMode && clips.length > 0) ? clips[0].startTime : 0;

      // If first clip is from a different video, switch to it
      if (isPlaybackMode && clips.length > 0 && clips[0].videoId !== video) {
        setCurrentClipIndex(0);
        pendingSeekOnUnpauseRef.current = null;
        clipModeFirstPlayRef.current = false;
        pendingCrossVideoSeekRef.current = { videoId: clips[0].videoId, startTime: seekTarget, autoResume: true };
        setVideo(clips[0].videoId);
      } else {
        player.seekTo(seekTarget, true);
        // Directly start the player. The seekTo-then-state-update chain is
        // fragile when the player is in cued (5) or unstarted (-1) state
        // — the MainVideoFrame useEffect is scheduled after the React batch,
        // leaving the player idle until buffering coincidentally resumes.
        try {
          player.unMute();
          player.playVideo();
        } catch (e) {
          console.log('[App] Error starting player in handleRestart:', e);
        }
        if (!isPlaying) {
          setIsPlaying(true);
        }

        // Reset clip state on restart
        if (isPlaybackMode) {
          setCurrentClipIndex(0);
          pendingSeekOnUnpauseRef.current = null;
          clipModeFirstPlayRef.current = false;
        }
      }

      // Reset the user exited fullscreen flag when restarting
      setUserExitedFullscreen(false);

      // Reset time events when restarting so they will trigger again
      console.log('[App] Calling resetTimeEvents after restart');
      resetTimeEvents();

      // When loaded from a share link, auto-fullscreen after a brief delay
      // (resetTimeEvents skips the fullscreen event when currentTime > 1s)
      if (loadedFromShareLinkRef.current) {
        loadedFromShareLinkRef.current = false;
        setTimeout(() => {
          if (!isFullscreen) {
            handleFullscreen();
          }
        }, 500);
      }
    }
  }, [player, isPlayerReady, isPlaying, resetTimeEvents, isPlaybackMode, clips, setCurrentClipIndex, isFullscreen, handleFullscreen, video]);

  // Load a different video for clip playback
  const handleLoadVideoForClip = useCallback((newVideoId: string) => {
    if (newVideoId !== video) {
      setVideo(newVideoId);
    }
  }, [video]);

  // Schedule a seek after a cross-video transition completes
  const handleCrossVideoSeek = useCallback((targetVideoId: string, startTime: number, autoResume: boolean) => {
    pendingCrossVideoSeekRef.current = { videoId: targetVideoId, startTime, autoResume };
  }, []);

  // Seek to a specific clip (handles cross-video transitions)
  const handleSequentialSeek = useCallback((targetClipIndex: number, seekTime: number) => {
    if (!player || !isPlayerReady) return;
    if (targetClipIndex < 0 || targetClipIndex >= clips.length) return;

    const targetClip = clips[targetClipIndex];
    setCurrentClipIndex(targetClipIndex);
    pendingSeekOnUnpauseRef.current = null;

    if (targetClip.videoId !== video) {
      setIsTransitioningBetweenClips(true);
      handleCrossVideoSeek(targetClip.videoId, seekTime, isPlaying);
      handleLoadVideoForClip(targetClip.videoId);
    } else {
      player.seekTo(seekTime, true);
    }
  }, [player, isPlayerReady, clips, video, isPlaying, setCurrentClipIndex,
      handleCrossVideoSeek, handleLoadVideoForClip, setIsTransitioningBetweenClips]);

  // Skip forward/back in playback mode, aware of cumulative timeline and clip boundaries
  const handlePlaybackModeSkip = useCallback((skipSeconds: number) => {
    if (!player || !isPlayerReady) return;

    // Non-playback mode: original behavior
    if (!isPlaybackMode || clips.length === 0 || currentClipIndex < 0 || !sequentialTimeData) {
      const currentTime = player.getCurrentTime();
      player.seekTo(currentTime + skipSeconds, true);
      return;
    }

    // Compute current cumulative position
    const currentTime = player.getCurrentTime();
    const cumulativeNow = getCumulativeElapsedTime(currentTime, currentClipIndex, clips, sequentialTimeData);

    // Compute target cumulative position, clamped to [0, totalDuration)
    const targetCumulative = Math.max(0, Math.min(
      cumulativeNow + skipSeconds,
      sequentialTimeData.totalDuration - 0.1
    ));

    // Find which clip the target falls into
    let targetClipIndex = clips.length - 1;
    for (let i = 0; i < clips.length; i++) {
      if (targetCumulative < sequentialTimeData.cumulativeOffsets[i] + sequentialTimeData.clipDurations[i]) {
        targetClipIndex = i;
        break;
      }
    }

    // Calculate the actual YouTube time within the target clip
    const offsetInClip = targetCumulative - sequentialTimeData.cumulativeOffsets[targetClipIndex];
    const seekTime = clips[targetClipIndex].startTime + offsetInClip;

    handleSequentialSeek(targetClipIndex, seekTime);
  }, [player, isPlayerReady, isPlaybackMode, clips, currentClipIndex, sequentialTimeData,
      handleSequentialSeek]);

  const handleSkipForward = useCallback(() => {
    handlePlaybackModeSkip(15);
  }, [handlePlaybackModeSkip]);

  const handleSkipBack = useCallback(() => {
    handlePlaybackModeSkip(-5);
  }, [handlePlaybackModeSkip]);

  const handleDuckingToggle = useCallback(() => {
    if (!isDucking) {
      // Instant duck down to the specified percentage
      preDuckVolume.current = videoVolume;
      setVideoVolume(Math.round(videoVolume * (audioDuckingPercentage / 100)));
      setIsDucking(true);
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

        if (currentStep >= steps) {
          clearInterval(fadeInterval);
          setIsDucking(false);
        }
      }, stepDuration);
    }
  }, [isDucking, videoVolume, audioDuckingPercentage]);

  const handleEnableDucking = useCallback(() => {
    if (!isDucking && !isMuted) {
      console.log('[App] Enabling audio ducking (current state:', isDucking, ')');
      // Instant duck down to the specified percentage
      preDuckVolume.current = videoVolume;
      setVideoVolume(Math.round(videoVolume * (audioDuckingPercentage / 100)));
      setIsDucking(true);
      console.log('[App] Audio ducking state after enable:', true);
    } else {
      console.log('[App] Audio ducking already enabled or audio is muted, skipping enable');
    }
  }, [isDucking, isMuted, videoVolume, audioDuckingPercentage]);

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
      } catch (error) {
        console.error('[App] Error during Quick Seek Resync:', error);
      }
    }
  }, [player, isPlayerReady]);

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
        
      } catch (error) {
        console.error('[App] Error during Rapid Pause/Play Resync:', error);
      }
    }
  }, [player, isPlayerReady, isPlaying]);

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

          // Restore volume and mute state after player is ready
          setTimeout(() => {
            player.setVolume(videoVolume);
            if (isMuted) {
              player.mute();
            } else {
              player.unMute();
            }
          }, 100);

          // Resume playback if it was playing
          if (wasPlaying) {
            setTimeout(() => {
              console.log('[App] Resuming playback after reload, calling playVideo()');
              // Set isPlaying true BEFORE calling playVideo to cancel any pending pause fade
              setIsPlaying(true);
              player.playVideo();
              // Ensure volume is maintained after playback starts
              player.setVolume(videoVolume);
            }, 1000);
          } else {
            console.log('[App] Not resuming playback - wasPlaying was false');
          }
        }, 200);
      } catch (error) {
        console.error('[App] Error during Player Reload Resync:', error);
      }
    }
  }, [player, isPlayerReady, video, videoVolume, isMuted]);

  const handleTimeChange = useCallback((newTime: number) => {
    if (player && isPlayerReady) {
      player.seekTo(newTime, true);

      // In clip playback mode, update currentClipIndex to match the seeked position
      if (isPlaybackMode) {
        const clipIndex = clips.findIndex(
          c => c.videoId === video && newTime >= c.startTime && newTime < c.endTime
        );
        if (clipIndex !== -1) {
          setCurrentClipIndex(clipIndex);
        }
        // Clear any pending seek since user manually seeked
        pendingSeekOnUnpauseRef.current = null;
      }
    }
  }, [player, isPlayerReady, isPlaybackMode, clips, setCurrentClipIndex, video]);

  const handleTimedEventsToggle = useCallback(() => {
    setIsAutomaticEventsEnabled(prev => !prev);
    console.log('[App] Timed events toggled:', !isAutomaticEventsEnabled);
  }, [isAutomaticEventsEnabled]);

  // Handle popout for Display tab
  const handlePopoutDisplay = useCallback(() => {
    if (!model) return;
    
    // Find the Display tab by searching for component "video"
    let displayTabId: string | null = null;
    
    model.visitNodes((node: any) => {
      if (node.getType() === "tab" && node.getComponent() === "video") {
        displayTabId = node.getId();
      }
    });
    
    if (displayTabId) {
      try {
        // Use flexlayout Actions.popoutTab to popout the Display tab
        model.doAction(Actions.popoutTab(displayTabId));
        console.log('[App] Popped out Display tab');
      } catch (error) {
        console.error('[App] Error popping out Display tab:', error);
      }
    } else {
      console.warn('[App] Could not find Display tab to popout');
    }
  }, [model]);

  // Keyboard controls for video and slides
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Skip keyboard shortcuts when user is typing in an input field
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

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
      }
      else if (event.code === 'KeyC' && !event.repeat && isClipModeActive) {
        event.preventDefault();
        if (!isPlaybackMode && clips.length > 0) {
          // Enter Play Clips mode: seek to first clip
          const firstClip = clips[0];
          if (firstClip.videoId !== video) {
            // First clip is on a different video
            pendingCrossVideoSeekRef.current = { videoId: firstClip.videoId, startTime: firstClip.startTime, autoResume: false };
            setVideo(firstClip.videoId);
          } else if (player && isPlayerReady) {
            player.seekTo(firstClip.startTime, true);
          }
          setCurrentClipIndex(0);
          setIsPlaybackMode(true);
        } else {
          // Exit to Find Clips mode
          setIsPlaybackMode(false);
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
      isClipModeActive, isPlaybackMode, clips, setIsPlaybackMode, setCurrentClipIndex, player
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
          onVideosLoaded={registerVideoTitles}
        />
      );
      const root = createRoot(videoListComponent);
      root.render(videoListInstance);
      videoListInitializedRef.current = true;
    }
  }, [handleVideoListError, playlistUrl, setVideo, video, registerVideoTitles]);

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

        // Set flag so first play will seek to start for live streams
        if (isLiveStream) {
          setNeedsLiveStreamSeekToStart(true);
          console.log('[App] Fancy controls opened - setting needsLiveStreamSeekToStart for live stream');
        }
      } else {
        // Start the service - restart and play the video
        // Set flag for live streams as backup in case handleRestart's seekTo doesn't take effect immediately
        if (isLiveStream) {
          setNeedsLiveStreamSeekToStart(true);
          console.log('[App] Start service clicked - setting needsLiveStreamSeekToStart for live stream');
        }
        handleRestart(); // Call the restart handler directly
      }
    };

    // Add event listener
    window.addEventListener('openControlsOnly', handleOpenControlsOnly as EventListener);

    // Clean up
    return () => {
      window.removeEventListener('openControlsOnly', handleOpenControlsOnly as EventListener);
    };
  }, [player, backgroundPlayerRef, setBackgroundMuted, handleRestart, isLiveStream]);

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
        const currentTime = player.getCurrentTime();

        // For live streams, use effective duration that extends beyond DVR window
        if (isLiveStream && currentTime > 0) {
          const effectiveDuration = Math.max(duration, currentTime + 60);
          setVideoDuration(effectiveDuration);
          console.log('[App] Initial live stream duration:', effectiveDuration);
        } else if (duration && duration > 0) {
          setVideoDuration(duration);
          console.log('[App] Initial video duration:', duration);
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

          // For live streams, calculate effective duration to extend beyond DVR window
          if (isLiveStream && time > 0) {
            const effectiveDuration = Math.max(currentDuration, time + 60);
            if (effectiveDuration !== videoDuration) {
              setVideoDuration(effectiveDuration);
              console.log('[App] Updated live stream duration:', effectiveDuration, '(API duration:', currentDuration, ', current time:', time, ')');
            }
          } else if (currentDuration && currentDuration > 0 && currentDuration !== videoDuration) {
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
  }, [player, isPlayerReady, videoDuration, isLiveStream]);

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
            isClipModeActive={isClipModeActive}
          />
          <VideoTimeEvents
            ref={timeEventsRef}
            player={player}
            isPlaying={isPlaying && !showStartOverlay}
            getElapsedTime={sequentialTimeData ? getElapsedTime : undefined}
            isTransitioning={isTransitioningBetweenClips}
          />
          <ClipBoundaryMonitor
            player={player}
            isPlaying={isPlaying && !showStartOverlay}
            onPause={handleClipPause}
            pendingSeekOnUnpauseRef={pendingSeekOnUnpauseRef}
            currentVideoId={video}
            onLoadVideo={handleLoadVideoForClip}
            onCrossVideoSeek={handleCrossVideoSeek}
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
          onVideosLoaded={registerVideoTitles}
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
            onVolumeChange={setVideoVolume}
            onDuckingToggle={handleDuckingToggle}
            onEnableDucking={handleEnableDucking}
            onDisableDucking={handleDisableDucking}
            onToggleMute={handleToggleMute}
            onHelpClick={() => setIsHelpOpen(true)}
            onTimeChange={handleTimeChange}
            onSequentialSeek={handleSequentialSeek}
            onTimedEventsToggle={handleTimedEventsToggle}
            onPopoutClick={handlePopoutDisplay}
            isPlaying={isPlaying}
            isSlideTransitionsEnabled={isSlideTransitionsEnabled}
            isPipMode={isPipMode}
            volume={videoVolume}
            isDucking={isDucking}
            isMuted={isMuted}
            isTimedEventsEnabled={isAutomaticEventsEnabled}
            currentTime={currentVideoTime}
            duration={videoDuration}
            clips={clips}
            currentClipIndex={currentClipIndex}
            isClipModeActive={isClipModeActive}
            currentVideoId={video}
            isPlaybackMode={isPlaybackMode}
            videoTitles={videoTitles}
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
    } else if (component === "clips") {
      return (
        <ClipEditor
          currentVideoTime={currentVideoTime}
          videoId={video}
          videoDuration={videoDuration}
          onSeekToTime={handleTimeChange}
          onLoadVideo={handleLoadVideoForClip}
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
    </React.Fragment>
  );
}

const App: React.FC = () => {
  return (
    <TimeEventsProvider>
      <YouTubeProvider>
        <ClipPlaylistProvider>
          <AppContent />
        </ClipPlaylistProvider>
      </YouTubeProvider>
    </TimeEventsProvider>
  );
};

export default App;
