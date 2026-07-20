import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Breadcrumb,
  Button,
  Icon,
  Status,
  StoreSwitcher,
  Topbar,
} from '../../components'
import { PurchasesSubnav } from '../../components/purchases/PurchasesSubnav'
import {
  money,
  poTotal,
  receivableOrders,
  type PurchaseOrder,
} from '../../data/purchases-mockup'
import { useAdminStore } from '../../hooks/useAdminStore'
import { cn } from '../../lib/cn'
import { paths } from '../../lib/paths'
import {
  card,
  pageContent,
  selectClass,
  tdClass,
  thClass,
} from '../../lib/ui'

export function ReceiveGoodsPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { storeId, setStoreId } = useAdminStore()
  const receivable = useMemo(() => receivableOrders(), [])

  const initialId =
    params.get('po') && receivable.some((p) => p.id === params.get('po'))
      ? (params.get('po') as string)
      : (receivable[0]?.id ?? '')

  const [poId, setPoId] = useState(initialId)
  const po: PurchaseOrder | undefined = receivable.find((p) => p.id === poId)

  const [qtyMap, setQtyMap] = useState<Record<string, number>>(() => {
    const map: Record<string, number> = {}
    for (const p of receivable) {
      for (const line of p.lines) {
        const remaining = Math.max(0, line.qtyOrdered - line.qtyReceived)
        map[`${p.id}:${line.sku}`] = remaining
      }
    }
    return map
  })

  const [done, setDone] = useState(false)

  const setQty = (sku: string, value: number) => {
    if (!po) return
    const line = po.lines.find((l) => l.sku === sku)
    const max = line ? Math.max(0, line.qtyOrdered - line.qtyReceived) : 0
    setQtyMap((prev) => ({
      ...prev,
      [`${po.id}:${sku}`]: Math.min(max, Math.max(0, value)),
    }))
    setDone(false)
  }

  const confirmReceive = () => {
    setDone(true)
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
            <Breadcrumb
              items={[
                { label: 'Purchases', to: paths.purchases },
                { label: 'Receive goods' },
              ]}
            />
          </div>
          <div className="flex shrink-0 flex-wrap gap-2.5">
            <Button variant="secondary" onClick={() => navigate(paths.purchases)}>
              Back to orders
            </Button>
            <Button
              variant="primary"
              disabled={!po}
              onClick={confirmReceive}
            >
              <Icon name="checkbox-circle-line" /> Confirm receive
            </Button>
          </div>
        </section>

        <PurchasesSubnav />

        {done ? (
          <div className="mb-4 rounded-[12px] border border-vpos-green/30 bg-vpos-green-bg px-4 py-3 text-[13px] font-semibold text-vpos-green">
            Receipt recorded (demo). Inventory quantities would update for{' '}
            {po?.store}.
          </div>
        ) : null}

        <article className={cn(card, 'mb-4 p-5')}>
          <label className="block max-w-md">
            <span className="mb-1.5 block text-[11px] font-extrabold tracking-wide text-vpos-muted uppercase">
              Purchase order to receive
            </span>
            {receivable.length === 0 ? (
              <p className="m-0 text-[13px] text-vpos-muted">
                No open orders ready to receive. Create or submit a PO first.
              </p>
            ) : (
              <select
                className={cn(selectClass, 'w-full')}
                value={poId}
                onChange={(e) => {
                  setPoId(e.target.value)
                  setDone(false)
                }}
              >
                {receivable.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.ref} — {p.supplierName} ({p.status})
                  </option>
                ))}
              </select>
            )}
          </label>

          {po ? (
            <div className="mt-4 flex flex-wrap gap-4 text-[12px] text-vpos-muted">
              <span>
                Store:{' '}
                <strong className="text-vpos-text">{po.store}</strong>
              </span>
              <span>
                Expected:{' '}
                <strong className="text-vpos-text">{po.expectedDate}</strong>
              </span>
              <span>
                Status: <Status value={po.status} />
              </span>
              <span>
                Order total:{' '}
                <strong className="text-vpos-text">{money(poTotal(po))}</strong>
              </span>
            </div>
          ) : null}
        </article>

        {po ? (
          <article className={cn(card, 'p-4')}>
            <strong className="mb-3 block text-[14px]">Receive quantities</strong>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    {[
                      'Product',
                      'SKU',
                      'Ordered',
                      'Already received',
                      'Remaining',
                      'Receive now',
                    ].map((h, i) => (
                      <th key={i} className={thClass}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {po.lines.map((line) => {
                    const remaining = Math.max(
                      0,
                      line.qtyOrdered - line.qtyReceived,
                    )
                    const key = `${po.id}:${line.sku}`
                    return (
                      <tr key={line.sku}>
                        <td className={tdClass}>
                          <strong>{line.name}</strong>
                        </td>
                        <td className={tdClass}>{line.sku}</td>
                        <td className={tdClass}>{line.qtyOrdered}</td>
                        <td className={tdClass}>{line.qtyReceived}</td>
                        <td className={tdClass}>{remaining}</td>
                        <td className={tdClass}>
                          <input
                            type="number"
                            min={0}
                            max={remaining}
                            value={qtyMap[key] ?? 0}
                            disabled={remaining === 0}
                            onChange={(e) =>
                              setQty(line.sku, Number(e.target.value) || 0)
                            }
                            className="h-9 w-24 rounded-lg border border-vpos-line px-2 text-[12px] font-semibold outline-none focus:border-vpos-primary"
                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </article>
        ) : null}
      </main>
    </>
  )
}
