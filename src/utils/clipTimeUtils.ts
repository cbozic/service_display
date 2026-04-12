import { VideoClip } from '../types/clipPlaylist';

export interface SequentialTimeData {
  clipDurations: number[];
  totalDuration: number;
  cumulativeOffsets: number[];
}

/**
 * Computes cumulative offset data for a clip playlist.
 * Returns null if clips array is empty or total duration is zero.
 */
export function computeSequentialTimeData(clips: VideoClip[]): SequentialTimeData | null {
  if (clips.length === 0) return null;

  const clipDurations = clips.map(c => c.endTime - c.startTime);
  const totalDuration = clipDurations.reduce((sum, d) => sum + d, 0);
  if (totalDuration <= 0) return null;

  const cumulativeOffsets: number[] = [];
  let cumulative = 0;
  for (const d of clipDurations) {
    cumulativeOffsets.push(cumulative);
    cumulative += d;
  }

  return { clipDurations, totalDuration, cumulativeOffsets };
}

/**
 * Converts a player's absolute YouTube time + current clip index
 * into cumulative elapsed time across the entire playlist.
 */
export function getCumulativeElapsedTime(
  playerCurrentTime: number,
  currentClipIndex: number,
  clips: VideoClip[],
  timeData: SequentialTimeData
): number {
  if (currentClipIndex < 0 || currentClipIndex >= clips.length) return 0;

  const clip = clips[currentClipIndex];
  const offsetInClip = Math.max(0, Math.min(
    playerCurrentTime - clip.startTime,
    clip.endTime - clip.startTime
  ));

  return timeData.cumulativeOffsets[currentClipIndex] + offsetInClip;
}
