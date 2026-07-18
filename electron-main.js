const { app, BrowserWindow, shell, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const { autoUpdater } = require('electron-updater');

let mainWindow;
let serverProcess;

// Register custom protocol for authentication deep linking
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient('jarvis-cyberdeck', process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient('jarvis-cyberdeck');
}

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
    // Handle deep link on Windows
    const url = commandLine.pop();
    handleDeepLink(url);
  });

  app.on('ready', () => {
    createWindow();
    
    // Auto-update check periodically
    autoUpdater.checkForUpdatesAndNotify();
    setInterval(() => {
      autoUpdater.checkForUpdatesAndNotify();
    }, 1000 * 60 * 15); // Check every 15 minutes
  });
  
  app.on('open-url', (event, url) => {
    // Handle deep link on macOS
    handleDeepLink(url);
  });
}

function handleDeepLink(url) {
  if (url && url.startsWith('jarvis-cyberdeck://')) {
    if (mainWindow) {
      mainWindow.webContents.send('auth-callback', url);
    }
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    autoHideMenuBar: true
  });

  // Intercept window.open or links with target="_blank" to open in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http') && !url.includes('localhost:3000')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  const serverPath = path.join(__dirname, 'dist', 'server.cjs');
  serverProcess = spawn('node', [serverPath], {
    env: { ...process.env, PORT: '3000', NODE_ENV: 'production' }
  });

  serverProcess.stdout.on('data', (data) => {
    console.log(`Server: ${data}`);
    if (data.toString().includes('Server running on') || data.toString().includes('port 3000')) {
      mainWindow.loadURL('http://localhost:3000');
    }
  });

  serverProcess.stderr.on('data', (data) => {
    console.error(`Server Error: ${data}`);
  });

  setTimeout(() => {
    if (mainWindow.webContents.getURL() === '') {
      mainWindow.loadURL('http://localhost:3000');
    }
  }, 3000);
}

// Auto Updater Events
autoUpdater.on('checking-for-update', () => {
  if (mainWindow) mainWindow.webContents.send('update-message', 'Checking for updates...');
});

autoUpdater.on('update-available', () => {
  if (mainWindow) mainWindow.webContents.send('update-message', 'Update available. Downloading...');
});

autoUpdater.on('update-not-available', () => {
  if (mainWindow) mainWindow.webContents.send('update-message', 'Up to date');
});

autoUpdater.on('error', (err) => {
  if (mainWindow) mainWindow.webContents.send('update-message', 'Error in auto-updater: ' + err.message);
});

autoUpdater.on('download-progress', (progressObj) => {
  let log_message = "Downloading update: " + Math.round(progressObj.percent) + '%';
  if (mainWindow) mainWindow.webContents.send('update-message', log_message);
});

autoUpdater.on('update-downloaded', () => {
  if (mainWindow) mainWindow.webContents.send('update-message', 'Update downloaded. Restarting to install...');
  setTimeout(() => {
    autoUpdater.quitAndInstall(true, true); // Silent restart
  }, 4000);
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  if (serverProcess) {
    serverProcess.kill();
  }
});
