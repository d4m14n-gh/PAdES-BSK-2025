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
                    .split('\n')
                    .filter((line) => line.includes(':'))
                    .map((drive) => drive.trim());
                resolve(drives);
            }
        });
    });
}

function generateRSAKeys(diskPath, userPIN) {
    return new Promise((resolve, reject) => {
        try {
            console.log('generateRSAKeys called with:', { diskPath, userPIN });
            const keypair = forge.pki.rsa.generateKeyPair({ bits: 4096 });
            const publicKeyPem = forge.pki.publicKeyToPem(keypair.publicKey);
            const privateKeyPem = forge.pki.privateKeyToPem(keypair.privateKey);
            
            const aesKey = hashPIN(userPIN);

            const encrypted = encryptWithAES(privateKeyPem, aesKey);

            const publicKeyPath = path.join(diskPath, 'rsa_public_key.pem');
            const privateKeyPath = path.join(diskPath, 'rsa_private_key.pem');

            fs.writeFileSync(publicKeyPath, publicKeyPem);
            console.log("Type of encrypted", typeof data)
            if (!Buffer.isBuffer(encrypted)) {
                throw new Error('Encryption failed. "encrypted" is not a Buffer.');
            }
            fs.writeFileSync(privateKeyPath, encrypted);

            resolve({ publicKeyPath, privateKeyPath });
        } catch (error) {
            reject(error);
        }
    });
}

function hashPIN(pin) {
    console.log('hashPIN called with:', pin);
    if (!pin || typeof pin !== 'string') {
        throw new Error('Invalid PIN. Expected a non-empty string.');
    }
    return crypto.createHash('sha256').update(pin, 'utf8').digest();
}
// function encryptWithAES(data, key) {
//     const cipher = crypto.createCipheriv('aes-256-cbc', key, null);
//     cipher.setAutoPadding(true);
//     const encrypted = Buffer.concat([cipher.update(data, 'utf8'), cipher.final()]);
//     return encrypted ; 
// }
function encryptWithAES(data, aesKey) {
    console.log('Type of data:', typeof data);
    console.log('Type of aesKey:', typeof aesKey);
    if (!aesKey || aesKey.length !== 32) { 
        throw new Error('Invalid AES key. Expected a 256-bit key.');
    }
    const cipher = crypto.createCipheriv('aes-256-ecb', aesKey, null); 
    cipher.setAutoPadding(true);
    try {
        const encrypted = Buffer.concat([cipher.update(data, 'utf8'), cipher.final()]);
        console.log('Type of encrypted:', typeof encrypted);
        if (!Buffer.isBuffer(encrypted)) {
            throw new Error('Encryption failed. "encrypted" is not a Buffer.');
        }
        return encrypted;
    } catch (error) {
        console.error('Encryption error:', error);
        throw error;
    }
    // const encrypted = Buffer.concat([cipher.update(data, 'utf8'), cipher.final()]);
    // return encrypted;
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