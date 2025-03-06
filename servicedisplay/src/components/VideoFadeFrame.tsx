import React, { useState, useEffect, useCallback } from 'react';
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
}

const VideoFadeFrame: React.FC<VideoFadeFrameProps> = ({
  video,
  startSeconds,
  useOverlay = true,
  overlaySlide,
  fadeDurationInSeconds = 2,
  minHeight = '100%',
  minWidth = '100%',
}) => {
  const [player, setPlayer] = useState<any>(null);
  const [startPlaying, setStartPlaying] = useState<boolean>(false);
  const [fullscreen, setFullscreen] = useState<boolean>(false);
  const [showOverlay, setShowOverlay] = useState<boolean>(true);
  const docElement = document.documentElement;

  const handleClick = () => {
    //do something here if you want
  };

  const hideOverlayAndStartPlaying = useCallback(() => {
    setShowOverlay(false);
    setStartPlaying(true);
  }, []);

  const showOverlayAndPausePlaying = useCallback(() => {
    setShowOverlay(true);
    setStartPlaying(false);
  }, []);

  const rewindSeconds = useCallback((seconds: number) => {
    player.seekTo(player.getCurrentTime() - seconds);
  }, [player]);

  const fastForwardSeconds = useCallback((seconds: number) => {
    player.seekTo(player.getCurrentTime() + seconds);
  }, [player]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      console.log(event.code);
      if (event.code === 'Space') {
        if (showOverlay) {
          hideOverlayAndStartPlaying();
        } else {
          showOverlayAndPausePlaying();
        }
      } else if (event.code === 'ArrowLeft') {
        rewindSeconds(5);
      } else if (event.code === 'ArrowRight') {
        fastForwardSeconds(15);
      } else if (event.code === 'KeyF') {
        setFullscreen(!fullscreen);
      } else {
        console.log('Unhandled key: ' + event.code);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showOverlay, fullscreen, fastForwardSeconds, rewindSeconds, hideOverlayAndStartPlaying, showOverlayAndPausePlaying]);

  const onPlayerReady: YouTubeProps['onReady'] = useCallback((event) => {
    event.target.seekTo(startSeconds);
    if (showOverlay) {
      event.target.setVolume(0);
      event.target.pauseVideo();
    } else {
      event.target.setVolume(100);
      event.target.playVideo();
    }
    setPlayer(event.target);
  }, [startSeconds, showOverlay]);

  const onStateChange: YouTubeProps['onStateChange'] = useCallback((event) => {
    console.log('Player State Changed: ' + event.data);
    if (event.data === 0) {
      // Video has reached the end so reset the player
      setShowOverlay(true);
      setStartPlaying(false);
      player.seekTo(startSeconds);
    }
  }, [player, startSeconds]);

  const fadeToVolume = useCallback((targetVolume: number, fadeDurationInSeconds = 0, invokeWhenFinished = () => { }) => {
    const currentVolume = player.getVolume();
    const volumeDifference = targetVolume - currentVolume;
    const steps = 25; // Number of steps for the fade effect
    const stepDuration = (fadeDurationInSeconds * 1000) / steps;
    let currentStep = 0;

    const fadeStep = () => {
      if (currentStep < steps) {
        const newVolume = currentVolume + (volumeDifference * (currentStep / steps));
        player.setVolume(newVolume);
        currentStep++;
        setTimeout(fadeStep, stepDuration);
      } else {
        player.setVolume(targetVolume);
        invokeWhenFinished();
      }
    };

    fadeStep();
  }, [player]);

  const isPlayerStopped = useCallback(() => {
    return player.getPlayerState() === 2 || player.getPlayerState() === 5 || player.getPlayerState() === 0 || player.getPlayerState() === -1;
  }, [player]);

  useEffect(() => {
    if (player) {
      console.log("playing: '" + startPlaying + "' and the player state is: '" + player.getPlayerState() + "'");
      if (startPlaying && isPlayerStopped()) {
        player.unMute();
        player.playVideo();
        fadeToVolume(100, fadeDurationInSeconds);
      } else {
        if (!isPlayerStopped()) {
          fadeToVolume(0, fadeDurationInSeconds, () => { player.pauseVideo(); });
        }
      }
    }
  }, [startPlaying, player, fadeToVolume, isPlayerStopped, fadeDurationInSeconds]);

  const openFullscreen = useCallback(() => {
    if (docElement) {
      if (docElement.requestFullscreen) {
        docElement.requestFullscreen();
      }
    }
  }, [docElement]);

  useEffect(() => {
    if (docElement) {
      if (fullscreen) {
        openFullscreen();
      }
    }
  }, [fullscreen, docElement, openFullscreen]);

  const opts: YouTubeProps['opts'] = {
    minHeight: minHeight,
    minWidth: minWidth,
    playerVars: {
      // https://developers.google.com/youtube/player_parameters
      playsinline: 0,
      controls: 0,
      disablekb: 1,
      iv_load_policy: 3,
      fs: 0,
    },
  };

  return (
    <div onClick={handleClick}>
      <YouTube className="VideoFadeFrame" iframeClassName="VideoFadeFrame" opts={opts} videoId={video} onReady={onPlayerReady} onStateChange={onStateChange} />
      {useOverlay && (
        <Overlay showOverlay={showOverlay} slide={overlaySlide} fadeDurationInSeconds={fadeDurationInSeconds} />
      )}
    </div>
  );
}

export default VideoFadeFrame;
