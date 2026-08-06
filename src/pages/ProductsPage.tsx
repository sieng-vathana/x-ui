import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Breadcrumb,
  Button,
  DataTable,
  Icon,
  ProductThumb,
  Select,
  Status,
  StoreSwitcher,
  Topbar,
  type DataTableColumn,
} from '../components'
import { ProductsSubnav } from '../components/products/ProductsSubnav'
import { money } from '../data/mockup'
import { useAdminStore } from '../hooks/useAdminStore'
import { cn } from '../lib/cn'
import { paths } from '../lib/paths'
import { useProductCategories, useProductsList } from '../features/products/useProducts'
import { card, pageContent } from '../lib/ui'

export function ProductsPage() {
  const navigate = useNavigate()
  const { storeId, setStoreId } = useAdminStore()
  const [statusFilter, setStatusFilter] = useState('All status')
  const [categoryFilter, setCategoryFilter] = useState('All categories')

  const { data: apiProducts = [] } = useProductsList(storeId)
  const { data: apiCategories = [] } = useProductCategories(storeId)

  const categoryFilterOptions = useMemo(() => {
    return [
      { value: 'All categories', label: 'All categories' },
      ...apiCategories.map((c) => ({ value: c.categoryName, label: c.categoryName })),
    ]
  }, [apiCategories])

  const baseRows = useMemo(() => {
    return apiProducts
      .map((p) => {
        const defaultVar = p.variants?.find((v) => v.isDefault) || p.variants?.[0]
        const img = p.thumbnail || defaultVar?.image || p.images?.[0]?.imageUrl
        return {
          id: p.id,
          sku: defaultVar?.sku || p.productCode || `PRD-${p.id}`,
          name: p.productName,
          category: p.category?.categoryName || 'General',
          image: img,
          posPrice: defaultVar?.posPrice ?? 0,
          onlinePrice: defaultVar?.onlinePrice,
          stock: 100,
          status: p.isSellable !== false ? 'Active' : 'Inactive',
          barcode: defaultVar?.barcode || '-',
          tone: 'ice',
        }
      })
      .filter((p) => {
        if (statusFilter !== 'All status' && p.status !== statusFilter) return false
        if (categoryFilter !== 'All categories' && p.category !== categoryFilter)
          return false
        return true
      })
  }, [apiProducts, statusFilter, categoryFilter])

  const columns: DataTableColumn<any>[] = useMemo(
    () => [
      {
        id: 'product',
        header: 'Product',
        searchable: (p) => `${p.name} ${p.category}`,
        cell: (p) => (
          <div className="flex items-center gap-[11px]">
            <ProductThumb src={p.image} tone={p.tone} />
            <span>
              <strong className="block text-[13px]">{p.name}</strong>
              <small className="mt-1 block text-[11px] text-vpos-muted">
                {p.category}
              </small>
            </span>
          </div>
        ),
      },
      {
        id: 'sku',
        header: 'SKU / Barcode',
        searchable: (p) => `${p.sku} ${p.barcode}`,
        cell: (p) => (
          <>
            <strong>{p.sku}</strong>
            <div className="mt-1 text-[11px] text-vpos-muted">{p.barcode}</div>
          </>
        ),
      },
      {
        id: 'category',
        header: 'Category',
        searchable: (p) => p.category,
        hideOnMobile: true,
        cell: (p) => p.category,
      },
      {
        id: 'posPrice',
        header: 'POS Price',
        cell: (p) => <span className="font-bold text-vpos-primary-2">{money(p.posPrice)}</span>,
      },
      {
        id: 'onlinePrice',
        header: 'Online Price',
        cell: (p) => (
          <span className="text-vpos-muted">
            {p.onlinePrice != null && p.onlinePrice > 0 ? money(p.onlinePrice) : '—'}
          </span>
        ),
      },
      {
        id: 'stock',
        header: 'Stock',
        cell: (p) => (
          <span
            className={cn(p.stock === 0 && 'font-extrabold text-vpos-red')}
          >
            {p.stock}
          </span>
        ),
      },
      {
        id: 'status',
        header: 'Status',
        searchable: (p) => p.status,
        cell: (p) => <Status value={p.status} />,
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: (p) => (
          <button
            type="button"
            className="border-0 bg-transparent text-[19px] text-vpos-muted hover:text-vpos-text"
            onClick={() => navigate(paths.productEdit(String(p.id)))}
            aria-label={`Edit ${p.name}`}
          >
            <Icon name="more-2-fill" />
          </button>
        ),
      },
    ],
    [navigate],
  )

  return (
    <>
      <Topbar
        title="Products"
        subtitle="Catalog, pricing, stock movement, and low-stock alerts"
        actions={<StoreSwitcher value={storeId} onChange={setStoreId} />}
      />
      <main className={pageContent}>
        <section className="mb-6 flex min-h-12 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1">
            <Breadcrumb items={[{ label: 'Products' }, { label: 'All products' }]} />
          </div>
          <div className="flex shrink-0 flex-wrap gap-2.5">
            <Button variant="secondary">Import</Button>
            <Button variant="primary" onClick={() => navigate(paths.productNew)}>
              <Icon name="add-line" /> Add product
            </Button>
          </div>
        </section>

        {/* Section nav only once (sidebar children + this bar) */}
        <ProductsSubnav />

        {/* Summary cards — not navigation tabs */}
        <section className="mb-[18px] grid grid-cols-1 gap-[18px] sm:grid-cols-2 xl:grid-cols-4">
          {[
            [
              'shopping-bag-3-line',
              'Total products',
              String(apiProducts.length),
              'bg-vpos-sand text-vpos-primary',
            ],
            [
              'checkbox-circle-line',
              'Active',
              String(apiProducts.filter((p) => p.isSellable !== false).length),
              'bg-vpos-green-bg text-vpos-green',
            ],
            [
              'error-warning-line',
              'Low stock',
              '0',
              'bg-vpos-orange-bg text-vpos-orange',
            ],
            [
              'forbid-line',
              'Inactive',
              String(apiProducts.filter((p) => p.isSellable === false).length),
              'bg-vpos-subtle text-vpos-muted',
            ],
          ].map(([icon, label, value, tone]) => (
            <article
              key={label}
              className={cn(
                card,
                'flex min-h-[86px] items-center gap-3.5 rounded-[13px] p-[17px]',
              )}
            >
              <span
                className={cn(
                  'grid h-[42px] w-[42px] place-items-center rounded-[10px] text-[19px]',
                  tone,
                )}
              >
                <Icon name={icon} />
              </span>
              <span>
                <small className="mb-1.5 block text-[12px] text-vpos-muted">
                  {label}
                </small>
                <strong className="block text-[20px]">{value}</strong>
              </span>
            </article>
          ))}
        </section>

        <DataTable
          data={baseRows}
          columns={columns}
          rowKey={(p) => p.sku}
          title="Product list"
          searchPlaceholder="Search product, SKU, or barcode…"
          pageSize={8}
          emptyMessage="No products match your filters."
          toolbar={
            <>
              <Select
                variant="toolbar"
                placeholder="All categories"
                value={categoryFilter === 'All categories' ? '' : categoryFilter}
                onChange={(v) => setCategoryFilter(v || 'All categories')}
                options={categoryFilterOptions}
              />
              <Select
                variant="toolbar"
                placeholder="All status"
                value={statusFilter === 'All status' ? '' : statusFilter}
                onChange={(v) => setStatusFilter(v || 'All status')}
                options={[
                  { value: 'Active', label: 'Active' },
                  { value: 'Low stock', label: 'Low stock' },
                  { value: 'Out of stock', label: 'Out of stock' },
                  { value: 'Inactive', label: 'Inactive' },
                ]}
              />
            </>
          }
        />
      </main>
    </>
  )
}
