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

 /**
 * Retrieves a list of available logical drives on the system.
 *
 * This function executes a shell command to query logical disks using `wmic`.
 * The results are processed to extract drive names (e.g., "C:", "D:").
 *
 * @function
 * @returns {Promise<string[]>} A promise that resolves to an array of drive names.
 *                              Each drive is represented as a string (e.g., "C:").
 * @throws {Error} If there is an issue executing the shell command.
 *
 */
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

/**
 * Generates an RSA key pair, encrypts the private key, and saves the keys to disk.
 *
 * This function creates a 4096-bit RSA key pair, encrypts the private key using a user-provided PIN,
 * and saves both the public and encrypted private keys as files on the specified disk path.
 *
 * @function
 * @param {string} diskPath - The directory path where the RSA key files will be saved.
 *                            Must be a valid and writable directory path.
 * @param {string} userPIN - A PIN provided by the user to encrypt the private key.
 *                           Must be a non-empty string.
 * @returns {Promise<Object>} A promise that resolves to an object containing:
 * - `publicKeyPath` (string): The file path of the saved public key.
 * - `privateKeyPath` (string): The file path of the saved encrypted private key.
 * @throws {Error} If key generation, encryption, or file writing fails.
 *
 * @example
 * const diskPath = '/path/to/keys';
 * const userPIN = '1234';
 *
 * generateRSAKeys(diskPath, userPIN)
 *     .then(({ publicKeyPath, privateKeyPath }) => {
 *         console.log('Keys generated successfully:');
 *         console.log('Public Key:', publicKeyPath);
 *         console.log('Encrypted Private Key:', privateKeyPath);
 *     })
 *     .catch((error) => {
 *         console.error('Failed to generate keys:', error.message);
 *     });
 */
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

/**
 * Hashes a given PIN using the SHA-256 algorithm.
 *
 * This function takes a string PIN as input, validates it, and returns a hashed value
 * using the `sha256` hashing algorithm. The hashed value is a Buffer object.
 *
 * @function
 * @param {string} pin - The PIN to be hashed. It must be a non-empty string.
 * @returns {Buffer} The hashed value of the PIN as a Buffer object.
 * @throws {Error} If the input PIN is invalid (not a string or empty).
 */
function hashPIN(pin) {
    console.log('hashPIN called with:', pin);
    if (!pin || typeof pin !== 'string') {
        throw new Error('Invalid PIN. Expected a non-empty string.');
    }
    return crypto.createHash('sha256').update(pin, 'utf8').digest();
}
/**
 * Encrypts data using AES-256-ECB encryption.
 *
 * This function encrypts a given string or buffer using a 256-bit AES key
 * and the ECB (Electronic Codebook) mode of operation. The encrypted result
 * is returned as a Buffer.
 *
 * @function
 * @param {string|Buffer} data - The data to be encrypted. Can be a UTF-8 string or a Buffer.
 * @param {Buffer} aesKey - A 256-bit AES key (32 bytes). Must be a valid Buffer of exactly 32 bytes.
 * @returns {Buffer} The encrypted data as a Buffer.
 * @throws {Error} If the AES key is invalid (not a Buffer of 32 bytes) or encryption fails.
 *
 * @example
 * const crypto = require('crypto');
 *
 * // Example 256-bit key (32 bytes)
 * const aesKey = crypto.randomBytes(32);
 *
 * // Data to encrypt
 * const data = "This is a secret message.";
 *
 * try {
 *     const encryptedData = encryptWithAES(data, aesKey);
 *     console.log('Encrypted data (hex):', encryptedData.toString('hex'));
 * } catch (error) {
 *     console.error('Encryption failed:', error.message);
 * }
 */
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