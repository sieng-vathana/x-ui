import { useMemo, useState } from 'react'
import { savedImageUrl } from '../../lib/api'
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
import { useLowStock } from '../../features/inventory/useStockMovements'
import type { StockBalance } from '../../features/inventory/stockApi'
import { useProductsList } from '../../features/products/useProducts'
import type { ProductItem } from '../../features/products/types'
import { useAdminStore } from '../../hooks/useAdminStore'
import { useStoresRaw } from '../../features/stores/useStores'
import { cn } from '../../lib/cn'
import { paths } from '../../lib/paths'
import { pageContent } from '../../lib/ui'

const LOW_STOCK_THRESHOLD = 5
const PAGE_SIZE = 50

interface LowStockRow {
  variantId: number
  productId?: number
  productCode?: string
  name: string
  variantName: string
  sku: string
  category: string
  image?: string
  availableQuantity: number
}

function indexVariants(products: ProductItem[]) {
  const variants = new Map<number, { product: ProductItem; sku: string; variantName: string; image?: string }>()
  for (const product of products) {
    for (const variant of product.variants ?? []) {
      if (!variant.id) continue
      variants.set(variant.id, {
        product,
        sku: variant.sku || product.productCode,
        variantName: variant.displayName || variant.variantName || '',
        image: savedImageUrl(variant.image, product.thumbnail, product.images?.[0]?.imageUrl),
      })
    }
  }
  return variants
}

function buildRows(balances: StockBalance[], products: ProductItem[]): LowStockRow[] {
  const variants = indexVariants(products)
  return balances.map((balance) => {
    const match = variants.get(balance.variantId)
    return {
      variantId: balance.variantId,
      productId: match?.product.id,
      productCode: match?.product.productCode,
      name: match?.product.productName || `Product variant #${balance.variantId}`,
      variantName: match?.variantName || '',
      sku: match?.sku || `VAR-${balance.variantId}`,
      category: match?.product.category?.categoryName || '—',
      image: match?.image,
      availableQuantity: balance.availableQuantity,
    }
  })
}

export function LowStockPage() {
  const navigate = useNavigate()
  const { storeId, setStoreId } = useAdminStore()
  const [page, setPage] = useState(0)
  const stockQuery = useLowStock(storeId, LOW_STOCK_THRESHOLD, page, PAGE_SIZE)
  const productsQuery = useProductsList(storeId)
  const storesQuery = useStoresRaw()
  const balances = stockQuery.data?.content ?? []
  const rows = useMemo(
    () => buildRows(balances, productsQuery.data ?? []),
    [balances, productsQuery.data],
  )
  const selectedStore = storesQuery.data?.find((store) => String(store.id) === String(storeId))
  const outCount = rows.filter((row) => row.availableQuantity <= 0).length
  const lowCount = rows.length - outCount

  const columns: DataTableColumn<LowStockRow>[] = useMemo(() => [
    {
      id: 'product',
      header: 'Product',
      searchable: (row) => `${row.name} ${row.variantName} ${row.sku} ${row.category}`,
      cell: (row) => (
        <div className="flex items-center gap-[11px]">
          <ProductThumb src={row.image} />
          <span>
            <strong className="block text-[13px]">{row.name}</strong>
            <small className="mt-1 block text-[11px] text-vpos-muted">
              {[row.variantName, row.sku, row.category].filter(Boolean).join(' · ')}
            </small>
          </span>
        </div>
      ),
    },
    {
      id: 'stock',
      header: 'Available',
      cell: (row) => (
        <strong className={cn('text-[15px]', row.availableQuantity <= 0 ? 'text-vpos-red' : 'text-vpos-orange')}>
          {row.availableQuantity}
        </strong>
      ),
    },
    { id: 'threshold', header: 'Reorder at', hideOnMobile: true, cell: () => LOW_STOCK_THRESHOLD },
    {
      id: 'status',
      header: 'Status',
      cell: (row) => <Status value={row.availableQuantity <= 0 ? 'Out of stock' : 'Low stock'} />,
    },
    { id: 'location', header: 'Location', cell: () => selectedStore?.name || `Store #${storeId}` },
    {
      id: 'actions',
      header: '',
      cell: (row) => row.productId ? (
        <Button variant="text" onClick={() => navigate(paths.productEdit(row.productId!))}>Edit product</Button>
      ) : null,
    },
  ], [navigate, selectedStore?.name, storeId])

  const totalElements = stockQuery.data?.totalElements ?? 0
  const totalPages = stockQuery.data?.totalPages ?? 0
  const loadError = stockQuery.error ?? productsQuery.error

  return (
    <>
      <Topbar
        title="Products"
        subtitle="Live inventory at or below the reorder threshold"
        actions={<StoreSwitcher value={storeId} onChange={(value) => { setPage(0); setStoreId(value) }} />}
      />
      <main className={pageContent}>
        <section className="mb-5 flex min-h-12 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1">
            <Breadcrumb items={[{ label: 'Products', to: paths.products }, { label: 'Low stock' }]} />
          </div>
          <Button variant="secondary" onClick={() => navigate(paths.productStockMovement)}>
            <Icon name="exchange-line" /> Stock movement
          </Button>
        </section>

        <ProductsSubnav />

        {stockQuery.isError || productsQuery.isError ? (
          <div className="mt-4 rounded-[4px] border border-vpos-red/25 bg-vpos-red-bg p-4 text-[13px] text-vpos-red">
            {loadError instanceof Error
              ? loadError.message
              : 'Live stock could not be loaded.'}
          </div>
        ) : null}

        <section className="mb-[18px] mt-[18px] grid grid-cols-1 gap-[18px] sm:grid-cols-3">
          <MetricCard
            label="Need attention"
            value={stockQuery.isLoading ? '—' : String(totalElements)}
            trend={`Available stock at or below ${LOW_STOCK_THRESHOLD}`}
            trendAs="small"
            icon={<Icon name="error-warning-line" />}
            iconTone="warning"
          />
          <MetricCard
            label="Low stock on this page"
            value={String(lowCount)}
            trend="Still sellable"
            trendAs="small"
            icon={<Icon name="stack-line" />}
            iconTone="warning"
          />
          <MetricCard
            label="Out of stock on this page"
            value={String(outCount)}
            trend="No available units"
            trendAs="small"
            icon={<Icon name="close-circle-line" />}
            iconTone="danger"
          />
        </section>

        <DataTable
          data={rows}
          columns={columns}
          rowKey={(row) => row.variantId}
          title="Low & out of stock"
          searchPlaceholder="Search product or SKU…"
          pageSize={10}
          isLoading={stockQuery.isLoading || productsQuery.isLoading}
          emptyMessage={stockQuery.isError ? 'Stock data is unavailable.' : 'Nothing is at or below the reorder threshold.'}
          emptyIcon="checkbox-circle-line"
        />
        {totalPages > 1 ? (
          <div className="mt-3 flex items-center justify-between text-[12px] text-vpos-muted">
            <span>Page {page + 1} of {totalPages} · {totalElements} variants</span>
            <div className="flex gap-2">
              <Button variant="secondary" disabled={page === 0} onClick={() => setPage((current) => Math.max(0, current - 1))}>Previous</Button>
              <Button variant="secondary" disabled={!stockQuery.data?.hasNext} onClick={() => setPage((current) => current + 1)}>Next</Button>
            </div>
          </div>
        ) : null}
      </main>
    </>
  )
}
