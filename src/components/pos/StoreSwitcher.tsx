import { useEffect, useId, useRef, useState } from 'react'
import { cn } from '../../lib/cn'
import { stores as defaultStores } from '../../data/mockup'
import { Icon } from '../ui/Icon'

export interface StoreOption {
  id: string
  name: string
  address?: string
  logo?: string
  image?: string
}

export interface StoreSwitcherProps {
  stores?: StoreOption[]
  value?: string
  onChange?: (id: string) => void
  variant?: 'default' | 'pos'
  className?: string
}

export function StoreSwitcher({
  stores = defaultStores,
  value,
  onChange,
  variant = 'default',
  className,
}: StoreSwitcherProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const listId = useId()
  const selected = stores.find((s) => s.id === value) ?? stores[0]

  const filtered = stores.filter((s) => {
    if (!query.trim()) return true
    const q = query.toLowerCase()
    return (
      s.name.toLowerCase().includes(q) ||
      (s.address?.toLowerCase().includes(q) ?? false)
    )
  })

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  return (
    <div ref={ref} className={cn('relative min-w-[196px]', className)}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex h-[42px] w-full items-center gap-2.5 rounded-[10px] border px-3.5 text-left transition',
          variant === 'default' &&
            'border-[#d4dee7] bg-white text-vpos-text hover:border-[#c8d3dc] hover:shadow-[0_6px_16px_rgba(11,25,44,.09)]',
          variant === 'pos' &&
            'border-white/25 bg-white/12 text-white hover:border-white/35 hover:bg-white/18',
        )}
      >
        {selected?.image ? (
          <img
            src={selected.image}
            alt=""
            className="h-[26px] w-[26px] shrink-0 rounded-[7px] object-cover"
          />
        ) : (
          <span
            className={cn(
              'grid h-[26px] w-[26px] shrink-0 place-items-center rounded-[7px] text-[14px]',
              variant === 'default'
                ? 'bg-vpos-sand text-vpos-primary'
                : 'bg-vpos-primary text-white',
            )}
          >
            <Icon name="store-2-line" />
          </span>
        )}
        <span className="min-w-0 flex-1 truncate text-[13px] font-bold">
          {selected?.name ?? 'Select store'}
        </span>
        <Icon
          name="arrow-down-s-line"
          className={cn(
            'text-[16px] transition-transform',
            open && 'rotate-180',
            variant === 'pos' ? 'text-white/80' : 'text-vpos-muted',
          )}
        />
      </button>

      {open ? (
        <div
          id={listId}
          role="listbox"
          className="popover-in absolute top-[calc(100%+8px)] right-0 z-[300] min-w-[260px] overflow-hidden rounded-xl border border-vpos-line bg-white py-1 shadow-[0_14px_36px_rgba(11,25,44,.14)]"
        >
          <div className="border-b border-[#f0f3f7] px-4 pt-2.5 pb-1.5 text-[10px] font-extrabold tracking-wider text-vpos-muted uppercase">
            Switch store
          </div>
          <div className="px-2.5 py-2">
            <input
              className="h-9 w-full rounded-md border border-[#cbd7e1] bg-white px-2.5 text-[12px] text-vpos-text outline-none transition-shadow focus:border-vpos-primary focus:shadow-[0_0_0_3px_#1d546c24] selection:bg-vpos-sand selection:text-vpos-primary"
              placeholder="Search stores"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={(e) => e.currentTarget.select()}
              autoFocus
            />
          </div>
          {filtered.map((store) => {
            const isSel = store.id === selected?.id
            return (
              <button
                key={store.id}
                type="button"
                role="option"
                aria-selected={isSel}
                className={cn(
                  'flex w-full items-center gap-3 border-0 px-4 py-2.5 text-left text-[13px] transition-colors',
                  isSel ? 'bg-vpos-sand font-bold' : 'bg-white hover:bg-[#eef3f6]',
                )}
                onClick={() => {
                  onChange?.(store.id)
                  setOpen(false)
                  setQuery('')
                }}
              >
                {store.image ? (
                  <img
                    src={store.image}
                    alt=""
                    className="h-8 w-8 shrink-0 rounded-lg object-cover"
                  />
                ) : (
                  <span
                    className={cn(
                      'grid h-7 w-7 shrink-0 place-items-center rounded-lg text-[14px]',
                      isSel
                        ? 'bg-vpos-primary text-white'
                        : 'bg-vpos-sand text-vpos-primary',
                    )}
                  >
                    <Icon name="store-2-line" />
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <strong
                    className={cn(
                      'block font-bold',
                      isSel ? 'text-vpos-primary' : 'text-vpos-text',
                    )}
                  >
                    {store.name}
                  </strong>
                  {store.address ? (
                    <small className="mt-0.5 block text-[11px] text-vpos-muted">
                      {store.address}
                    </small>
                  ) : null}
                </span>
                <Icon
                  name="check-line"
                  className={cn(
                    'ml-auto text-[16px] text-vpos-primary',
                    isSel ? 'opacity-100' : 'opacity-0',
                  )}
                />
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
