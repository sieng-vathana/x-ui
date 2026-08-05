import { useEffect, useId, useRef, useState } from 'react'
import { cn } from '../../lib/cn'
import { Icon } from './Icon'

export interface SelectOption {
  value: string
  label: string
  image?: string
}

export interface SelectProps {
  label?: string
  placeholder?: string
  options: SelectOption[]
  value: string
  onChange: (value: string) => void
  required?: boolean
  requiredMark?: boolean
  variant?: 'form' | 'toolbar'
  className?: string
  searchable?: boolean
}

const labelClass =
  'mb-2 block text-[12px] font-semibold tracking-[0.02em] text-vpos-dark'

export function Select({
  label,
  placeholder = '-- Select --',
  options,
  value,
  onChange,
  required,
  requiredMark,
  variant = 'form',
  className,
  searchable = false,
}: SelectProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listId = useId()
  const selected = options.find((o) => o.value === value)
  const isToolbar = variant === 'toolbar'

  const filtered = options.filter((o) => {
    if (!query.trim()) return true
    return o.label.toLowerCase().includes(query.toLowerCase())
  })

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', onDoc)
    const t = setTimeout(() => {
      if (searchable) inputRef.current?.focus()
    }, 50)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      clearTimeout(t)
    }
  }, [open, searchable])

  return (
    <div ref={ref} className={cn('relative', isToolbar ? 'inline-block' : 'w-full', className)}>
      {label ? (
        <span className={labelClass}>
          {label}
          {required || requiredMark ? <b className="text-vpos-red"> *</b> : null}
        </span>
      ) : null}
      <button
        type="button"
        aria-expanded={open}
        aria-controls={listId}
        aria-haspopup="listbox"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex items-center gap-2 border border-vpos-line bg-white text-left transition-colors',
          'hover:border-vpos-primary/60',
          open && 'border-vpos-primary shadow-[0_0_0_2px_rgb(104_124_254_/_0.12)]',
          isToolbar
            ? 'h-[39px] min-w-[140px] rounded-[4px] px-3.5 text-[13px]'
            : 'h-[39px] w-full rounded-[4px] px-3.5 text-[14px]',
        )}
      >
        {selected && (selected.image !== undefined || options.some((o) => o.image !== undefined)) ? (
          <OptionAvatar label={selected.label} image={selected.image} size="sm" />
        ) : null}
        <span
          className={cn(
            'min-w-0 flex-1 truncate font-semibold',
            selected ? 'text-vpos-text' : 'text-vpos-muted',
          )}
        >
          {selected?.label ?? placeholder}
        </span>
        <svg
          className={cn(
            'h-4 w-4 shrink-0 text-vpos-muted transition-transform',
            open && 'rotate-180',
          )}
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open ? (
        <div
          id={listId}
          role="listbox"
          className={cn(
            'absolute top-[calc(100%+6px)] z-[400] overflow-hidden rounded-[4px] border border-vpos-line bg-white py-1 shadow-vpos',
            isToolbar ? 'right-0 min-w-[160px]' : 'left-0 min-w-full',
          )}
        >
          {searchable ? (
            <div className="border-b border-vpos-line px-3 py-2">
              <input
                ref={inputRef}
                className="h-9 w-full rounded-[4px] border border-vpos-line bg-vpos-surface px-2.5 text-[13px] text-vpos-text outline-none focus:border-vpos-primary"
                placeholder="Search..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          ) : null}
          <div className="max-h-[220px] overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <p className="px-4 py-3 text-[13px] text-vpos-muted">No results</p>
            ) : (
              filtered.map((opt) => {
                const sel = opt.value === value
                const hasAnyImage = options.some((o) => o.image !== undefined)
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="option"
                    aria-selected={sel}
                    className={cn(
                      'flex w-full items-center justify-between gap-2 border-0 px-4 py-2.5 text-left text-[13px] font-semibold transition-colors',
                      sel
                        ? 'bg-vpos-sand text-vpos-primary'
                        : 'text-vpos-text hover:bg-vpos-subtle',
                    )}
                    onClick={() => {
                      onChange(opt.value)
                      setOpen(false)
                      setQuery('')
                    }}
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      {hasAnyImage || opt.image !== undefined ? (
                        <OptionAvatar label={opt.label} image={opt.image} size="md" />
                      ) : null}
                      <span className="truncate">{opt.label}</span>
                    </div>
                    {sel ? (
                      <Icon name="check-line" className="text-[15px] text-vpos-primary shrink-0" />
                    ) : null}
                  </button>
                )
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}

function OptionAvatar({ label, image, size = 'md' }: { label: string; image?: string; size?: 'sm' | 'md' }) {
  const [failed, setFailed] = useState(false)
  const isSm = size === 'sm'
  const initial = label ? label.trim().charAt(0).toUpperCase() : '?'

  if (image && !failed) {
    return (
      <img
        src={image}
        alt=""
        className={cn('shrink-0 object-cover', isSm ? 'h-6 w-6 rounded-md' : 'h-7 w-7 rounded-lg')}
        onError={() => setFailed(true)}
      />
    )
  }

  return (
    <span
      className={cn(
        'grid shrink-0 place-items-center bg-vpos-sand font-bold text-vpos-primary uppercase shadow-xs',
        isSm ? 'h-6 w-6 rounded-md text-[11px]' : 'h-7 w-7 rounded-lg text-[12px]',
      )}
    >
      {initial}
    </span>
  )
}
