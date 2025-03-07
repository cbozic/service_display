import React, { useEffect, useState, useRef } from 'react';
import YouTube, { YouTubeProps } from 'react-youtube';

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

const loadYouTubeAPI = (): Promise<void> => {
  return new Promise((resolve) => {
    if ((window as any).YT && (window as any).YT.Player) {
      resolve();
      return;
    }

    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';

    window.onYouTubeIframeAPIReady = () => {
      resolve();
    };

    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
  });
};

const HiddenVideoPlayer: React.FC<HiddenVideoPlayerProps> = ({
  videoId,
  isPlaying,
  onVideoEnd,
  volume = 25,
}) => {
  const [player, setPlayer] = useState<any>(null);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [isApiReady, setIsApiReady] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [currentVolume, setCurrentVolume] = useState(volume);
  const fadeIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    loadYouTubeAPI().then(() => {
      setIsApiReady(true);
    });
  }, []);

  // Clean up fade interval on unmount
  useEffect(() => {
    return () => {
      if (fadeIntervalRef.current) {
        clearInterval(fadeIntervalRef.current);
      }
    };
  }, []);

  const fadeOut = () => {
    if (fadeIntervalRef.current) {
      clearInterval(fadeIntervalRef.current);
    }

    let startVolume = currentVolume;
    const steps = 20; // Number of steps in the fade
    const interval = 2000 / steps; // Total time = 2000ms
    const volumeStep = startVolume / steps;
    let currentStep = 0;

    fadeIntervalRef.current = window.setInterval(() => {
      currentStep++;
      const newVolume = Math.max(0, startVolume - (volumeStep * currentStep));
      
      if (player && newVolume > 0) {
        player.setVolume(newVolume);
        setCurrentVolume(newVolume);
      } else {
        if (fadeIntervalRef.current) {
          clearInterval(fadeIntervalRef.current);
          fadeIntervalRef.current = null;
        }
        if (player) {
          player.pauseVideo();
          player.seekTo(0);
          player.mute();
        }
        setHasStarted(false);
      }
    }, interval);
  };

  const onPlayerReady: YouTubeProps['onReady'] = (event) => {
    const player = event.target;
    player.mute();
    player.pauseVideo();
    player.setVolume(volume);
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

  useEffect(() => {
    if (isPlayerReady && player) {
      try {
        if (isPlaying && !hasStarted) {
          // Clear any existing fade out
          if (fadeIntervalRef.current) {
            clearInterval(fadeIntervalRef.current);
            fadeIntervalRef.current = null;
          }
          player.seekTo(0);
          player.unMute();
          player.setVolume(volume);
          setCurrentVolume(volume);
          player.playVideo();
          setHasStarted(true);
        } else if (!isPlaying && hasStarted) {
          // Start fade out
          fadeOut();
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