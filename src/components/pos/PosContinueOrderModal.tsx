import { useEffect, useState } from 'react'
import { formatCurrency } from '../../lib/currency'
import type { PosOrder } from '../../features/orders/types'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'
import { Modal } from '../ui/Modal'

export type ContinueOrderChoice = 'khqr' | 'cash' | 'cancel'

export interface PosContinueOrderModalProps {
  order: PosOrder | null
  busy?: ContinueOrderChoice | null
  onClose: () => void
  onChoose: (choice: ContinueOrderChoice) => void
}

/** Finishes a sale that was created but never paid: take KHQR or cash for it, or cancel it to release the stock. */
export function PosContinueOrderModal({ order, busy = null, onClose, onChoose }: PosContinueOrderModalProps) {
  const [confirmCancel, setConfirmCancel] = useState(false)
  useEffect(() => setConfirmCancel(false), [order?.id])
  if (!order) return null

  const items = order.items ?? []
  const currency = (order.currencyCode || 'USD').toUpperCase()
  return (
    <Modal
      open={Boolean(order)}
      onClose={() => { if (!busy) onClose() }}
      size="md"
      title={`Continue ${order.orderNo || `order #${order.id}`}`}
      description="This sale was not paid yet. Take the payment now, or cancel it to put the stock back."
    >
      <div className="space-y-4">
        <div className="rounded-[12px] border border-vpos-line bg-vpos-subtle/60 p-3">
          <ul className="m-0 max-h-48 list-none space-y-1.5 overflow-y-auto p-0" data-locale-ignore>
            {items.map((item, index) => (
              <li key={item.id ?? index} className="flex justify-between gap-3 text-[13px] text-vpos-text">
                <span className="min-w-0 truncate">{Number(item.quantity ?? item.qty ?? 0)} × {item.productName ?? 'Item'}{item.variantName && item.variantName !== 'Default' ? ` (${item.variantName})` : ''}</span>
                <span className="shrink-0 text-vpos-muted">{formatCurrency(Number(item.total ?? 0), currency)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex items-center justify-between border-t border-vpos-line pt-3">
            <span className="text-[13px] font-bold text-vpos-muted">Total due</span>
            <strong className="text-[20px] text-vpos-primary">{formatCurrency(Number(order.grandTotal ?? 0), currency)}</strong>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <Button onClick={() => onChoose('khqr')} disabled={busy !== null}>
            <Icon name={busy === 'khqr' ? 'loader-4-line' : 'qr-code-line'} /> Pay with KHQR
          </Button>
          <Button variant="secondary" onClick={() => onChoose('cash')} disabled={busy !== null}>
            <Icon name="money-dollar-circle-line" /> Pay with cash
          </Button>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-vpos-line pt-3">
          {confirmCancel ? (
            <span className="text-[12px] text-vpos-red">Cancel this sale and put its items back in stock?</span>
          ) : (
            <span className="text-[12px] text-vpos-muted">The customer left without paying?</span>
          )}
          {confirmCancel ? (
            <div className="flex shrink-0 gap-2">
              <Button variant="secondary" onClick={() => setConfirmCancel(false)} disabled={busy !== null}>Keep it</Button>
              <Button variant="danger" onClick={() => onChoose('cancel')} disabled={busy !== null}>
                {busy === 'cancel' ? <Icon name="loader-4-line" /> : null} Cancel sale
              </Button>
            </div>
          ) : (
            <Button variant="secondary" onClick={() => setConfirmCancel(true)} disabled={busy !== null}>Cancel sale</Button>
          )}
        </div>
      </div>
    </Modal>
  )
}
