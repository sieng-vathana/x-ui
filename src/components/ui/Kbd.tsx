import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

export interface KbdProps {
  children: ReactNode
  /** dark = FinPOS shortcut panel; light = default app */
  tone?: 'light' | 'dark'
  className?: string
  size?: 'sm' | 'md'
}

/**
 * Keyboard key chip for shortcut displays.
 */
export function Kbd({
  children,
  tone = 'light',
  className,
  size = 'sm',
}: KbdProps) {
  return (
    <kbd
      className={cn(
        'inline-flex min-w-[1.65rem] items-center justify-center rounded-md border font-bold tracking-wide select-none',
        size === 'sm' && 'px-1.5 py-0.5 text-[11px]',
        size === 'md' && 'px-2 py-1 text-[12px]',
        tone === 'light' &&
          'border-vpos-line bg-vpos-subtle text-vpos-text shadow-[0_1px_0_#d0d8e0]',
        tone === 'dark' &&
          'border-[#34435C] bg-[#1B2639] text-[#F4F6FA] shadow-[0_1px_0_#0a101c]',
        className,
      )}
    >
      {children}
    </kbd>
  )
}

export interface ShortcutKeysProps {
  /** e.g. "CTRL+K" or "ALT+Q" */
  shortcut: string
  tone?: 'light' | 'dark'
  className?: string
}

/** Split "CTRL+K" into styled key chips */
export function ShortcutKeys({
  shortcut,
  tone = 'dark',
  className,
}: ShortcutKeysProps) {
  const keys = shortcut.split('+').map((k) => k.trim()).filter(Boolean)
  return (
    <span
      className={cn(
        'inline-flex flex-wrap items-center justify-end gap-1',
        className,
      )}
    >
      {keys.map((k, i) => (
        <span key={`${k}-${i}`} className="inline-flex items-center gap-1">
          {i > 0 ? (
            <span
              className={cn(
                'text-[11px] font-semibold',
                tone === 'dark' ? 'text-[#91A0B8]' : 'text-vpos-muted',
              )}
            >
              +
            </span>
          ) : null}
          <Kbd tone={tone}>{k}</Kbd>
        </span>
      ))}
    </span>
  )
}
