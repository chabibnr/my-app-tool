import * as path from 'path'
import * as fs from 'fs'
import { app } from 'electron'
import { EventEmitter } from 'events'
import type CoreAPI from './core-api'
import type { Plugin, PluginManifest, PluginRecord } from '../types/global'

const PLUGIN_DIRS = [
  path.join(app.getPath('userData'), 'plugins'),
  path.join(__dirname, '../../plugins'),
]

class PluginManager extends EventEmitter {
  private coreAPI: InstanceType<typeof CoreAPI>
  private plugins: Map<string, PluginRecord>

  constructor(coreAPI: InstanceType<typeof CoreAPI>) {
    super()
    this.coreAPI = coreAPI
    this.plugins = new Map()
  }

  async loadAll(): Promise<void> {
    for (const dir of PLUGIN_DIRS) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
        continue
      }
      const entries = fs.readdirSync(dir, { withFileTypes: true })
      for (const entry of entries) {
        if (!entry.isDirectory()) continue
        await this.loadPlugin(path.join(dir, entry.name)).catch((err: Error) => {
          console.error(`[PluginManager] Failed to load ${entry.name}:`, err.message)
          this.emit('plugin:error', { id: entry.name, error: err.message })
        })
      }
    }
    this.emit('plugins:loaded', this.getAll())
  }

  async loadPlugin(pluginPath: string): Promise<PluginManifest> {
    const manifestPath = path.join(pluginPath, 'manifest.json')
    if (!fs.existsSync(manifestPath)) throw new Error('manifest.json not found')

    const manifest: PluginManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))
    this._validateManifest(manifest)

    if (this.plugins.has(manifest.id)) {
      throw new Error(`Plugin ${manifest.id} already loaded`)
    }

    const mainPath = path.join(pluginPath, manifest.main || 'main.js')
    if (!fs.existsSync(mainPath)) throw new Error(`main file not found: ${mainPath}`)

    const pluginModule = require(mainPath) as { activate: (api: unknown) => void | Promise<void>; deactivate?: () => void | Promise<void> }
    if (typeof pluginModule.activate !== 'function') {
      throw new Error('Plugin must export activate(coreAPI)')
    }

    const sandboxedAPI = this.coreAPI.createForPlugin(manifest)

    await pluginModule.activate(sandboxedAPI)

    this.plugins.set(manifest.id, {
      manifest,
      module: pluginModule,
      path: pluginPath,
      status: 'active',
      activatedAt: Date.now(),
    })

    this.emit('plugin:activated', manifest)
    console.log(`[PluginManager] Loaded: ${manifest.id} v${manifest.version}`)
    return manifest
  }

  async unloadPlugin(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId)
    if (!plugin) throw new Error(`Plugin ${pluginId} not loaded`)

    if (typeof plugin.module.deactivate === 'function') {
      await plugin.module.deactivate()
    }

    this.coreAPI.cleanupPlugin(pluginId)
    delete require.cache[require.resolve(path.join(plugin.path, plugin.manifest.main || 'main.js'))]
    this.plugins.delete(pluginId)
    this.emit('plugin:deactivated', { id: pluginId })
  }

  async unloadAll(): Promise<void> {
    for (const [id] of this.plugins) {
      await this.unloadPlugin(id).catch(console.error)
    }
  }

  async reloadPlugin(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId)
    if (!plugin) throw new Error(`Plugin ${pluginId} not loaded`)
    const pluginPath = plugin.path
    await this.unloadPlugin(pluginId)
    await this.loadPlugin(pluginPath)
  }

  getAll(): Plugin[] {
    return Array.from(this.plugins.values()).map(p => ({
      id: p.manifest.id,
      name: p.manifest.name,
      version: p.manifest.version,
      description: p.manifest.description,
      permissions: p.manifest.permissions || [],
      panel: p.manifest.panel || null,
      path: p.path,
      status: p.status,
      activatedAt: p.activatedAt,
    }))
  }

  get(pluginId: string): PluginRecord | undefined {
    return this.plugins.get(pluginId)
  }

  private _validateManifest(manifest: Partial<PluginManifest>): void {
    const required: Array<keyof PluginManifest> = ['id', 'name', 'version']
    for (const field of required) {
      if (!manifest[field]) throw new Error(`manifest.json missing field: ${field}`)
    }
    if (!/^[a-z0-9-]+$/.test(manifest.id!)) {
      throw new Error('manifest.id must be lowercase alphanumeric with dashes')
    }
  }
}

export default PluginManager
