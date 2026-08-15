import { useEffect, useId, useRef, useState } from 'react'
import { cn } from '../../lib/cn'
import { stores as defaultStores } from '../../data/mockup'
import { useStores } from '../../features/stores/useStores'
import { useDelayedLoading } from '../../hooks/useDelayedLoading'
import { Icon } from '../ui/Icon'
import { Skeleton } from '../ui/Skeleton'

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
  compactOnMobile?: boolean
  className?: string
}

export function StoreSwitcher({
  stores: storesProp,
  value,
  onChange,
  variant = 'default',
  compactOnMobile = false,
  className,
}: StoreSwitcherProps) {
  const { data: apiStores, isLoading, isError } = useStores()
  const showLoadingSkeleton = useDelayedLoading(isLoading && !storesProp)
  const stores = storesProp ?? apiStores ?? (isError ? [] : defaultStores)
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
    <div
      ref={ref}
      className={cn(
        'relative w-[196px] min-w-0 max-w-full',
        !compactOnMobile && 'max-sm:w-[clamp(96px,30vw,196px)]',
        compactOnMobile && 'max-xl:w-10 max-xl:min-w-0',
        className,
      )}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex h-10 w-full min-w-0 items-center gap-2.5 rounded-md border px-3.5 text-left transition',
          variant === 'default' &&
            'border-vpos-line bg-vpos-black/30 text-vpos-text hover:border-vpos-primary/55 hover:bg-vpos-sand/45',
          variant === 'pos' &&
            'border-white/25 bg-white/12 text-white hover:border-white/35 hover:bg-white/18',
          compactOnMobile && 'max-xl:w-10 max-xl:justify-center max-xl:gap-1 max-xl:px-0',
        )}
      >
        {selected?.image ? (
          <img
            src={selected.image}
            alt=""
            className={cn('h-[26px] w-[26px] shrink-0 rounded-[7px] object-cover', compactOnMobile && 'max-xl:hidden')}
          />
        ) : (
          <span
            className={cn(
              'grid h-[26px] w-[26px] shrink-0 place-items-center rounded-[7px] text-[15px]',
              variant === 'default'
                ? 'bg-vpos-sand text-vpos-primary'
                : 'bg-vpos-primary text-white',
              compactOnMobile && 'max-xl:hidden',
            )}
          >
            <Icon name="store-2-line" />
          </span>
        )}
        {compactOnMobile ? (
          <span className="hidden h-5 w-5 shrink-0 place-items-center rounded-[5px] bg-vpos-sand text-[13px] text-vpos-primary max-xl:grid">
            <Icon name="store-2-line" />
          </span>
        ) : null}
        <span
          className={cn('min-w-0 flex-1 truncate text-[14px] font-bold', compactOnMobile && 'max-xl:hidden')}
          title={selected?.name}
        >
          {showLoadingSkeleton ? <Skeleton className="h-3.5 w-24" /> : isLoading && !storesProp ? 'Loading stores…' : selected?.name ?? 'Select store'}
        </span>
        <Icon
          name="arrow-down-s-line"
          className={cn(
            'text-[17px] transition-transform',
            open && 'rotate-180',
            variant === 'pos' ? 'text-white/80' : 'text-vpos-muted',
            compactOnMobile && 'max-xl:text-[15px]',
          )}
        />
      </button>

      {open ? (
        <div
          id={listId}
          role="listbox"
          className="popover-in absolute top-[calc(100%+8px)] right-0 z-[300] w-[min(320px,calc(100vw-24px))] min-w-0 max-w-[calc(100vw-24px)] overflow-hidden rounded-xl border border-vpos-line bg-vpos-surface py-1 shadow-[0_14px_36px_rgba(0,0,0,.28)]"
        >
          <div className="border-b border-vpos-line px-4 pt-2.5 pb-1.5 text-[11px] font-extrabold tracking-wider text-vpos-muted uppercase">
            Switch store
          </div>
          <div className="px-2.5 py-2">
            <input
              className="h-9 w-full rounded-md border border-vpos-line bg-vpos-black/25 px-2.5 text-[13px] text-vpos-text outline-none transition-shadow focus:border-vpos-primary focus:shadow-[0_0_0_3px_rgb(45_213_138_/_0.14)] selection:bg-vpos-sand selection:text-vpos-primary"
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
                  'flex w-full min-w-0 items-center gap-3 border-0 px-4 py-2.5 text-left text-[14px] transition-colors',
                  isSel ? 'bg-vpos-sand font-bold' : 'bg-vpos-surface hover:bg-vpos-subtle',
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
                      'grid h-7 w-7 shrink-0 place-items-center rounded-lg text-[15px]',
                      isSel
                        ? 'bg-vpos-primary text-white'
                        : 'bg-vpos-sand text-vpos-primary',
                    )}
                  >
                    <Icon name="store-2-line" />
                  </span>
                )}
                <span className="min-w-0 flex-1 truncate">
                  <strong
                    title={store.name}
                    className={cn(
                      'block truncate font-bold',
                      isSel ? 'text-vpos-primary' : 'text-vpos-text',
                    )}
                  >
                    {store.name}
                  </strong>
                  {store.address ? (
                    <small className="mt-0.5 block truncate text-[12px] text-vpos-muted">
                      {store.address}
                    </small>
                  ) : null}
                </span>
                <Icon
                  name="check-line"
                  className={cn(
                    'ml-auto text-[17px] text-vpos-primary',
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
