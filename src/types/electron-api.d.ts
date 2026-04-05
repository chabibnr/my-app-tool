import type { Plugin, PluginManifest, PluginError, PanelDefinition } from './global'

export interface ElectronAPI {
  plugins: {
    list: () => Promise<Plugin[]>
    load: (pluginPath: string) => Promise<PluginManifest>
    unload: (pluginId: string) => Promise<{ ok: boolean }>
    reload: (pluginId: string) => Promise<{ ok: boolean }>
    onActivated: (fn: (manifest: PluginManifest) => void) => void
    onDeactivated: (fn: (data: { id: string }) => void) => void
    onError: (fn: (data: PluginError) => void) => void
  }
  dialog: {
    openFolder: () => Promise<string | null>
  }
  panels: {
    list: () => Promise<PanelDefinition[]>
    onRegister: (fn: (panel: PanelDefinition) => void) => void
  }
  pluginCall: (pluginId: string, channel: string, data?: unknown) => Promise<unknown>
  pluginOn: (pluginId: string, channel: string, fn: (data: unknown) => void) => () => void
  window: {
    minimize: () => void
    maximize: () => void
    close: () => void
    onMaximizeChange: (fn: (maximized: boolean) => void) => () => void
  }
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
