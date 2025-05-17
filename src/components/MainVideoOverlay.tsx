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
    isPlaying?: boolean;
  };
  onVideoEnd?: () => void;
  isPipMode?: boolean;
}

const MainVideoOverlay: React.FC<MainVideoOverlayProps> = ({ 
  showOverlay, 
  slide, 
  fadeDurationInSeconds,
  style = {},
  overlayVideo,
  onVideoEnd,
  isPipMode
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

  const initializeVideoPlayback = useCallback(() => {
    if (!overlayPlayer || !videoId) {
      console.log('[MainVideoOverlay] initializeVideoPlayback: Preconditions not met.', { hasPlayer: !!overlayPlayer, videoId });
      return;
    }
    try {
      console.log('[MainVideoOverlay] Commanding PLAY on overlayPlayer');
      overlayPlayer.seekTo(0);
      
      // Make sure the player is unmuted and has proper volume
      if (overlayPlayer.isMuted && overlayPlayer.isMuted()) {
        console.log('[MainVideoOverlay] Unmuting player');
        overlayPlayer.unMute();
      }
      
      // Set initial volume before fading
      overlayPlayer.setVolume(30);
      
      // Call playVideo first, then start the fade
      overlayPlayer.playVideo();
      
      // Fade to full volume over the specified duration
      fadeToVolume(overlayPlayer, 100, fadeDurationInSeconds);
      
      setIsVideoPlaying(true);
    } catch (error) {
      console.error('Error in initializeVideoPlayback:', error);
      setIsVideoPlaying(false);
    }
  }, [overlayPlayer, videoId, fadeDurationInSeconds]);

  const stopVideoPlayback = useCallback(() => {
    if (!overlayPlayer) {
      console.log('[MainVideoOverlay] stopVideoPlayback: Player not available.');
      return;
    }
    try {
      console.log('[MainVideoOverlay] Commanding PAUSE on overlayPlayer');
      fadeToVolume(overlayPlayer, 0, fadeDurationInSeconds / 2, () => {
        if (overlayPlayer) {
          try {
            overlayPlayer.pauseVideo();
            setIsVideoPlaying(false);
          } catch (e) {
             console.error('[MainVideoOverlay] Error pausing video in fade callback:', e);
          }
        }
      });
    } catch (error) {
      console.error('Error in stopVideoPlayback:', error);
    }
  }, [overlayPlayer, fadeDurationInSeconds]);

  // Effect to handle manual play/pause commands from OverlayVideo component via props
  useEffect(() => {
    // Clear any stale playback timeouts from player ready events
    if (videoFadeTimeoutRef.current) {
      clearTimeout(videoFadeTimeoutRef.current);
      videoFadeTimeoutRef.current = null;
      console.log('[MainVideoOverlay] Cleared pending videoFadeTimeoutRef due to new isPlaying command.');
    }

    if (!overlayPlayer || !playerLoaded || !videoId) {
      // Player not ready or no video, do nothing regarding play/pause commands.
      return;
    }

    // Log the current state for debugging
    console.log(`[MainVideoOverlay] Video control - isPipMode: ${isPipMode}, isPlaying: ${isVideoPlaying}, overlay isPlaying: ${overlayVideo?.isPlaying}`);

    // Process play/pause commands regardless of overlay visibility
    if (overlayVideo?.isPlaying) {
      const currentPlayerState = overlayPlayer.getPlayerState();
      if (currentPlayerState !== 1 /* PLAYING */ && currentPlayerState !== 3 /* BUFFERING */) {
        console.log(`[MainVideoOverlay] Effect: Desired state PLAY. Player state: ${currentPlayerState}. Initializing playback.`);
        initializeVideoPlayback();
      }
    } else {
      // Parent wants video to stop/pause
      const currentPlayerState = overlayPlayer.getPlayerState();
      if (currentPlayerState === 1 /* PLAYING */ || currentPlayerState === 3 /* BUFFERING */) {
        console.log(`[MainVideoOverlay] Effect: Desired state PAUSE. Player state: ${currentPlayerState}. Stopping playback.`);
        stopVideoPlayback();
      } else {
        // Player already not playing, ensure local state is also false
        if (isVideoPlaying) {
          setIsVideoPlaying(false);
        }
      }
    }
  }, [
    overlayVideo?.isPlaying, 
    videoId, 
    playerLoaded, 
    overlayPlayer, 
    initializeVideoPlayback, 
    stopVideoPlayback,
    isVideoPlaying,
    isPipMode
  ]);

  // Effect for autoStartVideo (original logic, separate from manual play/pause)
   useEffect(() => {
    if (videoFadeTimeoutRef.current) {
      clearTimeout(videoFadeTimeoutRef.current);
      videoFadeTimeoutRef.current = null;
    }

    // Allow autoStartVideo to work in both regular overlay mode and PiP mode
    if (showOverlay || isPipMode) {
      if (overlayVideo?.autoStartVideo) {
        shouldPlayWhenReadyRef.current = true;
        if (overlayPlayer && videoId && playerLoaded) {
          console.log('[MainVideoOverlay] Autostart: Player ready, starting video with delay.');
          videoFadeTimeoutRef.current = setTimeout(() => {
            initializeVideoPlayback();
          }, fadeDurationInSeconds * 500);
        }
      }
    } else {
      shouldPlayWhenReadyRef.current = false;
      // This part is now handled by the main useEffect for isPlaying and showOverlay changes.
      // if (overlayPlayer && isVideoPlaying) {
      //   stopVideoPlayback();
      // }
    }
    // Cleanup function for this specific effect
    return () => {
      if (videoFadeTimeoutRef.current) {
        clearTimeout(videoFadeTimeoutRef.current);
        videoFadeTimeoutRef.current = null;
      }
    };
  // Dependencies: ensure this effect reruns if these change, affecting autostart logic
  }, [showOverlay, isPipMode, overlayVideo?.autoStartVideo, overlayPlayer, videoId, playerLoaded, initializeVideoPlayback, fadeDurationInSeconds]);

  const handlePlayerReady = useCallback((event: YouTubeEvent) => {
    console.log('Overlay video player ready');
    const playerInstance = event.target;

    // Always set/update player instance and loaded status
    setOverlayPlayer(playerInstance);
    setPlayerLoaded(true);

    if (!isInitializedRef.current) {
      isInitializedRef.current = true;
      try {
        playerInstance.setPlaybackQuality('hd720');
        // Don't mute by default - this was causing the underlay to be silent
        // playerInstance.mute();
        playerInstance.setVolume(100); // Set to full volume instead
        playerInstance.pauseVideo();
        playerInstance.seekTo(0);
        
        // Logic for when player becomes ready *after* a play command might have been issued
        // or if autostart is true.
        if ((showOverlay || isPipMode) && videoId) {
          if (overlayVideo?.isPlaying) { // Manual play was already requested
            console.log('[MainVideoOverlay] handlePlayerReady: Manual play already requested. Starting video now (with delay).');
            if (videoFadeTimeoutRef.current) clearTimeout(videoFadeTimeoutRef.current); // Clear previous timeout if any
            videoFadeTimeoutRef.current = setTimeout(() => {
              initializeVideoPlayback();
            }, fadeDurationInSeconds * 100); // Shorter delay for responsiveness
          } else if (overlayVideo?.autoStartVideo) { // Autostart video
            console.log('[MainVideoOverlay] handlePlayerReady: Autostart is true. Starting video with delay.');
            if (videoFadeTimeoutRef.current) clearTimeout(videoFadeTimeoutRef.current); // Clear previous timeout if any
            videoFadeTimeoutRef.current = setTimeout(() => {
              initializeVideoPlayback();
            }, fadeDurationInSeconds * 500);
          }
        }
      } catch (error) {
        console.error('Error initializing overlay player:', error);
      }
    } else {
      // Player re-readied, e.g. after video ID change and YouTube component re-mount
      // Ensure it's configured correctly if it's a new instance for a new videoId.
      // The key={videoId} on <YouTube> should handle giving a fresh player, but to be safe:
      try {
        playerInstance.setPlaybackQuality('hd720');
        // Don't mute by default - this was causing the underlay to be silent
        // playerInstance.mute();
        playerInstance.setVolume(100); // Set to full volume instead
        playerInstance.pauseVideo();
        playerInstance.seekTo(0);
        console.log('[MainVideoOverlay] handlePlayerReady: Player re-initialized.');
      } catch (e) {
        console.error('[MainVideoOverlay] Error re-initializing player on subsequent ready event:', e);
      }
    }
  }, [showOverlay, videoId, fadeDurationInSeconds, overlayVideo?.isPlaying, overlayVideo?.autoStartVideo, initializeVideoPlayback]);

  // Handle player state changes with robust state management
  const handlePlayerStateChange = useCallback((event: YouTubeEvent) => {
    // YouTube Player States: -1 (unstarted), 0 (ended), 1 (playing), 2 (paused), 3 (buffering), 5 (video cued)
    console.log('Overlay video player state changed:', event.data);
    
    switch (event.data) {
      case 0: // Video ended
        console.log('Overlay video ended');
        setIsVideoPlaying(false);
        
        // Notify the parent that the video has stopped playing
        if (overlayVideo && 'isPlaying' in overlayVideo) {
          // Dispatch a custom event that OverlayVideo component can listen for
          const customEvent = new CustomEvent('overlayVideoStateChange', { 
            detail: { isPlaying: false }
          });
          window.dispatchEvent(customEvent);
        }
        
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
          
          // Notify the parent that the video is playing
          if (overlayVideo && 'isPlaying' in overlayVideo) {
            // Dispatch a custom event that OverlayVideo component can listen for
            const customEvent = new CustomEvent('overlayVideoStateChange', { 
              detail: { isPlaying: true }
            });
            window.dispatchEvent(customEvent);
          }
          
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
          
          // Notify the parent that the video has been paused
          if (overlayVideo && 'isPlaying' in overlayVideo) {
            // Dispatch a custom event that OverlayVideo component can listen for
            const customEvent = new CustomEvent('overlayVideoStateChange', { 
              detail: { isPlaying: false }
            });
            window.dispatchEvent(customEvent);
          }
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
  }, [isVideoPlaying, fadeDurationInSeconds, onVideoEnd, overlayVideo]);

  const handlePlayerError = useCallback((event: YouTubeEvent) => {
    console.error('Overlay video player error:', event.data);
    
    // If the video fails to play, show the image overlay instead
    setVideoId(null);
    setIsVideoPlaying(false);
    isInitializedRef.current = false;
  }, []);

  const overlayStyle: CSSProperties = {
    ...style,
    // When in PiP mode, always make overlay visible
    opacity: isPipMode || showOverlay ? 1 : 0,
    pointerEvents: isPipMode || showOverlay ? 'auto' : 'none',
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
      origin: window.location.origin,
      mute: 0 // Ensure not muted by default
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

  // Determine which content to display in the overlay
  const showingVideo = videoId && (isVideoPlaying || overlayVideo?.isPlaying);

  return (
    <div className="overlay" style={{...overlayStyle, padding: 0}} ref={containerRef}>
      {/* Always render both containers but control visibility with CSS */}
      <div 
        className="overlay-video-container" 
        style={{
          ...containerStyle,
          opacity: showingVideo ? 1 : 0,
          visibility: showingVideo ? 'visible' : 'hidden',
          transition: `opacity ${fadeDurationInSeconds}s ease-in-out, visibility ${fadeDurationInSeconds}s ease-in-out`,
          position: 'absolute',
          top: 0,
          left: 0,
          zIndex: showingVideo ? 10 : 1
        }}
      >
        {videoId && (
          <>
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
                pointerEvents: 'none' // Allow interaction with video
              }} 
            />
          </>
        )}
      </div>
      
      <div 
        className="overlay-image-container" 
        style={{
          ...containerStyle,
          opacity: showingVideo ? 0 : 1,
          visibility: showingVideo ? 'hidden' : 'visible',
          transition: `opacity ${fadeDurationInSeconds}s ease-in-out, visibility ${fadeDurationInSeconds}s ease-in-out`,
          position: 'absolute',
          top: 0,
          left: 0,
          zIndex: showingVideo ? 1 : 10
        }}
      >
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
    </div>
  );
};

export default MainVideoOverlay;
