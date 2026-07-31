import { useEffect, useRef, useState } from 'react'
import type { PurchaseOrder } from '../../data/purchases-mockup'
import { money, poTotal } from '../../data/purchases-mockup'
import { cn } from '../../lib/cn'
import { Icon } from '../ui/Icon'
import { Status } from '../ui/Status'

export interface PurchaseOrderPickerProps {
  orders: PurchaseOrder[]
  value: string
  onChange: (id: string) => void
}

export function PurchaseOrderPicker({ orders, value, onChange }: PurchaseOrderPickerProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const selected = orders.find((order) => order.id === value)

  useEffect(() => {
    const closeOnOutsidePress = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', closeOnOutsidePress)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('mousedown', closeOnOutsidePress)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [])

  if (!selected) return null

  return (
    <div ref={rootRef} className="relative max-w-xl">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex min-h-[76px] w-full items-center gap-3 rounded-xl border border-vpos-line bg-white p-3 text-left shadow-vpos transition-colors hover:border-vpos-primary/45 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vpos-primary"
      >
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-vpos-sand text-[20px] text-vpos-primary">
          <Icon name="file-list-3-line" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <strong className="truncate text-[15px] text-vpos-text">{selected.ref}</strong>
            <Status value={selected.status} />
          </span>
          <span className="mt-1 block truncate text-[13px] text-vpos-muted">{selected.supplierName} · {selected.store}</span>
        </span>
        <span className="shrink-0 text-right">
          <span className="block text-[13px] font-bold text-vpos-text">{money(poTotal(selected))}</span>
          <Icon name={open ? 'arrow-up-s-line' : 'arrow-down-s-line'} className="mt-1 text-[19px] text-vpos-muted" />
        </span>
      </button>

      {open ? (
        <div role="listbox" aria-label="Purchase orders ready to receive" className="animate-slide-down absolute top-[calc(100%+8px)] right-0 left-0 z-50 max-h-[320px] overflow-y-auto rounded-xl border border-vpos-line bg-white p-1.5 shadow-[0_18px_38px_rgba(35,49,75,.18)]">
          {orders.map((order) => {
            const active = order.id === selected.id
            return (
              <button
                key={order.id}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => {
                  onChange(order.id)
                  setOpen(false)
                }}
                className={cn('flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors', active ? 'bg-vpos-sand text-vpos-primary' : 'text-vpos-text hover:bg-vpos-subtle')}
              >
                <span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-md text-[18px]', active ? 'bg-vpos-primary text-white' : 'bg-vpos-subtle text-vpos-muted')}>
                  <Icon name="inbox-unarchive-line" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2"><strong className="text-[14px]">{order.ref}</strong><Status value={order.status} /></span>
                  <span className="mt-1 block truncate text-[12px] text-vpos-muted">{order.supplierName} · {order.store} · Due {order.expectedDate}</span>
                </span>
                <span className="text-[13px] font-bold">{money(poTotal(order))}</span>
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
