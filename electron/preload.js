const { contextBridge, ipcRenderer } = require('electron');

// Expose some APIs to the renderer process
contextBridge.exposeInMainWorld('electron', {
  // Add any methods here that you want to expose to the renderer process
  appInfo: {
    name: 'Service Display',
    version: process.env.npm_package_version
  },
  
  // Example of exposing ipcRenderer functionality
  send: (channel, data) => {
    // Whitelist channels to ensure only known channels are used
    const validChannels = ['toMain'];
    if (validChannels.includes(channel)) {
      console.log('[Preload] Sending to main:', channel, data);
      ipcRenderer.send(channel, data);
    }
  },
  
  receive: (channel, func) => {
    const validChannels = ['fromMain'];
    if (validChannels.includes(channel)) {
      // Deliberately strip event as it includes `sender` 
      ipcRenderer.on(channel, (event, ...args) => {
        console.log('[Preload] Received from main:', channel, args);
        func(...args);
      });
    }
  },
  
  // Check if running in display window
  isDisplayWindow: () => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('displayWindow') === 'true';
  },
  
  // Add removeAllListeners method
  removeAllListeners: (channel) => {
    const validChannels = ['fromMain'];
    if (validChannels.includes(channel)) {
      console.log('[Preload] Removing all listeners for channel:', channel);
      ipcRenderer.removeAllListeners(channel);
    }
  }
}); 