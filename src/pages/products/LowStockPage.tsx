import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Breadcrumb,
  Button,
  DataTable,
  Icon,
  MetricCard,
  ProductThumb,
  Status,
  StoreSwitcher,
  Topbar,
  type DataTableColumn,
} from '../../components'
import { ProductsSubnav } from '../../components/products/ProductsSubnav'
import {
  isLowOrOutOfStock,
  LOW_STOCK_THRESHOLD,
  products as catalog,
  type MockProduct,
} from '../../data/mockup'
import { useAdminStore } from '../../hooks/useAdminStore'
import { cn } from '../../lib/cn'
import { paths } from '../../lib/paths'
import { pageContent } from '../../lib/ui'

export function LowStockPage() {
  const navigate = useNavigate()
  const { storeId, setStoreId } = useAdminStore()

  const rows = useMemo(
    () =>
      catalog
        .filter(isLowOrOutOfStock)
        .sort((a, b) => a.stock - b.stock),
    [],
  )

  const outCount = rows.filter(
    (p) => p.stock === 0 || p.status === 'Out of stock',
  ).length
  const lowCount = rows.length - outCount

  const columns: DataTableColumn<MockProduct>[] = useMemo(
    () => [
      {
        id: 'product',
        header: 'Product',
        searchable: (p) => `${p.name} ${p.sku} ${p.category}`,
        cell: (p) => (
          <div className="flex items-center gap-[11px]">
            <ProductThumb tone={p.tone} />
            <span>
              <strong className="block text-[12px]">{p.name}</strong>
              <small className="mt-1 block text-[10px] text-vpos-muted">
                {p.sku} · {p.category}
              </small>
            </span>
          </div>
        ),
      },
      {
        id: 'stock',
        header: 'On hand',
        cell: (p) => (
          <strong
            className={cn(
              'text-[14px]',
              p.stock === 0 ? 'text-vpos-red' : 'text-vpos-orange',
            )}
          >
            {p.stock}
          </strong>
        ),
      },
      {
        id: 'threshold',
        header: 'Reorder at',
        hideOnMobile: true,
        cell: () => LOW_STOCK_THRESHOLD,
      },
      {
        id: 'status',
        header: 'Status',
        searchable: (p) => p.status,
        cell: (p) => (
          <Status
            value={
              p.stock === 0 || p.status === 'Out of stock'
                ? 'Out of stock'
                : 'Low stock'
            }
          />
        ),
      },
      {
        id: 'location',
        header: 'Location',
        cell: () => 'Main Store',
      },
      {
        id: 'actions',
        header: '',
        cell: (p) => (
          <div className="flex flex-wrap gap-1">
            <Button
              variant="text"
              onClick={() => navigate(paths.productEdit(p.sku))}
            >
              Edit
            </Button>
            <Button
              variant="text"
              onClick={() => navigate(paths.purchaseOrderNew)}
            >
              Order more
            </Button>
          </div>
        ),
      },
    ],
    [navigate],
  )

  return (
    <>
      <Topbar
        title="Products"
        subtitle="Items that are low or out of stock — reorder before you run out"
        actions={<StoreSwitcher value={storeId} onChange={setStoreId} />}
      />
      <main className={pageContent}>
        <section className="mb-5 flex min-h-12 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1">
            <Breadcrumb
              items={[
                { label: 'Products', to: paths.products },
                { label: 'Low stock' },
              ]}
            />
          </div>
          <div className="flex shrink-0 flex-wrap gap-2.5">
            <Button
              variant="secondary"
              onClick={() => navigate(paths.productStockMovement)}
            >
              <Icon name="exchange-line" /> Stock movement
            </Button>
            <Button
              variant="primary"
              onClick={() => navigate(paths.purchaseOrderNew)}
            >
              <Icon name="truck-line" /> Create purchase order
            </Button>
          </div>
        </section>

        <ProductsSubnav />

        <section className="mb-[18px] grid grid-cols-1 gap-[18px] sm:grid-cols-3">
          <MetricCard
            label="Need attention"
            value={String(rows.length)}
            trend={`At or below ${LOW_STOCK_THRESHOLD} units`}
            trendAs="small"
            icon={<Icon name="error-warning-line" />}
            iconTone="warning"
          />
          <MetricCard
            label="Low stock"
            value={String(lowCount)}
            trend="Still sellable"
            trendAs="small"
            icon={<Icon name="stack-line" />}
            iconTone="warning"
          />
          <MetricCard
            label="Out of stock"
            value={String(outCount)}
            trend="Cannot sell"
            trendAs="small"
            icon={<Icon name="close-circle-line" />}
            iconTone="danger"
          />
        </section>

        <DataTable
          data={rows}
          columns={columns}
          rowKey={(p) => p.sku}
          title="Low & out of stock"
          searchPlaceholder="Search product or SKU…"
          pageSize={10}
          emptyMessage="Great — nothing is low stock right now."
          emptyIcon="checkbox-circle-line"
        />
      </main>
    </>
  )
}
