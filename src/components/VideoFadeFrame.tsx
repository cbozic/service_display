import React, { useState, useEffect, useCallback, useRef } from 'react';
import './VideoFadeFrame.css';
import YouTube, { YouTubeProps, YouTubeEvent } from 'react-youtube';
import { Box, Typography } from '@mui/material';
import { loadYouTubeAPI } from '../utils/youtubeAPI';
import { FADE_STEPS } from '../App';
import { fadeToVolume } from '../utils/audioUtils';

import Overlay from './Overlay';
import { useYouTube } from '../contexts/YouTubeContext';

interface VideoFadeFrameProps {
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
  isPlayEnabled?: boolean;
  onFullscreenChange?: (isFullscreen: boolean) => void;
}

const VideoFadeFrame: React.FC<VideoFadeFrameProps> = ({
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
  isPlayEnabled = true,
  onFullscreenChange
}) => {
  const [player, setPlayer] = useState<any>(null);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [fullscreen, setFullscreen] = useState<boolean>(false);
  const [showOverlay, setShowOverlay] = useState<boolean>(true);
  const [showInstructions, setShowInstructions] = useState<boolean>(false);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const fadeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const instructionsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const userExitedFullscreenRef = useRef<boolean>(false);
  const { setMainPlayersReady, setIsMainPlayerPlaying, setIsPlayEnabled } = useYouTube();

  const handleClick = () => {
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
        if (isPlayEnabled) {
          playerInstance.pauseVideo();
        }
        setPlayer(playerInstance);
        setIsPlayerReady(true);
        onPlayerReady?.(playerInstance);
        setMainPlayersReady(true);
      } catch (e) {
        console.log('Error initializing player:', e);
      }
    }, 100);
  }, [startSeconds, onPlayerReady, setMainPlayersReady, isPlayEnabled]);

  const onStateChangeHandler: YouTubeProps['onStateChange'] = useCallback((event: YouTubeEvent) => {
    if (!isPlayerReady) return;

    console.log('Player State Changed: ' + event.data);
    if (event.data === 0) {
      // Video has reached the end so reset the player
      setShowOverlay(true);
      player.seekTo(startSeconds);
      onStateChange?.(0);
      setIsMainPlayerPlaying(false);
      setIsPlayEnabled(true); // Main video ended, background should play
    } else {
      onStateChange?.(event.data);
      const isPlaying = event.data === 1;
      setIsMainPlayerPlaying(isPlaying);
      setIsPlayEnabled(!isPlaying); // Background should play when main video is paused
    }
  }, [player, startSeconds, onStateChange, isPlayerReady, setIsMainPlayerPlaying, setIsPlayEnabled]);

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

          // Store the cleanup function for later use
          return cleanup;
        } catch (e) {
          console.log('Error starting playback:', e);
        }
      } else {
        try {
          // Show overlay immediately when pausing
          setShowOverlay(true);
          // Trigger background player immediately when pausing
          setIsPlayEnabled(true);
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
          setIsPlayEnabled(true); // Make sure background can play if there's an error
        }
      }
    }
  }, [isPlaying, player, fadeDurationInSeconds, isPlayerReady, volume, setIsPlayEnabled]);

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

  const getPlaylistId = useCallback((url: string) => {
    const regex = /[&?]list=([^&]+)/;
    const match = url?.match(regex);
    return match ? match[1] : '';
  }, []);

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
        player.getIframe().style.width = '100%';
        player.getIframe().style.height = '100%';
      } catch (e) {
        console.log('Error resizing player:', e);
      }
    }
  }, [isPipMode, player, isPlayerReady]);

  // Make sure to set the volume on the player when it changes
  useEffect(() => {
    if (player) {
      player.setVolume(volume);
    }
  }, [player, volume]);

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
            videoId={video} 
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
        <Overlay 
          showOverlay={showOverlay} 
          slide={overlaySlide} 
          fadeDurationInSeconds={fadeDurationInSeconds}
          style={overlayStyle}
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

export default VideoFadeFrame;
