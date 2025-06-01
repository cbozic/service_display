interface ElectronAPI {
  appInfo: {
    name: string;
    version: string;
  };
  send: (channel: string, data: any) => void;
  receive: (channel: string, func: (...args: any[]) => void) => void;
  isDisplayWindow: () => boolean;
  removeAllListeners: (channel: string) => void;
}

declare global {
  interface Window {
    electron?: ElectronAPI;
  }
}

export {}; 