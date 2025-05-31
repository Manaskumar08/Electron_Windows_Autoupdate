const { app, BrowserWindow, dialog } = require('electron');
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false, // For simplicity (NOT recommended for production)
    }
  });

  win.loadFile('index.html');

  win.webContents.once('did-finish-load', async () => {
    try {
      const isOnlineModule = await import('is-online');
      const isOnline = isOnlineModule.default;

      if (await isOnline()) {
        log.info('Internet is available. Checking for updates...');
        autoUpdater.checkForUpdatesAndNotify();
      } else {
        log.warn('No internet connection. Skipping update check.');
        dialog.showMessageBox({
          type: 'warning',
          title: 'No Internet',
          message: 'Internet connection is unavailable. Cannot check for updates.',
        });
      }
    } catch (err) {
      log.error('Error checking internet connectivity:', err);
    }
  });
}

app.whenReady().then(() => {
  createWindow();
});

// Logging
autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';

// Event Listeners
autoUpdater.on('checking-for-update', () => {
  log.info('Checking for update...');
});

autoUpdater.on('update-available', (info) => {
  log.info('Update available.', info);
  dialog.showMessageBox({
    type: 'info',
    message: 'A new update is available. Downloading now...',
  });
});

autoUpdater.on('update-not-available', (info) => {
  log.info('Update not available.', info);
});

autoUpdater.on('error', (err) => {
  log.error('Error in auto-updater:', err);
});

// ✅ Show taskbar download progress
autoUpdater.on('download-progress', (progressObj) => {
  const percent = progressObj.percent / 100;
  const logMessage = `Download speed: ${progressObj.bytesPerSecond}\nDownloaded: ${progressObj.percent.toFixed(2)}%\n(${progressObj.transferred}/${progressObj.total})`;
  log.info(logMessage);

  const win = BrowserWindow.getAllWindows()[0];
  if (win) {
    win.setProgressBar(percent);
  }
});

autoUpdater.on('update-downloaded', (info) => {
  log.info('Update downloaded');

  const win = BrowserWindow.getAllWindows()[0];
  if (win) {
    win.setProgressBar(-1); // ✅ Clear progress bar
  }

  dialog.showMessageBox({
    type: 'info',
    title: 'Install Update',
    message: 'Update downloaded. The app will restart to install it.',
    buttons: ['Restart Now']
  }).then(() => {
    autoUpdater.quitAndInstall();
  });
});
