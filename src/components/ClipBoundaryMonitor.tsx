import { useEffect, useRef } from 'react';
import { useClipPlaylist } from '../contexts/ClipPlaylistContext';

interface ClipBoundaryMonitorProps {
  player: any;
  videoMonitorPlayer: any;
  isPlaying: boolean;
  onPause: () => void;
  pendingSeekOnUnpauseRef: React.MutableRefObject<number | null>;
}

const ClipBoundaryMonitor: React.FC<ClipBoundaryMonitorProps> = ({
  player,
  videoMonitorPlayer,
  isPlaying,
  onPause,
  pendingSeekOnUnpauseRef,
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

        // Detect backward seek: re-evaluate which clip we're in
        if (currentTime < lastCheckTimeRef.current - 1) {
          const newIndex = clips.findIndex(
            c => currentTime >= c.startTime && currentTime < c.endTime
          );
          if (newIndex !== -1 && newIndex !== currentClipIndex) {
            setCurrentClipIndex(newIndex);
          }
          lastCheckTimeRef.current = currentTime;
          return;
        }

        lastCheckTimeRef.current = currentTime;

        // Check if we've reached or passed the end of the current clip
        if (currentTime >= currentClip.endTime) {
          const isLastClip = currentClipIndex >= clips.length - 1;

          if (isLastClip) {
            // Last clip ended: pause and reset to first clip for replay
            setCurrentClipIndex(0);
            pendingSeekOnUnpauseRef.current = clips[0].startTime;
            onPause();
          } else if (currentClip.pauseAtEnd) {
            // Pause at end: advance index, set pending seek, trigger pause
            const nextClip = clips[currentClipIndex + 1];
            setCurrentClipIndex(currentClipIndex + 1);
            pendingSeekOnUnpauseRef.current = nextClip.startTime;
            onPause();
          } else {
            // Auto-continue: seek to next clip immediately
            const nextClip = clips[currentClipIndex + 1];
            setIsTransitioningBetweenClips(true);
            setCurrentClipIndex(currentClipIndex + 1);

            player.seekTo(nextClip.startTime, true);
            if (videoMonitorPlayer) {
              videoMonitorPlayer.seekTo(nextClip.startTime, true);
            }

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
    isPlaying, isPlaybackMode, player, videoMonitorPlayer,
    clips, currentClipIndex, isTransitioningBetweenClips,
    onPause, pendingSeekOnUnpauseRef,
    setCurrentClipIndex, setIsTransitioningBetweenClips,
  ]);

  return null;
};

export default ClipBoundaryMonitor;
