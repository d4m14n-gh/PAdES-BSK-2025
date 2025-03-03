const { app, BrowserWindow, ipcMain, dialog } = require('electron')
// const usbDetect = require('usb-detection');
// const fs = require('fs');
// const path = require('path');
// const { exec } = require('child_process');

let win

function createWindow() {
  win = new BrowserWindow({
    width: 1920,
    height: 1080,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  win.loadFile('index.html');

  win.on('closed', () => {
    win = null
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
});

ipcMain.handle('dialog:openFile', async () => {
  const result = await dialog.showOpenDialog(win, {
    properties: ['openFile'],
    filters: [
      { name: 'PDF Files', extensions: ['pdf'] }
    ],
  });
  return result.filePaths;
});
