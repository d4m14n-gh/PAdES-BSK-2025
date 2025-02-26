const {BrowserWindow, app, ipcMain} = require('electron')
const {exec} = require('child_process');
const path = require('path');

const createWindow = ()=>{
    const win = new BrowserWindow({
        width:800,
        height:600, 
        webPreferences:{
            preload: path.join(__dirname, 'preload.js')
        }
    })
    win.loadFile("index.html")
}

app.whenReady().then(()=>{
    createWindow();
});

function getAvailableDrives() {
    return new Promise((resolve, reject) => {
        exec('wmic logicaldisk get name', (error, stdout) => {
            if (error) {
                reject(error);
            } else {
                const drives = stdout
                    .split('\n') // Podziel wynik na linie
                    .filter((line) => line.includes(':')) // Filtruj linie zawierające ":"
                    .map((drive) => drive.trim()); // Usuń spacje
                resolve(drives);
            }
        });
    });
}

ipcMain.handle('get-drives', async () => {
    const drives = await getAvailableDrives();
    return drives;
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});