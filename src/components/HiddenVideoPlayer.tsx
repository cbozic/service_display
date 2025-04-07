import React, { useState, useRef, useEffect } from 'react';
import YouTube, { YouTubeProps, YouTubeEvent } from 'react-youtube';
import { loadYouTubeAPI } from '../utils/youtubeAPI';
import { FADE_STEPS } from '../App';
import { fadeToVolume } from '../utils/audioUtils';

// Declare global for YouTube API
declare global {
  interface Window {
    onYouTubeIframeAPIReady: () => void;
  }
}

interface HiddenVideoPlayerProps {
  videoId: string;
  isPlaying: boolean;
  onVideoEnd?: () => void;
  volume?: number;
}

const HiddenVideoPlayer: React.FC<HiddenVideoPlayerProps> = ({
  videoId,
  isPlaying,
  onVideoEnd,
  volume = 15,
}) => {
  const [player, setPlayer] = useState<any>(null);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [isApiReady, setIsApiReady] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [currentVolume, setCurrentVolume] = useState(volume);
  const fadeCleanupRef = useRef<(() => void) | null>(null);

  // Add initialization delay
  useEffect(() => {
    // Delay the API initialization by 500ms (changed from 2000)
    const timer = setTimeout(() => {
      loadYouTubeAPI().then(() => {
        setIsApiReady(true);
      });
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  // Clean up fade on unmount
  useEffect(() => {
    return () => {
      if (fadeCleanupRef.current) {
        fadeCleanupRef.current();
        fadeCleanupRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (isPlayerReady && player) {
      try {
        if (isPlaying && !hasStarted) {
          // Clear any existing fade
          if (fadeCleanupRef.current) {
            fadeCleanupRef.current();
            fadeCleanupRef.current = null;
          }
          player.seekTo(0);
          player.unMute();
          player.setVolume(volume);
          setCurrentVolume(volume);
          player.playVideo();
          setHasStarted(true);
        } else if (!isPlaying && hasStarted) {
          // Start fade out using the consolidated function
          const cleanup = fadeToVolume(player, 0, 3, () => {
            if (player) {
              player.pauseVideo();
              player.seekTo(0);
              player.mute();
            }
            setHasStarted(false);
          });
          fadeCleanupRef.current = cleanup;
        } else if (hasStarted) {
          // Update volume while playing
          player.setVolume(volume);
          setCurrentVolume(volume);
        }
      } catch (error) {
        console.error('Error controlling video:', error);
      }
    }
  }, [isPlaying, isPlayerReady, player, hasStarted, volume]);

  const onPlayerReady: YouTubeProps['onReady'] = (event) => {
    const player = event.target;
    player.mute();
    player.pauseVideo();
    player.setVolume(volume);
    // Set lower quality for hidden player
    player.setPlaybackQuality('small');
    setCurrentVolume(volume);
    setPlayer(player);
    setIsPlayerReady(true);
  };

  const onStateChange: YouTubeProps['onStateChange'] = (event) => {
    if (event.data === 0) {
      onVideoEnd?.();
      setHasStarted(false);
    }
  };

  // Update current volume when volume prop changes
  useEffect(() => {
    setCurrentVolume(volume);
  }, [volume]);

  const opts: YouTubeProps['opts'] = {
    height: '1',
    width: '1',
    playerVars: {
      autoplay: 0,
      controls: 0,
      disablekb: 1,
      fs: 0,
      modestbranding: 1,
      playsinline: 1,
      origin: window.location.origin,
      enablejsapi: 1,
      mute: 1,
      vq: 'small'
    },
  };

  if (!isApiReady) {
    return null;
  }

  return (
    <div style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', zIndex: -1 }}>
      <YouTube
        videoId={videoId}
        opts={opts}
        onReady={onPlayerReady}
        onStateChange={onStateChange}
      />
    </div>
  );
};

export default HiddenVideoPlayer; 