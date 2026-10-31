import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import {
  CHROME_HOLD_MAX_MS,
  CHROME_HOLD_MS,
  CHROME_HOLD_PLAYBACK_RATE,
  startPlaybackBehindCover,
} from './youtubeUtils';

const makePlayer = (state: number, time = 100) => ({
  state,
  time,
  mute: vi.fn(),
  seekTo: vi.fn(),
  setPlaybackRate: vi.fn(),
  playVideo: vi.fn(),
  getPlayerState() {
    return this.state;
  },
  getCurrentTime() {
    return this.time;
  },
});

describe('startPlaybackBehindCover', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('starts muted and slowed, then clears after the hold at normal speed', () => {
    const player = makePlayer(1);
    const onClear = vi.fn();
    startPlaybackBehindCover(player, { rewind: false, onClear });

    expect(player.mute).toHaveBeenCalled();
    expect(player.setPlaybackRate).toHaveBeenCalledWith(CHROME_HOLD_PLAYBACK_RATE);
    expect(player.playVideo).toHaveBeenCalled();

    vi.advanceTimersByTime(CHROME_HOLD_MS - 100);
    expect(onClear).not.toHaveBeenCalled();

    vi.advanceTimersByTime(300);
    expect(onClear).toHaveBeenCalledTimes(1);
    expect(player.setPlaybackRate).toHaveBeenLastCalledWith(1);
  });

  test('rewinds by the consumed video only from the paused state', () => {
    const paused = makePlayer(2);
    startPlaybackBehindCover(paused, { rewind: true, onClear: vi.fn() });
    expect(paused.seekTo).toHaveBeenCalledWith(100 - (CHROME_HOLD_MS / 1000) * CHROME_HOLD_PLAYBACK_RATE, true);

    const cued = makePlayer(5);
    startPlaybackBehindCover(cued, { rewind: true, onClear: vi.fn() });
    expect(cued.seekTo).not.toHaveBeenCalled();

    const nearStart = makePlayer(2, 0.5);
    startPlaybackBehindCover(nearStart, { rewind: true, onClear: vi.fn() });
    expect(nearStart.seekTo).not.toHaveBeenCalled();
  });

  test('restarts the hold after buffering or a seek', () => {
    const player = makePlayer(1);
    const onClear = vi.fn();
    startPlaybackBehindCover(player, { rewind: false, onClear });

    vi.advanceTimersByTime(CHROME_HOLD_MS - 500);
    player.state = 3;
    vi.advanceTimersByTime(200);
    player.state = 1;
    vi.advanceTimersByTime(CHROME_HOLD_MS - 200);
    expect(onClear).not.toHaveBeenCalled();

    player.time = 200;
    vi.advanceTimersByTime(CHROME_HOLD_MS - 200);
    expect(onClear).not.toHaveBeenCalled();

    vi.advanceTimersByTime(400);
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  test('gives up and clears if playback never settles', () => {
    const player = makePlayer(3);
    const onClear = vi.fn();
    startPlaybackBehindCover(player, { rewind: false, onClear });

    vi.advanceTimersByTime(CHROME_HOLD_MAX_MS + 100);
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  test('cancel stops the hold and restores speed without clearing', () => {
    const player = makePlayer(1);
    const onClear = vi.fn();
    const cancel = startPlaybackBehindCover(player, { rewind: false, onClear });

    cancel();
    vi.advanceTimersByTime(CHROME_HOLD_MAX_MS);
    expect(onClear).not.toHaveBeenCalled();
    expect(player.setPlaybackRate).toHaveBeenLastCalledWith(1);
  });
});
