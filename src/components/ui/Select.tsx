import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
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
  searchAction?: ReactNode
  allowCustom?: boolean | ((value: string) => boolean)
}

export interface MultiSelectProps {
  label?: string
  placeholder?: string
  options: SelectOption[]
  values: string[]
  onChange: (values: string[]) => void
  required?: boolean
  requiredMark?: boolean
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
  searchAction,
  allowCustom = false,
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

  const hasExactMatch = options.some(
    (o) => o.label.toLowerCase() === query.trim().toLowerCase() || o.value.toLowerCase() === query.trim().toLowerCase()
  )
  const canUseCustom = typeof allowCustom === 'function' ? allowCustom(query.trim()) : allowCustom

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
            selected || value ? 'text-vpos-text' : 'text-vpos-muted',
          )}
        >
          {selected?.label || value || placeholder}
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
            <div className="flex items-center gap-2 border-b border-vpos-line px-3 py-2">
              <input
                ref={inputRef}
                className="h-9 min-w-0 flex-1 rounded-[4px] border border-vpos-line bg-vpos-surface px-2.5 text-[13px] text-vpos-text outline-none focus:border-vpos-primary"
                placeholder="Search..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onClick={(e) => e.stopPropagation()}
              />
              {searchAction ? (
                <span className="shrink-0" onClick={(e) => e.stopPropagation()}>
                  {searchAction}
                </span>
              ) : null}
            </div>
          ) : null}
          <div className="max-h-[220px] overflow-y-auto py-1">
            {filtered.length === 0 && !canUseCustom ? (
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

            {canUseCustom && query.trim() && !hasExactMatch && (
              <button
                type="button"
                className="flex w-full items-center gap-2 border-0 border-t border-vpos-line bg-vpos-sand/40 px-4 py-2.5 text-left text-[13px] font-bold text-vpos-primary hover:bg-vpos-sand transition-colors"
                onClick={() => {
                  onChange(query.trim())
                  setOpen(false)
                  setQuery('')
                }}
              >
                <Icon name="add-line" className="text-[15px]" />
                <span>Use "{query.trim()}"</span>
              </button>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}

export function MultiSelect({
  label,
  placeholder = 'Select values',
  options,
  values,
  onChange,
  required,
  requiredMark,
  className,
  searchable = false,
}: MultiSelectProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listId = useId()
  const selectedOptions = values.map((value) => options.find((option) => option.value === value) ?? ({ value, label: value }))
  const filtered = options.filter((option) => {
    if (!query.trim()) return true
    return option.label.toLowerCase().includes(query.toLowerCase())
  })

  useEffect(() => {
    if (!open) return
    const onDoc = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', onDoc)
    const timeout = setTimeout(() => {
      if (searchable) inputRef.current?.focus()
    }, 50)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      clearTimeout(timeout)
    }
  }, [open, searchable])

  const toggleValue = (value: string) => {
    onChange(values.includes(value) ? values.filter((item) => item !== value) : [...values, value])
  }

  return (
    <div ref={ref} className={cn('relative w-full', className)}>
      {label ? (
        <span className={labelClass}>
          {label}
          {required || requiredMark ? <b className="text-vpos-red"> *</b> : null}
        </span>
      ) : null}
      <div
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-haspopup="listbox"
        tabIndex={0}
        onClick={() => setOpen((value) => !value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            setOpen((value) => !value)
          }
        }}
        className={cn(
          'flex min-h-[39px] w-full cursor-pointer items-center gap-2 rounded-[4px] border border-vpos-line bg-white px-2.5 text-left transition-colors',
          'hover:border-vpos-primary/60',
          open && 'border-vpos-primary shadow-[0_0_0_2px_rgb(104_124_254_/_0.12)]',
        )}
      >
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
          {selectedOptions.length > 0 ? selectedOptions.map((option) => (
            <span
              key={option.value}
              className="inline-flex max-w-full items-center gap-1 rounded-[5px] bg-vpos-subtle px-2 py-1 text-[11px] font-semibold text-vpos-text"
            >
              <span className="truncate">{option.label}</span>
              <span
                role="button"
                tabIndex={0}
                aria-label={`Remove ${option.label}`}
                onClick={(event) => {
                  event.stopPropagation()
                  toggleValue(option.value)
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    event.stopPropagation()
                    toggleValue(option.value)
                  }
                }}
                className="cursor-pointer text-[13px] leading-none text-vpos-muted hover:text-vpos-text"
              >
                ×
              </span>
            </span>
          )) : (
            <span className="truncate text-[13px] font-semibold text-vpos-muted">{placeholder}</span>
          )}
        </div>
        <svg
          className={cn('h-4 w-4 shrink-0 text-vpos-muted transition-transform', open && 'rotate-180')}
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
      </div>

      {open ? (
        <div
          id={listId}
          role="listbox"
          aria-multiselectable="true"
          className="absolute top-[calc(100%+6px)] left-0 z-[400] min-w-full overflow-hidden rounded-[4px] border border-vpos-line bg-white py-1 shadow-vpos"
        >
          {searchable ? (
            <div className="flex items-center gap-2 border-b border-vpos-line px-3 py-2">
              <input
                ref={inputRef}
                className="h-9 min-w-0 flex-1 rounded-[4px] border border-vpos-line bg-vpos-surface px-2.5 text-[13px] text-vpos-text outline-none focus:border-vpos-primary"
                placeholder="Search values..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onClick={(event) => event.stopPropagation()}
              />
            </div>
          ) : null}
          <div className="max-h-[220px] overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <p className="px-4 py-3 text-[13px] text-vpos-muted">No values available</p>
            ) : filtered.map((option) => {
              const selected = values.includes(option.value)
              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  className={cn(
                    'flex w-full items-center justify-between gap-2 border-0 px-4 py-2.5 text-left text-[13px] font-semibold transition-colors',
                    selected ? 'bg-vpos-sand text-vpos-primary' : 'text-vpos-text hover:bg-vpos-subtle',
                  )}
                  onClick={() => toggleValue(option.value)}
                >
                  <span className="truncate">{option.label}</span>
                  {selected ? <Icon name="check-line" className="shrink-0 text-[15px] text-vpos-primary" /> : null}
                </button>
              )
            })}
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
