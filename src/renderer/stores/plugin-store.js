import { create } from 'zustand'

export const usePluginStore = create((set, get) => ({
  plugins: [],
  panels: [],
  errors: [],

  async loadPlugin(pluginPath) {
    await window.electronAPI.plugins.load(pluginPath)
    await get().fetchPlugins()
  },

  async fetchPlugins() {
    const plugins = await window.electronAPI.plugins.list()
    const panels = await window.electronAPI.panels.list()
    set({ plugins, panels })
  },

  async unloadPlugin(pluginId) {
    await window.electronAPI.plugins.unload(pluginId)
    set(s => ({ plugins: s.plugins.filter(p => p.id !== pluginId) }))
  },

  async reloadPlugin(pluginId) {
    await window.electronAPI.plugins.reload(pluginId)
    await get().fetchPlugins()
  },

  init() {
    window.electronAPI.plugins.onActivated((manifest) => {
      set(s => {
        const existing = s.plugins.find(p => p.id === manifest.id)
        if (existing) return { plugins: s.plugins.map(p => p.id === manifest.id ? { ...p, status: 'active' } : p) }
        return { plugins: [...s.plugins, { ...manifest, status: 'active' }] }
      })
    })

    window.electronAPI.plugins.onDeactivated(({ id }) => {
      set(s => ({ plugins: s.plugins.filter(p => p.id !== id) }))
    })

    window.electronAPI.plugins.onError((data) => {
      set(s => ({ errors: [...s.errors, data] }))
    })

    window.electronAPI.panels.onRegister((panel) => {
      set(s => ({ panels: [...s.panels.filter(p => p.pluginId !== panel.pluginId), panel] }))
    })
  },
}))
