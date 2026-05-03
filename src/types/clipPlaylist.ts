export type ClipTransitionType = 'none' | 'fadeToSlide';

export interface VideoClip {
  id: string;
  videoId: string;      // YouTube video ID this clip belongs to
  startTime: number;    // seconds (absolute YouTube time)
  endTime: number;      // seconds
  label?: string;
  pauseAtEnd: boolean;  // true = pause at clip end; false = auto-continue to next
  transitionType?: ClipTransitionType; // only meaningful when pauseAtEnd === false
}

export interface ClipPlaylist {
  version: number;                          // 1 = legacy single-video, 2 = multi-video
  videoTitles?: Record<string, string>;     // videoId -> display title (v2)
  clips: VideoClip[];
  videoId?: string;                         // v1 backward compat: single video for all clips
}
