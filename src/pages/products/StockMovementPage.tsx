import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Breadcrumb,
  Button,
  DataTable,
  Icon,
  MetricCard,
  StoreSwitcher,
  Topbar,
  type DataTableColumn,
} from '../../components'
import { ProductsSubnav } from '../../components/products/ProductsSubnav'
import {
  stockMovements,
  type StockMovement,
  type StockMovementType,
} from '../../data/mockup'
import { useAdminStore } from '../../hooks/useAdminStore'
import { cn } from '../../lib/cn'
import { paths } from '../../lib/paths'
import { pageContent, selectClass } from '../../lib/ui'

const TYPES: Array<StockMovementType | 'All types'> = [
  'All types',
  'Sale',
  'Purchase receive',
  'Adjustment',
  'Transfer in',
  'Transfer out',
  'Return to supplier',
  'Customer return',
]

export function StockMovementPage() {
  const navigate = useNavigate()
  const { storeId, setStoreId } = useAdminStore()
  const [type, setType] = useState<(typeof TYPES)[number]>('All types')

  const rows = useMemo(() => {
    if (type === 'All types') return stockMovements
    return stockMovements.filter((m) => m.type === type)
  }, [type])

  const inQty = stockMovements
    .filter((m) => m.qtyChange > 0)
    .reduce((s, m) => s + m.qtyChange, 0)
  const outQty = stockMovements
    .filter((m) => m.qtyChange < 0)
    .reduce((s, m) => s + Math.abs(m.qtyChange), 0)

  const columns: DataTableColumn<StockMovement>[] = useMemo(
    () => [
      {
        id: 'when',
        header: 'Date / time',
        searchable: (m) => `${m.date} ${m.time}`,
        cell: (m) => (
          <>
            <strong className="block">{m.date}</strong>
            <small className="text-[10px] text-vpos-muted">{m.time}</small>
          </>
        ),
      },
      {
        id: 'type',
        header: 'Type',
        searchable: (m) => m.type,
        cell: (m) => (
          <span
            className={cn(
              'inline-flex rounded-full px-2.5 py-1 text-[11px] font-extrabold',
              m.qtyChange > 0
                ? 'bg-vpos-green-bg text-vpos-green'
                : m.qtyChange < 0
                  ? 'bg-vpos-red-bg text-vpos-red'
                  : 'bg-vpos-subtle text-vpos-muted',
            )}
          >
            {m.type}
          </span>
        ),
      },
      {
        id: 'product',
        header: 'Product',
        searchable: (m) => `${m.productName} ${m.sku}`,
        cell: (m) => (
          <>
            <strong className="block">{m.productName}</strong>
            <small className="text-[10px] text-vpos-muted">{m.sku}</small>
          </>
        ),
      },
      {
        id: 'location',
        header: 'Location',
        searchable: (m) => m.location,
        hideOnMobile: true,
        cell: (m) => m.location,
      },
      {
        id: 'qty',
        header: 'Qty change',
        cell: (m) => (
          <strong
            className={cn(
              m.qtyChange > 0 && 'text-vpos-green',
              m.qtyChange < 0 && 'text-vpos-red',
            )}
          >
            {m.qtyChange > 0 ? `+${m.qtyChange}` : m.qtyChange}
          </strong>
        ),
      },
      {
        id: 'balance',
        header: 'Balance after',
        hideOnMobile: true,
        cell: (m) => m.balanceAfter,
      },
      {
        id: 'ref',
        header: 'Reference',
        searchable: (m) => m.ref,
        cell: (m) => (
          <span className="font-semibold text-vpos-primary">{m.ref}</span>
        ),
      },
      {
        id: 'user',
        header: 'By',
        searchable: (m) => m.user,
        hideOnMobile: true,
        cell: (m) => m.user,
      },
      {
        id: 'note',
        header: 'Note',
        searchable: (m) => m.note ?? '',
        hideOnMobile: true,
        className: 'max-w-[160px] whitespace-normal',
        cell: (m) => m.note || '—',
      },
    ],
    [],
  )

  return (
    <>
      <Topbar
        title="Products"
        subtitle="Every stock in and out — sales, receives, adjustments, transfers"
        actions={<StoreSwitcher value={storeId} onChange={setStoreId} />}
      />
      <main className={pageContent}>
        <section className="mb-5 flex min-h-12 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1">
            <Breadcrumb
              items={[
                { label: 'Products', to: paths.products },
                { label: 'Stock movement' },
              ]}
            />
          </div>
          <div className="flex shrink-0 flex-wrap gap-2.5">
            <Button
              variant="secondary"
              onClick={() => navigate(paths.productLowStock)}
            >
              <Icon name="error-warning-line" /> Low stock
            </Button>
            <Button variant="primary">
              <Icon name="add-line" /> Stock adjustment
            </Button>
          </div>
        </section>

        <ProductsSubnav />

        <section className="mb-[18px] grid grid-cols-1 gap-[18px] sm:grid-cols-3">
          <MetricCard
            label="Movements"
            value={String(stockMovements.length)}
            trend="Demo history"
            trendAs="small"
            icon={<Icon name="exchange-line" />}
            iconTone="primary"
          />
          <MetricCard
            label="Stock in"
            value={`+${inQty}`}
            trend="Receives, returns, +adjust"
            trendAs="small"
            icon={<Icon name="arrow-down-circle-line" />}
            iconTone="positive"
          />
          <MetricCard
            label="Stock out"
            value={`−${outQty}`}
            trend="Sales, transfers, −adjust"
            trendAs="small"
            icon={<Icon name="arrow-up-circle-line" />}
            iconTone="danger"
          />
        </section>

        <DataTable
          data={rows}
          columns={columns}
          rowKey={(m) => m.id}
          title="Stock movement history"
          searchPlaceholder="Search product, SKU, ref, type…"
          pageSize={8}
          emptyMessage="No stock movements match your filters."
          toolbar={
            <select
              className={selectClass}
              value={type}
              onChange={(e) =>
                setType(e.target.value as (typeof TYPES)[number])
              }
            >
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          }
        />
      </main>
    </>
  )
}
