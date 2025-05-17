import React, { useState, useEffect, useCallback, useRef } from 'react';
import './MainVideoFrame.css';
import YouTube, { YouTubeProps, YouTubeEvent } from 'react-youtube';
import { fadeToVolume } from '../utils/audioUtils';

import MainVideoOverlay from './MainVideoOverlay';
import { useYouTube } from '../contexts/YouTubeContext';

interface MainVideoFrameProps {
  video: string;
  startSeconds: number;
  useOverlay?: boolean;
  overlaySlide?: string;
  fadeDurationInSeconds?: number;
  minHeight?: string;
  minWidth?: string;
  onPlayerReady?: (player: any) => void;
  onStateChange?: (state: number) => void;
  isPlaying?: boolean;
  isFullscreen?: boolean;
  isPipMode?: boolean;
  isSlideTransitionsEnabled?: boolean;
  volume?: number;
  playlistUrl?: string;
  usePlaylistMode?: boolean;
  onFullscreenChange?: (isFullscreen: boolean) => void;
  overlayVideo?: {
    videoUrl: string;
    autoStartVideo: boolean;
    videoPlayer: any | null;
  };
}

const MainVideoFrame: React.FC<MainVideoFrameProps> = ({
  video,
  startSeconds,
  useOverlay = true,
  overlaySlide,
  fadeDurationInSeconds = 2,
  minHeight = '100%',
  minWidth = '100%',
  onPlayerReady,
  onStateChange,
  isPlaying = false,
  isFullscreen = false,
  isPipMode = false,
  isSlideTransitionsEnabled = false,
  volume = 100,
  playlistUrl,
  usePlaylistMode = false,
  onFullscreenChange,
  overlayVideo
}) => {
  const [player, setPlayer] = useState<YouTubeEvent['target'] | null>(null);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [fullscreen, setFullscreen] = useState<boolean>(false);
  const [showOverlay, setShowOverlay] = useState<boolean>(true);
  const [showInstructions, setShowInstructions] = useState<boolean>(false);
  const [currentVideoId, setCurrentVideoId] = useState<string>(video);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const instructionsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const userExitedFullscreenRef = useRef<boolean>(false);
  const playlistUrlRef = useRef<string | undefined>(playlistUrl);
  const initializedRef = useRef<boolean>(false);
  const { setMainPlayersReady, setIsMainPlayerPlaying } = useYouTube();

  // Define getPlaylistId function before using it in hooks
  const getPlaylistId = useCallback((url: string) => {
    const regex = /[&?]list=([^&]+)/;
    const match = url?.match(regex);
    return match ? match[1] : '';
  }, []);

  // Track changes to the video ID prop
  useEffect(() => {
    setCurrentVideoId(video);
  }, [video]);

  // Reinitialize player when video ID changes
  useEffect(() => {
    // Only reinitialize if player is ready and the ID has actually changed
    if (player && isPlayerReady && currentVideoId !== video) {
      console.log(`[VideoFadeFrame] Video ID changed to ${video}, reinitializing player`);
      // We'll handle this through the YouTube component's videoId prop
      setCurrentVideoId(video);
    }
  }, [player, isPlayerReady, video, currentVideoId]);

  // Reinitialize player when playlist URL changes
  useEffect(() => {
    if (player && isPlayerReady && playlistUrl !== playlistUrlRef.current) {
      console.log(`[VideoFadeFrame] Playlist URL changed, reinitializing player with playlist: ${playlistUrl}`);
      playlistUrlRef.current = playlistUrl;
      
      // Load the playlist if in playlist mode
      if (usePlaylistMode && playlistUrl) {
        const playlistId = getPlaylistId(playlistUrl);
        if (playlistId) {
          try {
            console.log(`[VideoFadeFrame] Loading playlist: ${playlistId}`);
            player.loadPlaylist({
              list: playlistId,
              listType: 'playlist',
              index: 0,
              startSeconds: startSeconds
            });
          } catch (e) {
            console.error('[VideoFadeFrame] Error loading playlist:', e);
          }
        }
      }
    }
  }, [player, isPlayerReady, playlistUrl, usePlaylistMode, getPlaylistId, startSeconds]);

  const handleClick = () => {
    // If we have an overlay video and it's playing, don't toggle main video
    if (overlayVideo?.videoUrl && showOverlay) {
      // This prevents main video play/pause toggle when interacting with overlay video
      return;
    }

    if (player && isPlayerReady) {
      // Toggle play/pause state by sending appropriate state code
      // YouTube API: 1 = playing, 2 = paused
      const newState = isPlaying ? 2 : 1;
      onStateChange?.(newState);
    }
  };

  const rewindSeconds = useCallback((seconds: number) => {
    if (player && isPlayerReady) {
      const currentTime = player.getCurrentTime();
      player.seekTo(currentTime - seconds);
    }
  }, [player, isPlayerReady]);

  const fastForwardSeconds = useCallback((seconds: number) => {
    if (player && isPlayerReady) {
      const currentTime = player.getCurrentTime();
      player.seekTo(currentTime + seconds);
    }
  }, [player, isPlayerReady]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'ArrowLeft') {
        rewindSeconds(5);
      } else if (event.code === 'ArrowRight') {
        fastForwardSeconds(15);
      } else if (event.code === 'KeyF') {
        setFullscreen(!fullscreen);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [fullscreen, fastForwardSeconds, rewindSeconds]);

  const onPlayerReadyHandler: YouTubeProps['onReady'] = useCallback((event: YouTubeEvent) => {
    const playerInstance = event.target;
    
    setTimeout(() => {
      try {
        playerInstance.seekTo(startSeconds);
        playerInstance.mute();
        playerInstance.pauseVideo();
        setPlayer(playerInstance);
        setIsPlayerReady(true);
        onPlayerReady?.(playerInstance);
        setMainPlayersReady(true);
        
        // Always try to load the first video from the playlist after initialization
        if (!initializedRef.current && playlistUrl) {
          console.log('[VideoFadeFrame] Initial load, attempting to load first video from playlist');
          
          // First, initialize with the default video ID
          try {
            playerInstance.cueVideoById({
              videoId: video,
              startSeconds: startSeconds
            });
          } catch (e) {
            console.error('[VideoFadeFrame] Error cueing default video:', e);
          }
          
          // Then, try to get the playlist ID and load the first video from it
          const playlistId = getPlaylistId(playlistUrl);
          if (playlistId) {
            try {
              // Use setTimeout to ensure this happens after the default video is loaded
              setTimeout(() => {
                console.log(`[VideoFadeFrame] Loading first video from playlist: ${playlistId}`);
                
                // If in playlist mode, load the entire playlist
                if (usePlaylistMode) {
                  playerInstance.loadPlaylist({
                    list: playlistId,
                    listType: 'playlist',
                    index: 0,
                    startSeconds: startSeconds
                  });
                } else {
                  // Otherwise, just load the first video from the playlist
                  playerInstance.cuePlaylist({
                    list: playlistId,
                    listType: 'playlist',
                    index: 0
                  });
                  
                  // Set a flag to handle the first cued event
                  const firstCueHandledRef = {current: false};
                  
                  // Set up a timer to check and handle the first cued video
                  const checkFirstVideoInterval = setInterval(() => {
                    try {
                      // Check if a video is cued (state 5)
                      const playerState = playerInstance.getPlayerState();
                      
                      if (playerState === 5 && !firstCueHandledRef.current) {
                        firstCueHandledRef.current = true;
                        
                        // Get the current video URL and extract ID
                        const videoUrl = playerInstance.getVideoUrl();
                        let videoId = '';
                        
                        if (videoUrl.includes('youtube.com/watch')) {
                          const urlParams = new URLSearchParams(videoUrl.split('?')[1]);
                          videoId = urlParams.get('v') || '';
                        } else if (videoUrl.includes('youtu.be/')) {
                          videoId = videoUrl.split('youtu.be/')[1].split('?')[0];
                        }
                        
                        if (videoId) {
                          console.log(`[VideoFadeFrame] First video from playlist has ID: ${videoId}`);
                          setCurrentVideoId(videoId);
                          
                          // Notify parent to update VideoConfigurationForm
                          if (onStateChange) {
                            const customEvent = {
                              data: playerState,
                              videoId: videoId
                            };
                            // @ts-ignore - We're extending the event data
                            onStateChange(customEvent);
                          }
                        }
                        
                        // Clear the interval once we've handled the first video
                        clearInterval(checkFirstVideoInterval);
                      }
                    } catch (err) {
                      console.error('[VideoFadeFrame] Error checking for first video:', err);
                      clearInterval(checkFirstVideoInterval);
                    }
                  }, 500); // Check every 500ms
                  
                  // Set a timeout to clear the interval if it takes too long
                  setTimeout(() => {
                    clearInterval(checkFirstVideoInterval);
                  }, 10000); // 10 seconds max
                }
              }, 200);
            } catch (e) {
              console.error('[VideoFadeFrame] Error loading first video from playlist:', e);
            }
          }
          initializedRef.current = true;
        }
      } catch (e) {
        console.log('Error initializing player:', e);
      }
    }, 100);
  }, [startSeconds, onPlayerReady, setMainPlayersReady, usePlaylistMode, playlistUrl, getPlaylistId, video, onStateChange]);

  const onStateChangeHandler: YouTubeProps['onStateChange'] = useCallback((event: YouTubeEvent) => {
    if (!isPlayerReady || !player) return;

    console.log('Player State Changed: ' + event.data);
    
    // Parse the video ID from the current video URL
    try {
      const videoUrl = event.target.getVideoUrl();
      let videoId = '';
      
      // Parse the URL to get the video ID
      if (videoUrl.includes('youtube.com/watch')) {
        // Format: https://www.youtube.com/watch?v=VIDEO_ID
        const urlParams = new URLSearchParams(videoUrl.split('?')[1]);
        videoId = urlParams.get('v') || '';
      } else if (videoUrl.includes('youtu.be/')) {
        // Format: https://youtu.be/VIDEO_ID
        videoId = videoUrl.split('youtu.be/')[1].split('?')[0];
      }
      
      // If we got a valid video ID and it's different from current, update VideoConfigurationForm
      if (videoId && videoId !== currentVideoId) {
        console.log(`[VideoFadeFrame] Detected video ID change from ${currentVideoId} to ${videoId}`);
        setCurrentVideoId(videoId);
        // Notify parent to update VideoConfigurationForm
        if (onStateChange) {
          // Use a custom event data to pass both the state change and the new video ID
          const customEvent = {
            data: event.data,
            videoId: videoId
          };
          // @ts-ignore - We're extending the event data
          onStateChange(customEvent);
        }
      } else {
        // Normal state change handling
        if (event.data === 0) {
          // Video has reached the end so reset the player
          setShowOverlay(true);
          player.seekTo(startSeconds);
          onStateChange?.(0);
          setIsMainPlayerPlaying(false);
        } else {
          onStateChange?.(event.data);
          const isPlaying = event.data === 1;
          setIsMainPlayerPlaying(isPlaying);
        }
      }
    } catch (e) {
      console.error('[VideoFadeFrame] Error parsing video ID from URL:', e);
      // Fall back to normal state change handling
      if (event.data === 0) {
        // Video has reached the end so reset the player
        setShowOverlay(true);
        player.seekTo(startSeconds);
        onStateChange?.(0);
        setIsMainPlayerPlaying(false);
      } else {
        onStateChange?.(event.data);
        const isPlaying = event.data === 1;
        setIsMainPlayerPlaying(isPlaying);
      }
    }
  }, [player, startSeconds, onStateChange, isPlayerReady, setIsMainPlayerPlaying, currentVideoId]);

  useEffect(() => {
    if (player && isPlayerReady) {
      if (isPlaying) {
        try {
          // Start fading out overlay immediately
          setShowOverlay(false);
          player.unMute();
          // Use the imported fadeToVolume function instead
          const cleanup = fadeToVolume(player, volume, fadeDurationInSeconds);
          player.playVideo();
          setIsMainPlayerPlaying(true);

          // Store the cleanup function for later use
          return cleanup;
        } catch (e) {
          console.log('Error starting playback:', e);
        }
      } else {
        try {
          // Show overlay immediately when pausing
          setShowOverlay(true);
          setIsMainPlayerPlaying(false);
          // Use the imported fadeToVolume function instead
          const cleanup = fadeToVolume(player, 0, fadeDurationInSeconds, () => {
            if (player && isPlayerReady) {
              try {
                player.pauseVideo();
              } catch (e) {
                console.log('Error pausing video:', e);
              }
            }
          });

          // Store the cleanup function for later use
          return cleanup;
        } catch (e) {
          console.log('Error pausing playback:', e);
          setIsMainPlayerPlaying(false);
        }
      }
    }
  }, [isPlaying, player, fadeDurationInSeconds, isPlayerReady, volume, setIsMainPlayerPlaying]);

  // Keep the original openFullscreen as it's used by other parts of the component
  const openFullscreen = useCallback(() => {
    const element = videoContainerRef.current as HTMLElement & {
      webkitRequestFullscreen?: () => Promise<void>;
      msRequestFullscreen?: () => Promise<void>;
    };

    if (element) {
      try {
        if (document.fullscreenElement) {
          document.exitFullscreen()
            .then(() => {
              // We don't need to call onFullscreenChange here because the fullscreenchange event will handle it
            })
            .catch(e => {
              console.log('Error exiting fullscreen:', e);
            });
        } else {
          if (element.requestFullscreen) {
            element.requestFullscreen()
              .then(() => {
                // We don't need to call onFullscreenChange here because the fullscreenchange event will handle it
              })
              .catch(e => {
                console.log('Error entering fullscreen:', e);
              });
          } else if (element.webkitRequestFullscreen) { /* Safari */
            element.webkitRequestFullscreen();
          } else if (element.msRequestFullscreen) { /* IE11 */
            element.msRequestFullscreen();
          }
        }
      } catch (e) {
        console.log('Error toggling fullscreen:', e);
      }
    }
  }, [videoContainerRef]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = Boolean(document.fullscreenElement);
      
      // If exiting fullscreen and we were in fullscreen mode before, mark as user exited
      if (!isCurrentlyFullscreen && fullscreen) {
        userExitedFullscreenRef.current = true;
        console.log('User manually exited fullscreen (likely using Escape key)');
        
        // Immediately dispatch the event instead of waiting for the next render cycle
        const event = new CustomEvent('userExitedFullscreen', { detail: { userExited: true } });
        window.dispatchEvent(event);
      }
      
      if (isCurrentlyFullscreen !== fullscreen) {
        setFullscreen(isCurrentlyFullscreen);
        // Also notify the parent component with the manual exit status
        onFullscreenChange?.(isCurrentlyFullscreen);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    // Add additional listeners for cross-browser compatibility
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, [fullscreen, onFullscreenChange]);

  // Handle external fullscreen requests
  useEffect(() => {
    if (isFullscreen !== fullscreen) {
      if (isFullscreen) {
        openFullscreen();
      } else if (document.fullscreenElement) {
        document.exitFullscreen().catch(e => {
          console.log('Error exiting fullscreen:', e);
        });
      }
    }
  }, [isFullscreen, fullscreen, openFullscreen]);

  // Show instructions when entering fullscreen
  useEffect(() => {
    if (fullscreen) {
      setShowInstructions(true);
      
      // Clear any existing timeout
      if (instructionsTimeoutRef.current) {
        clearTimeout(instructionsTimeoutRef.current);
      }
      
      // Hide instructions after 5 seconds
      instructionsTimeoutRef.current = setTimeout(() => {
        setShowInstructions(false);
      }, 5000);
    } else {
      setShowInstructions(false);
    }
    
    return () => {
      if (instructionsTimeoutRef.current) {
        clearTimeout(instructionsTimeoutRef.current);
      }
    };
  }, [fullscreen]);

  // Create a separate handler specifically for the button
  const handleFullscreenButtonClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // If we're already in fullscreen mode, don't do anything
    if (document.fullscreenElement) return;
    
    // Reset the user exited flag when user explicitly requests fullscreen
    userExitedFullscreenRef.current = false;
    
    // Update the parent's state first to prevent conflicts
    onFullscreenChange?.(true);
    
    // Request fullscreen immediately - user interaction allows this without delay
    const element = videoContainerRef.current as HTMLElement & {
      webkitRequestFullscreen?: () => Promise<void>;
      msRequestFullscreen?: () => Promise<void>;
    };

    if (element) {
      try {
        console.log('Requesting fullscreen from button click');
        
        if (element.requestFullscreen) {
          element.requestFullscreen().catch(e => {
            console.error('Error requesting fullscreen:', e);
          });
        } else if (element.webkitRequestFullscreen) { /* Safari */
          element.webkitRequestFullscreen();
        } else if (element.msRequestFullscreen) { /* IE11 */
          element.msRequestFullscreen();
        }
      } catch (e) {
        console.error('Error entering fullscreen:', e);
      }
    }
  };

  // Handle overlay video end event
  const handleOverlayVideoEnd = () => {
    console.log('[VideoFadeFrame] Overlay video ended');
    
    // If we're in PiP mode, exit PiP
    if (isPipMode) {
      console.log('[VideoFadeFrame] Exiting PiP mode because overlay video ended');
      // Dispatch an event that can be caught by the parent to exit PiP
      const event = new CustomEvent('exitPipMode', { detail: { reason: 'overlayVideoEnded' } });
      window.dispatchEvent(event);
    }
    
    // If main video is paused, resume it
    if (!isPlaying && player && isPlayerReady) {
      console.log('[VideoFadeFrame] Resuming main video because overlay video ended');
      // Use a custom event to request play without directly controlling the player
      const event = new CustomEvent('requestMainVideoPlay', { detail: { reason: 'overlayVideoEnded' } });
      window.dispatchEvent(event);
    }
  };

  // Add CSS transition for overlay opacity
  const overlayStyle = {
    transition: `opacity ${fadeDurationInSeconds}s ease-in-out`
  };

  const videoContainerStyle: React.CSSProperties = {
    position: 'relative',
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    overflow: 'hidden',
    cursor: 'pointer',
  };

  const underlayStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
    overflow: 'hidden',
    backgroundColor: 'black',
    opacity: isPipMode ? 1 : 0,
    transition: 'opacity 2s ease-in-out',
    pointerEvents: isPipMode ? 'auto' : 'none',
  };

  const underlayImageStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
  };

  const videoWrapperStyle: React.CSSProperties = {
    position: 'absolute',
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    zIndex: isPipMode ? 2 : 'auto',
  };

  const youtubeContainerStyle: React.CSSProperties = {
    position: 'absolute',
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    transition: 'all 2s ease-in-out',
    transform: isPipMode ? 'scale(0.2) translate(4%, 4%)' : 'none',
    transformOrigin: '0 0',
    backgroundColor: isPipMode ? 'rgba(0, 0, 0, 0.8)' : 'transparent',
    borderRadius: isPipMode ? '8px' : '0',
    boxShadow: isPipMode ? '0 4px 8px rgba(0, 0, 0, 0.2)' : 'none',
  };

  const fullscreenButtonStyle: React.CSSProperties = {
    position: 'absolute',
    bottom: '20px',
    right: '20px',
    zIndex: 1000,
    backgroundColor: 'var(--accent-color, #4caf50)',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
    transition: 'all 0.3s ease',
    opacity: isFullscreen ? 0 : 0.8,
    visibility: isFullscreen ? 'hidden' : 'visible',
    display: isPipMode || isFullscreen ? 'none' : 'block',
  };

  // Create a styled class in CSS for the hover effects
  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      .fullscreen-button:hover {
        background-color: var(--accent-hover, #45a049) !important;
        transform: scale(1.05) !important;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  useEffect(() => {
    if (player && isPlayerReady) {
      // Force player to resize when underlay mode changes
      try {
        const iframe = player!.getIframe();
        if (iframe) {
          iframe.style.width = '100%';
          iframe.style.height = '100%';
        }
      } catch (e) {
        console.log('Error resizing player:', e);
      }
    }
  }, [isPipMode, player, isPlayerReady]);

  // Make sure to set the volume on the player when it changes
  useEffect(() => {
    if (player && isPlayerReady) {
      player!.setVolume(volume);
    }
  }, [player, isPlayerReady, volume]);

  const instructionsOverlayStyle: React.CSSProperties = {
    position: 'absolute',
    bottom: '80px',
    left: '50%',
    transform: 'translateX(-50%)',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    color: 'white',
    padding: '10px 20px',
    borderRadius: '5px',
    zIndex: 1000,
    fontWeight: 'bold',
    textAlign: 'center',
    opacity: showInstructions ? 1 : 0,
    transition: 'opacity 0.5s ease-in-out',
    pointerEvents: 'none',
    visibility: showInstructions ? 'visible' : 'hidden',
  };

  const opts: YouTubeProps['opts'] = {
    width: '100%',
    height: '100%',
    playerVars: {
      // https://developers.google.com/youtube/player_parameters
      playsinline: 1,
      controls: 0,
      disablekb: 1,
      iv_load_policy: 3,
      fs: 0,
      modestbranding: 1,
      ...(usePlaylistMode && playlistUrl && {
        listType: 'playlist',
        list: getPlaylistId(playlistUrl)
      })
    },
  };

  return (
    <div ref={videoContainerRef} onClick={handleClick} style={videoContainerStyle}>
      {isPipMode && overlaySlide && (
        <div style={underlayStyle}>
          <img 
            src={overlaySlide} 
            alt="Background"
            style={underlayImageStyle}
          />
        </div>
      )}
      <div style={videoWrapperStyle}>
        <div style={youtubeContainerStyle}>
          <YouTube 
            key="youtube-player"
            className="VideoFadeFrame" 
            iframeClassName="VideoFadeFrame" 
            opts={opts}
            videoId={currentVideoId} 
            onReady={onPlayerReadyHandler} 
            onStateChange={onStateChangeHandler} 
          />
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            zIndex: 10,
          }} />
        </div>
      </div>
      {useOverlay && !isPipMode && (
        <MainVideoOverlay 
          showOverlay={showOverlay} 
          slide={overlaySlide} 
          fadeDurationInSeconds={fadeDurationInSeconds}
          style={overlayStyle}
          overlayVideo={overlayVideo?.videoUrl ? overlayVideo : undefined}
          onVideoEnd={handleOverlayVideoEnd}
        />
      )}
      <button 
        style={fullscreenButtonStyle} 
        onClick={handleFullscreenButtonClick}
        className="fullscreen-button"
      >
        GO FULLSCREEN
      </button>
      <div style={instructionsOverlayStyle}>
        Click or press SPACEBAR to play/pause video
      </div>
    </div>
  );
}

export default MainVideoFrame;
