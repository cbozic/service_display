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
      ipcRenderer.send(channel, data);
    }
  },
  
  receive: (channel, func) => {
    const validChannels = ['fromMain'];
    if (validChannels.includes(channel)) {
      // Deliberately strip event as it includes `sender` 
      ipcRenderer.on(channel, (event, ...args) => func(...args));
    }
  }
}); 