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
    firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
  });

  return apiLoadPromise;
}; 