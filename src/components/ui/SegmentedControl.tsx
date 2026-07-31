import { cn } from '../../lib/cn'
import { Icon } from './Icon'

export interface SegmentOption<T extends string = string> {
  id: T
  label: string
  icon?: string
}

export interface SegmentedControlProps<T extends string = string> {
  value: T
  onChange: (value: T) => void
  options: SegmentOption<T>[]
  /** light (default app) | dark (FinPOS panels) */
  tone?: 'light' | 'dark'
  size?: 'sm' | 'md'
  className?: string
  'aria-label'?: string
}

/**
 * Pill segmented control with clear selected state and smooth transition.
 */
export function SegmentedControl<T extends string = string>({
  value,
  onChange,
  options,
  tone = 'light',
  size = 'md',
  className,
  'aria-label': ariaLabel,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        'grid gap-1 rounded-[4px] p-1',
        options.length === 2 && 'grid-cols-2',
        options.length === 3 && 'grid-cols-3',
        options.length > 3 && 'grid-cols-2 sm:grid-cols-4',
        tone === 'light' && 'bg-vpos-subtle',
        tone === 'dark' && 'bg-[#0B1220] ring-1 ring-[#2D394E]',
        className,
      )}
    >
      {options.map((opt) => {
        const selected = value === opt.id
        return (
          <button
            key={opt.id}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(opt.id)}
            className={cn(
              'inline-flex items-center justify-center gap-1.5 rounded-[3px] border-0 font-semibold transition-all duration-200 ease-out',
              size === 'sm' && 'h-9 px-2 text-[12px]',
              size === 'md' && 'h-10 px-3 text-[13px]',
              selected &&
                tone === 'light' &&
                'bg-white text-vpos-primary shadow-sm ring-1 ring-vpos-line/80',
              selected &&
                tone === 'dark' &&
                'bg-[#1B2639] text-[#F4F6FA] shadow-sm ring-1 ring-[#34435C]',
              !selected &&
                tone === 'light' &&
                'bg-transparent text-vpos-muted hover:bg-white/50 hover:text-vpos-text',
              !selected &&
                tone === 'dark' &&
                'bg-transparent text-[#91A0B8] hover:bg-white/5 hover:text-[#F4F6FA]',
            )}
          >
            {opt.icon ? <Icon name={opt.icon} className="text-[16px]" /> : null}
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
