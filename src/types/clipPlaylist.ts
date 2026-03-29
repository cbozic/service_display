export interface VideoClip {
  id: string;
  startTime: number;    // seconds (absolute YouTube time)
  endTime: number;      // seconds
  label?: string;
  pauseAtEnd: boolean;  // true = pause at clip end; false = auto-continue to next
}

export interface ClipPlaylist {
  version: number;
  videoId: string;
  clips: VideoClip[];
}
