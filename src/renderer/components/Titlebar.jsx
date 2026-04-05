import { useState, useEffect } from 'react'
import { Minus, Square, X, Maximize2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function Titlebar({ title = 'Plugin App' }) {
  const [isMaximized, setIsMaximized] = useState(false)

  useEffect(() => {
    const unsub = window.electronAPI.window.onMaximizeChange((maximized) => {
      setIsMaximized(maximized)
    })
    return unsub
  }, [])

  return (
    <div className="drag-region flex h-10 items-center justify-between bg-titlebar border-b border-titlebar-border select-none shrink-0">
      {/* Left — app icon + title */}
      <div className="flex items-center gap-2 px-4 no-drag pointer-events-none">
        <div className="size-4 rounded-sm bg-blue-500/80 flex items-center justify-center">
          <span className="text-[8px] font-bold text-white leading-none">P</span>
        </div>
        <span className="text-[13px] font-medium text-muted-foreground">{title}</span>
      </div>

      {/* Center — drag zone (fills middle) */}
      <div className="drag-region flex-1 h-full" />

      {/* Right — window controls */}
      <div className="no-drag flex items-center">
        <WinButton
          onClick={() => window.electronAPI.window.minimize()}
          label="Minimize"
        >
          <Minus className="size-3.5" />
        </WinButton>

        <WinButton
          onClick={() => window.electronAPI.window.maximize()}
          label={isMaximized ? 'Restore' : 'Maximize'}
        >
          {isMaximized
            ? <RestoreIcon />
            : <Maximize2 className="size-3" />
          }
        </WinButton>

        <WinButton
          onClick={() => window.electronAPI.window.close()}
          label="Close"
          variant="close"
        >
          <X className="size-3.5" />
        </WinButton>
      </div>
    </div>
  )
}

function WinButton({ children, onClick, label, variant }) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={cn(
        'flex h-10 w-12 items-center justify-center transition-colors',
        'text-muted-foreground hover:text-foreground',
        variant === 'close'
          ? 'hover:bg-red-600 hover:text-white'
          : 'hover:bg-white/10',
      )}
    >
      {children}
    </button>
  )
}

/* Restore icon — two overlapping squares */
function RestoreIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.2">
      <rect x="1" y="3" width="7" height="7" rx="0.5" />
      <path d="M3 3V2a.5.5 0 0 1 .5-.5h6a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-.5.5H9" />
    </svg>
  )
}
