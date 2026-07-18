const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let serverProcess;

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

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  if (serverProcess) {
    serverProcess.kill();
  }
});
