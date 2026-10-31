import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { checkChannelLive } from './liveStreamDetector';

vi.mock('./youtubeAPI', () => ({
  loadYouTubeAPI: () => Promise.resolve(),
}));

type Config = {
  videoId: string;
  playerVars: Record<string, unknown>;
  events: {
    onReady: (event: { target: unknown }) => void;
    onStateChange: (event: { data: number; target: unknown }) => void;
    onError: (event: { data: number }) => void;
  };
};

let config: Config;
let target: { mute: any; playVideo: any; destroy: any; getVideoData: any };

const startCheck = async (timeoutMs = 5000) => {
  const promise = checkChannelLive('UC_TEST', timeoutMs);
  await vi.advanceTimersByTimeAsync(0); // Let the API promise resolve
  return promise;
};

const hiddenHostCount = () => document.body.querySelectorAll('div').length;

describe('checkChannelLive', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = '';
    target = {
      mute: vi.fn(),
      playVideo: vi.fn(),
      destroy: vi.fn(),
      getVideoData: vi.fn(() => ({ video_id: 'CUED_VIDEO1', title: 'Cued', isLive: false })),
    };
    (window as any).YT = {
      Player: vi.fn(function (this: unknown, _element: HTMLElement, playerConfig: Config) {
        config = playerConfig;
        return target;
      }),
    };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('asks for the channel live embed and starts muted playback', async () => {
    const promise = startCheck();
    await vi.advanceTimersByTimeAsync(0);
    config.events.onReady({ target });

    expect(config.videoId).toBe('live_stream');
    expect(config.playerVars.channel).toBe('UC_TEST');
    expect(config.playerVars.mute).toBe(1);
    expect(target.mute).toHaveBeenCalled();
    expect(target.playVideo).toHaveBeenCalled();

    config.events.onError({ data: 150 });
    await promise;
  });

  it('resolves with the video once it reports isLive, then cleans up', async () => {
    const promise = startCheck();
    await vi.advanceTimersByTimeAsync(0);
    config.events.onReady({ target });

    target.getVideoData.mockReturnValue({ video_id: 'LIVE_VIDEO1', title: 'Service', isLive: true });
    config.events.onStateChange({ data: -1, target });

    await expect(promise).resolves.toEqual({ videoId: 'LIVE_VIDEO1', title: 'Service' });
    expect(target.destroy).toHaveBeenCalledTimes(1);
    expect(hiddenHostCount()).toBe(0);
  });

  it('resolves null when the embed errors because nothing is live', async () => {
    const promise = startCheck();
    await vi.advanceTimersByTimeAsync(0);
    config.events.onError({ data: 150 });

    await expect(promise).resolves.toBeNull();
    expect(target.destroy).toHaveBeenCalledTimes(1);
    expect(hiddenHostCount()).toBe(0);
  });

  it('resolves null on timeout when a video is cued but never live', async () => {
    const promise = startCheck(5000);
    await vi.advanceTimersByTimeAsync(0);
    config.events.onReady({ target });
    config.events.onStateChange({ data: 5, target });

    await vi.advanceTimersByTimeAsync(5000);

    await expect(promise).resolves.toBeNull();
    expect(target.destroy).toHaveBeenCalledTimes(1);
    expect(hiddenHostCount()).toBe(0);
  });

  it('ignores player events after it has settled', async () => {
    const promise = startCheck();
    await vi.advanceTimersByTimeAsync(0);
    config.events.onError({ data: 150 });
    await promise;

    target.getVideoData.mockReturnValue({ video_id: 'LIVE_VIDEO1', title: 'Service', isLive: true });
    config.events.onStateChange({ data: 1, target });
    await vi.advanceTimersByTimeAsync(5000);

    expect(target.destroy).toHaveBeenCalledTimes(1);
    expect(await promise).toBeNull();
  });
});
