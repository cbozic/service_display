import React, { useState, useEffect, useCallback, useRef } from 'react';
import './VideoFadeFrame.css';
import YouTube, { YouTubeProps } from 'react-youtube';

import Overlay from './Overlay';

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
  isUnderlayMode?: boolean;
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
  isUnderlayMode = false
}) => {
  const [player, setPlayer] = useState<any>(null);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [fullscreen, setFullscreen] = useState<boolean>(false);
  const [showOverlay, setShowOverlay] = useState<boolean>(true);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const fadeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleClick = () => {
    //do something here if you want
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

  const onPlayerReadyHandler: YouTubeProps['onReady'] = useCallback((event) => {
    const playerInstance = event.target;
    
    // Wait a short moment to ensure player is fully initialized
    setTimeout(() => {
      try {
        playerInstance.seekTo(startSeconds);
        playerInstance.mute(); // Use mute instead of setVolume(0)
        playerInstance.pauseVideo();
        setPlayer(playerInstance);
        setIsPlayerReady(true);
        onPlayerReady?.(playerInstance);
      } catch (e) {
        console.log('Error initializing player:', e);
      }
    }, 100);
  }, [startSeconds, onPlayerReady]);

  const onStateChangeHandler: YouTubeProps['onStateChange'] = useCallback((event) => {
    if (!isPlayerReady) return;

    console.log('Player State Changed: ' + event.data);
    if (event.data === 0) {
      // Video has reached the end so reset the player
      setShowOverlay(true);
      player.seekTo(startSeconds);
      onStateChange?.(0);
    } else {
      onStateChange?.(event.data);
    }
  }, [player, startSeconds, onStateChange, isPlayerReady]);

  const fadeToVolume = useCallback((targetVolume: number, fadeDurationInSeconds = 0, invokeWhenFinished = () => { }) => {
    if (!player || !isPlayerReady) {
      invokeWhenFinished();
      return;
    }
    
    // Clear any existing fade timeout
    if (fadeTimeoutRef.current) {
      clearTimeout(fadeTimeoutRef.current);
    }

    // For immediate volume changes, just set directly
    if (fadeDurationInSeconds === 0) {
      try {
        if (targetVolume === 0) {
          player.mute();
        } else {
          player.unMute();
          player.setVolume(targetVolume);
        }
      } catch (e) {
        console.log('Error setting volume directly:', e);
      }
      invokeWhenFinished();
      return;
    }
    
    // For fade effects
    try {
      let currentVolume = 0;
      try {
        currentVolume = player.getVolume();
        if (isNaN(currentVolume)) currentVolume = 0;
      } catch (e) {
        console.log('Error getting volume:', e);
      }

      const volumeDifference = targetVolume - currentVolume;
      const steps = 25;
      const stepDuration = (fadeDurationInSeconds * 1000) / steps;
      let currentStep = 0;

      const fadeStep = () => {
        if (!player || !isPlayerReady) {
          invokeWhenFinished();
          return;
        }

        if (currentStep < steps) {
          const newVolume = currentVolume + (volumeDifference * (currentStep / steps));
          try {
            if (newVolume === 0) {
              player.mute();
            } else {
              player.unMute();
              player.setVolume(newVolume);
            }
            currentStep++;
            fadeTimeoutRef.current = setTimeout(fadeStep, stepDuration);
          } catch (e) {
            console.log('Error in fade step:', e);
            // Skip to end
            try {
              if (targetVolume === 0) {
                player.mute();
              } else {
                player.unMute();
                player.setVolume(targetVolume);
              }
            } catch (e) {
              console.log('Error setting final volume:', e);
            }
            fadeTimeoutRef.current = null;
            invokeWhenFinished();
          }
        } else {
          try {
            if (targetVolume === 0) {
              player.mute();
            } else {
              player.unMute();
              player.setVolume(targetVolume);
            }
          } catch (e) {
            console.log('Error setting final volume:', e);
          }
          fadeTimeoutRef.current = null;
          invokeWhenFinished();
        }
      };

      fadeStep();
    } catch (e) {
      console.log('Error in fade setup:', e);
      invokeWhenFinished();
    }

    return () => {
      if (fadeTimeoutRef.current) {
        clearTimeout(fadeTimeoutRef.current);
        fadeTimeoutRef.current = null;
      }
    };
  }, [player, isPlayerReady]);

  useEffect(() => {
    if (player && isPlayerReady) {
      if (isPlaying) {
        try {
          // Start fading out overlay immediately
          setShowOverlay(false);
          player.unMute();
          player.playVideo();
          // Start the fade in effect for volume
          fadeToVolume(100, fadeDurationInSeconds);
        } catch (e) {
          console.log('Error starting playback:', e);
        }
      } else {
        // Show overlay immediately when pausing
        setShowOverlay(true);
        fadeToVolume(0, fadeDurationInSeconds, () => {
          if (player && isPlayerReady) {
            try {
              player.pauseVideo();
            } catch (e) {
              console.log('Error pausing video:', e);
            }
          }
        });
      }
    }
    
    return () => {
      if (fadeTimeoutRef.current) {
        clearTimeout(fadeTimeoutRef.current);
        fadeTimeoutRef.current = null;
      }
    };
  }, [isPlaying, player, fadeDurationInSeconds, isPlayerReady, fadeToVolume]);

  const openFullscreen = useCallback(() => {
    const element = videoContainerRef.current as HTMLElement & {
      webkitRequestFullscreen?: () => Promise<void>;
      msRequestFullscreen?: () => Promise<void>;
    };

    if (element) {
      try {
        if (document.fullscreenElement) {
          document.exitFullscreen();
        } else {
          if (element.requestFullscreen) {
            element.requestFullscreen();
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
      if (isCurrentlyFullscreen !== fullscreen) {
        setFullscreen(isCurrentlyFullscreen);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [fullscreen]);

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
    opacity: isUnderlayMode ? 1 : 0,
    transition: 'opacity 2s ease-in-out',
    pointerEvents: isUnderlayMode ? 'auto' : 'none',
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
    zIndex: isUnderlayMode ? 2 : 'auto',
  };

  const youtubeContainerStyle: React.CSSProperties = {
    position: 'absolute',
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    transition: 'all 2s ease-in-out',
    transform: isUnderlayMode ? 'scale(0.2) translate(4%, 4%)' : 'none',
    transformOrigin: '0 0',
    backgroundColor: isUnderlayMode ? 'rgba(0, 0, 0, 0.8)' : 'transparent',
    borderRadius: isUnderlayMode ? '8px' : '0',
    boxShadow: isUnderlayMode ? '0 4px 8px rgba(0, 0, 0, 0.2)' : 'none',
  };

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
  }, [isUnderlayMode, player, isPlayerReady]);

  return (
    <div ref={videoContainerRef} onClick={handleClick} style={videoContainerStyle}>
      {isUnderlayMode && overlaySlide && (
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
      {useOverlay && !isUnderlayMode && (
        <Overlay 
          showOverlay={showOverlay} 
          slide={overlaySlide} 
          fadeDurationInSeconds={fadeDurationInSeconds}
          style={overlayStyle}
        />
      )}
    </div>
  );
}

export default VideoFadeFrame;
