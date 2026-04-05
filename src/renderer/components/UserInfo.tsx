import { useEffect, useRef, useState } from 'react'
import { User, LogIn, UserPlus, Settings, Puzzle, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth-store'

export default function UserInfo() {
  const { user, isLoggedIn, logout } = useAuthStore()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  return (
    <div ref={ref} className="relative border-t border-sidebar-border">
      {/* Trigger button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2.5 w-full px-3 py-2.5 hover:bg-white/5 transition-colors"
      >
        {/* Avatar */}
        <div className="size-7 rounded-full bg-muted/40 flex items-center justify-center shrink-0 overflow-hidden">
          {isLoggedIn && user?.avatarUrl ? (
            <img src={user.avatarUrl} alt={user.name} className="size-full object-cover" />
          ) : (
            <User className="size-3.5 text-muted-foreground" />
          )}
        </div>

        {/* Name / Guest label */}
        <div className="flex-1 text-left overflow-hidden">
          <p className="text-xs font-medium text-foreground truncate leading-tight">
            {isLoggedIn ? user?.name : 'Guest'}
          </p>
          {isLoggedIn && user?.email && (
            <p className="text-[10px] text-muted-foreground truncate leading-tight">{user.email}</p>
          )}
        </div>
      </button>

      {/* Dropdown menu — positioned above the trigger */}
      {open && (
        <div className="absolute bottom-full left-2 right-2 mb-1 z-50 rounded-md bg-popover border border-sidebar-border shadow-lg overflow-hidden">
          {isLoggedIn ? (
            <>
              <DropdownItem
                icon={User}
                label="Profile"
                onClick={() => setOpen(false)}
              />
              <DropdownItem
                icon={Settings}
                label="Settings"
                onClick={() => setOpen(false)}
              />
              <DropdownItem
                icon={Puzzle}
                label="Plugins"
                onClick={() => setOpen(false)}
              />
              <div className="h-px bg-sidebar-border my-0.5" />
              <DropdownItem
                icon={LogOut}
                label="Logout"
                variant="destructive"
                onClick={() => {
                  logout()
                  setOpen(false)
                }}
              />
            </>
          ) : (
            <>
              <DropdownItem
                icon={LogIn}
                label="Login"
                onClick={() => setOpen(false)}
              />
              <DropdownItem
                icon={UserPlus}
                label="Register"
                onClick={() => setOpen(false)}
              />
            </>
          )}
        </div>
      )}
    </div>
  )
}

interface DropdownItemProps {
  icon: React.ComponentType<{ className?: string }>
  label: string
  onClick: () => void
  variant?: 'destructive' | 'default'
}

function DropdownItem({ icon: Icon, label, onClick, variant }: DropdownItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-2.5 w-full px-3 py-2 text-xs transition-colors text-left',
        variant === 'destructive'
          ? 'text-red-400 hover:bg-red-500/10 hover:text-red-300'
          : 'text-muted-foreground hover:text-foreground hover:bg-white/5',
      )}
    >
      <Icon className="size-3.5 shrink-0" />
      {label}
    </button>
  )
}
