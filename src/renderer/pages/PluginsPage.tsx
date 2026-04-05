import { useState } from 'react'
import {
  Plus, RefreshCw, Trash2, Package, AlertCircle,
  CheckCircle2, Clock, FolderOpen, Cpu, Usb, HardDrive,
  ChevronRight, Loader2,
} from 'lucide-react'
import { usePluginStore } from '../stores/plugin-store'
import { cn } from '../lib/utils'
import type { Plugin, PluginError } from '../../types/global'

type ActionState = 'reloading' | 'unloading'
type ToastType = 'success' | 'error'

interface Toast {
  message: string
  type: ToastType
}

export default function PluginsPage() {
  const { plugins, errors, loadPlugin, reloadPlugin, unloadPlugin } = usePluginStore()
  const [loading, setLoading] = useState(false)
  const [actionStates, setActionStates] = useState<Record<string, ActionState>>({})
  const [toast, setToast] = useState<Toast | null>(null)

  function showToast(message: string, type: ToastType = 'success') {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  async function handleLoad() {
    const folder = await window.electronAPI.dialog.openFolder()
    if (!folder) return
    setLoading(true)
    try {
      await loadPlugin(folder)
      showToast('Plugin loaded successfully')
    } catch (err) {
      showToast((err as Error).message, 'error')
    } finally {
      setLoading(false)
    }
  }

  async function handleReload(id: string) {
    setActionStates(s => ({ ...s, [id]: 'reloading' }))
    try {
      await reloadPlugin(id)
      showToast(`${id} reloaded`)
    } catch (err) {
      showToast((err as Error).message, 'error')
    } finally {
      setActionStates(s => { const n = { ...s }; delete n[id]; return n })
    }
  }

  async function handleUnload(id: string) {
    setActionStates(s => ({ ...s, [id]: 'unloading' }))
    try {
      await unloadPlugin(id)
      showToast(`${id} unloaded`)
    } catch (err) {
      showToast((err as Error).message, 'error')
    } finally {
      setActionStates(s => { const n = { ...s }; delete n[id]; return n })
    }
  }

  const activeCount = plugins.filter(p => p.status === 'active').length

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
        <div>
          <h1 className="text-base font-semibold text-foreground">Plugin Manager</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {plugins.length} installed &middot; {activeCount} active
          </p>
        </div>

        <button
          onClick={handleLoad}
          disabled={loading}
          className={cn(
            'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
            'bg-primary text-primary-foreground hover:bg-primary/90',
            loading && 'opacity-60 cursor-not-allowed',
          )}
        >
          {loading
            ? <Loader2 className="size-3.5 animate-spin" />
            : <Plus className="size-3.5" />
          }
          Load Plugin
        </button>
      </div>

      {/* Error banner */}
      {errors.length > 0 && (
        <div className="flex items-start gap-2.5 mx-6 mt-4 px-3 py-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs shrink-0">
          <AlertCircle className="size-3.5 mt-0.5 shrink-0" />
          <div className="space-y-0.5">
            {errors.map((e, i) => (
              <div key={i}><span className="font-medium">[{e.pluginId ?? e.id}]</span> {e.message ?? e.error}</div>
            ))}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {plugins.length === 0 ? (
          <EmptyState onLoad={handleLoad} loading={loading} />
        ) : (
          <div className="grid grid-cols-1 gap-3 max-w-3xl">
            {plugins.map((plugin) => (
              <PluginCard
                key={plugin.id}
                plugin={plugin}
                actionState={actionStates[plugin.id]}
                onReload={() => handleReload(plugin.id)}
                onUnload={() => handleUnload(plugin.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className={cn(
          'absolute bottom-5 right-5 flex items-center gap-2 px-4 py-2.5 rounded-lg shadow-lg text-sm font-medium',
          'border transition-all duration-200',
          toast.type === 'error'
            ? 'bg-destructive/10 border-destructive/30 text-destructive'
            : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
        )}>
          {toast.type === 'error'
            ? <AlertCircle className="size-3.5" />
            : <CheckCircle2 className="size-3.5" />
          }
          {toast.message}
        </div>
      )}
    </div>
  )
}

interface PluginCardProps {
  plugin: Plugin
  actionState: ActionState | undefined
  onReload: () => void
  onUnload: () => void
}

function PluginCard({ plugin, actionState, onReload, onUnload }: PluginCardProps) {
  const [expanded, setExpanded] = useState(false)
  const busy = !!actionState

  return (
    <div className={cn(
      'rounded-lg border bg-muted/20 transition-colors',
      busy ? 'border-border/50 opacity-75' : 'border-border hover:border-border/80',
    )}>
      {/* Main row */}
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Icon */}
        <div className="size-9 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
          <Package className="size-4 text-muted-foreground" />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground truncate">{plugin.name}</span>
            <span className="text-[10px] text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded font-mono shrink-0">
              v{plugin.version}
            </span>
            <StatusBadge status={plugin.status} />
          </div>
          {plugin.description && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{plugin.description}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setExpanded(e => !e)}
            className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
            title="Details"
          >
            <ChevronRight className={cn('size-3.5 transition-transform', expanded && 'rotate-90')} />
          </button>
          <button
            onClick={onReload}
            disabled={busy}
            className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors disabled:opacity-40"
            title="Reload"
          >
            {actionState === 'reloading'
              ? <Loader2 className="size-3.5 animate-spin" />
              : <RefreshCw className="size-3.5" />
            }
          </button>
          <button
            onClick={onUnload}
            disabled={busy}
            className="p-1.5 rounded text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-40"
            title="Unload"
          >
            {actionState === 'unloading'
              ? <Loader2 className="size-3.5 animate-spin" />
              : <Trash2 className="size-3.5" />
            }
          </button>
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-border/50 px-4 py-3 space-y-3">
          {/* Permissions */}
          <div>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold mb-1.5">
              Permissions
            </p>
            {plugin.permissions.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {plugin.permissions.map(perm => (
                  <PermissionBadge key={perm} permission={perm} />
                ))}
              </div>
            ) : (
              <span className="text-xs text-muted-foreground/50 italic">No special permissions</span>
            )}
          </div>

          {/* Meta */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
            <MetaRow icon={<Package className="size-3" />} label="ID" value={plugin.id} mono />
            <MetaRow
              icon={<Clock className="size-3" />}
              label="Activated"
              value={plugin.activatedAt ? new Date(plugin.activatedAt).toLocaleTimeString() : '—'}
            />
            {plugin.panel && (
              <MetaRow icon={<FolderOpen className="size-3" />} label="Panel" value={plugin.panel.title} />
            )}
            <MetaRow icon={<FolderOpen className="size-3" />} label="Path" value={plugin.path} mono />
          </div>
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: Plugin['status'] }) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0',
      status === 'active'
        ? 'bg-emerald-500/15 text-emerald-400'
        : 'bg-yellow-500/15 text-yellow-400',
    )}>
      <span className={cn(
        'size-1.5 rounded-full',
        status === 'active' ? 'bg-emerald-400' : 'bg-yellow-400',
      )} />
      {status}
    </span>
  )
}

const PERMISSION_MAP: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  serial: { icon: <Cpu className="size-3" />, label: 'Serial', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
  hid: { icon: <Usb className="size-3" />, label: 'HID', color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
  storage: { icon: <HardDrive className="size-3" />, label: 'Storage', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
}

function PermissionBadge({ permission }: { permission: string }) {
  const entry = PERMISSION_MAP[permission] ?? { icon: <Package className="size-3" />, label: permission, color: 'text-muted-foreground bg-muted/40 border-border' }

  return (
    <span className={cn('inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border font-medium', entry.color)}>
      {entry.icon}
      {entry.label}
    </span>
  )
}

interface MetaRowProps {
  icon: React.ReactNode
  label: string
  value: string
  mono?: boolean
}

function MetaRow({ icon, label, value, mono }: MetaRowProps) {
  return (
    <div className="flex items-start gap-1.5">
      <span className="text-muted-foreground/50 mt-0.5 shrink-0">{icon}</span>
      <div className="min-w-0">
        <span className="text-[10px] text-muted-foreground/60 uppercase tracking-wider block">{label}</span>
        <span className={cn('text-xs text-foreground/80 break-all', mono && 'font-mono text-[10px]')}>{value}</span>
      </div>
    </div>
  )
}

interface EmptyStateProps {
  onLoad: () => void
  loading: boolean
}

function EmptyState({ onLoad, loading }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
      <div className="size-16 rounded-2xl bg-muted/30 flex items-center justify-center">
        <Package className="size-7 text-muted-foreground/30" />
      </div>
      <div className="space-y-1">
        <h2 className="text-sm font-medium text-foreground">No plugins installed</h2>
        <p className="text-xs text-muted-foreground">Load a plugin folder to get started</p>
      </div>
      <button
        onClick={onLoad}
        disabled={loading}
        className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-60"
      >
        <FolderOpen className="size-3.5" />
        Browse for Plugin
      </button>
    </div>
  )
}

// Needed for inline error display - re-export the PluginError type usage
export type { PluginError }
