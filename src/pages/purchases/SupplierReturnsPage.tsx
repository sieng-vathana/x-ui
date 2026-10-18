import { useEffect, useMemo, useState } from 'react'
import {
  Breadcrumb,
  Button,
  DataTable,
  FormField,
  Icon,
  MetricCard,
  Select,
  Status,
  StoreSwitcher,
  Topbar,
  type DataTableColumn,
} from '../../components'
import { PurchaseLineEditor, type EditableLine } from '../../components/purchases/PurchaseLineEditor'
import { PurchasesSubnav } from '../../components/purchases/PurchasesSubnav'
import { Modal } from '../../components/ui/Modal'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import {
  useCreateSupplierReturn,
  usePurchaseOrders,
  useSupplierReturnAction,
  useSupplierReturns,
  useSuppliers,
} from '../../features/purchases/usePurchases'
import {
  returnStatusLabel,
  supplierIsActive,
  type SupplierReturn,
  type SupplierReturnStatus,
} from '../../features/purchases/types'
import { useStoresRaw } from '../../features/stores/useStores'
import { useAdminStore } from '../../hooks/useAdminStore'
import { formatCurrency } from '../../lib/currency'
import { paths } from '../../lib/paths'
import { pageContent } from '../../lib/ui'

const STATUSES: SupplierReturnStatus[] = ['PENDING', 'COMPLETED', 'CANCELLED']

/** Goods sent back to suppliers. Completing a return removes the goods from the store's stock. */
export function SupplierReturnsPage() {
  const { toast } = useToast()
  const { storeId, setStoreId } = useAdminStore()
  const [status, setStatus] = useState<SupplierReturnStatus | ''>('')
  const [creating, setCreating] = useState(false)
  const [viewing, setViewing] = useState<SupplierReturn | null>(null)
  const returnsQuery = useSupplierReturns(Number(storeId) || undefined)
  const storesQuery = useStoresRaw()
  const actionMutation = useSupplierReturnAction()
  const storeNames = useMemo(() => new Map((storesQuery.data ?? []).map((store) => [store.id, store.name])), [storesQuery.data])
  const returns = useMemo(() => returnsQuery.data ?? [], [returnsQuery.data])
  const rows = useMemo(() => (status ? returns.filter((supplierReturn) => supplierReturn.status === status) : returns), [returns, status])
  const pending = returns.filter((supplierReturn) => supplierReturn.status === 'PENDING').length
  const completedValue = returns
    .filter((supplierReturn) => supplierReturn.status === 'COMPLETED')
    .reduce((totals, supplierReturn) => totals.set(supplierReturn.currencyCode, (totals.get(supplierReturn.currencyCode) ?? 0) + supplierReturn.totalCost), new Map<string, number>())

  const act = async (supplierReturn: SupplierReturn, action: 'complete' | 'cancel') => {
    try {
      const updated = await actionMutation.mutateAsync({ id: supplierReturn.id, action })
      setViewing(null)
      toast(action === 'complete'
        ? `${updated.returnNumber} completed. ${updated.units} units removed from stock.`
        : `${updated.returnNumber} cancelled.`, 'success')
    } catch (error) {
      toast(error instanceof Error ? error.message : 'The return could not be updated.', 'error')
    }
  }

  const columns: DataTableColumn<SupplierReturn>[] = useMemo(
    () => [
      { id: 'ref', header: 'Return #', searchable: (r) => r.returnNumber, cell: (r) => <strong className="text-vpos-primary">{r.returnNumber}</strong> },
      { id: 'supplier', header: 'Supplier', searchable: (r) => r.supplierName, cell: (r) => r.supplierName },
      { id: 'store', header: 'Store', hideOnMobile: true, searchable: (r) => storeNames.get(r.storeId) ?? '', cell: (r) => storeNames.get(r.storeId) ?? `Store #${r.storeId}` },
      { id: 'date', header: 'Date', cell: (r) => r.createdAt.slice(0, 10) },
      { id: 'units', header: 'Units', cell: (r) => r.units },
      { id: 'total', header: 'Value', cell: (r) => <strong>{formatCurrency(r.totalCost, r.currencyCode)}</strong> },
      { id: 'reason', header: 'Reason', searchable: (r) => r.reason, className: 'max-w-[200px] whitespace-normal', cell: (r) => r.reason },
      { id: 'status', header: 'Status', searchable: (r) => returnStatusLabel(r.status), cell: (r) => <Status value={returnStatusLabel(r.status)} /> },
      { id: 'actions', header: '', cell: (r) => <Button variant="text" onClick={() => setViewing(r)}>View</Button> },
    ],
    [storeNames],
  )

  return (
    <>
      <Topbar title="Purchases" subtitle="Return damaged or incorrect stock to suppliers" actions={<StoreSwitcher value={storeId} onChange={setStoreId} />} />
      <main className={pageContent}>
        <section className="mb-5 flex min-h-12 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1">
            <Breadcrumb items={[{ label: 'Purchases', to: paths.purchases }, { label: 'Supplier returns' }]} />
          </div>
          <div className="flex shrink-0 flex-wrap gap-2.5">
            <Button variant="primary" onClick={() => setCreating(true)}>
              <Icon name="add-line" /> New return
            </Button>
          </div>
        </section>

        <PurchasesSubnav />

        <section className="mb-[18px] grid grid-cols-1 gap-[18px] sm:grid-cols-2 xl:grid-cols-3">
          <MetricCard label="Pending returns" value={String(pending)} trend="Not sent back yet" trendAs="small" icon={<Icon name="arrow-go-back-line" />} iconTone="warning" />
          <MetricCard label="All returns" value={String(returns.length)} trend="For this store" trendAs="small" icon={<Icon name="file-list-line" />} iconTone="primary" />
          <MetricCard
            label="Returned value"
            value={completedValue.size === 0 ? formatCurrency(0, 'USD') : Array.from(completedValue, ([currency, total]) => formatCurrency(total, currency)).join(' + ')}
            trend="Completed returns"
            trendAs="small"
            icon={<Icon name="funds-line" />}
            iconTone="primary"
          />
        </section>

        <DataTable
          data={rows}
          columns={columns}
          rowKey={(r) => String(r.id)}
          title="Supplier returns"
          searchPlaceholder="Search return #, supplier, reason…"
          pageSize={10}
          emptyMessage={returnsQuery.isLoading ? 'Loading returns…' : 'No supplier returns yet.'}
          toolbar={
            <Select
              variant="toolbar"
              placeholder="All status"
              value={status}
              onChange={(value) => setStatus(value as SupplierReturnStatus | '')}
              options={STATUSES.map((value) => ({ value, label: returnStatusLabel(value) }))}
            />
          }
        />
      </main>

      <NewReturnModal open={creating} onClose={() => setCreating(false)} defaultStoreId={storeId} />

      <Modal
        open={Boolean(viewing)}
        onClose={() => setViewing(null)}
        size="lg"
        title={viewing ? `${viewing.returnNumber} · ${viewing.supplierName}` : 'Supplier return'}
        description={viewing ? `${returnStatusLabel(viewing.status)} · ${viewing.reason}` : undefined}
        footer={viewing?.status === 'PENDING' ? (
          <>
            <Button variant="secondary" onClick={() => viewing && void act(viewing, 'cancel')} disabled={actionMutation.isPending}>Cancel return</Button>
            <Button variant="primary" onClick={() => viewing && void act(viewing, 'complete')} disabled={actionMutation.isPending}>
              <Icon name="checkbox-circle-line" /> Complete and remove stock
            </Button>
          </>
        ) : <Button variant="secondary" onClick={() => setViewing(null)}>Done</Button>}
      >
        {viewing ? (
          <div className="space-y-2 text-[13px]">
            {viewing.lines.map((line) => (
              <div key={line.id} className="flex justify-between gap-3 border-b border-vpos-line/70 pb-2">
                <span><strong>{line.productName}</strong>{line.variantName ? ` · ${line.variantName}` : ''}<small className="block text-vpos-muted">{line.quantity} × {formatCurrency(line.unitCost, viewing.currencyCode)}</small></span>
                <strong>{formatCurrency(line.lineTotal, viewing.currencyCode)}</strong>
              </div>
            ))}
            <div className="flex justify-between pt-1 text-[14px]"><span className="font-bold">Total</span><strong>{formatCurrency(viewing.totalCost, viewing.currencyCode)}</strong></div>
            {viewing.status === 'PENDING' ? <p className="mb-0 text-vpos-muted">Complete the return when the goods leave the store; their stock is removed then.</p> : null}
          </div>
        ) : null}
      </Modal>
    </>
  )
}

function NewReturnModal({ open, onClose, defaultStoreId }: { open: boolean; onClose: () => void; defaultStoreId: string }) {
  const { toast } = useToast()
  const { user } = useAuth()
  const suppliersQuery = useSuppliers()
  const storesQuery = useStoresRaw()
  const createMutation = useCreateSupplierReturn()
  const [supplierId, setSupplierId] = useState('')
  const [storeId, setStoreId] = useState(defaultStoreId)
  const [purchaseOrderId, setPurchaseOrderId] = useState('')
  const [currencyCode, setCurrencyCode] = useState('USD')
  const [reason, setReason] = useState('')
  const [lines, setLines] = useState<EditableLine[]>([])
  const ordersQuery = usePurchaseOrders(Number(storeId) || undefined)
  const supplierOrders = (ordersQuery.data ?? []).filter((order) => String(order.supplierId) === supplierId && order.unitsReceived > 0)

  useEffect(() => {
    if (!open) return
    setSupplierId('')
    setStoreId(defaultStoreId)
    setPurchaseOrderId('')
    setCurrencyCode((user?.business.defaultCurrencyCode || 'USD').toUpperCase())
    setReason('')
    setLines([])
  }, [defaultStoreId, open, user?.business.defaultCurrencyCode])

  const save = async () => {
    if (!supplierId || !Number(storeId) || !reason.trim() || lines.length === 0) {
      toast('Choose the supplier and store, give a reason and add the products.', 'warning')
      return
    }
    try {
      const created = await createMutation.mutateAsync({
        storeId: Number(storeId),
        supplierId: Number(supplierId),
        purchaseOrderId: purchaseOrderId ? Number(purchaseOrderId) : undefined,
        currencyCode,
        reason: reason.trim(),
        lines: lines.map((line) => ({ variantId: line.variantId, quantity: line.quantity, unitCost: line.unitCost })),
      })
      toast(`${created.returnNumber} saved. Complete it when the goods leave the store.`, 'success')
      onClose()
    } catch (error) {
      toast(error instanceof Error ? error.message : 'The return could not be saved.', 'error')
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="3xl"
      closeOnBackdrop={false}
      title="New supplier return"
      description="Record goods going back to a supplier. Stock is removed when you complete the return."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={() => void save()} disabled={createMutation.isPending}>
            <Icon name="save-line" /> Save return
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="Supplier" value={supplierId} onChange={(value) => { setSupplierId(value); setPurchaseOrderId('') }} placeholder="Choose a supplier" options={(suppliersQuery.data ?? []).filter(supplierIsActive).map((supplier) => ({ value: String(supplier.id), label: supplier.supplierName }))} />
          <Select label="Store" value={storeId} onChange={(value) => { setStoreId(value); setLines([]); setPurchaseOrderId('') }} options={(storesQuery.data ?? []).map((store) => ({ value: String(store.id), label: store.name }))} />
          <Select label="From purchase order (optional)" value={purchaseOrderId} onChange={setPurchaseOrderId} placeholder="Not linked" options={supplierOrders.map((order) => ({ value: String(order.id), label: `${order.poNumber} · ${order.orderDate}` }))} />
          <Select label="Currency" value={currencyCode} onChange={setCurrencyCode} options={[{ value: 'USD', label: 'USD — US dollar' }, { value: 'KHR', label: 'KHR — Riel' }]} />
        </div>
        <FormField label="Reason" value={reason} onChange={(event) => setReason(event.target.value)} maxLength={255} placeholder="For example: damaged packaging, wrong item, expired" />
        {Number(storeId) ? <PurchaseLineEditor storeId={Number(storeId)} currencyCode={currencyCode} lines={lines} onChange={setLines} /> : null}
      </div>
    </Modal>
  )
}
