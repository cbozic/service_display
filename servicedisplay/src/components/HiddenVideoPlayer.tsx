import React, { useEffect, useState } from 'react';
import YouTube, { YouTubeProps } from 'react-youtube';

declare global {
  interface Window {
    onYouTubeIframeAPIReady: () => void;
  }
}

interface HiddenVideoPlayerProps {
  videoId: string;
  isPlaying: boolean;
  onVideoEnd: () => void;
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
}) => {
  const [player, setPlayer] = useState<any>(null);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [isApiReady, setIsApiReady] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    loadYouTubeAPI().then(() => {
      setIsApiReady(true);
    });
  }, []);

  const onPlayerReady: YouTubeProps['onReady'] = (event) => {
    const player = event.target;
    player.mute(); // Mute initially to prevent any sound
    player.pauseVideo(); // Ensure video is paused on load
    setPlayer(player);
    setIsPlayerReady(true);
  };

  const onStateChange: YouTubeProps['onStateChange'] = (event) => {
    if (event.data === 0) { // Video ended
      onVideoEnd();
      setHasStarted(false);
    }
  };

  useEffect(() => {
    if (isPlayerReady && player) {
      try {
        if (isPlaying && !hasStarted) {
          player.seekTo(0);
          player.unMute();
          player.playVideo();
          setHasStarted(true);
        } else if (!isPlaying && hasStarted) {
          player.pauseVideo();
          player.seekTo(0);
          player.mute();
          setHasStarted(false);
        }
      } catch (error) {
        console.error('Error controlling video:', error);
      }
    }
  }, [isPlaying, isPlayerReady, player, hasStarted]);

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