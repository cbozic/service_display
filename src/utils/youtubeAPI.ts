declare global {
  interface Window {
    YT: {
      Player: new (
        elementIdOrElement: string | HTMLElement,
        config: {
          videoId?: string;
          width?: string | number;
          height?: string | number;
          playerVars?: {
            controls?: number;
            modestbranding?: number;
            rel?: number;
            showinfo?: number;
            autoplay?: number;
            mute?: number;
            start?: number;
            enablejsapi?: number;
            origin?: string;
            list?: string;
            listType?: string;
            loop?: number;
            playsinline?: number;
            disablekb?: number;
            fs?: number;
            vq?: string;
          };
          events?: {
            onReady?: (event: { target: any }) => void;
            onStateChange?: (event: { data: number }) => void;
            onError?: (event: { data: number }) => void;
          };
        }
      ) => any;
    };
    onYouTubeIframeAPIReady: () => void;
  }
}

let apiLoadPromise: Promise<void> | null = null;

export const loadYouTubeAPI = (): Promise<void> => {
  // Return existing promise if we're already loading
  if (apiLoadPromise) {
    return apiLoadPromise;
  }

  apiLoadPromise = new Promise((resolve) => {
    // If API is already loaded, resolve immediately
    if (window.YT && window.YT.Player) {
      resolve();
      return;
    }

    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';

    // Store the original onYouTubeIframeAPIReady if it exists
    const originalCallback = window.onYouTubeIframeAPIReady;

    window.onYouTubeIframeAPIReady = () => {
      // Call original callback if it existed
      if (originalCallback) {
        originalCallback();
      }
      // Wait a short moment to ensure API is fully initialized
      setTimeout(() => {
        resolve();
      }, 100);
    };

    const firstScriptTag = document.getElementsByTagName('script')[0];
    if (firstScriptTag?.parentNode) {
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    } else {
      document.head.appendChild(tag);
    }
  });

  return apiLoadPromise;
};

/**
 * Forcefully disable closed captions on a YouTube player instance.
 *
 * The `cc_load_policy=0` player var only sets the default; YouTube can still
 * auto-load captions from the viewer's account/device preferences. Unloading
 * the captions module (both the legacy AS3 `captions` name and the HTML5 `cc`
 * name) and clearing the active track reliably keeps captions off. The player
 * only accepts these calls once it has fully initialized, so we retry a few
 * times after readiness.
 */
export const disableCaptions = (player: any): void => {
  if (!player) {
    return;
  }

  const turnOff = () => {
    try {
      player.unloadModule?.('captions');
    } catch (e) { /* module may not be present yet */ }
    try {
      player.unloadModule?.('cc');
    } catch (e) { /* module may not be present yet */ }
    try {
      player.setOption?.('captions', 'track', {});
    } catch (e) { /* option may not be available yet */ }
  };

  turnOff();
  // Captions are sometimes loaded slightly after the player reports ready,
  // so retry a couple of times to catch that late load.
  setTimeout(turnOff, 500);
  setTimeout(turnOff, 1500);
};