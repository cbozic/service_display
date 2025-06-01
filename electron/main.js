const { app, BrowserWindow, Menu, shell, ipcMain } = require('electron');
const path = require('path');
const url = require('url');
const fs = require('fs');

// Keep a global reference of the window objects to avoid garbage collection
let mainWindow;
let displayWindow;

// Set the app name
app.setName('Service Display');

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: 'Service Display',
    icon: path.join(__dirname, '../public/logo512.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // Determine how to load the app
  const startUrl = process.env.ELECTRON_START_URL || url.format({
    pathname: path.join(__dirname, '../build/index.html'),
    protocol: 'file:',
    slashes: true
  });
  
  mainWindow.loadURL(startUrl);

  // Open external links in browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Emitted when the window is closed
  mainWindow.on('closed', function () {
    mainWindow = null;
    // Close display window if it exists
    if (displayWindow) {
      displayWindow.close();
    }
  });

  // Create application menu
  const template = [
    {
      label: 'File',
      submenu: [
        { role: 'quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'delete' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { type: 'separator' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        {
          label: 'Pop Out Display',
          accelerator: 'CmdOrCtrl+D',
          click: () => {
            mainWindow.webContents.send('fromMain', { action: 'toggleDisplayPopout' });
          }
        },
        { type: 'separator' },
        { role: 'minimize' },
        { role: 'close' }
      ]
    },
    {
      role: 'help',
      submenu: [
        {
          label: 'Learn More',
          click: async () => {
            await shell.openExternal('https://github.com/cbozic/service_display');
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function createDisplayWindow() {
  displayWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    title: 'Service Display - Display',
    icon: path.join(__dirname, '../public/logo512.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // Load the same URL but with a query parameter to indicate it's the display window
  const startUrl = process.env.ELECTRON_START_URL 
    ? `${process.env.ELECTRON_START_URL}?displayWindow=true`
    : url.format({
        pathname: path.join(__dirname, '../build/index.html'),
        protocol: 'file:',
        slashes: true,
        query: { displayWindow: 'true' }
      });
  
  displayWindow.loadURL(startUrl);

  displayWindow.on('closed', function () {
    displayWindow = null;
    // Notify main window that display window was closed
    if (mainWindow) {
      mainWindow.webContents.send('fromMain', { action: 'displayWindowClosed' });
    }
  });
}

// IPC handlers
ipcMain.on('toMain', (event, data) => {
  console.log('[Main] Received IPC:', data);
  
  if (data.action === 'openDisplayWindow') {
    if (!displayWindow) {
      createDisplayWindow();
    } else {
      displayWindow.focus();
    }
  } else if (data.action === 'closeDisplayWindow') {
    if (displayWindow) {
      displayWindow.close();
    }
  } else if (data.action === 'syncToDisplay' && displayWindow) {
    // Forward sync data to display window
    console.log('[Main] Forwarding sync to display window');
    displayWindow.webContents.send('fromMain', data);
  } else if (data.action === 'controlDisplayPlayer' && displayWindow) {
    // Handle direct player control commands
    console.log('[Main] Forwarding player control to display:', data.command, data.args);
    displayWindow.webContents.send('fromMain', {
      action: 'controlPlayer',
      command: data.command,
      args: data.args
    });
  } else if (data.action === 'syncToMain' && mainWindow) {
    // Forward sync data from display window to main window
    console.log('[Main] Forwarding sync to main window');
    mainWindow.webContents.send('fromMain', data);
  } else if (data.action === 'displayPlayerReady' && mainWindow) {
    // Forward display player ready notification to main window
    console.log('[Main] Forwarding display player ready to main window');
    mainWindow.webContents.send('fromMain', data);
  }
});

// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (mainWindow === null) createWindow();
  });
});

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
}); 