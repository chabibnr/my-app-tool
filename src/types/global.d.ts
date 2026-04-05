export interface PluginManifest {
  id: string
  name: string
  version: string
  description?: string
  main?: string
  permissions?: string[]
  panel?: {
    title: string
    icon: string
    position: string
  }
}

export interface Plugin {
  id: string
  name: string
  version: string
  description?: string
  permissions: string[]
  panel: PluginManifest['panel'] | null
  path: string
  status: 'active' | 'inactive' | 'error'
  activatedAt?: number
}

export interface PluginError {
  id?: string
  pluginId?: string
  message?: string
  error?: string
}

export interface PanelDefinition {
  pluginId: string
  title: string
  icon: string
  componentId?: string
}

export interface PluginRecord {
  manifest: PluginManifest
  module: PluginModule
  path: string
  status: 'active' | 'inactive' | 'error'
  activatedAt: number
}

export interface PluginModule {
  activate: (api: unknown) => void | Promise<void>
  deactivate?: () => void | Promise<void>
}
