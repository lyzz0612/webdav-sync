const { contextBridge, ipcRenderer } = require('electron')
contextBridge.exposeInMainWorld('syncDesk', {
  getConfig: () => ipcRenderer.invoke('config:get'),
  saveConfig: next => ipcRenderer.invoke('config:save', next),
  testTarget: id => ipcRenderer.invoke('target:test', id),
  startJob: id => ipcRenderer.invoke('jobs:start', id),
  stopJob: id => ipcRenderer.invoke('jobs:stop', id),
  syncOnce: id => ipcRenderer.invoke('sync:once', id),
  clearLogs: () => ipcRenderer.invoke('logs:clear'),
  pickFolder: () => ipcRenderer.invoke('dialog:pick-folder'),
  onEvent: callback => ipcRenderer.on('sync-event', (_, event) => callback(event)),
})
