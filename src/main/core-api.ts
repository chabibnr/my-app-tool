import { ipcMain, BrowserWindow, app } from 'electron'
import * as path from 'path'
import { EventEmitter } from 'events'
import Store from 'electron-store'
import type { PluginManifest, PanelDefinition } from '../types/global'

export type SerialAdapter = typeof import('./device/serial-adapter')
export type HidAdapter = typeof import('./device/hid-adapter')

export interface SandboxedAPI {
  pluginId: string
  store: InstanceType<typeof Store>
  events: {
    on: (event: string, fn: (...args: unknown[]) => void) => void
    off: (event: string, fn: (...args: unknown[]) => void) => void
    emit: (event: string, data: unknown) => void
  }
  ipc: {
    handle: (channel: string, handler: (...args: unknown[]) => unknown) => void
    send: (channel: string, data: unknown) => void
  }
  ui: {
    registerPanel: (panelDef: Omit<PanelDefinition, 'pluginId'>) => void
  }
  device: SerialAdapter | null
  hid: HidAdapter | null
  app: {
    getVersion: () => string
    getPath: (name: Parameters<typeof app.getPath>[0]) => string
  }
  log: {
    info: (...args: unknown[]) => void
    warn: (...args: unknown[]) => void
    error: (...args: unknown[]) => void
  }
}

class CoreAPI {
  private _getMainWindow: () => BrowserWindow | undefined
  private _eventBus: EventEmitter
  private _ipcHandlers: Map<string, boolean>
  private _panelRegistry: Map<string, PanelDefinition>

  constructor({ mainWindow }: { mainWindow: () => BrowserWindow | undefined }) {
    this._getMainWindow = mainWindow
    this._eventBus = new EventEmitter()
    this._ipcHandlers = new Map()
    this._panelRegistry = new Map()
  }

  /** Called once per plugin — returns a scoped API object */
  createForPlugin(manifest: PluginManifest): SandboxedAPI {
    const pluginId = manifest.id
    const permissions = manifest.permissions || []
    const self = this

    return {
      pluginId,

      /** Scoped key-value store per plugin */
      store: new Store({
        name: `plugin-${pluginId}`,
        cwd: path.join(app.getPath('userData'), 'plugin-stores'),
      }),

      /** Subscribe to app-wide events */
      events: {
        on: (event: string, fn: (...args: unknown[]) => void) => self._eventBus.on(event, fn),
        off: (event: string, fn: (...args: unknown[]) => void) => self._eventBus.off(event, fn),
        emit: (event: string, data: unknown) => {
          self._eventBus.emit(`plugin:${pluginId}:${event}`, data)
        },
      },

      /** Register an IPC handler from plugin → renderer */
      ipc: {
        handle: (channel: string, handler: (...args: unknown[]) => unknown) => {
          const fullChannel = `plugin:${pluginId}:${channel}`
          if (self._ipcHandlers.has(fullChannel)) {
            ipcMain.removeHandler(fullChannel)
          }
          ipcMain.handle(fullChannel, handler)
          self._ipcHandlers.set(fullChannel, true)
        },
        send: (channel: string, data: unknown) => {
          const win = self._getMainWindow()
          if (win) win.webContents.send(`plugin:${pluginId}:${channel}`, data)
        },
      },

      /** Register a UI panel that shows in sidebar */
      ui: {
        registerPanel: (panelDef: Omit<PanelDefinition, 'pluginId'>) => {
          const fullPanel: PanelDefinition = { pluginId, ...panelDef }
          self._panelRegistry.set(pluginId, fullPanel)
          const win = self._getMainWindow()
          if (win) win.webContents.send('core:panel:register', fullPanel)
        },
      },

      /** Device access — gated by permissions */
      device: permissions.includes('serial')
        ? (require('./device/serial-adapter') as SerialAdapter)
        : null,
      hid: permissions.includes('hid')
        ? (require('./device/hid-adapter') as HidAdapter)
        : null,

      /** App-level utilities */
      app: {
        getVersion: () => app.getVersion(),
        getPath: (name: Parameters<typeof app.getPath>[0]) => app.getPath(name),
      },

      /** Logger scoped to plugin */
      log: {
        info: (...args: unknown[]) => console.log(`[${pluginId}]`, ...args),
        warn: (...args: unknown[]) => console.warn(`[${pluginId}]`, ...args),
        error: (...args: unknown[]) => console.error(`[${pluginId}]`, ...args),
      },
    }
  }

  /** Cleanup all IPC handlers registered by a plugin */
  cleanupPlugin(pluginId: string): void {
    for (const [channel] of this._ipcHandlers) {
      if (channel.startsWith(`plugin:${pluginId}:`)) {
        ipcMain.removeHandler(channel)
        this._ipcHandlers.delete(channel)
      }
    }
    this._panelRegistry.delete(pluginId)
  }

  /** For core app use */
  emit(event: string, data: unknown): void {
    this._eventBus.emit(event, data)
  }

  getPanels(): PanelDefinition[] {
    return Array.from(this._panelRegistry.values())
  }
}

export default CoreAPI
