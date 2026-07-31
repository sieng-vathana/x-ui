import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

export interface ChipProps {
  selected?: boolean
  onClick?: () => void
  children: ReactNode
  disabled?: boolean
  className?: string
  type?: 'button' | 'submit'
}

/**
 * Selectable chip for presets / filters — clear selected ring and scale.
 */
export function Chip({
  selected,
  onClick,
  children,
  disabled,
  className,
  type = 'button',
}: ChipProps) {
  return (
    <button
      type={type}
      disabled={disabled}
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        'rounded-full border px-3.5 py-1.5 text-[13px] font-bold transition-all duration-200 ease-out',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vpos-primary',
        'disabled:cursor-not-allowed disabled:opacity-50',
        selected
          ? 'scale-[1.02] border-vpos-primary bg-vpos-sand text-vpos-primary shadow-sm'
          : 'border-vpos-line bg-white text-vpos-text hover:border-vpos-primary/45 hover:bg-vpos-subtle',
        className,
      )}
    >
      {children}
    </button>
  )
}
