const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('trayMenuApi', {
  getState: () => ipcRenderer.invoke('tray-menu-get-state'),
  runAction: (action) => ipcRenderer.send('tray-menu-action', action),
  close: () => ipcRenderer.send('tray-menu-close'),
  resize: (height) => ipcRenderer.send('tray-menu-resize', height),
  onRefresh: (cb) => ipcRenderer.on('tray-menu-refresh', () => cb()),
})
