declare module 'react-youtube' {
  import { ComponentType } from 'react';

  export interface YouTubeEvent {
    target: {
      getCurrentTime: () => number;
      getDuration: () => number;
      getPlayerState: () => number;
      getVideoUrl: () => string;
      getVideoData: () => { video_id: string; title: string };
      seekTo: (seconds: number, allowSeekAhead?: boolean) => void;
      playVideo: () => void;
      pauseVideo: () => void;
      stopVideo: () => void;
      mute: () => void;
      unMute: () => void;
      isMuted: () => boolean;
      setVolume: (volume: number) => void;
      getVolume: () => number;
      getIframe: () => HTMLIFrameElement;
      loadVideoById: (videoId: string | { videoId: string; startSeconds?: number }) => void;
      cueVideoById: (videoId: string | { videoId: string; startSeconds?: number }) => void;
      loadPlaylist: (playlist: string | string[] | { list: string; listType?: string; index?: number; startSeconds?: number }) => void;
      cuePlaylist: (playlist: string | string[] | { list: string; listType?: string; index?: number }) => void;
      nextVideo: () => void;
      previousVideo: () => void;
      playVideoAt: (index: number) => void;
      getPlaylist: () => string[];
      getPlaylistIndex: () => number;
      setLoop: (loopPlaylists: boolean) => void;
      setShuffle: (shufflePlaylist: boolean) => void;
      getOptions: () => string[];
      getOption: (module: string, option: string) => any;
      setOption: (module: string, option: string, value: any) => void;
      destroy: () => void;
      getPlaybackQuality: () => string;
      setPlaybackQuality: (quality: string) => void;
    };
    data: number;
  }

  export interface YouTubeProps {
    videoId?: string;
    id?: string;
    className?: string;
    iframeClassName?: string;
    style?: React.CSSProperties;
    title?: string;
    loading?: 'lazy' | 'eager';
    opts?: {
      width?: string | number;
      height?: string | number;
      playerVars?: {
        autoplay?: 0 | 1;
        cc_load_policy?: 1;
        color?: 'red' | 'white';
        controls?: 0 | 1;
        disablekb?: 0 | 1;
        enablejsapi?: 0 | 1;
        end?: number;
        fs?: 0 | 1;
        hl?: string;
        iv_load_policy?: 1 | 3;
        list?: string;
        listType?: 'playlist' | 'search' | 'user_uploads';
        loop?: 0 | 1;
        modestbranding?: 1;
        origin?: string;
        playlist?: string;
        playsinline?: 0 | 1;
        rel?: 0 | 1;
        start?: number;
        mute?: 0 | 1;
        vq?: string;
        showinfo?: number;
      };
    };
    onReady?: (event: YouTubeEvent) => void;
    onError?: (event: YouTubeEvent) => void;
    onPlay?: (event: YouTubeEvent) => void;
    onPause?: (event: YouTubeEvent) => void;
    onEnd?: (event: YouTubeEvent) => void;
    onStateChange?: (event: YouTubeEvent) => void;
    onPlaybackRateChange?: (event: YouTubeEvent) => void;
    onPlaybackQualityChange?: (event: YouTubeEvent) => void;
  }

  const YouTube: ComponentType<YouTubeProps>;
  export default YouTube;
} 