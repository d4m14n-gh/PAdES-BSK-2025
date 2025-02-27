const {BrowserWindow, app, ipcMain} = require('electron')
const {exec} = require('child_process');
const path = require('path');
const fs = require('fs');
const forge = require('node-forge');
const crypto =require('crypto');

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

function generateRSAKeys(diskPath, userPIN) {
    return new Promise((resolve, reject) => {
        try {
            const keypair = forge.pki.rsa.generateKeyPair({ bits: 4096 });
            const publicKeyPem = forge.pki.publicKeyToPem(keypair.publicKey);
            const privateKeyPem = forge.pki.privateKeyToPem(keypair.privateKey);
            
            const aesKey = hashPIN(userPIN);

            const { encrypted} = encryptWithAES(privateKeyPem, aesKey);

            // Ścieżki do zapisania kluczy
            const publicKeyPath = path.join(diskPath, 'rsa_public_key.pem');
            const privateKeyPath = path.join(diskPath, 'rsa_private_key.pem');

            fs.writeFileSync(publicKeyPath, publicKeyPem);
            fs.writeFileSync(privateKeyPath, encrypted);

            resolve({ publicKeyPath, privateKeyPath });
        } catch (error) {
            reject(error);
        }
    });
}

function hashPIN(pin) {
    if (typeof pin !== 'string') {
        throw new TypeError('PIN must be a string');
    }
    return crypto.createHash('sha256').update(pin).digest();
}

function encryptWithAES(data, key) {
    const cipher = crypto.createCipheriv('aes-256-cbc', key, null);
    const encrypted = Buffer.concat([cipher.update(data, 'utf8'), cipher.final()]);
    return encrypted ; // Return encrypted data and IV
}

ipcMain.handle('get-drives', async () => {
    const drives = await getAvailableDrives();
    return drives;
});

ipcMain.handle('generate-keys', async (_, diskPath, userPIN) => {
    return await generateRSAKeys(diskPath, userPIN);
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});