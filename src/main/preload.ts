import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  // Plugin management
  plugins: {
    list: () => ipcRenderer.invoke('core:plugins:list'),
    load: (pluginPath: string) => ipcRenderer.invoke('core:plugins:load', pluginPath),
    unload: (pluginId: string) => ipcRenderer.invoke('core:plugins:unload', pluginId),
    reload: (pluginId: string) => ipcRenderer.invoke('core:plugins:reload', pluginId),
    onActivated: (fn: (data: unknown) => void) => {
      ipcRenderer.on('core:plugin:activated', (_event, data) => fn(data))
    },
    onDeactivated: (fn: (data: unknown) => void) => {
      ipcRenderer.on('core:plugin:deactivated', (_event, data) => fn(data))
    },
    onError: (fn: (data: unknown) => void) => {
      ipcRenderer.on('core:plugin:error', (_event, data) => fn(data))
    },
  },

  // Dialog
  dialog: {
    openFolder: () => ipcRenderer.invoke('dialog:open-folder'),
  },

  // UI panels registered by plugins
  panels: {
    list: () => ipcRenderer.invoke('core:panels:list'),
    onRegister: (fn: (data: unknown) => void) => {
      ipcRenderer.on('core:panel:register', (_event, data) => fn(data))
    },
  },

  // Call a specific plugin's IPC handler
  pluginCall: (pluginId: string, channel: string, data?: unknown) =>
    ipcRenderer.invoke(`plugin:${pluginId}:${channel}`, data),

  // Listen to events pushed by a plugin
  pluginOn: (pluginId: string, channel: string, fn: (data: unknown) => void) => {
    const fullChannel = `plugin:${pluginId}:${channel}`
    ipcRenderer.on(fullChannel, (_event, data) => fn(data))
    return () => ipcRenderer.removeAllListeners(fullChannel)
  },

  // Window controls (frameless)
  window: {
    minimize: () => ipcRenderer.send('window:minimize'),
    maximize: () => ipcRenderer.send('window:maximize'),
    close: () => ipcRenderer.send('window:close'),
    onMaximizeChange: (fn: (maximized: boolean) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, maximized: boolean) => fn(maximized)
      ipcRenderer.on('window:maximized', handler)
      return () => ipcRenderer.removeListener('window:maximized', handler)
    },
  },
})
