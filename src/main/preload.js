const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  // Plugin management
  plugins: {
    list: () => ipcRenderer.invoke('core:plugins:list'),
    load: (pluginPath) => ipcRenderer.invoke('core:plugins:load', pluginPath),
    unload: (pluginId) => ipcRenderer.invoke('core:plugins:unload', pluginId),
    reload: (pluginId) => ipcRenderer.invoke('core:plugins:reload', pluginId),
    onActivated: (fn) => {
      ipcRenderer.on('core:plugin:activated', (_, data) => fn(data))
    },
    onDeactivated: (fn) => {
      ipcRenderer.on('core:plugin:deactivated', (_, data) => fn(data))
    },
    onError: (fn) => {
      ipcRenderer.on('core:plugin:error', (_, data) => fn(data))
    },
  },

  // Dialog
  dialog: {
    openFolder: () => ipcRenderer.invoke('dialog:open-folder'),
  },

  // UI panels registered by plugins
  panels: {
    list: () => ipcRenderer.invoke('core:panels:list'),
    onRegister: (fn) => {
      ipcRenderer.on('core:panel:register', (_, data) => fn(data))
    },
  },

  // Call a specific plugin's IPC handler
  pluginCall: (pluginId, channel, data) =>
    ipcRenderer.invoke(`plugin:${pluginId}:${channel}`, data),

  // Listen to events pushed by a plugin
  pluginOn: (pluginId, channel, fn) => {
    const fullChannel = `plugin:${pluginId}:${channel}`
    ipcRenderer.on(fullChannel, (_, data) => fn(data))
    return () => ipcRenderer.removeAllListeners(fullChannel)
  },

  // Window controls (frameless)
  window: {
    minimize: () => ipcRenderer.send('window:minimize'),
    maximize: () => ipcRenderer.send('window:maximize'),
    close: () => ipcRenderer.send('window:close'),
    onMaximizeChange: (fn) => {
      const handler = (_, maximized) => fn(maximized)
      ipcRenderer.on('window:maximized', handler)
      return () => ipcRenderer.removeListener('window:maximized', handler)
    },
  },
})
