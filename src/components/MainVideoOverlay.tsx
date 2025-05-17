import React, { CSSProperties, useRef, useEffect, useState, useCallback } from 'react';
import './MainVideoOverlay.css';
import YouTube, { YouTubeProps, YouTubeEvent } from 'react-youtube';
import { fadeToVolume } from '../utils/audioUtils';

interface MainVideoOverlayProps {
  showOverlay: boolean;
  slide?: string;
  fadeDurationInSeconds: number;
  style?: CSSProperties;
  overlayVideo?: {
    videoUrl: string;
    autoStartVideo: boolean;
    videoPlayer: any | null;
  };
  onVideoEnd?: () => void;
}

const MainVideoOverlay: React.FC<MainVideoOverlayProps> = ({ 
  showOverlay, 
  slide, 
  fadeDurationInSeconds,
  style = {},
  overlayVideo,
  onVideoEnd
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [imageStyle, setImageStyle] = useState<CSSProperties>({});
  const [overlayPlayer, setOverlayPlayer] = useState<YouTubeEvent['target'] | null>(null);
  const [isVideoPlaying, setIsVideoPlaying] = useState<boolean>(false);
  const [videoId, setVideoId] = useState<string | null>(null);
  const videoFadeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [playerLoaded, setPlayerLoaded] = useState<boolean>(false);
  const previousVideoIdRef = useRef<string | null>(null);
  const isInitializedRef = useRef<boolean>(false);
  const shouldPlayWhenReadyRef = useRef<boolean>(false);

  // Extract YouTube video ID from URL only when it changes
  useEffect(() => {
    if (overlayVideo?.videoUrl) {
      const extractVideoId = (url: string): string | null => {
        if (!url) return null;
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
      };
      
      const newVideoId = extractVideoId(overlayVideo.videoUrl);
      
      // Only update state if video ID actually changed
      if (newVideoId !== previousVideoIdRef.current) {
        console.log(`Extracted video ID changed from ${previousVideoIdRef.current} to ${newVideoId}`);
        previousVideoIdRef.current = newVideoId;
        setVideoId(newVideoId);
        isInitializedRef.current = false;
      }
    } else if (previousVideoIdRef.current !== null) {
      previousVideoIdRef.current = null;
      setVideoId(null);
      setIsVideoPlaying(false);
      isInitializedRef.current = false;
    }
  }, [overlayVideo]);

  // Update image dimensions when container or slide changes
  useEffect(() => {
    const updateImageSize = () => {
      if (!containerRef.current || !imageRef.current) return;

      const container = containerRef.current;
      const image = imageRef.current;

      // Get natural image dimensions
      const naturalWidth = image.naturalWidth;
      const naturalHeight = image.naturalHeight;

      if (naturalWidth === 0 || naturalHeight === 0) return;

      // Get container dimensions
      const containerRect = container.getBoundingClientRect();
      const containerWidth = containerRect.width;
      const containerHeight = containerRect.height;

      // Calculate aspect ratios
      const containerRatio = containerWidth / containerHeight;
      const imageRatio = naturalWidth / naturalHeight;

      let newStyle: CSSProperties = {};

      if (imageRatio > containerRatio) {
        // Image is wider relative to container - fit to width
        newStyle = {
          width: '100%',
          height: 'auto',
          maxHeight: '100%',
          objectFit: 'contain',
          display: 'block'
        };
      } else {
        // Image is taller relative to container - fit to height
        newStyle = {
          width: 'auto',
          height: '100%',
          maxWidth: '100%',
          objectFit: 'contain',
          display: 'block'
        };
      }

      setImageStyle(newStyle);
    };

    // Set up resize observer
    const resizeObserver = new ResizeObserver(() => {
      window.requestAnimationFrame(updateImageSize);
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    // Update size when image loads
    if (imageRef.current) {
      imageRef.current.onload = updateImageSize;
      
      // Force an update when slide changes
      updateImageSize();
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [slide]); // Re-run when slide changes

  // Handle player state and overlay visibility changes separately to avoid race conditions
  const initializeVideoPlayback = useCallback(() => {
    if (!overlayPlayer || !videoId || !showOverlay) return;
    
    try {
      if (isVideoPlaying) {
        // Already playing, nothing to do
        return;
      }
        
      console.log('Starting overlay video...');
      overlayPlayer.seekTo(0);
      overlayPlayer.unMute();
      // Fade in volume
      fadeToVolume(overlayPlayer, 100, fadeDurationInSeconds);
      overlayPlayer.playVideo();
      setIsVideoPlaying(true);
    } catch (error) {
      console.error('Error starting overlay video:', error);
    }
  }, [overlayPlayer, videoId, showOverlay, isVideoPlaying, fadeDurationInSeconds]);

  // Handle overlay visibility changes separately
  useEffect(() => {
    // Clean up any existing timeout
    if (videoFadeTimeoutRef.current) {
      clearTimeout(videoFadeTimeoutRef.current);
      videoFadeTimeoutRef.current = null;
    }

    if (showOverlay) {
      console.log(`Overlay becoming visible. Auto-start: ${overlayVideo?.autoStartVideo}, Player loaded: ${playerLoaded}`);
      
      // Mark that we should play when ready if autostart is enabled
      if (overlayVideo?.autoStartVideo) {
        shouldPlayWhenReadyRef.current = true;
        
        // If player is already loaded, start playback after a short delay
        if (overlayPlayer && videoId && playerLoaded) {
          videoFadeTimeoutRef.current = setTimeout(() => {
            initializeVideoPlayback();
          }, fadeDurationInSeconds * 500); // Half of fade duration in ms
        }
      }
    } else {
      // Overlay becoming hidden - stop video immediately
      shouldPlayWhenReadyRef.current = false;
      
      if (overlayPlayer && isVideoPlaying) {
        try {
          console.log('Stopping overlay video due to overlay hidden');
          // Fade out volume
          fadeToVolume(overlayPlayer, 0, fadeDurationInSeconds / 2, () => {
            if (overlayPlayer) {
              overlayPlayer.pauseVideo();
              setIsVideoPlaying(false);
            }
          });
        } catch (error) {
          console.error('Error stopping overlay video:', error);
        }
      }
    }

    return () => {
      if (videoFadeTimeoutRef.current) {
        clearTimeout(videoFadeTimeoutRef.current);
        videoFadeTimeoutRef.current = null;
      }
    };
  }, [showOverlay, overlayVideo, overlayPlayer, videoId, playerLoaded, isVideoPlaying, fadeDurationInSeconds, initializeVideoPlayback]);

  // Handle player ready with stable initialization
  const handlePlayerReady = useCallback((event: YouTubeEvent) => {
    console.log('Overlay video player ready');
    
    if (!isInitializedRef.current) {
      isInitializedRef.current = true;
      
      try {
        // Configure player initially
        event.target.setPlaybackQuality('hd720');
        event.target.mute();
        event.target.pauseVideo();
        event.target.seekTo(0);
        
        // Set player state after initialization
        setOverlayPlayer(event.target);
        setPlayerLoaded(true);
        
        // Start playback if overlay is visible and autostart is enabled
        if (showOverlay && shouldPlayWhenReadyRef.current && videoId) {
          console.log('Auto-starting overlay video after ready');
          // Use a timeout to ensure the player is fully initialized
          videoFadeTimeoutRef.current = setTimeout(() => {
            try {
              event.target.seekTo(0);
              event.target.unMute();
              // Fade in volume
              fadeToVolume(event.target, 100, fadeDurationInSeconds);
              event.target.playVideo();
              setIsVideoPlaying(true);
            } catch (error) {
              console.error('Error auto-starting overlay video:', error);
            }
          }, fadeDurationInSeconds * 500); // Half of fade duration in ms
        }
      } catch (error) {
        console.error('Error initializing overlay player:', error);
      }
    }
  }, [showOverlay, videoId, fadeDurationInSeconds]);

  // Handle player state changes with robust state management
  const handlePlayerStateChange = useCallback((event: YouTubeEvent) => {
    // YouTube Player States: -1 (unstarted), 0 (ended), 1 (playing), 2 (paused), 3 (buffering), 5 (video cued)
    console.log('Overlay video player state changed:', event.data);
    
    switch (event.data) {
      case 0: // Video ended
        console.log('Overlay video ended');
        setIsVideoPlaying(false);
        
        // Fade out the video player
        const videoElement = event.target.getIframe();
        if (videoElement) {
          videoElement.style.transition = `opacity ${fadeDurationInSeconds}s ease-out`;
          videoElement.style.opacity = '0';
        }
        
        // Call the onVideoEnd callback
        if (onVideoEnd) {
          // Add a slight delay to allow for the visual fade out
          setTimeout(() => {
            onVideoEnd();
          }, fadeDurationInSeconds * 1000);
        }
        break;
        
      case 1: // Video playing
        // Only update state if not already set to playing
        if (!isVideoPlaying) {
          setIsVideoPlaying(true);
          
          // Ensure video player is visible
          const iframe = event.target.getIframe();
          if (iframe) {
            iframe.style.transition = `opacity ${fadeDurationInSeconds}s ease-in`;
            iframe.style.opacity = '1';
          }
        }
        break;
        
      case 2: // Video paused
        if (isVideoPlaying) {
          console.log('Overlay video paused');
          setIsVideoPlaying(false);
        }
        break;
      
      // Other states don't need to trigger state updates
      case 3: // Video buffering
        console.log('Overlay video buffering');
        break;
        
      case 5: // Video cued
        console.log('Overlay video cued and ready');
        break;
        
      case -1: // Unstarted
        console.log('Overlay video unstarted');
        break;
    }
  }, [isVideoPlaying, fadeDurationInSeconds, onVideoEnd]);

  const handlePlayerError = useCallback((event: YouTubeEvent) => {
    console.error('Overlay video player error:', event.data);
    
    // If the video fails to play, show the image overlay instead
    setVideoId(null);
    setIsVideoPlaying(false);
    isInitializedRef.current = false;
  }, []);

  const overlayStyle: CSSProperties = {
    ...style,
    opacity: showOverlay ? 1 : 0,
    pointerEvents: showOverlay ? 'auto' : 'none',
  };

  // Stable YouTube player options that won't change between renders
  const opts = useRef<YouTubeProps['opts']>({
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
      rel: 0,
      showinfo: 0,
      enablejsapi: 1,
      origin: window.location.origin
    },
  }).current;

  const containerStyle: CSSProperties = {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    padding: 0
  };

  return (
    <div className="overlay" style={{...overlayStyle, padding: 0}} ref={containerRef}>
      {videoId ? (
        <div className="overlay-video-container" style={containerStyle}>
          <YouTube
            key={videoId} // Use videoId as key to ensure proper reinitialization when ID changes
            videoId={videoId}
            opts={opts}
            onReady={handlePlayerReady}
            onStateChange={handlePlayerStateChange}
            onError={handlePlayerError}
            className="overlay-video-player"
            style={{ 
              opacity: 1, 
              transition: `opacity ${fadeDurationInSeconds}s ease-in-out`,
              position: 'relative',
              zIndex: 10,
              width: '100%',
              height: '100%'
            }}
          />
          {/* Transparent div to prevent direct clicking on the video */}
          <div 
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              zIndex: 5,
              cursor: 'default',
              backgroundColor: 'transparent',
              pointerEvents: 'none' // Changed from 'auto' to 'none' to allow interaction with video
            }} 
          />
        </div>
      ) : (
        <div className="overlay-image-container" style={containerStyle}>
          {slide && (
            <img 
              ref={imageRef}
              src={slide} 
              alt="Overlay"
              style={imageStyle}
              className="overlay-image"
            />
          )}
        </div>
      )}
    </div>
  );
};

export default MainVideoOverlay;
