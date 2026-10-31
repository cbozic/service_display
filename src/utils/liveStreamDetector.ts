import { loadYouTubeAPI } from './youtubeAPI';

export interface LiveVideo {
  videoId: string;
  title: string;
}

/**
 * Checks whether a YouTube channel is streaming right now, resolving to the live
 * video or null.
 *
 * The channel's /live page can't be read from a browser (no CORS header) and this
 * app has no backend or API key, so this loads the channel's `live_stream` embed
 * in a hidden, muted player. A channel with nothing to show fails with an error.
 * `isLive` only becomes true once playback starts, so the player has to play
 * briefly. Requiring it means a scheduled stream or older video doesn't count.
 *
 * Never rejects. Errors and timeouts resolve to null.
 */
export const checkChannelLive = (channelId: string, timeoutMs: number): Promise<LiveVideo | null> => {
  return new Promise((resolve) => {
    let settled = false;
    let player: any = null;
    let host: HTMLDivElement | null = null;

    const finish = (result: LiveVideo | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        player?.destroy();
      } catch (error) {
        console.error('[LiveStreamDetector] Error destroying player:', error);
      }
      host?.remove();
      resolve(result);
    };

    const timer = setTimeout(() => finish(null), timeoutMs);

    const checkIsLive = (target: any) => {
      try {
        const data = target.getVideoData();
        if (data?.isLive === true && data.video_id) {
          finish({ videoId: data.video_id, title: data.title || 'Live video' });
        }
      } catch (error) {
        console.error('[LiveStreamDetector] Error reading video data:', error);
      }
    };

    loadYouTubeAPI()
      .then(() => {
        if (settled) return;

        host = document.createElement('div');
        host.style.cssText = 'position:absolute;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none;z-index:-1';
        const element = document.createElement('div');
        host.appendChild(element);
        document.body.appendChild(host);

        player = new window.YT.Player(element, {
          width: 1,
          height: 1,
          videoId: 'live_stream',
          playerVars: {
            channel: channelId,
            autoplay: 1,
            mute: 1,
            controls: 0,
            disablekb: 1,
            fs: 0,
            playsinline: 1,
            enablejsapi: 1,
            origin: window.location.origin,
          },
          events: {
            onReady: (event) => {
              if (settled) return;
              event.target.mute();
              event.target.playVideo();
              checkIsLive(event.target);
            },
            onStateChange: (event) => {
              if (!settled) checkIsLive((event as any).target ?? player);
            },
            onError: () => finish(null),
          },
        });
      })
      .catch((error) => {
        console.error('[LiveStreamDetector] Error starting check:', error);
        finish(null);
      });
  });
};
