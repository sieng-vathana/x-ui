import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Breadcrumb,
  Button,
  DataTable,
  Icon,
  MetricCard,
  Modal,
  Select,
  StoreSwitcher,
  Topbar,
  type DataTableColumn,
} from '../../components'
import { ProductsSubnav } from '../../components/products/ProductsSubnav'
import { useStockIn, useStockMovements, useStockOut } from '../../features/inventory/useStockMovements'
import type { StockMovement, StockMovementType } from '../../features/inventory/stockApi'
import { useAuth } from '../../context/AuthContext'
import { useProductsList } from '../../features/products/useProducts'
import type { ProductItem } from '../../features/products/types'
import { useStoresRaw } from '../../features/stores/useStores'
import { useToast } from '../../context/ToastContext'
import { useAdminStore } from '../../hooks/useAdminStore'
import { cn } from '../../lib/cn'
import { formatReportDate } from '../../lib/reporting'
import { paths } from '../../lib/paths'
import { pageContent } from '../../lib/ui'

const PAGE_SIZE = 25

const MOVEMENT_TYPES: Array<{ value: StockMovementType; label: string }> = [
  { value: 'STOCK_IN', label: 'Stock received' },
  { value: 'STOCK_OUT', label: 'Stock removed' },
  { value: 'SALE', label: 'Sale' },
  { value: 'RETURN', label: 'Customer return' },
  { value: 'ADJUSTMENT_IN', label: 'Adjustment in' },
  { value: 'ADJUSTMENT_OUT', label: 'Adjustment out' },
  { value: 'RESERVATION', label: 'Reserved' },
  { value: 'RESERVATION_RELEASE', label: 'Reservation released' },
  { value: 'RESERVATION_CONSUMED', label: 'Reservation consumed' },
  { value: 'RESERVATION_REOPENED', label: 'Reservation reopened' },
  { value: 'RESERVATION_EXPIRED', label: 'Reservation expired' },
]

interface MovementRow {
  id: number
  createdAt: string
  type: string
  productName: string
  sku: string
  storeName: string
  quantityDelta: number
  reference: string
  performedBy: string
  note: string
}

function variantIndex(products: ProductItem[]) {
  const variants = new Map<number, { productName: string; sku: string }>()
  for (const product of products) {
    for (const variant of product.variants ?? []) {
      if (variant.id) {
        variants.set(variant.id, {
          productName: [product.productName, variant.displayName || variant.variantName].filter(Boolean).join(' · '),
          sku: variant.sku || product.productCode,
        })
      }
    }
  }
  return variants
}

function toRows(movements: StockMovement[], products: ProductItem[], stores: Array<{ id: number; name: string }>): MovementRow[] {
  const variants = variantIndex(products)
  const storeNames = new Map(stores.map((store) => [String(store.id), store.name]))
  const typeLabels = new Map(MOVEMENT_TYPES.map((type) => [type.value, type.label]))

  return movements.map((movement) => {
    const product = variants.get(movement.variantId)
    const isManualAdjustment = movement.referenceType?.toUpperCase() === 'ADJUSTMENT'
    const typeLabel = isManualAdjustment && movement.movementType === 'STOCK_IN'
      ? 'Adjustment in'
      : isManualAdjustment && movement.movementType === 'STOCK_OUT'
        ? 'Adjustment out'
        : typeLabels.get(movement.movementType) || movement.movementType
    return {
      id: movement.id,
      createdAt: movement.createdAt,
      type: typeLabel,
      productName: product?.productName || `Product variant #${movement.variantId}`,
      sku: product?.sku || `VAR-${movement.variantId}`,
      storeName: storeNames.get(String(movement.storeId)) || `Store #${movement.storeId}`,
      quantityDelta: movement.quantityDelta,
      reference: [movement.referenceType, movement.referenceId].filter(Boolean).join(' / ') || '—',
      performedBy: movement.performedBy ? `User #${movement.performedBy}` : 'System',
      note: movement.note || '—',
    }
  })
}

export function StockMovementPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { toast } = useToast()
  const { storeId, setStoreId } = useAdminStore()
  const [type, setType] = useState<StockMovementType | ''>('')
  const [page, setPage] = useState(0)
  const [adjustmentOpen, setAdjustmentOpen] = useState(false)
  const [adjustmentDirection, setAdjustmentDirection] = useState<'in' | 'out'>('in')
  const [variantId, setVariantId] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [note, setNote] = useState('')

  const movementQuery = useStockMovements({ storeId, movementType: type || undefined, page, size: PAGE_SIZE })
  const productsQuery = useProductsList(storeId)
  const storesQuery = useStoresRaw()
  const stockInMutation = useStockIn()
  const stockOutMutation = useStockOut()
  const movements = movementQuery.data?.content ?? []
  const stores = storesQuery.data ?? []
  const rows = useMemo(
    () => toRows(movements, productsQuery.data ?? [], stores),
    [movements, productsQuery.data, stores],
  )
  const variantOptions = useMemo(() => (productsQuery.data ?? [])
    .filter((product) => product.isStockable !== false)
    .flatMap((product) => (product.variants ?? [])
      .filter((variant) => Boolean(variant.id))
      .map((variant) => ({
        value: String(variant.id),
        label: [product.productName, variant.displayName || variant.variantName, variant.sku].filter(Boolean).join(' · '),
      }))), [productsQuery.data])

  const permissions = user?.permissions ?? []
  const canStockIn = permissions.includes('x-inventory:stock-in')
  const canStockOut = permissions.includes('x-inventory:stock-out')
  const canAdjustStock = canStockIn || canStockOut
  const activeDirection = canStockIn && canStockOut
    ? adjustmentDirection
    : canStockIn ? 'in' : 'out'
  const adjustmentBusy = stockInMutation.isPending || stockOutMutation.isPending
  const rowsIn = movements.filter((movement) => movement.quantityDelta > 0).length
  const rowsOut = movements.filter((movement) => movement.quantityDelta < 0).length
  const totalPages = movementQuery.data?.totalPages ?? 0
  const loadError = movementQuery.error ?? productsQuery.error

  const columns: DataTableColumn<MovementRow>[] = useMemo(() => [
    {
      id: 'when',
      header: 'Date / time',
      searchable: (row) => row.createdAt,
      cell: (row) => <strong className="block">{formatReportDate(row.createdAt)}</strong>,
    },
    {
      id: 'type',
      header: 'Type',
      searchable: (row) => row.type,
      cell: (row) => (
        <span className={cn(
          'inline-flex rounded-full px-2.5 py-1 text-[12px] font-extrabold',
          row.quantityDelta > 0 ? 'bg-vpos-green-bg text-vpos-green' : row.quantityDelta < 0 ? 'bg-vpos-red-bg text-vpos-red' : 'bg-vpos-subtle text-vpos-muted',
        )}>
          {row.type}
        </span>
      ),
    },
    {
      id: 'product',
      header: 'Product',
      searchable: (row) => `${row.productName} ${row.sku}`,
      cell: (row) => <><strong className="block">{row.productName}</strong><small className="text-[11px] text-vpos-muted">{row.sku}</small></>,
    },
    { id: 'location', header: 'Location', searchable: (row) => row.storeName, hideOnMobile: true, cell: (row) => row.storeName },
    {
      id: 'qty',
      header: 'Qty change',
      cell: (row) => <strong className={cn(row.quantityDelta > 0 && 'text-vpos-green', row.quantityDelta < 0 && 'text-vpos-red')}>
        {row.quantityDelta > 0 ? `+${row.quantityDelta}` : row.quantityDelta}
      </strong>,
    },
    { id: 'ref', header: 'Reference', searchable: (row) => row.reference, cell: (row) => <span className="font-semibold text-vpos-primary">{row.reference}</span> },
    { id: 'user', header: 'By', searchable: (row) => row.performedBy, hideOnMobile: true, cell: (row) => row.performedBy },
    { id: 'note', header: 'Note', searchable: (row) => row.note, hideOnMobile: true, className: 'max-w-[160px] whitespace-normal', cell: (row) => row.note },
  ], [])

  const openAdjustment = () => {
    setVariantId(variantOptions[0]?.value ?? '')
    setQuantity('1')
    setNote('')
    setAdjustmentOpen(true)
  }

  const saveAdjustment = async () => {
    const numericStoreId = Number(storeId)
    const numericVariantId = Number(variantId)
    const numericQuantity = Number(quantity)
    if (!Number.isInteger(numericStoreId) || numericStoreId <= 0 || !Number.isInteger(numericVariantId) || numericVariantId <= 0) {
      toast('Select a store and product variant.', 'warning')
      return
    }
    if (!Number.isSafeInteger(numericQuantity) || numericQuantity <= 0) {
      toast('Enter a whole number of units greater than zero.', 'warning')
      return
    }
    if (!note.trim()) {
      toast('Add a note explaining this stock adjustment.', 'warning')
      return
    }

    const input = {
      storeId: numericStoreId,
      variantId: numericVariantId,
      quantity: numericQuantity,
      referenceType: 'ADJUSTMENT',
      performedBy: Number(user?.id) || undefined,
      note: note.trim(),
    }

    try {
      if (activeDirection === 'in') {
        await stockInMutation.mutateAsync(input)
      } else {
        await stockOutMutation.mutateAsync(input)
      }
      setAdjustmentOpen(false)
      toast('Stock adjustment recorded.', 'success')
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Stock adjustment could not be recorded.', 'error')
    }
  }

  return (
    <>
      <Topbar
        title="Products"
        subtitle="Stock movement history and inventory adjustments"
        actions={<StoreSwitcher value={storeId} onChange={(value) => { setPage(0); setStoreId(value) }} />}
      />
      <main className={pageContent}>
        <section className="mb-5 flex min-h-12 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1">
            <Breadcrumb items={[{ label: 'Products', to: paths.products }, { label: 'Stock movement' }]} />
          </div>
          <div className="flex shrink-0 flex-wrap gap-2.5">
            <Button variant="secondary" onClick={() => { setPage(0); void movementQuery.refetch() }}>
              <Icon name="refresh-line" /> Refresh
            </Button>
            <Button variant="secondary" onClick={() => navigate(paths.productLowStock)}>
              <Icon name="error-warning-line" /> Low stock
            </Button>
            {canAdjustStock ? (
              <Button variant="primary" disabled={variantOptions.length === 0 || productsQuery.isLoading} onClick={openAdjustment}>
                <Icon name="add-line" /> Stock adjustment
              </Button>
            ) : null}
          </div>
        </section>

        <ProductsSubnav />

        {movementQuery.isError || productsQuery.isError ? (
          <div className="mt-4 rounded-[4px] border border-vpos-red/25 bg-vpos-red-bg p-4 text-[13px] text-vpos-red">
            {loadError instanceof Error
              ? loadError.message
              : 'Stock data could not be loaded.'}
          </div>
        ) : null}

        <section className="mb-[18px] mt-[18px] grid grid-cols-1 gap-[18px] sm:grid-cols-3">
          <MetricCard label="Total movements" value={movementQuery.isLoading ? '—' : String(movementQuery.data?.totalElements ?? 0)} trend="For the selected store and filter" trendAs="small" icon={<Icon name="exchange-line" />} iconTone="primary" />
          <MetricCard label="Stock in" value={String(rowsIn)} trend="On this page" trendAs="small" icon={<Icon name="arrow-down-circle-line" />} iconTone="positive" />
          <MetricCard label="Stock out" value={String(rowsOut)} trend="On this page" trendAs="small" icon={<Icon name="arrow-up-circle-line" />} iconTone="danger" />
        </section>

        <DataTable
          data={rows}
          columns={columns}
          rowKey={(row) => row.id}
          title="Stock movement history"
          searchPlaceholder="Search product, SKU, reference, type…"
          pageSize={PAGE_SIZE}
          isLoading={movementQuery.isLoading || productsQuery.isLoading}
          emptyMessage={movementQuery.isError ? 'Stock history is unavailable.' : 'No stock movements match your filters.'}
          toolbar={(
            <Select
              variant="toolbar"
              placeholder="All types"
              value={type}
              onChange={(value) => { setPage(0); setType(value as StockMovementType | '') }}
              options={MOVEMENT_TYPES}
            />
          )}
        />

        {totalPages > 1 ? (
          <div className="mt-3 flex items-center justify-between text-[12px] text-vpos-muted">
            <span>Page {page + 1} of {totalPages}</span>
            <div className="flex gap-2">
              <Button variant="secondary" disabled={page === 0} onClick={() => setPage((current) => Math.max(0, current - 1))}>Previous</Button>
              <Button variant="secondary" disabled={!movementQuery.data?.hasNext} onClick={() => setPage((current) => current + 1)}>Next</Button>
            </div>
          </div>
        ) : null}
      </main>

      <Modal
        open={adjustmentOpen}
        onClose={() => setAdjustmentOpen(false)}
        title="Stock adjustment"
        description="Record the physical stock change and why it happened."
        closeOnBackdrop={false}
        footer={(
          <>
            <Button variant="secondary" disabled={adjustmentBusy} onClick={() => setAdjustmentOpen(false)}>Cancel</Button>
            <Button variant="primary" disabled={adjustmentBusy || !variantId || !note.trim()} onClick={() => void saveAdjustment()}>
              {adjustmentBusy ? 'Saving…' : 'Save adjustment'}
            </Button>
          </>
        )}
      >
        <div className="space-y-4">
          {canStockIn && canStockOut ? (
            <Select label="Adjustment" value={adjustmentDirection} onChange={(value) => setAdjustmentDirection(value as 'in' | 'out')} options={[
              { value: 'in', label: 'Increase stock' },
              { value: 'out', label: 'Decrease stock' },
            ]} />
          ) : <p className="m-0 text-[13px] font-semibold text-vpos-text">{activeDirection === 'in' ? 'Increase stock' : 'Decrease stock'}</p>}
          <Select label="Product variant" value={variantId} onChange={setVariantId} placeholder="Select product" options={variantOptions} searchable />
          <label className="block">
            <span className="mb-2 block text-[12px] font-semibold text-vpos-dark">Quantity <b className="text-vpos-red">*</b></span>
            <input type="number" min="1" step="1" value={quantity} onChange={(event) => setQuantity(event.target.value)} className="h-[39px] w-full rounded-[4px] border border-vpos-line bg-white px-3.5 text-[14px] text-vpos-text outline-none focus:border-vpos-primary" />
          </label>
          <label className="block">
            <span className="mb-2 block text-[12px] font-semibold text-vpos-dark">Reason / note <b className="text-vpos-red">*</b></span>
            <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={3} maxLength={500} className="w-full rounded-[4px] border border-vpos-line bg-white p-3 text-[14px] text-vpos-text outline-none focus:border-vpos-primary" placeholder="For example: stock count correction or damaged goods" />
          </label>
        </div>
      </Modal>
    </>
  )
}
