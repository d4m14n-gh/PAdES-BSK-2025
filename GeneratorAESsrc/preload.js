const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    getDrives: () => ipcRenderer.invoke('get-drives'),
});