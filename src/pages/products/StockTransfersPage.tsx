import { useEffect, useMemo, useState } from 'react'
import { Button, Breadcrumb, Icon, Modal, ProductThumb, Select, StoreSwitcher, Topbar } from '../../components'
import { ProductsSubnav } from '../../components/products/ProductsSubnav'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { useCreateStockTransfer, useReceiveStockTransfer, useStockTransferCommand, useStockTransfers } from '../../features/inventory/useStockTransfers'
import type { StockTransfer, StockTransferLine, StockTransferStatus } from '../../features/inventory/stockTransferApi'
import { useProductsList } from '../../features/products/useProducts'
import type { ProductItem } from '../../features/products/types'
import { useStoresRaw } from '../../features/stores/useStores'
import { useAdminStore } from '../../hooks/useAdminStore'
import { cn } from '../../lib/cn'
import { paths } from '../../lib/paths'
import { card, pageContent } from '../../lib/ui'
import { savedImageUrl } from '../../lib/api'
import { parseServerTime } from '../../lib/serverTime'

const STATUS_FILTERS = [
  { value: 'ALL', label: 'All statuses' },
  { value: 'REQUESTED', label: 'Requested' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'IN_TRANSIT', label: 'In transit' },
  { value: 'PARTIALLY_RECEIVED', label: 'Partially received' },
  { value: 'RECEIVED', label: 'Received' },
  { value: 'RECEIVED_WITH_VARIANCE', label: 'Received with variance' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'CANCELLED', label: 'Cancelled' },
]

const STATUS_STYLE: Record<StockTransferStatus, string> = {
  REQUESTED: 'bg-amber-50 text-amber-800',
  APPROVED: 'bg-blue-50 text-blue-800',
  REJECTED: 'bg-rose-50 text-rose-800',
  IN_TRANSIT: 'bg-violet-50 text-violet-800',
  PARTIALLY_RECEIVED: 'bg-orange-50 text-orange-800',
  RECEIVED: 'bg-emerald-50 text-emerald-800',
  RECEIVED_WITH_VARIANCE: 'bg-red-50 text-red-800',
  CANCELLED: 'bg-slate-100 text-slate-600',
}

interface DraftLine {
  variantId: number
  productName: string
  variantName: string
  sku: string
  image?: string
  quantity: number
}

function storeLabel(storeId: number, stores: { id: number; name: string }[]) {
  return stores.find((store) => store.id === storeId)?.name ?? `Store #${storeId}`
}

function variantRows(products: ProductItem[]) {
  return products.flatMap((product) => (product.variants ?? []).flatMap((variant) => {
    if (!variant.id || product.isStockable === false) return []
    return [{
      id: variant.id,
      productName: product.productName,
      variantName: variant.displayName || variant.variantName || '',
      sku: variant.sku || product.productCode,
      image: savedImageUrl(variant.image, product.thumbnail, product.images?.[0]?.imageUrl),
      label: [product.productName, variant.displayName || variant.variantName, variant.sku || product.productCode]
        .filter(Boolean).join(' · '),
    }]
  }))
}

function formatDate(value?: string | null) {
  if (!value) return '—'
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(parseServerTime(value))
}

export function StockTransfersPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const { storeId, setStoreId } = useAdminStore()
  const currentStoreId = Number(storeId)
  const storesQuery = useStoresRaw()
  const stores = storesQuery.data ?? []
  const transferQuery = useStockTransfers(currentStoreId)
  const [filter, setFilter] = useState('ALL')
  const [createOpen, setCreateOpen] = useState(false)
  const [receiveTransfer, setReceiveTransfer] = useState<StockTransfer | null>(null)
  const [sourceStoreId, setSourceStoreId] = useState('')
  const [destinationStoreId, setDestinationStoreId] = useState('')
  const [variantId, setVariantId] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [draftLines, setDraftLines] = useState<DraftLine[]>([])
  const [createNote, setCreateNote] = useState('')
  const [receiveNote, setReceiveNote] = useState('')
  const [receiptQuantities, setReceiptQuantities] = useState<Record<number, { received: string; missing: string }>>({})

  const sourceProducts = useProductsList(sourceStoreId, createOpen && Boolean(sourceStoreId))
  const variants = useMemo(() => variantRows(sourceProducts.data ?? []), [sourceProducts.data])
  const createMutation = useCreateStockTransfer()
  const commandMutation = useStockTransferCommand()
  const receiveMutation = useReceiveStockTransfer()

  const canCreate = user?.permissions.includes('x-inventory:create') ?? false
  const canUpdate = user?.permissions.includes('x-inventory:update') ?? false
  const canDispatch = user?.permissions.includes('x-inventory:stock-out') ?? false
  const canReceive = user?.permissions.includes('x-inventory:stock-in') ?? false

  useEffect(() => {
    if (createOpen && !sourceStoreId && currentStoreId) setSourceStoreId(String(currentStoreId))
  }, [createOpen, currentStoreId, sourceStoreId])

  useEffect(() => {
    if (!receiveTransfer) return
    setReceiptQuantities(Object.fromEntries(receiveTransfer.lines.map((line) => [line.id, { received: '', missing: '' }])))
    setReceiveNote('')
  }, [receiveTransfer])

  const transfers = (transferQuery.data?.content ?? [])
    .filter((transfer) => filter === 'ALL' || transfer.status === filter)
    .sort((a, b) => parseServerTime(b.createdAt).getTime() - parseServerTime(a.createdAt).getTime())

  const closeCreate = () => {
    setCreateOpen(false)
    setDraftLines([])
    setVariantId('')
    setQuantity('1')
    setCreateNote('')
    setDestinationStoreId('')
  }

  const addDraftLine = () => {
    const selected = variants.find((variant) => String(variant.id) === variantId)
    const amount = Number(quantity)
    if (!selected || !Number.isInteger(amount) || amount < 1) {
      toast('Choose a product and enter a quantity of at least one.', 'warning')
      return
    }
    if (draftLines.some((line) => line.variantId === selected.id)) {
      toast('That product variant is already on this transfer.', 'warning')
      return
    }
    setDraftLines((lines) => [...lines, {
      variantId: selected.id,
      productName: selected.productName,
      variantName: selected.variantName,
      sku: selected.sku,
      image: selected.image,
      quantity: amount,
    }])
    setVariantId('')
    setQuantity('1')
  }

  const submitCreate = async () => {
    const sourceId = Number(sourceStoreId)
    const destinationId = Number(destinationStoreId)
    if (!sourceId || !destinationId || sourceId === destinationId || draftLines.length === 0) {
      toast('Choose two different stores and add at least one product.', 'warning')
      return
    }
    try {
      await createMutation.mutateAsync({
        sourceStoreId: sourceId,
        destinationStoreId: destinationId,
        performedBy: Number(user?.id) || undefined,
        note: createNote.trim() || undefined,
        lines: draftLines.map(({ variantId: productVariantId, quantity: count }) => ({ variantId: productVariantId, quantity: count })),
      })
      toast('Stock transfer request created.', 'success')
      closeCreate()
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Stock transfer could not be created.', 'error')
    }
  }

  const performCommand = async (transfer: StockTransfer, action: 'approve' | 'reject' | 'cancel' | 'dispatch') => {
    const verbs: Record<typeof action, string> = { approve: 'approved', reject: 'rejected', cancel: 'cancelled', dispatch: 'dispatched' }
    try {
      await commandMutation.mutateAsync({ id: transfer.id, action, input: { performedBy: Number(user?.id) || undefined } })
      toast(`Transfer #${transfer.id} ${verbs[action]}.`, 'success')
    } catch (error) {
      toast(error instanceof Error ? error.message : `Transfer could not be ${verbs[action]}.`, 'error')
    }
  }

  const submitReceipt = async () => {
    if (!receiveTransfer) return
    const lines = receiveTransfer.lines.map((line) => ({
      lineId: line.id,
      receivedQuantity: Number(receiptQuantities[line.id]?.received || 0),
      missingQuantity: Number(receiptQuantities[line.id]?.missing || 0),
    }))
    const anyEntered = lines.some((line) => line.receivedQuantity + line.missingQuantity > 0)
    const invalid = receiveTransfer.lines.some((line) => {
      const values = receiptQuantities[line.id]
      const received = Number(values?.received || 0)
      const missing = Number(values?.missing || 0)
      const remaining = line.quantityDispatched - line.quantityReceived - line.quantityMissing
      return !Number.isInteger(received) || !Number.isInteger(missing) || received < 0 || missing < 0 || received + missing > remaining
    })
    if (!anyEntered || invalid) {
      toast('Enter valid received or missing quantities within each line’s remaining shipment.', 'warning')
      return
    }
    try {
      await receiveMutation.mutateAsync({
        id: receiveTransfer.id,
        input: {
          performedBy: Number(user?.id) || undefined,
          note: receiveNote.trim() || undefined,
          lines: lines.filter((line) => line.receivedQuantity + line.missingQuantity > 0),
        },
      })
      toast('Transfer receipt recorded.', 'success')
      setReceiveTransfer(null)
    } catch (error) {
      toast(error instanceof Error ? error.message : 'The receipt could not be recorded.', 'error')
    }
  }

  return (
    <>
      <Topbar title="Stock transfers" subtitle="Move stock between your stores with approval, dispatch, and receiving records" actions={<StoreSwitcher value={storeId} onChange={setStoreId} />} />
      <main className={pageContent}>
        <section className="mb-5 flex min-h-12 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1"><Breadcrumb items={[{ label: 'Products', to: paths.products }, { label: 'Stock transfers' }]} /></div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => void transferQuery.refetch()}><Icon name="refresh-line" /> Refresh</Button>
            {canCreate ? <Button onClick={() => setCreateOpen(true)}><Icon name="add-line" /> New transfer</Button> : null}
          </div>
        </section>
        <ProductsSubnav />

        {transferQuery.error ? <div className="mb-4 rounded border border-vpos-red/25 bg-vpos-red-bg p-4 text-sm text-vpos-red">{transferQuery.error instanceof Error ? transferQuery.error.message : 'Stock transfers could not be loaded.'}</div> : null}

        <section className={cn(card, 'mb-4 flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between')}>
          <div>
            <h2 className="m-0 text-[15px] font-extrabold text-vpos-text">Transfers involving {storeLabel(currentStoreId, stores)}</h2>
            <p className="mb-0 mt-1 text-[12px] text-vpos-muted">Dispatch deducts stock using earliest-expiry lots. Receiving preserves each lot’s expiry date.</p>
          </div>
          <Select variant="toolbar" value={filter} onChange={setFilter} options={STATUS_FILTERS} />
        </section>

        <section className="space-y-3">
          {transferQuery.isLoading ? <div className={cn(card, 'p-5 text-sm text-vpos-muted')}>Loading stock transfers…</div> : null}
          {!transferQuery.isLoading && transfers.length === 0 ? (
            <div className={cn(card, 'p-8 text-center')}>
              <span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-vpos-sand text-vpos-primary"><Icon name="truck-line" className="text-2xl" /></span>
              <h3 className="m-0 text-base font-bold text-vpos-text">No stock transfers yet</h3>
              <p className="mb-0 mt-2 text-sm text-vpos-muted">Create a request to move inventory between stores, then approve, dispatch, and record what arrived.</p>
            </div>
          ) : null}
          {transfers.map((transfer) => (
            <TransferCard
              key={transfer.id}
              transfer={transfer}
              isSource={transfer.sourceStoreId === currentStoreId}
              isDestination={transfer.destinationStoreId === currentStoreId}
              storeName={(id) => storeLabel(id, stores)}
              canUpdate={canUpdate}
              canDispatch={canDispatch}
              canReceive={canReceive}
              isBusy={commandMutation.isPending || receiveMutation.isPending}
              onAction={(action) => void performCommand(transfer, action)}
              onReceive={() => setReceiveTransfer(transfer)}
            />
          ))}
        </section>
      </main>

      <Modal open={createOpen} onClose={closeCreate} title="Request a stock transfer" description="Select stores, add items, and submit the request for approval." size="2xl" closeOnBackdrop={false}
        footer={<><Button variant="secondary" disabled={createMutation.isPending} onClick={closeCreate}>Cancel</Button><Button disabled={createMutation.isPending || draftLines.length === 0} onClick={() => void submitCreate()}>{createMutation.isPending ? 'Submitting…' : 'Submit request'}</Button></>}>
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Select label="From store" required searchable value={sourceStoreId} onChange={(value) => { setSourceStoreId(value); setDraftLines([]); setVariantId('') }} options={stores.map((store) => ({ value: String(store.id), label: store.name }))} />
            <Select label="To store" required searchable value={destinationStoreId} onChange={setDestinationStoreId} options={stores.filter((store) => String(store.id) !== sourceStoreId).map((store) => ({ value: String(store.id), label: store.name }))} />
          </div>
          {sourceStoreId && destinationStoreId && sourceStoreId === destinationStoreId ? <p className="m-0 text-sm text-vpos-red">Choose two different stores.</p> : null}
          <div className="grid items-end gap-3 sm:grid-cols-[1fr_110px_auto]">
            <Select label="Product variant" searchable value={variantId} onChange={setVariantId} options={variants.filter((variant) => !draftLines.some((line) => line.variantId === variant.id)).map((variant) => ({ value: String(variant.id), label: variant.label }))} placeholder={sourceProducts.isLoading ? 'Loading products…' : 'Select a product'} />
            <label className="block"><span className="mb-2 block text-[12px] font-semibold text-vpos-dark">Quantity</span><input type="number" min="1" step="1" value={quantity} onChange={(event) => setQuantity(event.target.value)} className="h-[39px] w-full rounded border border-vpos-line bg-white px-3 text-sm outline-none focus:border-vpos-primary" /></label>
            <Button variant="secondary" onClick={addDraftLine}><Icon name="add-line" /> Add item</Button>
          </div>
          {sourceProducts.error ? <p className="m-0 text-sm text-vpos-red">Products could not be loaded for the source store.</p> : null}
          {draftLines.length > 0 ? <div className="overflow-hidden rounded border border-vpos-line">
            {draftLines.map((line) => <div key={line.variantId} className="flex items-center gap-3 border-b border-vpos-line p-3 last:border-b-0"><ProductThumb src={line.image} /><div className="min-w-0 flex-1"><strong className="block truncate text-sm">{line.productName}</strong><span className="text-xs text-vpos-muted">{[line.variantName, line.sku].filter(Boolean).join(' · ')}</span></div><strong className="text-sm">× {line.quantity}</strong><button type="button" aria-label="Remove item" className="grid h-8 w-8 place-items-center rounded text-vpos-red hover:bg-vpos-red-bg" onClick={() => setDraftLines((items) => items.filter((item) => item.variantId !== line.variantId))}><Icon name="close-line" /></button></div>)}
          </div> : <p className="m-0 rounded bg-vpos-subtle p-3 text-sm text-vpos-muted">Add at least one product variant to the transfer request.</p>}
          <label className="block"><span className="mb-2 block text-[12px] font-semibold text-vpos-dark">Request note</span><textarea value={createNote} onChange={(event) => setCreateNote(event.target.value)} maxLength={500} rows={2} className="w-full rounded border border-vpos-line bg-white p-3 text-sm outline-none focus:border-vpos-primary" placeholder="Optional reason or handling note" /></label>
        </div>
      </Modal>

      <Modal open={Boolean(receiveTransfer)} onClose={() => setReceiveTransfer(null)} title={`Receive transfer #${receiveTransfer?.id ?? ''}`} description="Record accepted units and any units that are missing from this shipment." size="2xl" closeOnBackdrop={false}
        footer={<><Button variant="secondary" disabled={receiveMutation.isPending} onClick={() => setReceiveTransfer(null)}>Cancel</Button><Button disabled={receiveMutation.isPending} onClick={() => void submitReceipt()}>{receiveMutation.isPending ? 'Saving…' : 'Record receipt'}</Button></>}>
        <div className="space-y-3">
          {receiveTransfer?.lines.map((line) => {
            const remaining = line.quantityDispatched - line.quantityReceived - line.quantityMissing
            return <ReceiveLine key={line.id} line={line} remaining={remaining} value={receiptQuantities[line.id] ?? { received: '', missing: '' }} onChange={(value) => setReceiptQuantities((items) => ({ ...items, [line.id]: value }))} />
          })}
          <label className="block"><span className="mb-2 block text-[12px] font-semibold text-vpos-dark">Receipt note</span><textarea value={receiveNote} onChange={(event) => setReceiveNote(event.target.value)} maxLength={500} rows={2} className="w-full rounded border border-vpos-line bg-white p-3 text-sm outline-none focus:border-vpos-primary" placeholder="Optional discrepancy or condition details" /></label>
        </div>
      </Modal>
    </>
  )
}

function TransferCard({ transfer, isSource, isDestination, storeName, canUpdate, canDispatch, canReceive, isBusy, onAction, onReceive }: {
  transfer: StockTransfer
  isSource: boolean
  isDestination: boolean
  storeName: (id: number) => string
  canUpdate: boolean
  canDispatch: boolean
  canReceive: boolean
  isBusy: boolean
  onAction: (action: 'approve' | 'reject' | 'cancel' | 'dispatch') => void
  onReceive: () => void
}) {
  return (
    <article className={cn(card, 'overflow-hidden')}>
      <header className="flex flex-col gap-3 border-b border-vpos-line px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="flex flex-wrap items-center gap-2.5"><strong className="text-[15px]">Transfer #{transfer.id}</strong><span className={cn('rounded-full px-2.5 py-1 text-[11px] font-bold', STATUS_STYLE[transfer.status])}>{transfer.status.replaceAll('_', ' ')}</span></div>
        <span className="text-xs text-vpos-muted">Created {formatDate(transfer.createdAt)}</span>
      </header>
      <div className="grid gap-4 p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm"><span className="font-semibold">{storeName(transfer.sourceStoreId)}</span><Icon name="arrow-right-line" className="text-vpos-primary" /><span className="font-semibold">{storeName(transfer.destinationStoreId)}</span></div>
        <div className="overflow-x-auto rounded border border-vpos-line">
          <table className="w-full min-w-[570px] text-left text-sm"><thead className="bg-vpos-subtle text-xs text-vpos-muted"><tr><th className="px-3 py-2">Product</th><th className="px-3 py-2">Requested</th><th className="px-3 py-2">Sent</th><th className="px-3 py-2">Received</th><th className="px-3 py-2">Missing</th><th className="px-3 py-2">Remaining</th></tr></thead><tbody>{transfer.lines.map((line) => <tr key={line.id} className="border-t border-vpos-line"><td className="px-3 py-2.5"><strong>{line.productName}</strong><small className="mt-0.5 block text-xs text-vpos-muted">{[line.variantName, line.sku].filter(Boolean).join(' · ')}</small></td><td className="px-3 py-2.5">{line.quantityRequested}</td><td className="px-3 py-2.5">{line.quantityDispatched || '—'}</td><td className="px-3 py-2.5">{line.quantityReceived || '—'}</td><td className="px-3 py-2.5">{line.quantityMissing || '—'}</td><td className="px-3 py-2.5">{Math.max(0, line.quantityDispatched - line.quantityReceived - line.quantityMissing) || '—'}</td></tr>)}</tbody></table>
        </div>
        {transfer.note ? <p className="m-0 text-sm text-vpos-muted"><strong className="text-vpos-text">Note:</strong> {transfer.note}</p> : null}
        {transfer.resolutionNote ? <p className="m-0 rounded bg-vpos-subtle p-3 text-sm text-vpos-muted"><strong className="text-vpos-text">Decision note:</strong> {transfer.resolutionNote}</p> : null}
        <div className="flex flex-wrap gap-2">
          {isSource && transfer.status === 'REQUESTED' && canUpdate ? <><Button variant="small" disabled={isBusy} onClick={() => onAction('approve')}>Approve</Button><Button variant="secondary" disabled={isBusy} onClick={() => onAction('reject')}>Reject</Button></> : null}
          {isSource && transfer.status === 'APPROVED' && canDispatch ? <Button disabled={isBusy} onClick={() => onAction('dispatch')}><Icon name="truck-line" /> Dispatch stock</Button> : null}
          {isDestination && (transfer.status === 'IN_TRANSIT' || transfer.status === 'PARTIALLY_RECEIVED') && canReceive ? <Button disabled={isBusy} onClick={onReceive}><Icon name="inbox-archive-line" /> Receive stock</Button> : null}
          {isSource && (transfer.status === 'REQUESTED' || transfer.status === 'APPROVED') && canUpdate ? <Button variant="secondary" disabled={isBusy} onClick={() => onAction('cancel')}>Cancel request</Button> : null}
        </div>
      </div>
    </article>
  )
}

function ReceiveLine({ line, remaining, value, onChange }: {
  line: StockTransferLine
  remaining: number
  value: { received: string; missing: string }
  onChange: (value: { received: string; missing: string }) => void
}) {
  return <div className="grid gap-3 rounded border border-vpos-line p-3 sm:grid-cols-[1fr_110px_110px] sm:items-end">
    <div className="min-w-0"><strong className="block text-sm">{line.productName}</strong><span className="text-xs text-vpos-muted">{[line.variantName, line.sku].filter(Boolean).join(' · ')} · {remaining} remaining</span></div>
    <label className="block"><span className="mb-1.5 block text-[11px] font-semibold text-vpos-dark">Received</span><input type="number" min="0" max={remaining} step="1" value={value.received} onChange={(event) => onChange({ ...value, received: event.target.value })} className="h-9 w-full rounded border border-vpos-line px-2 text-sm outline-none focus:border-vpos-primary" /></label>
    <label className="block"><span className="mb-1.5 block text-[11px] font-semibold text-vpos-dark">Missing</span><input type="number" min="0" max={remaining} step="1" value={value.missing} onChange={(event) => onChange({ ...value, missing: event.target.value })} className="h-9 w-full rounded border border-vpos-line px-2 text-sm outline-none focus:border-vpos-primary" /></label>
  </div>
}
