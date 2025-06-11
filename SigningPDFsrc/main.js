const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const { spawn } = require('child_process');
const path = require('path');


let win
function createWindow() {
  win = new BrowserWindow({
    width: 1920,
    height: 1080,
    title: 'BSK 2025 Signing and Verifying PDF',
    icon: path.join(__dirname, 'assets', 'favicon.png'),
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

ipcMain.handle('dialog:openFile', async (event, filtersv) => {
  const result = await dialog.showOpenDialog(win, {
    properties: ['openFile'],
    filters: filtersv,
  });
  return result.filePaths;
});

ipcMain.handle('dialog:save-file', async () => {
  const { filePath, canceled } = await dialog.showSaveDialog({
    title: 'Save file as',
    defaultPath: 'signed.pdf',
    filters: [
      { name: 'PDF Files', extensions: ['pdf'] },
    ]
  });

  if (canceled) return null;
  return filePath;
});

ipcMain.handle('sign', async (event, inputPath, outputPath, privateKeyPath) => {
  console.log('Signing PDF:', inputPath, 'with private key:', privateKeyPath, 'and output path:', outputPath);
  const scriptPath = path.join(__dirname, 'python', 'main.py');
  const python = spawn('python', [scriptPath, '--sign', inputPath, outputPath, privateKeyPath]);

  python.stdout.on('data', data => {
    console.log('Response:', data.toString());
  });

  python.stderr.on('data', data => {
    console.error('Error:', data.toString());
  });

  return new Promise((resolve, reject) => {
    python.on('close', (code) => {
      if (code === 0) {
        resolve('signing successful');
      } else {
        reject(new Error(`signing failed with code ${code}`));
      }
    });
  });
});

ipcMain.handle('verify', async (event, filePath, publicKeyPath) => {
  console.log('Verifying PDF:', filePath, 'with public key:', publicKeyPath);
  const python = spawn('python', ['python/main.py', '--verify', filePath, publicKeyPath]);

  python.stdout.on('data', data => {
    console.log('Response:', data.toString());
  });

  python.stderr.on('data', data => {
    console.error('Error:', data.toString());
  });

  return new Promise((resolve, reject) => {
    python.on('close', (code) => {
      if (code === 0) {
        resolve('Verification successful');
      } else {
        reject(new Error(`Verification failed with code ${code}`));
      }
    });
  });
});

