import { useEffect, useState } from 'react'
import {
  LayoutGrid, RefreshCw, X, ChevronDown, ChevronUp,
  Terminal, Settings, Monitor, Radio, ClipboardList, BarChart2, Zap,
  AlertCircle, Puzzle,
} from 'lucide-react'
import { usePluginStore } from './stores/plugin-store'
import Titlebar from './components/Titlebar'
import PluginsPage from './pages/PluginsPage'
import SshTerminalPage from './pages/SshTerminalPage'
import { cn } from './lib/utils'

// Map pluginId → renderer component
const PLUGIN_PAGES = {
  'ssh-terminal': SshTerminalPage,
}

// Built-in pages accessible from sidebar (not plugin panels)
const CORE_PAGES = [
  { id: 'plugins', label: 'Plugins', icon: Puzzle },
]

export default function App() {
  const { plugins, panels, errors, fetchPlugins, reloadPlugin, unloadPlugin, init } = usePluginStore()
  // activePage: 'plugins' | panel pluginId
  const [activePage, setActivePage] = useState('plugins')

  useEffect(() => {
    init()
    fetchPlugins()
  }, [])

  const activePanel = panels.find(p => p.pluginId === activePage) ?? null

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-background">
      <Titlebar title="Plugin App" />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="flex flex-col shrink-0 w-56 bg-sidebar border-r border-sidebar-border overflow-hidden">
          {/* Core nav */}
          <nav className="p-2 space-y-0.5 border-b border-sidebar-border">
            {CORE_PAGES.map(({ id, label, icon: Icon }) => (
              <NavItem
                key={id}
                icon={Icon}
                label={label}
                active={activePage === id}
                onClick={() => setActivePage(id)}
              />
            ))}
          </nav>

          {/* Plugin panels nav */}
          <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
            {panels.length > 0 && (
              <p className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
                Panels
              </p>
            )}

            {panels.map((panel) => (
              <NavItem
                key={panel.pluginId}
                icon={ICON_MAP[panel.icon]}
                label={panel.title}
                active={activePage === panel.pluginId}
                onClick={() => setActivePage(panel.pluginId)}
              />
            ))}
          </div>

          {/* Plugin list footer */}
          <PluginList
            plugins={plugins}
            onReload={reloadPlugin}
            onUnload={unloadPlugin}
          />
        </aside>

        {/* Main content */}
        <main className="relative flex flex-col flex-1 overflow-hidden">
          {/* Error bar */}
          {errors.length > 0 && (
            <div className="flex items-start gap-2 px-4 py-2 bg-destructive/10 border-b border-destructive/20 text-destructive text-xs shrink-0">
              <AlertCircle className="size-3.5 mt-0.5 shrink-0" />
              <div className="space-y-0.5">
                {errors.map((e, i) => (
                  <div key={i}>[{e.pluginId ?? e.id}] {e.message ?? e.error}</div>
                ))}
              </div>
            </div>
          )}

          {/* Page content */}
          {activePage === 'plugins' && <PluginsPage />}

          {activePage !== 'plugins' && (() => {
            const PluginPage = PLUGIN_PAGES[activePage]
            if (PluginPage) return <PluginPage />
            if (activePanel) return (
              <div className="flex-1 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                <LayoutGrid className="size-8 opacity-20" />
                <p className="text-sm">
                  Panel <span className="text-foreground font-medium">{activePanel.title}</span> is active
                </p>
                <p className="text-xs opacity-50">Plugin UI renders here</p>
              </div>
            )
            return (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground">
                <div className="size-14 rounded-2xl bg-muted/30 flex items-center justify-center">
                  <Zap className="size-7 opacity-30" />
                </div>
                <div className="text-center space-y-1">
                  <h2 className="text-sm font-medium text-foreground">No panel selected</h2>
                  <p className="text-xs opacity-60">Install a plugin with a panel to get started</p>
                </div>
              </div>
            )
          })()}
        </main>
      </div>
    </div>
  )
}

function NavItem({ icon: Icon, label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-2.5 w-full px-3 py-2 rounded-md text-sm transition-colors text-left',
        active
          ? 'bg-sidebar-active text-foreground font-medium'
          : 'text-muted-foreground hover:text-foreground hover:bg-white/5',
      )}
    >
      {Icon && <Icon className="size-4 shrink-0" />}
      <span className="truncate">{label}</span>
    </button>
  )
}

function PluginList({ plugins, onReload, onUnload }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="border-t border-sidebar-border">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center justify-between w-full px-3 py-2.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <span className="font-semibold uppercase tracking-wider text-[10px]">
          Loaded ({plugins.length})
        </span>
        {open ? <ChevronDown className="size-3" /> : <ChevronUp className="size-3" />}
      </button>

      {open && (
        <div className="pb-2 px-2 space-y-0.5 max-h-40 overflow-y-auto">
          {plugins.map((p) => (
            <div key={p.id} className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-white/5 group">
              <span className="flex-1 text-xs text-foreground truncate">{p.name}</span>
              <span className={cn(
                'text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0',
                p.status === 'active' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-muted text-muted-foreground',
              )}>
                {p.status}
              </span>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => onReload(p.id)}
                  className="p-1 rounded hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
                  title="Reload"
                >
                  <RefreshCw className="size-3" />
                </button>
                <button
                  onClick={() => onUnload(p.id)}
                  className="p-1 rounded hover:bg-red-500/20 hover:text-red-400 text-muted-foreground transition-colors"
                  title="Unload"
                >
                  <X className="size-3" />
                </button>
              </div>
            </div>
          ))}
          {plugins.length === 0 && (
            <p className="px-2 py-1 text-xs text-muted-foreground/50 italic">No plugins loaded</p>
          )}
        </div>
      )}
    </div>
  )
}

const ICON_MAP = {
  terminal: Terminal,
  settings: Settings,
  monitor: Monitor,
  device: Radio,
  log: ClipboardList,
  chart: BarChart2,
}
