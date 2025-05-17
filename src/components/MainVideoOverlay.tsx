import React, { CSSProperties, useRef, useEffect, useState } from 'react';
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

  // Extract YouTube video ID from URL
  useEffect(() => {
    if (overlayVideo?.videoUrl) {
      const extractVideoId = (url: string): string | null => {
        if (!url) return null;
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
      };
      
      const newVideoId = extractVideoId(overlayVideo.videoUrl);
      console.log('Extracted video ID:', newVideoId);
      setVideoId(newVideoId);
    } else {
      setVideoId(null);
      setIsVideoPlaying(false);
    }
  }, [overlayVideo]);

  useEffect(() => {
    const updateImageSize = () => {
      if (!containerRef.current || !imageRef.current) return;

      const container = containerRef.current;
      const image = imageRef.current;

      // Get container dimensions (accounting for padding)
      const containerWidth = container.clientWidth - 32; // 16px padding on each side
      const containerHeight = container.clientHeight - 32;

      // Get natural image dimensions
      const naturalWidth = image.naturalWidth;
      const naturalHeight = image.naturalHeight;

      if (naturalWidth === 0 || naturalHeight === 0) return;

      // Calculate aspect ratios
      const containerRatio = containerWidth / containerHeight;
      const imageRatio = naturalWidth / naturalHeight;

      let newStyle: CSSProperties = {};

      if (imageRatio > containerRatio) {
        // Image is wider relative to container - fit to width
        newStyle = {
          width: '100%',
          height: 'auto',
        };
      } else {
        // Image is taller relative to container - fit to height
        newStyle = {
          width: 'auto',
          height: '100%',
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
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [slide]); // Re-run when slide changes

  // Handle overlay visibility changes
  useEffect(() => {
    // Clean up any existing timeout
    if (videoFadeTimeoutRef.current) {
      clearTimeout(videoFadeTimeoutRef.current);
      videoFadeTimeoutRef.current = null;
    }

    if (showOverlay) {
      console.log('Overlay becoming visible. Video ID:', videoId, 'Auto-start:', overlayVideo?.autoStartVideo, 'Player loaded:', playerLoaded);
      
      // Overlay becoming visible
      if (videoId && overlayVideo?.autoStartVideo && overlayPlayer) {
        // Start video with a short delay to allow overlay fade-in
        videoFadeTimeoutRef.current = setTimeout(() => {
          try {
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
        }, fadeDurationInSeconds * 500); // Half of fade duration in ms
      }
    } else {
      // Overlay becoming hidden - stop video immediately
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
      }
    };
  }, [showOverlay, videoId, overlayVideo, overlayPlayer, fadeDurationInSeconds, isVideoPlaying, playerLoaded]);

  // Handle player ready
  const handlePlayerReady = (event: YouTubeEvent) => {
    console.log('Overlay video player ready');
    setPlayerLoaded(true);
    setOverlayPlayer(event.target);
    
    // Ensure video is muted initially
    event.target.mute();
    event.target.pauseVideo();
    
    // If overlay is already visible and autostart is enabled, start the video
    if (showOverlay && overlayVideo?.autoStartVideo) {
      videoFadeTimeoutRef.current = setTimeout(() => {
        try {
          console.log('Auto-starting overlay video after ready');
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
  };

  // Handle player state changes
  const handlePlayerStateChange = (event: YouTubeEvent) => {
    // YouTube Player States: -1 (unstarted), 0 (ended), 1 (playing), 2 (paused), 3 (buffering), 5 (video cued)
    console.log('Overlay video player state changed:', event.data);
    
    if (event.data === 0) { // Video ended
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
    } else if (event.data === 1) { // Video playing
      setIsVideoPlaying(true);
      
      // Ensure video player is visible
      const videoElement = event.target.getIframe();
      if (videoElement) {
        videoElement.style.transition = `opacity ${fadeDurationInSeconds}s ease-in`;
        videoElement.style.opacity = '1';
      }
    }
  };

  const handlePlayerError = (event: YouTubeEvent) => {
    console.error('Overlay video player error:', event.data);
    
    // If the video fails to play, show the image overlay instead
    setVideoId(null);
  };

  const overlayStyle: CSSProperties = {
    ...style,
    opacity: showOverlay ? 1 : 0,
    pointerEvents: showOverlay ? 'auto' : 'none',
  };

  // YouTube player options
  const opts: YouTubeProps['opts'] = {
    width: '100%',
    height: '100%',
    playerVars: {
      // https://developers.google.com/youtube/player_parameters
      autoplay: 0,
      controls: 0,
      disablekb: 1,
      enablejsapi: 1,
      iv_load_policy: 3,
      modestbranding: 1,
      rel: 0,
      showinfo: 0,
      fs: 0,
      origin: window.location.origin
    },
  };

  return (
    <div className="overlay" style={overlayStyle} ref={containerRef}>
      {videoId ? (
        <div className="overlay-video-container" style={{ width: '100%', height: '100%' }}>
          <YouTube
            videoId={videoId}
            opts={opts}
            onReady={handlePlayerReady}
            onStateChange={handlePlayerStateChange}
            onError={handlePlayerError}
            className="overlay-video-player"
            style={{ opacity: 1, transition: `opacity ${fadeDurationInSeconds}s ease-in-out` }}
          />
        </div>
      ) : (
        <div className="overlay-image-container">
          {slide && (
            <img 
              ref={imageRef}
              src={slide} 
              alt="Overlay"
              style={imageStyle}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default MainVideoOverlay;
