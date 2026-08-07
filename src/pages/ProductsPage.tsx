import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import {
  Breadcrumb,
  Button,
  ConfirmModal,
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
import { useToast } from '../context/ToastContext'
import { cn } from '../lib/cn'
import { paths } from '../lib/paths'
import { useDeleteProduct, useProductCategories, useProductsList } from '../features/products/useProducts'
import { card, pageContent } from '../lib/ui'

function ProductActionsMenu({
  product,
  onEdit,
  onView,
  onDelete,
}: {
  product: any
  onEdit: () => void
  onView: () => void
  onDelete: () => void
}) {
  const [open, setOpen] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null)

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setCoords({
        top: rect.bottom + 6,
        left: Math.max(16, rect.right - 176),
      })
      setOpen(true)
    } else {
      setOpen(false)
    }
  }

  useEffect(() => {
    if (!open) return
    const handleClickOutside = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    const handleScrollOrResize = () => setOpen(false)

    document.addEventListener('mousedown', handleClickOutside)
    window.addEventListener('scroll', handleScrollOrResize, true)
    window.addEventListener('resize', handleScrollOrResize)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('scroll', handleScrollOrResize, true)
      window.removeEventListener('resize', handleScrollOrResize)
    }
  }, [open])

  return (
    <div className="relative inline-block text-left">
      <button
        ref={buttonRef}
        type="button"
        className="flex h-8 w-8 items-center justify-center rounded-lg border-0 bg-transparent text-[19px] text-vpos-muted transition-all duration-150 hover:bg-vpos-subtle hover:text-vpos-text active:scale-95 cursor-pointer"
        onClick={handleToggle}
        aria-label={`Actions for ${product.name}`}
      >
        <Icon name="more-2-fill" />
      </button>

      {open && coords && createPortal(
        <div
          ref={menuRef}
          style={{ top: `${coords.top}px`, left: `${coords.left}px` }}
          className="fixed z-[99999] w-44 rounded-xl border border-vpos-line/80 bg-white/95 backdrop-blur-md p-1.5 shadow-[0_12px_32px_rgba(0,0,0,0.12)] transition-all duration-150 ease-out animate-in fade-in zoom-in-95"
        >
          <button
            type="button"
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium text-vpos-text transition-all duration-150 hover:bg-vpos-subtle active:scale-[0.98] cursor-pointer border-0 bg-transparent"
            onClick={() => {
              setOpen(false)
              onEdit()
            }}
          >
            <Icon name="edit-line" className="text-[16px] text-vpos-muted" />
            Edit product
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium text-vpos-text transition-all duration-150 hover:bg-vpos-subtle active:scale-[0.98] cursor-pointer border-0 bg-transparent"
            onClick={() => {
              setOpen(false)
              onView()
            }}
          >
            <Icon name="eye-line" className="text-[16px] text-vpos-muted" />
            View details
          </button>
          <div className="my-1 h-px bg-vpos-line/60" />
          <button
            type="button"
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium text-vpos-red transition-all duration-150 hover:bg-vpos-red-bg active:scale-[0.98] cursor-pointer border-0 bg-transparent"
            onClick={() => {
              setOpen(false)
              onDelete()
            }}
          >
            <Icon name="delete-bin-line" className="text-[16px] text-vpos-red" />
            Delete product
          </button>
        </div>,
        document.body,
      )}
    </div>
  )
}

export function ProductsPage() {
  const navigate = useNavigate()
  const { storeId, setStoreId } = useAdminStore()
  const [statusFilter, setStatusFilter] = useState('All status')
  const [categoryFilter, setCategoryFilter] = useState('All categories')
  const [deleteTarget, setDeleteTarget] = useState<{ id: number | string; name: string } | null>(null)

  const deleteProductMutation = useDeleteProduct()
  const { toast } = useToast()

  const handleDeleteProduct = (id: number | string, name: string) => {
    setDeleteTarget({ id, name })
  }

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
        const totalStock = p.variants && p.variants.length > 0
          ? p.variants.reduce((sum, v) => sum + ((v as any).quantity ?? (v as any).stockQuantity ?? (v as any).stock ?? v.stockAlertQty ?? 0), 0)
          : 0
        const variantCount = p.variants?.length || 1

        return {
          id: p.id,
          sku: defaultVar?.sku || p.productCode || `PRD-${p.id}`,
          name: p.productName,
          category: p.category?.categoryName || 'General',
          unit: p.unit?.unitName || p.unit?.unitCode || 'Pcs',
          image: img,
          posPrice: defaultVar?.posPrice ?? 0,
          onlinePrice: defaultVar?.onlinePrice,
          stock: totalStock,
          variantCount,
          isStockable: p.isStockable !== false,
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
          <div
            className="flex items-center gap-[11px] cursor-pointer group"
            onClick={() => navigate(paths.productDetail(String(p.id)))}
          >
            <ProductThumb src={p.image} tone={p.tone} />
            <span>
              <strong className="block text-[13px] group-hover:text-vpos-primary transition-colors">{p.name}</strong>
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
        id: 'unit',
        header: 'Unit',
        hideOnMobile: true,
        cell: (p) => (
          <span className="inline-block rounded-md bg-vpos-subtle px-2 py-0.5 text-[12px] font-medium text-vpos-text">
            {p.unit}
          </span>
        ),
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
          <div>
            <span
              className={cn(
                'font-semibold block text-[13px]',
                p.stock === 0 ? 'font-extrabold text-vpos-red' : 'text-vpos-text',
              )}
            >
              {p.isStockable === false ? 'Unlimited' : `${p.stock} ${p.unit}`}
            </span>
            {p.variantCount > 1 ? (
              <small className="block text-[11px] font-semibold text-vpos-primary">
                {p.variantCount} variants
              </small>
            ) : null}
          </div>
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
          <ProductActionsMenu
            product={p}
            onEdit={() => navigate(paths.productEdit(String(p.id)))}
            onView={() => navigate(paths.productDetail(String(p.id)))}
            onDelete={() => handleDeleteProduct(p.id, p.name)}
          />
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

      <ConfirmModal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (!deleteTarget) return
          try {
            await deleteProductMutation.mutateAsync(deleteTarget.id)
            toast(`Product "${deleteTarget.name}" deleted successfully!`, 'success')
            setDeleteTarget(null)
          } catch (err) {
            const msg = err instanceof Error ? err.message : 'Failed to delete product'
            toast(msg, 'error')
          }
        }}
        title="Delete Product"
        description={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmText="Delete Product"
        cancelText="Cancel"
        variant="danger"
        icon="delete-bin-line"
        isLoading={deleteProductMutation.isPending}
      />
    </>
  )
}
