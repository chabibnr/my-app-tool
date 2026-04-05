import { create } from 'zustand'
import type { Plugin, PanelDefinition, PluginError, PluginManifest } from '../../types/global'

interface PluginStore {
  plugins: Plugin[]
  panels: PanelDefinition[]
  errors: PluginError[]
  loadPlugin: (pluginPath: string) => Promise<void>
  fetchPlugins: () => Promise<void>
  unloadPlugin: (pluginId: string) => Promise<void>
  reloadPlugin: (pluginId: string) => Promise<void>
  init: () => void
}

export const usePluginStore = create<PluginStore>((set, get) => ({
  plugins: [],
  panels: [],
  errors: [],

  async loadPlugin(pluginPath: string): Promise<void> {
    await window.electronAPI.plugins.load(pluginPath)
    await get().fetchPlugins()
  },

  async fetchPlugins(): Promise<void> {
    const plugins = await window.electronAPI.plugins.list()
    const panels = await window.electronAPI.panels.list()
    set({ plugins, panels })
  },

  async unloadPlugin(pluginId: string): Promise<void> {
    await window.electronAPI.plugins.unload(pluginId)
    set(s => ({ plugins: s.plugins.filter(p => p.id !== pluginId) }))
  },

  async reloadPlugin(pluginId: string): Promise<void> {
    await window.electronAPI.plugins.reload(pluginId)
    await get().fetchPlugins()
  },

  init(): void {
    window.electronAPI.plugins.onActivated((manifest) => {
      const m = manifest as PluginManifest
      set(s => {
        const existing = s.plugins.find(p => p.id === m.id)
        if (existing) {
          return { plugins: s.plugins.map(p => (p.id === m.id ? { ...p, status: 'active' as const } : p)) }
        }
        return { plugins: [...s.plugins, { ...m, permissions: m.permissions ?? [], panel: m.panel ?? null, path: '', status: 'active' as const }] }
      })
    })

    window.electronAPI.plugins.onDeactivated((data) => {
      const { id } = data as { id: string }
      set(s => ({ plugins: s.plugins.filter(p => p.id !== id) }))
    })

    window.electronAPI.plugins.onError((data) => {
      set(s => ({ errors: [...s.errors, data as PluginError] }))
    })

    window.electronAPI.panels.onRegister((panel) => {
      const p = panel as PanelDefinition
      set(s => ({ panels: [...s.panels.filter(existing => existing.pluginId !== p.pluginId), p] }))
    })
  },
}))
