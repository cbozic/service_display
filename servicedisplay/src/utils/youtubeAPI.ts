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

export const loadYouTubeAPI = (): Promise<void> => {
  return new Promise((resolve) => {
    if ((window as any).YT && (window as any).YT.Player) {
      resolve();
      return;
    }

    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';

    window.onYouTubeIframeAPIReady = () => {
      resolve();
    };

    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
  });
}; 