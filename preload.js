const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('api', {
  // 메인 → 렌더러
  onInitWidget: (cb) => ipcRenderer.on('init-widget', (_e, data) => cb(data)),
  onStartTitleEdit: (cb) => ipcRenderer.on('start-title-edit', () => cb()),
  onExternalTitleUpdate: (cb) => ipcRenderer.on('external-title-update', (_e, title) => cb(title)),
  onWidgetListUpdated: (cb) => ipcRenderer.on('widget-list-updated', () => cb()),

  // 렌더러 → 메인
  createWidget: () => ipcRenderer.send('create-widget'),
  updateWidget: (payload) => ipcRenderer.send('update-widget', payload),
  hideWidget: () => ipcRenderer.send('hide-widget'),
  focusWidget: (id) => ipcRenderer.send('focus-widget', id),
  getWindowBounds: () => ipcRenderer.invoke('get-window-bounds'),
  setWindowBounds: (bounds) => ipcRenderer.send('set-window-bounds', bounds),
  resizeDone: () => ipcRenderer.send('resize-done'),
  setWindowColor: (color) => ipcRenderer.send('set-window-color', color),
  closeGuide: () => ipcRenderer.send('close-guide'),
  getWidgetList: () => ipcRenderer.invoke('get-widget-list'),
  toggleWidgetVisibility: (id) => ipcRenderer.invoke('toggle-widget-visibility', id),
  renameWidgetTitle: (id, title) => ipcRenderer.invoke('rename-widget-title', { id, title }),
  deleteWidgetById: (id) => ipcRenderer.invoke('delete-widget-by-id', id),
})
