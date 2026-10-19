import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Breadcrumb,
  Button,
  Icon,
  Status,
  StoreSwitcher,
  Topbar,
} from '../../components'
import { PurchaseOrderPicker } from '../../components/purchases/PurchaseOrderPicker'
import { PurchasesSubnav } from '../../components/purchases/PurchasesSubnav'
import { useToast } from '../../context/ToastContext'
import { usePurchaseOrders, useReceivePurchaseOrder } from '../../features/purchases/usePurchases'
import { isReceivable, orderStatusLabel } from '../../features/purchases/types'
import { useStoresRaw } from '../../features/stores/useStores'
import { useAdminStore } from '../../hooks/useAdminStore'
import { cn } from '../../lib/cn'
import { formatCurrency } from '../../lib/currency'
import { paths } from '../../lib/paths'
import { card, pageContent, tdClass, thClass } from '../../lib/ui'

/** Adds goods that arrived to the store's stock, against an ordered purchase order. */
export function ReceiveGoodsPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [params] = useSearchParams()
  const { storeId, setStoreId } = useAdminStore()
  const ordersQuery = usePurchaseOrders()
  const storesQuery = useStoresRaw()
  const receiveMutation = useReceivePurchaseOrder()
  const storeNames = useMemo(() => new Map((storesQuery.data ?? []).map((store) => [store.id, store.name])), [storesQuery.data])
  const receivable = useMemo(() => (ordersQuery.data ?? []).filter(isReceivable), [ordersQuery.data])

  const [orderId, setOrderId] = useState(0)
  const [quantities, setQuantities] = useState<Record<number, number>>({})
  const [batchCodes, setBatchCodes] = useState<Record<number, string>>({})
  const [expiryDates, setExpiryDates] = useState<Record<number, string>>({})
  const [note, setNote] = useState('')
  const order = receivable.find((candidate) => candidate.id === orderId)

  // Pick the order from the link, else the first one waiting, once the list has loaded.
  useEffect(() => {
    if (receivable.length === 0 || receivable.some((candidate) => candidate.id === orderId)) return
    const fromLink = Number(params.get('po'))
    setOrderId(receivable.some((candidate) => candidate.id === fromLink) ? fromLink : receivable[0].id)
  }, [orderId, params, receivable])

  // Every line starts with what is still to come.
  useEffect(() => {
    if (!order) return
    setQuantities(Object.fromEntries(order.lines.map((line) => [line.id, Math.max(0, line.qtyOrdered - line.qtyReceived)])))
    setBatchCodes({})
    setExpiryDates({})
    setNote('')
  }, [order])

  const totalToReceive = Object.values(quantities).reduce((sum, quantity) => sum + quantity, 0)
  const today = (() => {
    const date = new Date()
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  })()

  const confirm = async () => {
    if (!order) return
    if (totalToReceive === 0) {
      toast('Enter the quantities that arrived.', 'warning')
      return
    }
    if (Object.entries(quantities).some(([lineId, quantity]) => quantity > 0 && expiryDates[Number(lineId)] && expiryDates[Number(lineId)] < today)) {
      toast('A received batch cannot have an expiry date in the past.', 'warning')
      return
    }
    try {
      const updated = await receiveMutation.mutateAsync({
        id: order.id,
        lines: Object.entries(quantities).filter(([, quantity]) => quantity > 0).map(([lineId, quantity]) => ({
          lineId: Number(lineId),
          quantity,
          ...(batchCodes[Number(lineId)]?.trim() ? { batchCode: batchCodes[Number(lineId)].trim() } : {}),
          ...(expiryDates[Number(lineId)] ? { expiryDate: expiryDates[Number(lineId)] } : {}),
        })),
        note: note.trim() || undefined,
      })
      toast(updated.status === 'RECEIVED'
        ? `${updated.poNumber} is fully received. ${totalToReceive} unit${totalToReceive === 1 ? '' : 's'} added to stock.`
        : `${totalToReceive} unit${totalToReceive === 1 ? '' : 's'} added to stock. ${updated.poNumber} is waiting for the rest.`, 'success')
    } catch (error) {
      toast(error instanceof Error ? error.message : 'The goods could not be received.', 'error')
    }
  }

  return (
    <>
      <Topbar
        title="Purchases"
        subtitle="Receive stock against open purchase orders"
        actions={<StoreSwitcher value={storeId} onChange={setStoreId} />}
      />
      <main className={pageContent}>
        <section className="mb-5 flex min-h-12 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1">
            <Breadcrumb items={[{ label: 'Purchases', to: paths.purchases }, { label: 'Receive goods' }]} />
          </div>
          <div className="flex shrink-0 flex-wrap gap-2.5">
            <Button variant="secondary" onClick={() => navigate(paths.purchases)}>Back to orders</Button>
            <Button variant="primary" disabled={!order || totalToReceive === 0 || receiveMutation.isPending} onClick={() => void confirm()}>
              <Icon name={receiveMutation.isPending ? 'loader-4-line' : 'checkbox-circle-line'} className={receiveMutation.isPending ? 'animate-spin' : ''} /> Confirm receive
            </Button>
          </div>
        </section>

        <PurchasesSubnav />

        <article className={cn(card, 'mb-4 p-5')}>
          <div className="max-w-md">
            <span className="mb-1.5 block text-[12px] font-extrabold tracking-wide text-vpos-muted uppercase">Purchase order to receive</span>
            {ordersQuery.isLoading ? (
              <p className="m-0 text-[14px] text-vpos-muted">Loading orders…</p>
            ) : receivable.length === 0 ? (
              <p className="m-0 text-[14px] text-vpos-muted">
                No orders are waiting for goods. Place a purchase order first.{' '}
                <button type="button" onClick={() => navigate(paths.purchaseOrderNew)} className="border-0 bg-transparent p-0 font-bold text-vpos-primary underline underline-offset-2">New purchase order</button>
              </p>
            ) : (
              <PurchaseOrderPicker orders={receivable} value={orderId} onChange={setOrderId} storeNames={storeNames} />
            )}
          </div>

          {order ? (
            <div className="mt-4 flex flex-wrap items-center gap-4 text-[13px] text-vpos-muted">
              <span>Store: <strong className="text-vpos-text">{storeNames.get(order.storeId) ?? `Store #${order.storeId}`}</strong></span>
              <span>Expected: <strong className="text-vpos-text">{order.expectedDate || '—'}</strong></span>
              <span className="inline-flex items-center gap-1.5">Status: <Status value={orderStatusLabel(order.status)} /></span>
              <span>Order total: <strong className="text-vpos-text">{formatCurrency(order.totalCost, order.currencyCode)}</strong></span>
            </div>
          ) : null}
        </article>

        {order ? (
          <article className={cn(card, 'p-4')}>
            <strong className="mb-3 block text-[15px]">Quantities that arrived</strong>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
              <thead><tr>{['Product', 'SKU', 'Ordered', 'Already received', 'Still to come', 'Receive now', 'Batch code', 'Expiry date'].map((heading) => <th key={heading} className={thClass}>{heading}</th>)}</tr></thead>
                <tbody>
                  {order.lines.map((line) => {
                    const remaining = Math.max(0, line.qtyOrdered - line.qtyReceived)
                    return (
                      <tr key={line.id}>
                        <td className={tdClass}><strong>{line.productName}</strong>{line.variantName ? <small className="block text-[11px] text-vpos-muted">{line.variantName}</small> : null}</td>
                        <td className={tdClass}>{line.sku || '—'}</td>
                        <td className={tdClass}>{line.qtyOrdered}</td>
                        <td className={tdClass}>{line.qtyReceived}</td>
                        <td className={tdClass}>{remaining}</td>
                        <td className={tdClass}>
                          <input
                            type="number"
                            min={0}
                            max={remaining}
                            aria-label={`Receive ${line.productName}`}
                            value={quantities[line.id] ?? 0}
                            disabled={remaining === 0}
                            onChange={(event) => setQuantities((current) => ({
                              ...current,
                              [line.id]: Math.min(remaining, Math.max(0, Math.floor(Number(event.target.value) || 0))),
                            }))}
                            className="h-9 w-24 rounded-lg border border-vpos-line px-2 text-[13px] font-semibold outline-none focus:border-vpos-primary disabled:bg-vpos-subtle"
                          />
                        </td>
                        <td className={tdClass}>
                          <input
                            type="text"
                            maxLength={100}
                            aria-label={`Batch code for ${line.productName}`}
                            placeholder="Optional"
                            value={batchCodes[line.id] ?? ''}
                            disabled={remaining === 0 || (quantities[line.id] ?? 0) === 0}
                            onChange={(event) => setBatchCodes((current) => ({ ...current, [line.id]: event.target.value }))}
                            className="h-9 w-32 rounded-lg border border-vpos-line px-2 text-[13px] outline-none focus:border-vpos-primary disabled:bg-vpos-subtle"
                          />
                        </td>
                        <td className={tdClass}>
                          <input
                            type="date"
                            min={today}
                            aria-label={`Expiry date for ${line.productName}`}
                            value={expiryDates[line.id] ?? ''}
                            disabled={remaining === 0 || (quantities[line.id] ?? 0) === 0}
                            onChange={(event) => setExpiryDates((current) => ({ ...current, [line.id]: event.target.value }))}
                            className="h-9 w-36 rounded-lg border border-vpos-line px-2 text-[13px] outline-none focus:border-vpos-primary disabled:bg-vpos-subtle"
                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <p className="mt-3 mb-0 text-[12px] text-vpos-muted">
              Enter the supplier lot code and expiry date for dated goods. Each received line becomes its own stock batch; leave expiry blank for non-perishable goods.
            </p>
            <label className="mt-4 block max-w-xl">
              <span className="mb-1.5 block text-[12px] font-extrabold tracking-wide text-vpos-muted uppercase">Delivery note</span>
              <input value={note} onChange={(event) => setNote(event.target.value)} maxLength={500} placeholder="Optional, e.g. invoice number or who delivered" className="h-[39px] w-full rounded-[4px] border border-vpos-line px-3 text-[14px] outline-none focus:border-vpos-primary" />
            </label>
          </article>
        ) : null}
      </main>
    </>
  )
}
