import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Breadcrumb,
  Button,
  ConfirmModal,
  DataTable,
  Icon,
  MetricCard,
  ProductThumb,
  Status,
  StoreSwitcher,
  Topbar,
  type DataTableColumn,
} from '../components'
import { useToast } from '../context/ToastContext'
import { useAdminStore } from '../hooks/useAdminStore'
import { money } from '../data/mockup'
import { useDeleteProduct, useProduct } from '../features/products/useProducts'
import { cn } from '../lib/cn'
import { paths } from '../lib/paths'
import { card, pageContent } from '../lib/ui'
import { resolveImageUrl } from '../lib/api'

export function ProductDetailPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const { storeId, setStoreId } = useAdminStore()
  const { toast } = useToast()

  const { data: product, isLoading, refetch } = useProduct(id)
  const deleteMutation = useDeleteProduct()

  const [activeImageIndex, setActiveImageIndex] = useState(0)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)

  const imagesList = useMemo(() => {
    if (!product) return []
    const list: string[] = []
    if (product.thumbnail) list.push(product.thumbnail)
    if (product.images && product.images.length > 0) {
      for (const img of product.images) {
        if (img.imageUrl && !list.includes(img.imageUrl)) {
          list.push(img.imageUrl)
        }
      }
    }
    if (product.variants && product.variants.length > 0) {
      for (const v of product.variants) {
        if (v.image && !list.includes(v.image)) {
          list.push(v.image)
        }
      }
    }
    return list
  }, [product])

  const handleDelete = () => {
    setConfirmDeleteOpen(true)
  }

  const defaultVariant = product?.variants?.find((v) => v.isDefault) || product?.variants?.[0]
  const posPrice = defaultVariant?.posPrice ?? 0
  const onlinePrice = defaultVariant?.onlinePrice
  const costPrice = defaultVariant?.costPrice ?? 0
  const profitMargin = posPrice > 0 && costPrice > 0 ? (((posPrice - costPrice) / posPrice) * 100).toFixed(1) : null

  const variantColumns: DataTableColumn<any>[] = useMemo(
    () => [
      {
        id: 'variantName',
        header: 'Variant Name',
        cell: (v) => (
          <div>
            <strong className="block text-[13px] text-vpos-text">{v.variantName || 'Default'}</strong>
            {v.isDefault ? (
              <span className="mt-0.5 inline-block rounded bg-vpos-sand px-1.5 py-0.5 text-[10px] font-semibold text-vpos-primary">
                Default Variant
              </span>
            ) : null}
          </div>
        ),
      },
      {
        id: 'sku',
        header: 'SKU / Barcode',
        cell: (v) => (
          <div>
            <strong className="block text-[12px] font-mono text-vpos-text">{v.sku || '—'}</strong>
            <small className="block text-[11px] font-mono text-vpos-muted">{v.barcode || '—'}</small>
          </div>
        ),
      },
      {
        id: 'posPrice',
        header: 'POS Price',
        cell: (v) => <span className="font-bold text-vpos-primary-2">{money(v.posPrice ?? 0)}</span>,
      },
      {
        id: 'onlinePrice',
        header: 'Online Price',
        cell: (v) => (
          <span className="text-vpos-muted">
            {v.onlinePrice != null && v.onlinePrice > 0 ? money(v.onlinePrice) : '—'}
          </span>
        ),
      },
      {
        id: 'costPrice',
        header: 'Cost Price',
        cell: (v) => (
          <span className="text-vpos-muted">
            {v.costPrice != null && v.costPrice > 0 ? money(v.costPrice) : '—'}
          </span>
        ),
      },
      {
        id: 'supplier',
        header: 'Supplier',
        cell: (v) => (v.supplier as any)?.supplierName || 'General',
      },
      {
        id: 'reorder',
        header: 'Stock Alert',
        cell: (v) => (
          <span className="rounded-md bg-vpos-subtle px-2 py-1 text-[11px] font-semibold text-vpos-text">
            {v.stockAlertQty ?? 5} units
          </span>
        ),
      },
    ],
    [],
  )

  if (isLoading) {
    return (
      <>
        <Topbar title="Product Details" actions={<StoreSwitcher value={storeId} onChange={setStoreId} />} />
        <main className={pageContent}>
          <div className="flex h-64 items-center justify-center">
            <span className="text-[14px] font-medium text-vpos-muted">Loading product details…</span>
          </div>
        </main>
      </>
    )
  }

  if (!product) {
    return (
      <>
        <Topbar title="Product Details" actions={<StoreSwitcher value={storeId} onChange={setStoreId} />} />
        <main className={pageContent}>
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-vpos-red-bg text-vpos-red">
              <Icon name="error-warning-line" className="text-[24px]" />
            </span>
            <strong className="text-[16px] text-vpos-text">Product not found</strong>
            <p className="text-[13px] text-vpos-muted">The product you are looking for does not exist or has been removed.</p>
            <Button variant="primary" onClick={() => navigate(paths.products)}>
              Back to catalog
            </Button>
          </div>
        </main>
      </>
    )
  }

  const selectedImageUrl = imagesList[activeImageIndex] || product.thumbnail

  return (
    <>
      <Topbar
        title="Product Details"
        subtitle={`Viewing details for ${product.productName}`}
        actions={<StoreSwitcher value={storeId} onChange={setStoreId} />}
      />
      <main className={cn(pageContent, 'pb-16')}>
        <section className="mb-6 flex min-h-12 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1">
            <Breadcrumb
              items={[
                { label: 'Products', to: paths.products },
                { label: product.productName },
              ]}
            />
          </div>
          <div className="flex shrink-0 flex-wrap gap-2.5">
            <Button variant="secondary" onClick={() => refetch()}>
              <Icon name="refresh-line" /> Refresh
            </Button>
            <Button variant="secondary" onClick={() => navigate(paths.productEdit(String(product.id)))}>
              <Icon name="edit-line" /> Edit product
            </Button>
            <Button variant="soft" className="text-vpos-red hover:bg-vpos-red-bg" onClick={handleDelete}>
              <Icon name="delete-bin-line" /> Delete
            </Button>
          </div>
        </section>

        {/* Hero Section */}
        <section className={cn(card, 'mb-6 p-6')}>
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
            {/* Left Image Showcase */}
            <div className="lg:col-span-5 flex flex-col gap-4">
              <div className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-2xl border border-vpos-line/80 bg-vpos-subtle/50 p-4">
                {selectedImageUrl ? (
                  <img
                    src={resolveImageUrl(selectedImageUrl)}
                    alt={product.productName}
                    className="h-full w-full object-contain transition-transform duration-300 hover:scale-105"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-vpos-muted">
                    <ProductThumb large />
                    <span className="text-[12px] font-medium">No image available</span>
                  </div>
                )}
                {product.isFeatured ? (
                  <span className="absolute top-3 left-3 flex items-center gap-1 rounded-full bg-amber-500/90 px-3 py-1 text-[11px] font-bold text-white shadow-md backdrop-blur-sm">
                    <Icon name="star-fill" className="text-[12px]" /> Featured
                  </span>
                ) : null}
              </div>

              {/* Sub thumbnails */}
              {imagesList.length > 1 ? (
                <div className="flex flex-wrap gap-2.5">
                  {imagesList.map((imgUrl, idx) => (
                    <button
                      key={imgUrl}
                      type="button"
                      onClick={() => setActiveImageIndex(idx)}
                      className={cn(
                        'h-16 w-16 overflow-hidden rounded-xl border-2 p-1 transition-all cursor-pointer bg-white',
                        activeImageIndex === idx
                          ? 'border-vpos-primary shadow-sm scale-105'
                          : 'border-vpos-line hover:border-vpos-primary/50',
                      )}
                    >
                      <img
                        src={resolveImageUrl(imgUrl)}
                        alt=""
                        className="h-full w-full object-cover rounded-lg"
                      />
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            {/* Right Product Summary */}
            <div className="lg:col-span-7 flex flex-col justify-between gap-6">
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-vpos-primary/10 px-3 py-1 text-[12px] font-bold text-vpos-primary">
                    {product.salesChannel === 1 ? 'POS Only' : product.salesChannel === 2 ? 'Online Only' : 'POS & Online'}
                  </span>
                  <Status value={product.isSellable !== false ? 'Active' : 'Inactive'} />
                  {product.isStockable ? (
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-[12px] font-bold text-blue-700">
                      📦 Tracked Stock
                    </span>
                  ) : null}
                </div>

                <h1 className="text-[26px] font-extrabold tracking-tight text-vpos-text">
                  {product.productName}
                </h1>
                {product.shortName ? (
                  <p className="text-[14px] font-medium text-vpos-muted">{product.shortName}</p>
                ) : null}

                <div className="mt-1 flex flex-wrap gap-4 text-[13px] text-vpos-muted">
                  <div className="flex items-center gap-1.5">
                    <Icon name="price-tag-3-line" className="text-[16px] text-vpos-primary" />
                    <span>Category:</span>
                    <strong className="text-vpos-text">{product.category?.categoryName || 'General'}</strong>
                  </div>
                  {product.brand ? (
                    <div className="flex items-center gap-1.5">
                      <Icon name="award-line" className="text-[16px] text-vpos-primary" />
                      <span>Brand:</span>
                      <strong className="text-vpos-text">{product.brand.brandName}</strong>
                    </div>
                  ) : null}
                  {product.unit ? (
                    <div className="flex items-center gap-1.5">
                      <Icon name="scales-3-line" className="text-[16px] text-vpos-primary" />
                      <span>Unit:</span>
                      <strong className="text-vpos-text">{product.unit.unitName}</strong>
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Price Callout Banner */}
              <div className="grid grid-cols-2 gap-4 rounded-xl border border-vpos-line/70 bg-vpos-sand/40 p-4 sm:grid-cols-3">
                <div>
                  <small className="block text-[11px] font-bold uppercase tracking-wider text-vpos-muted">
                    POS Selling Price
                  </small>
                  <strong className="mt-0.5 block text-[22px] font-black text-vpos-primary-2">
                    {money(posPrice)}
                  </strong>
                </div>
                <div>
                  <small className="block text-[11px] font-bold uppercase tracking-wider text-vpos-muted">
                    Online Price
                  </small>
                  <strong className="mt-0.5 block text-[22px] font-bold text-vpos-text">
                    {onlinePrice != null && onlinePrice > 0 ? money(onlinePrice) : '—'}
                  </strong>
                </div>
                <div>
                  <small className="block text-[11px] font-bold uppercase tracking-wider text-vpos-muted">
                    Profit Margin
                  </small>
                  <span className="mt-1 inline-block rounded-md bg-emerald-100 px-2 py-1 text-[13px] font-extrabold text-emerald-800">
                    {profitMargin ? `+${profitMargin}%` : '—'}
                  </span>
                </div>
              </div>

              {/* Description Box */}
              {product.description ? (
                <div className="flex flex-col gap-1.5">
                  <h3 className="text-[13px] font-bold uppercase tracking-wider text-vpos-muted">
                    Description
                  </h3>
                  <p className="rounded-xl border border-vpos-line/60 bg-white p-3.5 text-[13px] leading-relaxed text-vpos-text whitespace-pre-wrap">
                    {product.description}
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        </section>

        {/* Metrics Grid */}
        <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label="Product Code"
            value={product.productCode || `PRD-${product.id}`}
            trend="Internal SKU / Code"
            trendAs="small"
            icon={<Icon name="barcode-line" />}
            iconTone="primary"
          />
          <MetricCard
            label="Variants Count"
            value={String(product.variants?.length || 1)}
            trend="Active SKU Options"
            trendAs="small"
            icon={<Icon name="stack-line" />}
            iconTone="positive"
          />
          <MetricCard
            label="Tax Class"
            value={product.tax ? `${product.tax.taxName} (${product.tax.percentage}%)` : 'No Tax'}
            trend="Tax Configuration"
            trendAs="small"
            icon={<Icon name="percent-line" />}
            iconTone="warning"
          />
          <MetricCard
            label="Supplier"
            value={(defaultVariant?.supplier as any)?.supplierName || 'General'}
            trend="Primary Wholesale Supplier"
            trendAs="small"
            icon={<Icon name="store-2-line" />}
            iconTone="primary"
          />
        </section>

        {/* Product Variants Section */}
        <section className="mb-6">
          <DataTable
            data={product.variants || []}
            columns={variantColumns}
            rowKey={(v) => String(v.id || v.sku)}
            title="Product Variants & Pricing Breakdown"
            pageSize={10}
            emptyMessage="No variants configured for this product."
          />
        </section>
      </main>

      <ConfirmModal
        open={confirmDeleteOpen}
        onClose={() => setConfirmDeleteOpen(false)}
        onConfirm={async () => {
          if (!product) return
          try {
            await deleteMutation.mutateAsync(product.id)
            toast(`Product "${product.productName}" deleted successfully!`, 'success')
            setConfirmDeleteOpen(false)
            navigate(paths.products)
          } catch (err) {
            const msg = err instanceof Error ? err.message : 'Failed to delete product'
            toast(msg, 'error')
          }
        }}
        title="Delete Product"
        description={`Are you sure you want to delete "${product?.productName}"? This action cannot be undone.`}
        confirmText="Delete Product"
        cancelText="Cancel"
        variant="danger"
        icon="delete-bin-line"
        isLoading={deleteMutation.isPending}
      />
    </>
  )
}
