import { useEffect, useState } from 'react'
import {
  LayoutGrid,
  Terminal, Settings, Monitor, Radio, ClipboardList, BarChart2, Zap,
  AlertCircle, Puzzle,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { usePluginStore } from './stores/plugin-store'
import Titlebar from './components/Titlebar'
import PluginsPage from './pages/PluginsPage'
import SshTerminalPage from './pages/SshTerminalPage'
import { cn } from './lib/utils'
import type { PanelDefinition } from '../types/global'

// Map pluginId → renderer component
const PLUGIN_PAGES: Record<string, React.ComponentType> = {
  'ssh-terminal': SshTerminalPage,
}

// Built-in pages accessible from sidebar (not plugin panels)
const CORE_PAGES = [
  { id: 'plugins', label: 'Plugins', icon: Puzzle },
]

export default function App() {
  const { panels, errors, fetchPlugins, init } = usePluginStore()
  const [activePage, setActivePage] = useState('plugins')

  useEffect(() => {
    init()
    void fetchPlugins()
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

          {/* User info footer */}
          <UserInfo />
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

interface NavItemProps {
  icon: LucideIcon | undefined
  label: string
  active: boolean
  onClick: () => void
}

function NavItem({ icon: Icon, label, active, onClick }: NavItemProps) {
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

interface UserInfoProps {
  name?: string
  email?: string
  avatarUrl?: string
}

function UserInfo({ name = 'Developer', email = 'dev@example.com', avatarUrl }: UserInfoProps) {
  const initials = name
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <div className="border-t border-sidebar-border px-3 py-3 flex items-center gap-2.5 shrink-0">
      {/* Avatar circle */}
      <div className="size-8 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center shrink-0 overflow-hidden">
        {avatarUrl
          ? <img src={avatarUrl} alt={name} className="size-full object-cover" />
          : <span className="text-[11px] font-semibold text-blue-400 leading-none">{initials}</span>
        }
      </div>

      {/* Name & email */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-foreground truncate leading-tight">{name}</p>
        <p className="text-[10px] text-muted-foreground truncate leading-tight mt-0.5">{email}</p>
      </div>
    </div>
  )
}

const ICON_MAP: Record<string, LucideIcon | undefined> = {
  terminal: Terminal,
  settings: Settings,
  monitor: Monitor,
  device: Radio,
  log: ClipboardList,
  chart: BarChart2,
}

// Needed for panel type reference
export type { PanelDefinition }
