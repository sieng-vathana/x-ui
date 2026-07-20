import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Breadcrumb,
  Button,
  FormField,
  Icon,
  Status,
  StoreSwitcher,
  Topbar,
} from '../../components'
import { PurchasesSubnav } from '../../components/purchases/PurchasesSubnav'
import {
  money,
  poLineTotal,
  poTotal,
  purchaseOrders,
  suppliers,
} from '../../data/purchases-mockup'
import { products as catalog } from '../../data/mockup'
import { useAdminStore } from '../../hooks/useAdminStore'
import { cn } from '../../lib/cn'
import { paths } from '../../lib/paths'
import {
  card,
  formGrid,
  pageContent,
  selectClass,
  tdClass,
  thClass,
} from '../../lib/ui'

/** View existing PO or create a new draft (id === "new") */
export function PurchaseOrderDetailPage() {
  const { id } = useParams()
  const isNew = id === 'new' || !id
  const navigate = useNavigate()
  const { storeId, setStoreId } = useAdminStore()

  const existing = useMemo(
    () => (isNew ? null : purchaseOrders.find((p) => p.id === id) ?? null),
    [id, isNew],
  )

  const [supplierId, setSupplierId] = useState(
    existing?.supplierId ?? suppliers[0]?.id ?? '',
  )
  const [store, setStore] = useState(existing?.store ?? 'Main Store')
  const [expectedDate, setExpectedDate] = useState(
    existing?.expectedDate ?? '2026-07-25',
  )
  const [note, setNote] = useState(existing?.note ?? '')
  const [lines, setLines] = useState(
    existing?.lines ?? [
      {
        sku: catalog[0]?.sku ?? 'SKU-1020',
        name: catalog[0]?.name ?? 'Product',
        qtyOrdered: 10,
        qtyReceived: 0,
        unitCost: 5,
      },
    ],
  )

  const total = lines.reduce((s, l) => s + l.qtyOrdered * l.unitCost, 0)
  const title = isNew
    ? 'New purchase order'
    : existing
      ? existing.ref
      : 'Purchase order'

  const addLine = () => {
    const p = catalog[lines.length % catalog.length]
    setLines((prev) => [
      ...prev,
      {
        sku: p.sku,
        name: p.name,
        qtyOrdered: 1,
        qtyReceived: 0,
        unitCost: Math.round(p.price * 0.55 * 100) / 100,
      },
    ])
  }

  const removeLine = (idx: number) => {
    setLines((prev) => prev.filter((_, i) => i !== idx))
  }

  return (
    <>
      <Topbar
        title="Purchases"
        subtitle={isNew ? 'Create a supplier purchase order' : `Order ${title}`}
        onBack={() => navigate(paths.purchases)}
        actions={<StoreSwitcher value={storeId} onChange={setStoreId} />}
      />
      <main className={pageContent}>
        <section className="mb-5 flex min-h-12 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1">
            <Breadcrumb
              items={[
                { label: 'Purchases', to: paths.purchases },
                { label: 'Purchase orders', to: paths.purchases },
                { label: title },
              ]}
            />
          </div>
          <div className="flex shrink-0 flex-wrap gap-2.5">
            <Button variant="secondary" onClick={() => navigate(paths.purchases)}>
              Cancel
            </Button>
            {!isNew &&
            existing &&
            (existing.status === 'Ordered' || existing.status === 'Partial') ? (
              <Button
                variant="secondary"
                onClick={() =>
                  navigate(
                    `${paths.purchaseReceive}?po=${encodeURIComponent(existing.id)}`,
                  )
                }
              >
                <Icon name="inbox-unarchive-line" /> Receive
              </Button>
            ) : null}
            <Button variant="primary">
              <Icon name="save-line" /> {isNew ? 'Create PO' : 'Save'}
            </Button>
          </div>
        </section>

        <PurchasesSubnav />

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_280px]">
          <div className="space-y-4">
            <article className={cn(card, 'p-5')}>
              <h2 className="m-0 mb-4 text-[14px] font-extrabold text-vpos-text">
                Order details
              </h2>
              <div className={formGrid}>
                <label className="block">
                  <span className="mb-1.5 block text-[11px] font-extrabold tracking-wide text-vpos-muted uppercase">
                    Supplier
                  </span>
                  <select
                    className={cn(selectClass, 'w-full')}
                    value={supplierId}
                    onChange={(e) => setSupplierId(e.target.value)}
                    disabled={!isNew && existing?.status !== 'Draft'}
                  >
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-[11px] font-extrabold tracking-wide text-vpos-muted uppercase">
                    Destination store
                  </span>
                  <select
                    className={cn(selectClass, 'w-full')}
                    value={store}
                    onChange={(e) => setStore(e.target.value)}
                  >
                    <option>Main Store</option>
                    <option>Warehouse A</option>
                  </select>
                </label>
                <FormField
                  label="Expected delivery"
                  type="date"
                  value={expectedDate}
                  onChange={(e) => setExpectedDate(e.target.value)}
                />
                {!isNew && existing ? (
                  <div>
                    <span className="mb-1.5 block text-[11px] font-extrabold tracking-wide text-vpos-muted uppercase">
                      Status
                    </span>
                    <Status value={existing.status} />
                  </div>
                ) : null}
              </div>
              <label className="mt-4 block">
                <span className="mb-1.5 block text-[11px] font-extrabold tracking-wide text-vpos-muted uppercase">
                  Notes
                </span>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  className="w-full resize-y rounded-[10px] border border-vpos-line px-3 py-2.5 text-[13px] outline-none focus:border-vpos-primary"
                  placeholder="Optional note for warehouse or supplier…"
                />
              </label>
            </article>

            <article className={cn(card, 'p-5')}>
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="m-0 text-[14px] font-extrabold text-vpos-text">
                  Line items
                </h2>
                <Button variant="secondary" onClick={addLine}>
                  <Icon name="add-line" /> Add line
                </Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      {['Product', 'SKU', 'Qty ordered', 'Received', 'Unit cost', 'Line total', ''].map(
                        (h, i) => (
                          <th key={i} className={thClass}>
                            {h}
                          </th>
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((line, idx) => (
                      <tr key={`${line.sku}-${idx}`}>
                        <td className={tdClass}>
                          <strong>{line.name}</strong>
                        </td>
                        <td className={tdClass}>{line.sku}</td>
                        <td className={tdClass}>
                          <input
                            type="number"
                            min={0}
                            value={line.qtyOrdered}
                            onChange={(e) => {
                              const v = Number(e.target.value) || 0
                              setLines((prev) =>
                                prev.map((l, i) =>
                                  i === idx ? { ...l, qtyOrdered: v } : l,
                                ),
                              )
                            }}
                            className="h-9 w-20 rounded-lg border border-vpos-line px-2 text-[12px] outline-none"
                          />
                        </td>
                        <td className={tdClass}>{line.qtyReceived}</td>
                        <td className={tdClass}>
                          <input
                            type="number"
                            min={0}
                            step={0.01}
                            value={line.unitCost}
                            onChange={(e) => {
                              const v = Number(e.target.value) || 0
                              setLines((prev) =>
                                prev.map((l, i) =>
                                  i === idx ? { ...l, unitCost: v } : l,
                                ),
                              )
                            }}
                            className="h-9 w-24 rounded-lg border border-vpos-line px-2 text-[12px] outline-none"
                          />
                        </td>
                        <td className={tdClass}>
                          <strong>
                            {money(
                              existing
                                ? poLineTotal(line)
                                : line.qtyOrdered * line.unitCost,
                            )}
                          </strong>
                        </td>
                        <td className={tdClass}>
                          <button
                            type="button"
                            aria-label="Remove line"
                            onClick={() => removeLine(idx)}
                            className="grid h-8 w-8 place-items-center rounded-lg border-0 bg-vpos-subtle text-vpos-red"
                          >
                            <Icon name="delete-bin-line" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>
          </div>

          <aside className={cn(card, 'h-fit p-5')}>
            <h3 className="m-0 mb-3 text-[11px] font-extrabold tracking-wide text-vpos-muted uppercase">
              Summary
            </h3>
            <div className="space-y-2 text-[13px]">
              <div className="flex justify-between text-vpos-muted">
                <span>Lines</span>
                <span className="font-semibold text-vpos-text">{lines.length}</span>
              </div>
              <div className="flex justify-between text-vpos-muted">
                <span>Units ordered</span>
                <span className="font-semibold text-vpos-text">
                  {lines.reduce((s, l) => s + l.qtyOrdered, 0)}
                </span>
              </div>
              <div className="flex justify-between border-t border-vpos-line pt-3">
                <span className="font-bold text-vpos-text">Order total</span>
                <strong className="text-[18px] text-vpos-primary">
                  {money(existing ? poTotal(existing) : total)}
                </strong>
              </div>
            </div>
            <p className="mt-4 mb-0 text-[11px] leading-relaxed text-vpos-muted">
              Receiving this order will increase on-hand stock in Inventory for
              the destination store.
            </p>
          </aside>
        </div>
      </main>
    </>
  )
}
