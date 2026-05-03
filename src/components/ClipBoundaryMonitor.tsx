import { useEffect, useRef } from 'react';
import { useClipPlaylist } from '../contexts/ClipPlaylistContext';

interface ClipBoundaryMonitorProps {
  player: any;
  isPlaying: boolean;
  onPause: () => void;
  pendingSeekOnUnpauseRef: React.MutableRefObject<number | null>;
  currentVideoId: string;
  onLoadVideo: (videoId: string) => void;
  onCrossVideoSeek: (videoId: string, startTime: number, autoResume: boolean) => void;
  onAutoResume: (seekTime: number) => void;
  fadeDurationInSeconds?: number;
}

const ClipBoundaryMonitor: React.FC<ClipBoundaryMonitorProps> = ({
  player,
  isPlaying,
  onPause,
  pendingSeekOnUnpauseRef,
  currentVideoId,
  onLoadVideo,
  onCrossVideoSeek,
  onAutoResume,
  fadeDurationInSeconds = 2,
}) => {
  const {
    clips,
    currentClipIndex,
    isPlaybackMode,
    isTransitioningBetweenClips,
    setCurrentClipIndex,
    setIsTransitioningBetweenClips,
  } = useClipPlaylist();

  const intervalRef = useRef<number | null>(null);
  const lastCheckTimeRef = useRef<number>(0);
  const fadeStartedRef = useRef<boolean>(false);
  const fadeAdvanceTimerRef = useRef<number | null>(null);

  // Clean up the delayed advance timer on unmount or clip changes
  useEffect(() => {
    return () => {
      if (fadeAdvanceTimerRef.current) {
        window.clearTimeout(fadeAdvanceTimerRef.current);
        fadeAdvanceTimerRef.current = null;
      }
    };
  }, [currentClipIndex, clips]);

  // Reset fade flag when clip index changes
  useEffect(() => {
    fadeStartedRef.current = false;
  }, [currentClipIndex]);

  useEffect(() => {
    if (!isPlaying || !isPlaybackMode || !player) {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const checkBoundary = () => {
      if (isTransitioningBetweenClips) return;
      if (currentClipIndex < 0 || currentClipIndex >= clips.length) return;

      try {
        const currentTime = player.getCurrentTime();
        const currentClip = clips[currentClipIndex];

        // Skip boundary checks if the current clip is from a different video than what's loaded
        if (currentClip.videoId !== currentVideoId) return;

        // Detect backward seek: re-evaluate which clip we're in
        if (currentTime < lastCheckTimeRef.current - 1) {
          // Only match clips for the currently loaded video
          const newIndex = clips.findIndex(
            c => c.videoId === currentVideoId && currentTime >= c.startTime && currentTime < c.endTime
          );
          if (newIndex !== -1 && newIndex !== currentClipIndex) {
            fadeStartedRef.current = false;
            setCurrentClipIndex(newIndex);
          }
          lastCheckTimeRef.current = currentTime;
          return;
        }

        lastCheckTimeRef.current = currentTime;

        const isLastClip = currentClipIndex >= clips.length - 1;
        const willPause = currentClip.pauseAtEnd || isLastClip;
        const nextClipPreview = !isLastClip ? clips[currentClipIndex + 1] : null;
        const nextClipSameVideo = nextClipPreview ? nextClipPreview.videoId === currentVideoId : false;
        // Per design: cross-video continuing clips already fade through onPause()+autoResume
        // in the auto-continue branch below, so transitionType is honored only same-video.
        const isFadeToSlide = !willPause && nextClipSameVideo
          && currentClip.transitionType === 'fadeToSlide';
        const fadesOut = willPause || isFadeToSlide;

        // For clips that fade out (pause OR same-video fadeToSlide): start the
        // overlay/audio fade early so the transition completes right at the
        // clip's end time. The video keeps playing during the fade
        // (MainVideoFrame only calls pauseVideo() after the fade finishes).
        if (fadesOut && !fadeStartedRef.current) {
          const fadeStartTime = currentClip.endTime - fadeDurationInSeconds;
          if (currentTime >= fadeStartTime) {
            fadeStartedRef.current = true;

            // Start the visual/audio fade — video keeps playing
            onPause();

            // Schedule clip advancement for when the fade completes (at endTime)
            const remainingMs = Math.max(0, (currentClip.endTime - currentTime) * 1000);
            fadeAdvanceTimerRef.current = window.setTimeout(() => {
              try {
                fadeAdvanceTimerRef.current = null;

                if (isLastClip) {
                  const firstClip = clips[0];
                  setCurrentClipIndex(0);

                  if (firstClip.videoId !== currentVideoId) {
                    onCrossVideoSeek(firstClip.videoId, firstClip.startTime, false);
                    onLoadVideo(firstClip.videoId);
                  } else {
                    pendingSeekOnUnpauseRef.current = firstClip.startTime;
                  }
                } else {
                  const nextClip = clips[currentClipIndex + 1];
                  const isCrossVideo = nextClip.videoId !== currentVideoId;

                  if (isCrossVideo) {
                    setIsTransitioningBetweenClips(true);
                    setCurrentClipIndex(currentClipIndex + 1);
                    onCrossVideoSeek(nextClip.videoId, nextClip.startTime, false);
                    onLoadVideo(nextClip.videoId);
                  } else if (isFadeToSlide) {
                    // Same-video fadeToSlide: advance and immediately auto-resume
                    // playback at the next clip's start (slide fades back out as
                    // audio fades back in via the play branch in MainVideoFrame).
                    setCurrentClipIndex(currentClipIndex + 1);
                    onAutoResume(nextClip.startTime);
                  } else {
                    setCurrentClipIndex(currentClipIndex + 1);
                    pendingSeekOnUnpauseRef.current = nextClip.startTime;
                  }
                }
              } catch (error) {
                console.error('[ClipBoundaryMonitor] Error advancing clip:', error);
              }
            }, remainingMs);

            return;
          }
        }

        // For auto-continue clips (no pause): trigger at the actual end time
        if (!willPause && currentTime >= currentClip.endTime) {
          const nextClip = clips[currentClipIndex + 1];
          const isCrossVideo = nextClip.videoId !== currentVideoId;

          if (isCrossVideo) {
            setIsTransitioningBetweenClips(true);
            setCurrentClipIndex(currentClipIndex + 1);
            onCrossVideoSeek(nextClip.videoId, nextClip.startTime, true);
            onPause();
            onLoadVideo(nextClip.videoId);
          } else {
            // Same video, auto-continue: seek to next clip immediately
            setIsTransitioningBetweenClips(true);
            setCurrentClipIndex(currentClipIndex + 1);

            player.seekTo(nextClip.startTime, true);

            // Clear transition flag after a brief delay
            setTimeout(() => {
              setIsTransitioningBetweenClips(false);
            }, 500);
          }
        }
      } catch (error) {
        console.error('[ClipBoundaryMonitor] Error checking boundary:', error);
      }
    };

    intervalRef.current = window.setInterval(checkBoundary, 250);

    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [
    isPlaying, isPlaybackMode, player,
    clips, currentClipIndex, isTransitioningBetweenClips,
    onPause, pendingSeekOnUnpauseRef, currentVideoId,
    onLoadVideo, onCrossVideoSeek, onAutoResume, fadeDurationInSeconds,
    setCurrentClipIndex, setIsTransitioningBetweenClips,
  ]);

  return null;
};

export default ClipBoundaryMonitor;
