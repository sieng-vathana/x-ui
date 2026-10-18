import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Breadcrumb,
  Button,
  FormField,
  Icon,
  Select,
  Status,
  StoreSwitcher,
  Topbar,
} from '../../components'
import { PurchaseLineEditor, type EditableLine } from '../../components/purchases/PurchaseLineEditor'
import { PurchasesSubnav } from '../../components/purchases/PurchasesSubnav'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import {
  usePurchaseOrder,
  usePurchaseOrderAction,
  useSavePurchaseOrder,
  useSuppliers,
} from '../../features/purchases/usePurchases'
import { isReceivable, orderStatusLabel, supplierIsActive } from '../../features/purchases/types'
import { useStoresRaw } from '../../features/stores/useStores'
import { useAdminStore } from '../../hooks/useAdminStore'
import { cn } from '../../lib/cn'
import { formatCurrency } from '../../lib/currency'
import { paths } from '../../lib/paths'
import { card, formGrid, pageContent, tdClass, thClass } from '../../lib/ui'

/** A new purchase order (id "new"), an editable draft, or a placed order to receive, close or cancel. */
export function PurchaseOrderDetailPage() {
  const { id } = useParams()
  const isNew = !id || id === 'new'
  const orderId = isNew ? undefined : Number(id)
  const navigate = useNavigate()
  const { toast } = useToast()
  const { user } = useAuth()
  const { storeId: adminStoreId, setStoreId } = useAdminStore()
  const orderQuery = usePurchaseOrder(orderId)
  const suppliersQuery = useSuppliers()
  const storesQuery = useStoresRaw()
  const saveMutation = useSavePurchaseOrder()
  const actionMutation = usePurchaseOrderAction()
  const order = orderQuery.data
  const editable = isNew || order?.status === 'DRAFT'

  const [supplierId, setSupplierId] = useState('')
  const [storeId, setStore] = useState(adminStoreId)
  const [currencyCode, setCurrencyCode] = useState((user?.business.defaultCurrencyCode || 'USD').toUpperCase())
  const [expectedDate, setExpectedDate] = useState('')
  const [note, setNote] = useState('')
  const [lines, setLines] = useState<EditableLine[]>([])

  useEffect(() => {
    if (!order) return
    setSupplierId(String(order.supplierId))
    setStore(String(order.storeId))
    setCurrencyCode(order.currencyCode)
    setExpectedDate(order.expectedDate ?? '')
    setNote(order.note ?? '')
    setLines(order.lines.map((line) => ({
      variantId: line.variantId,
      productName: line.productName,
      variantName: line.variantName,
      sku: line.sku,
      quantity: line.qtyOrdered,
      unitCost: line.unitCost,
    })))
  }, [order])

  const suppliers = useMemo(
    () => (suppliersQuery.data ?? []).filter((supplier) => supplierIsActive(supplier) || String(supplier.id) === supplierId),
    [suppliersQuery.data, supplierId],
  )
  const storeName = (storesQuery.data ?? []).find((store) => String(store.id) === String(order?.storeId ?? storeId))?.name
  const total = lines.reduce((sum, line) => sum + line.quantity * line.unitCost, 0)
  const title = isNew ? 'New purchase order' : order?.poNumber ?? 'Purchase order'

  const save = async (placeOrder: boolean) => {
    if (!supplierId) {
      toast('Choose a supplier.', 'warning')
      return
    }
    if (!Number(storeId)) {
      toast('Choose the store that receives the goods.', 'warning')
      return
    }
    if (lines.length === 0) {
      toast('Add at least one product.', 'warning')
      return
    }
    try {
      const saved = await saveMutation.mutateAsync({
        id: orderId,
        input: {
          storeId: Number(storeId),
          supplierId: Number(supplierId),
          currencyCode,
          expectedDate: expectedDate || undefined,
          note: note.trim() || undefined,
          placeOrder,
          lines: lines.map((line) => ({ variantId: line.variantId, quantity: line.quantity, unitCost: line.unitCost })),
        },
      })
      toast(placeOrder
        ? `${saved.poNumber} is ordered. Receive it when the goods arrive.`
        : `${saved.poNumber} saved as a draft.`, 'success')
      if (isNew) navigate(paths.purchaseOrder(String(saved.id)), { replace: true })
    } catch (error) {
      toast(error instanceof Error ? error.message : 'The purchase order could not be saved.', 'error')
    }
  }

  const act = async (action: 'close' | 'cancel') => {
    if (!order) return
    try {
      const updated = await actionMutation.mutateAsync({ id: order.id, action })
      toast(action === 'close'
        ? `${updated.poNumber} is closed. What was received stays in stock.`
        : `${updated.poNumber} is cancelled.`, 'success')
    } catch (error) {
      toast(error instanceof Error ? error.message : 'The purchase order could not be updated.', 'error')
    }
  }

  const busy = saveMutation.isPending || actionMutation.isPending
  const canCancel = order && (order.status === 'DRAFT' || order.status === 'ORDERED') && order.unitsReceived === 0

  return (
    <>
      <Topbar
        title="Purchases"
        subtitle={isNew ? 'Create a supplier purchase order' : `Order ${title}`}
        onBack={() => navigate(paths.purchases)}
        actions={<StoreSwitcher value={adminStoreId} onChange={setStoreId} />}
      />
      <main className={pageContent}>
        <section className="mb-5 flex min-h-12 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1">
            <Breadcrumb items={[{ label: 'Purchases', to: paths.purchases }, { label: 'Purchase orders', to: paths.purchases }, { label: title }]} />
          </div>
          <div className="flex shrink-0 flex-wrap gap-2.5">
            {order && isReceivable(order) ? (
              <>
                <Button variant="secondary" onClick={() => void act('close')} disabled={busy}>
                  <Icon name="lock-line" /> Close order
                </Button>
                <Button variant="primary" onClick={() => navigate(`${paths.purchaseReceive}?po=${order.id}`)}>
                  <Icon name="inbox-unarchive-line" /> Receive goods
                </Button>
              </>
            ) : null}
            {canCancel ? (
              <Button variant="secondary" onClick={() => void act('cancel')} disabled={busy}>
                <Icon name="close-circle-line" /> Cancel order
              </Button>
            ) : null}
            {editable ? (
              <>
                <Button variant="secondary" onClick={() => void save(false)} disabled={busy}>
                  <Icon name="save-line" /> Save draft
                </Button>
                <Button variant="primary" onClick={() => void save(true)} disabled={busy}>
                  <Icon name="send-plane-line" /> Place order
                </Button>
              </>
            ) : null}
          </div>
        </section>

        <PurchasesSubnav />

        {orderQuery.isError ? (
          <p className="mb-4 rounded-lg border border-vpos-red/25 bg-vpos-red-bg px-3 py-2.5 text-[13px] text-vpos-red">
            {orderQuery.error instanceof Error ? orderQuery.error.message : 'The purchase order could not be loaded.'}
          </p>
        ) : null}

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_280px]">
          <div className="space-y-4">
            <article className={cn(card, 'p-5')}>
              <h2 className="m-0 mb-4 text-[15px] font-extrabold text-vpos-text">Order details</h2>
              {editable ? (
                <>
                  {suppliersQuery.isSuccess && suppliers.length === 0 ? (
                    <p className="mt-0 mb-4 rounded-lg border border-vpos-orange/25 bg-vpos-orange-bg px-3 py-2.5 text-[13px] text-vpos-orange">
                      Add a supplier first.{' '}
                      <button type="button" onClick={() => navigate(paths.purchaseSuppliers)} className="border-0 bg-transparent p-0 font-bold text-vpos-orange underline">Open suppliers</button>
                    </p>
                  ) : null}
                  <div className={formGrid}>
                    <Select label="Supplier" value={supplierId} onChange={setSupplierId} placeholder="Choose a supplier" options={suppliers.map((supplier) => ({ value: String(supplier.id), label: supplier.supplierName }))} />
                    <Select label="Receiving store" value={storeId} onChange={(value) => { setStore(value); setLines([]) }} options={(storesQuery.data ?? []).map((store) => ({ value: String(store.id), label: store.name }))} />
                    <Select label="Currency" value={currencyCode} onChange={setCurrencyCode} options={[{ value: 'USD', label: 'USD — US dollar' }, { value: 'KHR', label: 'KHR — Riel' }]} />
                    <FormField label="Expected delivery" type="date" value={expectedDate} onChange={(event) => setExpectedDate(event.target.value)} />
                  </div>
                  <label className="mt-4 block">
                    <span className="mb-1.5 block text-[12px] font-extrabold tracking-wide text-vpos-muted uppercase">Notes</span>
                    <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={2} maxLength={500} className="w-full resize-y rounded-[10px] border border-vpos-line px-3 py-2.5 text-[14px] outline-none focus:border-vpos-primary" placeholder="Optional note for the supplier or whoever receives the goods" />
                  </label>
                </>
              ) : order ? (
                <dl className="m-0 grid grid-cols-1 gap-3 text-[13px] sm:grid-cols-2">
                  <Detail label="Supplier" value={order.supplierName} />
                  <Detail label="Receiving store" value={storeName ?? `Store #${order.storeId}`} />
                  <Detail label="Ordered" value={order.orderDate} />
                  <Detail label="Expected" value={order.expectedDate || '—'} />
                  <div><dt className="text-[11px] font-extrabold tracking-wide text-vpos-muted uppercase">Status</dt><dd className="m-0 mt-1"><Status value={orderStatusLabel(order.status)} /></dd></div>
                  {order.note ? <Detail label="Notes" value={order.note} /> : null}
                </dl>
              ) : (
                <p className="m-0 text-[13px] text-vpos-muted">Loading…</p>
              )}
            </article>

            <article className={cn(card, 'p-5')}>
              <h2 className="m-0 mb-3 text-[15px] font-extrabold text-vpos-text">Products</h2>
              {editable ? (
                Number(storeId) ? <PurchaseLineEditor storeId={Number(storeId)} currencyCode={currencyCode} lines={lines} onChange={setLines} /> : <p className="m-0 text-[13px] text-vpos-muted">Choose the receiving store first.</p>
              ) : order ? (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead><tr>{['Product', 'SKU', 'Ordered', 'Received', 'Still to come', 'Unit cost', 'Line total'].map((heading) => <th key={heading} className={thClass}>{heading}</th>)}</tr></thead>
                    <tbody>
                      {order.lines.map((line) => (
                        <tr key={line.id}>
                          <td className={tdClass}><strong>{line.productName}</strong>{line.variantName ? <small className="block text-[11px] text-vpos-muted">{line.variantName}</small> : null}</td>
                          <td className={tdClass}>{line.sku || '—'}</td>
                          <td className={tdClass}>{line.qtyOrdered}</td>
                          <td className={tdClass}>{line.qtyReceived}</td>
                          <td className={tdClass}>{Math.max(0, line.qtyOrdered - line.qtyReceived)}</td>
                          <td className={tdClass}>{formatCurrency(line.unitCost, order.currencyCode)}</td>
                          <td className={tdClass}><strong>{formatCurrency(line.lineTotal, order.currencyCode)}</strong></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </article>
          </div>

          <aside className={cn(card, 'h-fit p-5')}>
            <h3 className="m-0 mb-3 text-[12px] font-extrabold tracking-wide text-vpos-muted uppercase">Summary</h3>
            <div className="space-y-2 text-[14px]">
              <div className="flex justify-between text-vpos-muted"><span>Products</span><span className="font-semibold text-vpos-text">{editable ? lines.length : order?.lines.length ?? 0}</span></div>
              <div className="flex justify-between text-vpos-muted"><span>Units ordered</span><span className="font-semibold text-vpos-text">{editable ? lines.reduce((sum, line) => sum + line.quantity, 0) : order?.unitsOrdered ?? 0}</span></div>
              {!editable && order ? <div className="flex justify-between text-vpos-muted"><span>Units received</span><span className="font-semibold text-vpos-text">{order.unitsReceived}</span></div> : null}
              <div className="flex justify-between border-t border-vpos-line pt-3">
                <span className="font-bold text-vpos-text">Order total</span>
                <strong className="text-[19px] text-vpos-primary">{formatCurrency(editable ? total : order?.totalCost ?? 0, editable ? currencyCode : order?.currencyCode ?? currencyCode)}</strong>
              </div>
            </div>
            <p className="mt-4 mb-0 text-[12px] leading-relaxed text-vpos-muted">
              {editable
                ? 'A draft can still be changed. Place the order when you send it to the supplier; receiving it then adds the stock to the store.'
                : 'Receiving adds the stock to the store. Close the order when nothing more is coming.'}
            </p>
          </aside>
        </div>
      </main>
    </>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] font-extrabold tracking-wide text-vpos-muted uppercase">{label}</dt>
      <dd className="m-0 mt-1 font-semibold text-vpos-text">{value}</dd>
    </div>
  )
}
