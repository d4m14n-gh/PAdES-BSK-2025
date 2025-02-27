const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    getDrives: () => ipcRenderer.invoke('get-drives'),
    generateKeys: (diskPath, userPIN) => ipcRenderer.invoke('generate-keys', diskPath, userPIN)
});