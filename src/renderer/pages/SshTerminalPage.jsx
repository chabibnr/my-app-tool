import { useEffect, useRef, useState, useCallback } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'
import {
  Plus, X, Loader2, AlertCircle, Terminal as TerminalIcon,
  Key, Lock, Server, User, Hash, History, Trash2, Clock,
} from 'lucide-react'
import { usePlugin } from '../hooks/use-plugin'
import { cn } from '../lib/utils'

const PLUGIN_ID = 'ssh-terminal'

let sessionCounter = 0
function newSessionId() {
  return `session-${++sessionCounter}-${Date.now()}`
}

export default function SshTerminalPage() {
  const { call, on } = usePlugin(PLUGIN_ID)
  const [sessions, setSessions] = useState([])       // [{ id, label, status, host, username }]
  const [activeId, setActiveId] = useState(null)
  const [showForm, setShowForm] = useState(false)

  // xterm instances: { [sessionId]: { terminal, fitAddon } }
  const instances = useRef({})
  // DOM container refs per session: { [sessionId]: HTMLDivElement }
  const containerRefs = useRef({})

  // Subscribe to plugin events once
  useEffect(() => {
    const unsubData = on('data', ({ sessionId, data }) => {
      const inst = instances.current[sessionId]
      if (inst) {
        inst.terminal.write(Uint8Array.from(atob(data), c => c.charCodeAt(0)))
      }
    })

    const unsubClosed = on('session-closed', ({ sessionId }) => {
      setSessions(s => s.map(sess =>
        sess.id === sessionId ? { ...sess, status: 'disconnected' } : sess
      ))
    })

    return () => {
      unsubData()
      unsubClosed()
    }
  }, [on])

  // Attach a new xterm instance to the container for a given session
  const initTerminal = useCallback((sessionId, element) => {
    if (!element || instances.current[sessionId]) return

    const terminal = new Terminal({
      theme: {
        background: '#0d0d14',
        foreground: '#e2e2e8',
        cursor: '#6c8ef5',
        selectionBackground: '#3a4a7a',
        black: '#1a1a2e',
        red: '#f56c6c',
        green: '#6cf58a',
        yellow: '#f5c26c',
        blue: '#6c8ef5',
        magenta: '#c46cf5',
        cyan: '#6cd8f5',
        white: '#e2e2e8',
        brightBlack: '#3a3a50',
        brightRed: '#ff8080',
        brightGreen: '#80ff9a',
        brightYellow: '#ffd080',
        brightBlue: '#80a0ff',
        brightMagenta: '#d880ff',
        brightCyan: '#80e8ff',
        brightWhite: '#ffffff',
      },
      fontFamily: '"Cascadia Code", "JetBrains Mono", "Fira Code", monospace',
      fontSize: 13,
      lineHeight: 1.4,
      cursorBlink: true,
      allowTransparency: false,
      scrollback: 5000,
    })

    const fitAddon = new FitAddon()
    terminal.loadAddon(fitAddon)
    terminal.open(element)
    fitAddon.fit()

    // Send keystrokes to the plugin
    terminal.onData((data) => {
      call('send', {
        sessionId,
        data: btoa(data),
      }).catch(() => {})
    })

    instances.current[sessionId] = { terminal, fitAddon }

    return () => {
      terminal.dispose()
      delete instances.current[sessionId]
    }
  }, [call])

  // Re-fit active terminal on resize
  useEffect(() => {
    if (!activeId) return
    const inst = instances.current[activeId]
    if (!inst) return

    const observer = new ResizeObserver(() => {
      inst.fitAddon.fit()
      const { cols, rows } = inst.terminal
      call('resize', { sessionId: activeId, cols, rows }).catch(() => {})
    })

    const el = containerRefs.current[activeId]
    if (el) observer.observe(el)
    return () => observer.disconnect()
  }, [activeId, call])

  async function handleConnect(formData) {
    const sessionId = newSessionId()
    const label = `${formData.username}@${formData.host}`

    setSessions(s => [...s, {
      id: sessionId,
      label,
      host: formData.host,
      username: formData.username,
      status: 'connecting',
    }])
    setActiveId(sessionId)
    setShowForm(false)

    try {
      await call('connect', {
        sessionId,
        host: formData.host,
        port: parseInt(formData.port) || 22,
        username: formData.username,
        password: formData.authType === 'password' ? formData.password : undefined,
        privateKeyPath: formData.authType === 'key' ? formData.keyPath : undefined,
      })
      setSessions(s => s.map(sess =>
        sess.id === sessionId ? { ...sess, status: 'connected' } : sess
      ))
    } catch (err) {
      setSessions(s => s.map(sess =>
        sess.id === sessionId ? { ...sess, status: 'error', error: err.message } : sess
      ))
    }
  }

  function handleCloseSession(sessionId) {
    call('disconnect', { sessionId }).catch(() => {})
    const inst = instances.current[sessionId]
    if (inst) {
      inst.terminal.dispose()
      delete instances.current[sessionId]
    }
    setSessions(s => {
      const next = s.filter(sess => sess.id !== sessionId)
      if (activeId === sessionId) setActiveId(next[next.length - 1]?.id ?? null)
      return next
    })
  }

  const activeSession = sessions.find(s => s.id === activeId)

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#0d0d14]">
      {/* Tab bar */}
      <div className="flex items-center bg-[#13131f] border-b border-white/8 shrink-0 overflow-x-auto">
        {sessions.map(sess => (
          <Tab
            key={sess.id}
            session={sess}
            active={sess.id === activeId}
            onClick={() => setActiveId(sess.id)}
            onClose={() => handleCloseSession(sess.id)}
          />
        ))}

        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 px-3 py-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors shrink-0 border-r border-white/8"
        >
          <Plus className="size-3.5" />
          New
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 relative overflow-hidden">
        {/* Empty state */}
        {sessions.length === 0 && !showForm && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
            <div className="size-16 rounded-2xl bg-white/5 flex items-center justify-center">
              <TerminalIcon className="size-7 text-muted-foreground/40" />
            </div>
            <div className="text-center space-y-1">
              <h2 className="text-sm font-medium text-foreground">No active sessions</h2>
              <p className="text-xs text-muted-foreground">Connect to an SSH server to get started</p>
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white transition-colors"
            >
              <Plus className="size-3.5" />
              New Connection
            </button>
          </div>
        )}

        {/* Terminal panes — all mounted, only active visible */}
        {sessions.map(sess => (
          <TerminalPane
            key={sess.id}
            session={sess}
            active={sess.id === activeId}
            containerRefs={containerRefs}
            onInit={initTerminal}
          />
        ))}

        {/* Connection form overlay */}
        {showForm && (
          <ConnectForm
            call={call}
            onConnect={handleConnect}
            onCancel={() => setShowForm(false)}
          />
        )}
      </div>

      {/* Status bar */}
      {activeSession && (
        <div className="flex items-center gap-3 px-3 py-1 bg-[#0a0a12] border-t border-white/8 shrink-0 text-[11px] text-muted-foreground/60">
          <StatusDot status={activeSession.status} />
          <span>{activeSession.label}</span>
          {activeSession.error && (
            <span className="text-red-400 ml-2">{activeSession.error}</span>
          )}
          <span className="ml-auto">SSH</span>
        </div>
      )}
    </div>
  )
}

function Tab({ session, active, onClick, onClose }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 px-3 py-2.5 text-xs border-r border-white/8 transition-colors shrink-0 min-w-0 max-w-[180px] group',
        active
          ? 'bg-[#0d0d14] text-foreground border-t-2 border-t-blue-500 -mt-px'
          : 'text-muted-foreground hover:text-foreground hover:bg-white/5',
      )}
    >
      <StatusDot status={session.status} />
      <span className="truncate">{session.label}</span>
      <span
        onClick={e => { e.stopPropagation(); onClose() }}
        className="ml-auto p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-white/10 transition-all shrink-0"
      >
        <X className="size-2.5" />
      </span>
    </button>
  )
}

function TerminalPane({ session, active, containerRefs, onInit }) {
  const divRef = useCallback((el) => {
    if (!el) return
    containerRefs.current[session.id] = el
    onInit(session.id, el)
  }, [session.id, onInit, containerRefs])

  return (
    <div
      className={cn('absolute inset-0 flex flex-col', !active && 'invisible pointer-events-none')}
    >
      {/* Error banner */}
      {session.status === 'error' && (
        <div className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border-b border-red-500/20 text-red-400 text-xs shrink-0">
          <AlertCircle className="size-3.5 shrink-0" />
          {session.error || 'Connection failed'}
        </div>
      )}

      {/* Connecting overlay */}
      {session.status === 'connecting' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[#0d0d14] z-10">
          <Loader2 className="size-6 text-blue-400 animate-spin" />
          <span className="text-xs text-muted-foreground">Connecting to {session.host}…</span>
        </div>
      )}

      {/* xterm container */}
      <div ref={divRef} className="flex-1 overflow-hidden p-1" />
    </div>
  )
}

function StatusDot({ status }) {
  return (
    <span className={cn(
      'size-1.5 rounded-full shrink-0',
      status === 'connected' && 'bg-emerald-400',
      status === 'connecting' && 'bg-yellow-400 animate-pulse',
      status === 'disconnected' && 'bg-muted-foreground',
      status === 'error' && 'bg-red-400',
    )} />
  )
}

function ConnectForm({ call, onConnect, onCancel }) {
  const [form, setForm] = useState({
    host: '', port: '22', username: '',
    authType: 'password', password: '', keyPath: '',
  })
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState(null)
  const [history, setHistory] = useState([])

  useEffect(() => {
    call('get-history').then(setHistory).catch(() => {})
  }, [call])

  function setField(field, value) {
    setForm(f => ({ ...f, [field]: value }))
  }

  function applyHistory(item) {
    setForm(f => ({
      ...f,
      host: item.host,
      port: String(item.port),
      username: item.username,
      authType: item.authType,
      keyPath: item.keyPath || '',
      password: '',
    }))
  }

  async function deleteHistoryItem(e, id) {
    e.stopPropagation()
    await call('delete-history', { id }).catch(() => {})
    setHistory(h => h.filter(x => x.id !== id))
  }

  async function clearHistory(e) {
    e.stopPropagation()
    await call('clear-history').catch(() => {})
    setHistory([])
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.host || !form.username) return
    setConnecting(true)
    setError(null)
    try {
      await onConnect(form)
    } catch (err) {
      setError(err.message)
      setConnecting(false)
    }
  }

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-[#0d0d14]/90 backdrop-blur-sm z-20 p-4">
      <div className="flex w-full max-w-2xl gap-3 max-h-[90vh]">

        {/* History panel */}
        <div className="w-56 shrink-0 bg-[#13131f] border border-white/10 rounded-xl flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-white/8">
            <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
              <History className="size-3.5 text-muted-foreground" />
              Recent
            </div>
            {history.length > 0 && (
              <button
                onClick={clearHistory}
                className="text-[10px] text-muted-foreground/50 hover:text-red-400 transition-colors"
                title="Clear all"
              >
                Clear all
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            {history.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-2 py-8 text-center px-3">
                <Clock className="size-5 text-muted-foreground/20" />
                <p className="text-[11px] text-muted-foreground/40">No recent connections</p>
              </div>
            ) : (
              <div className="p-1.5 space-y-0.5">
                {history.map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => applyHistory(item)}
                    className="w-full flex items-center gap-2 px-2.5 py-2 rounded-md hover:bg-white/5 text-left group transition-colors"
                  >
                    <div className="size-6 rounded bg-white/5 flex items-center justify-center shrink-0">
                      {item.authType === 'key'
                        ? <Key className="size-3 text-muted-foreground" />
                        : <Lock className="size-3 text-muted-foreground" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-foreground truncate">{item.label}</p>
                      <p className="text-[10px] text-muted-foreground/50">
                        :{item.port} · {formatRelative(item.lastUsed)}
                      </p>
                    </div>
                    <button
                      onClick={e => deleteHistoryItem(e, item.id)}
                      className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-white/10 text-muted-foreground hover:text-red-400 transition-all shrink-0"
                    >
                      <X className="size-2.5" />
                    </button>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Connection form */}
        <form
          onSubmit={handleSubmit}
          className="flex-1 bg-[#13131f] border border-white/10 rounded-xl p-5 shadow-2xl space-y-3.5 overflow-y-auto"
        >
          <div className="flex items-center justify-between mb-0.5">
            <div className="flex items-center gap-2">
              <TerminalIcon className="size-4 text-blue-400" />
              <h2 className="text-sm font-semibold text-foreground">New SSH Connection</h2>
            </div>
            <button type="button" onClick={onCancel} className="p-1 rounded hover:bg-white/5 text-muted-foreground hover:text-foreground transition-colors">
              <X className="size-4" />
            </button>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-md px-3 py-2">
              <AlertCircle className="size-3.5 shrink-0" />
              {error}
            </div>
          )}

          <div className="flex gap-2">
            <FormField label="Host" icon={<Server className="size-3" />} className="flex-1">
              <input type="text" placeholder="192.168.1.1" value={form.host}
                onChange={e => setField('host', e.target.value)} required autoFocus className={inputClass} />
            </FormField>
            <FormField label="Port" icon={<Hash className="size-3" />} className="w-20">
              <input type="number" placeholder="22" value={form.port}
                onChange={e => setField('port', e.target.value)} className={inputClass} />
            </FormField>
          </div>

          <FormField label="Username" icon={<User className="size-3" />}>
            <input type="text" placeholder="root" value={form.username}
              onChange={e => setField('username', e.target.value)} required className={inputClass} />
          </FormField>

          <div>
            <label className="block text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold mb-1.5">
              Authentication
            </label>
            <div className="flex gap-1 p-0.5 bg-white/5 rounded-md">
              {[{ value: 'password', label: 'Password', icon: Lock }, { value: 'key', label: 'Private Key', icon: Key }].map(({ value, label, icon: Icon }) => (
                <button key={value} type="button" onClick={() => setField('authType', value)}
                  className={cn('flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded text-xs font-medium transition-colors',
                    form.authType === value ? 'bg-blue-600 text-white' : 'text-muted-foreground hover:text-foreground')}>
                  <Icon className="size-3" />{label}
                </button>
              ))}
            </div>
          </div>

          {form.authType === 'password' ? (
            <FormField label="Password" icon={<Lock className="size-3" />}>
              <input type="password" placeholder="••••••••" value={form.password}
                onChange={e => setField('password', e.target.value)} className={inputClass} />
            </FormField>
          ) : (
            <FormField label="Private Key Path" icon={<Key className="size-3" />}>
              <input type="text" placeholder="~/.ssh/id_rsa" value={form.keyPath}
                onChange={e => setField('keyPath', e.target.value)} className={inputClass} />
            </FormField>
          )}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onCancel}
              className="flex-1 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors border border-white/10">
              Cancel
            </button>
            <button type="submit" disabled={connecting}
              className="flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white transition-colors disabled:opacity-60">
              {connecting ? <Loader2 className="size-3.5 animate-spin" /> : <TerminalIcon className="size-3.5" />}
              Connect
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function formatRelative(ts) {
  const diff = Date.now() - ts
  const m = Math.floor(diff / 60000)
  const h = Math.floor(diff / 3600000)
  const d = Math.floor(diff / 86400000)
  if (d > 0) return `${d}d ago`
  if (h > 0) return `${h}h ago`
  if (m > 0) return `${m}m ago`
  return 'just now'
}

function FormField({ label, icon, children, className }) {
  return (
    <div className={className}>
      <label className="flex items-center gap-1 text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold mb-1.5">
        {icon}
        {label}
      </label>
      {children}
    </div>
  )
}

const inputClass = 'w-full px-3 py-1.5 rounded-md text-sm bg-white/5 border border-white/10 text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-blue-500/60 focus:bg-white/8 transition-colors'
