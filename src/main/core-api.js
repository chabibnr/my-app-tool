const { ipcMain, BrowserWindow } = require('electron')
const path = require('path')
const fs = require('fs')
const EventEmitter = require('events')
const Store = require('electron-store')

class CoreAPI {
  constructor({ mainWindow }) {
    this._getMainWindow = mainWindow
    this._eventBus = new EventEmitter()
    this._ipcHandlers = new Map()
    this._panelRegistry = new Map()
  }

  /** Called once per plugin — returns a scoped API object */
  createForPlugin(manifest) {
    const pluginId = manifest.id
    const permissions = manifest.permissions || []
    const self = this

    return {
      pluginId,

      /** Scoped key-value store per plugin */
      store: new Store({ name: `plugin-${pluginId}`, cwd: path.join(
        require('electron').app.getPath('userData'), 'plugin-stores'
      )}),

      /** Subscribe to app-wide events */
      events: {
        on: (event, fn) => self._eventBus.on(event, fn),
        off: (event, fn) => self._eventBus.off(event, fn),
        emit: (event, data) => {
          // Plugins can only emit namespaced events
          self._eventBus.emit(`plugin:${pluginId}:${event}`, data)
        },
      },

      /** Register an IPC handler from plugin → renderer */
      ipc: {
        handle: (channel, handler) => {
          const fullChannel = `plugin:${pluginId}:${channel}`
          if (self._ipcHandlers.has(fullChannel)) {
            ipcMain.removeHandler(fullChannel)
          }
          ipcMain.handle(fullChannel, handler)
          self._ipcHandlers.set(fullChannel, true)
        },
        send: (channel, data) => {
          const win = self._getMainWindow()
          if (win) win.webContents.send(`plugin:${pluginId}:${channel}`, data)
        },
      },

      /** Register a UI panel that shows in sidebar */
      ui: {
        registerPanel: (panelDef) => {
          self._panelRegistry.set(pluginId, {
            pluginId,
            ...panelDef,
          })
          const win = self._getMainWindow()
          if (win) win.webContents.send('core:panel:register', { pluginId, ...panelDef })
        },
      },

      /** Device access — gated by permissions */
      device: permissions.includes('serial') ? require('./device/serial-adapter') : null,
      hid: permissions.includes('hid') ? require('./device/hid-adapter') : null,

      /** App-level utilities */
      app: {
        getVersion: () => require('electron').app.getVersion(),
        getPath: (name) => require('electron').app.getPath(name),
      },

      /** Logger scoped to plugin */
      log: {
        info: (...args) => console.log(`[${pluginId}]`, ...args),
        warn: (...args) => console.warn(`[${pluginId}]`, ...args),
        error: (...args) => console.error(`[${pluginId}]`, ...args),
      },
    }
  }

  /** Cleanup all IPC handlers registered by a plugin */
  cleanupPlugin(pluginId) {
    for (const [channel] of this._ipcHandlers) {
      if (channel.startsWith(`plugin:${pluginId}:`)) {
        ipcMain.removeHandler(channel)
        this._ipcHandlers.delete(channel)
      }
    }
    this._panelRegistry.delete(pluginId)
  }

  /** For core app use */
  emit(event, data) {
    this._eventBus.emit(event, data)
  }

  getPanels() {
    return Array.from(this._panelRegistry.values())
  }
}

module.exports = CoreAPI
