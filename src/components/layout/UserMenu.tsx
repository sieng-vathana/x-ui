import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { cn } from '../../lib/cn'
import { Icon } from '../ui/Icon'
import { useAuth } from '../../context/AuthContext'

export interface UserMenuProps {
  userName?: string
  role?: string
  className?: string
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

/** Avatar + account menu only (greeting lives in top-left title). */
export function UserMenu({
  userName = 'Vathana Sieng',
  role = 'Administrator',
  className,
}: UserMenuProps) {
  const navigate = useNavigate()
  const { signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={userName}
        aria-expanded={open}
        aria-haspopup="menu"
        className={cn(
          'grid h-[38px] w-[38px] place-items-center rounded-[4px] bg-vpos-primary text-[13px] font-semibold text-white transition ring-offset-2',
          open && 'ring-2 ring-vpos-primary/30',
        )}
      >
        {initials(userName)}
      </button>

      {open ? (
        <div
          role="menu"
          className="popover-in absolute top-[calc(100%+10px)] right-0 z-[300] w-[240px] overflow-hidden rounded-[4px] border border-vpos-line bg-white py-2 shadow-vpos"
        >
          <div className="border-b border-vpos-line px-4 py-3">
            <p className="m-0 truncate text-[15px] font-semibold text-vpos-dark">
              {userName}
            </p>
            <p className="mt-0.5 mb-0 text-[12px] font-semibold text-vpos-primary-2">
              {role}
            </p>
          </div>
          <div className="py-1">
            <MenuItem icon="user-settings-line" label="My profile" onClick={() => { setOpen(false); navigate('/settings') }} />
            <MenuItem icon="settings-3-line" label="Account settings" onClick={() => { setOpen(false); navigate('/settings') }} />
          </div>
          <div className="border-t border-vpos-line py-1">
            <MenuItem icon="logout-box-r-line" label="Sign out" danger onClick={() => { void signOut(); navigate('/sign-in', { replace: true }) }} />
          </div>
        </div>
      ) : null}
    </div>
  )
}

function MenuItem({
  icon,
  label,
  danger,
  onClick,
}: {
  icon: string
  label: string
  danger?: boolean
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2.5 border-0 bg-transparent px-4 py-2 text-left text-[14px] font-medium transition-colors hover:bg-vpos-subtle',
        danger ? 'text-vpos-red hover:bg-vpos-red-bg' : 'text-vpos-text',
      )}
    >
      <Icon name={icon} className="text-[17px]" />
      {label}
    </button>
  )
}
