import { useEffect, useRef, useState } from 'react'
import { orderStatusLabel, type PurchaseOrder } from '../../features/purchases/types'
import { formatCurrency } from '../../lib/currency'
import { cn } from '../../lib/cn'
import { Icon } from '../ui/Icon'
import { Status } from '../ui/Status'

export interface PurchaseOrderPickerProps {
  orders: PurchaseOrder[]
  value: number
  onChange: (id: number) => void
  /** Store names by id, for the order summary line. */
  storeNames: Map<number, string>
}

export function PurchaseOrderPicker({ orders, value, onChange, storeNames }: PurchaseOrderPickerProps) {
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
            <strong className="truncate text-[15px] text-vpos-text">{selected.poNumber}</strong>
            <Status value={orderStatusLabel(selected.status)} />
          </span>
          <span className="mt-1 block truncate text-[13px] text-vpos-muted">{selected.supplierName} · {storeNames.get(selected.storeId) ?? `Store #${selected.storeId}`}</span>
        </span>
        <span className="shrink-0 text-right">
          <span className="block text-[13px] font-bold text-vpos-text">{formatCurrency(selected.totalCost, selected.currencyCode)}</span>
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
                  <span className="flex items-center gap-2"><strong className="text-[14px]">{order.poNumber}</strong><Status value={orderStatusLabel(order.status)} /></span>
                  <span className="mt-1 block truncate text-[12px] text-vpos-muted">{order.supplierName} · {storeNames.get(order.storeId) ?? `Store #${order.storeId}`}{order.expectedDate ? ` · Due ${order.expectedDate}` : ''}</span>
                </span>
                <span className="text-[13px] font-bold">{formatCurrency(order.totalCost, order.currencyCode)}</span>
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
