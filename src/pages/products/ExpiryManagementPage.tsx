import { useMemo, useState } from 'react'
import {
  Breadcrumb,
  Button,
  DataTable,
  Icon,
  MetricCard,
  Modal,
  ProductThumb,
  Select,
  StoreSwitcher,
  Topbar,
  type DataTableColumn,
} from '../../components'
import { ProductsSubnav } from '../../components/products/ProductsSubnav'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import {
  useExpiryBatches,
  useExpirySummary,
  useWriteOffExpiredBatch,
} from '../../features/inventory/useStockMovements'
import type { ExpiryBatch, ExpiryBatchFilter } from '../../features/inventory/stockApi'
import { useProductsList } from '../../features/products/useProducts'
import type { ProductItem } from '../../features/products/types'
import { useStoresRaw } from '../../features/stores/useStores'
import { useAdminStore } from '../../hooks/useAdminStore'
import { cn } from '../../lib/cn'
import { paths } from '../../lib/paths'
import { card, pageContent } from '../../lib/ui'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { savedImageUrl, API_BASE_URL, ApiClient } from '../../lib/api'

const PAGE_SIZE = 25
const FILTERS: Array<{ value: ExpiryBatchFilter; label: string }> = [
  { value: 'ALL', label: 'All batches' },
  { value: 'EXPIRED', label: 'Expired' },
  { value: 'WITHIN_7_DAYS', label: 'Expires within 7 days' },
  { value: 'WITHIN_30_DAYS', label: 'Expires within 30 days' },
  { value: 'NO_DATE', label: 'No expiry date' },
]

interface BatchRow extends ExpiryBatch {
  productName: string
  variantName: string
  sku: string
  image?: string
}

function indexProducts(products: ProductItem[]) {
  const variants = new Map<number, { productName: string; variantName: string; sku: string; image?: string }>()
  for (const product of products) {
    for (const variant of product.variants ?? []) {
      if (!variant.id) continue
      variants.set(variant.id, {
        productName: product.productName,
        variantName: variant.displayName || variant.variantName || '',
        sku: variant.sku || product.productCode,
        image: savedImageUrl(variant.image, product.thumbnail, product.images?.[0]?.imageUrl),
      })
    }
  }
  return variants
}

function daysUntil(expiryDate: string): number {
  const expiry = new Date(`${expiryDate}T00:00:00`)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.floor((expiry.getTime() - today.getTime()) / 86_400_000)
}

function expiryLabel(expiryDate?: string | null) {
  if (!expiryDate) return { label: 'No expiry date', tone: 'neutral' }
  const days = daysUntil(expiryDate)
  if (days < 0) return { label: `Expired ${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} ago`, tone: 'danger' }
  if (days === 0) return { label: 'Expires today', tone: 'warning' }
  return { label: `Expires in ${days} day${days === 1 ? '' : 's'}`, tone: days <= 7 ? 'warning' : 'neutral' }
}

function formatDate(value?: string | null) {
  if (!value) return '—'
  return new Intl.DateTimeFormat(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
    .format(new Date(`${value}T00:00:00`))
}

const api = new ApiClient({ baseUrl: API_BASE_URL })

export function ExpiryManagementPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const { storeId, setStoreId } = useAdminStore()
  const [filter, setFilter] = useState<ExpiryBatchFilter>('ALL')
  const [page, setPage] = useState(0)
  const [writeOffBatch, setWriteOffBatch] = useState<BatchRow | null>(null)
  const [editBatch, setEditBatch] = useState<BatchRow | null>(null)
  const [writeOffQuantity, setWriteOffQuantity] = useState('')
  const [writeOffReason, setWriteOffReason] = useState('')
  const [batchCode, setBatchCode] = useState('')
  const [expiryDate, setExpiryDate] = useState('')
  const queryClient = useQueryClient()
  const storeNumber = Number(storeId)
  const batchesQuery = useExpiryBatches(storeId, filter, page, PAGE_SIZE)
  const summaryQuery = useExpirySummary(storeId)
  const productsQuery = useProductsList(storeId)
  const storesQuery = useStoresRaw()
  const writeOffMutation = useWriteOffExpiredBatch()
  const canWriteOff = user?.permissions.includes('x-inventory:stock-out') ?? false
  const canEditBatch = user?.permissions.includes('x-inventory:update') ?? false

  const updateBatchMutation = useMutation({
    mutationFn: async ({ id, code, expiry }: { id: number; code: string; expiry: string }) => {
      const response = await api.request<{ data?: ExpiryBatch; message?: string; error?: string }>(
        `/stock/expiry/batches/${id}?storeId=${storeNumber}`,
        { method: 'PUT', body: JSON.stringify({
          batchCode: code.trim() || undefined,
          expiryDate: expiry,
          performedBy: Number(user?.id) || undefined,
        }) },
      )
      if (!response.data) throw new Error(response.message ?? response.error ?? 'The batch could not be updated.')
      return response.data
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['stock-expiry-batches'] }),
        queryClient.invalidateQueries({ queryKey: ['stock-expiry-summary'] }),
        queryClient.invalidateQueries({ queryKey: ['stock-balance'] }),
      ])
    },
  })

  const productIndex = useMemo(() => indexProducts(productsQuery.data ?? []), [productsQuery.data])
  const rows = useMemo<BatchRow[]>(() => (batchesQuery.data?.content ?? []).map((batch) => {
    const product = productIndex.get(batch.variantId)
    return {
      ...batch,
      productName: product?.productName ?? `Product variant #${batch.variantId}`,
      variantName: product?.variantName ?? '',
      sku: product?.sku ?? `VAR-${batch.variantId}`,
      image: product?.image,
    }
  }), [batchesQuery.data?.content, productIndex])
  const selectedStore = storesQuery.data?.find((store) => String(store.id) === String(storeId))

  const openEdit = (row: BatchRow) => {
    setEditBatch(row)
    setBatchCode(row.batchCode ?? '')
    setExpiryDate(row.expiryDate ?? '')
  }

  const saveBatch = async () => {
    if (!editBatch || !expiryDate) {
      toast('Choose an expiry date for this batch.', 'warning')
      return
    }
    try {
      await updateBatchMutation.mutateAsync({ id: editBatch.id, code: batchCode, expiry: expiryDate })
      toast('Stock batch details updated.', 'success')
      setEditBatch(null)
    } catch (error) {
      toast(error instanceof Error ? error.message : 'The batch could not be updated.', 'error')
    }
  }

  const confirmWriteOff = async () => {
    if (!writeOffBatch) return
    const quantity = Number(writeOffQuantity)
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > writeOffBatch.availableQuantity) {
      toast(`Enter a quantity from 1 to ${writeOffBatch.availableQuantity}.`, 'warning')
      return
    }
    if (!writeOffReason.trim()) {
      toast('Add a reason for the write-off.', 'warning')
      return
    }
    try {
      await writeOffMutation.mutateAsync({
        batchId: writeOffBatch.id,
        input: { storeId: storeNumber, quantity, reason: writeOffReason.trim(), performedBy: Number(user?.id) || undefined },
      })
      toast(`${quantity} expired unit${quantity === 1 ? '' : 's'} written off.`, 'success')
      setWriteOffBatch(null)
      setWriteOffQuantity('')
      setWriteOffReason('')
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Expired stock could not be written off.', 'error')
    }
  }

  const columns: DataTableColumn<BatchRow>[] = useMemo(() => [
    {
      id: 'product',
      header: 'Product / SKU',
      searchable: (row) => `${row.productName} ${row.variantName} ${row.sku} ${row.batchCode ?? ''}`,
      cell: (row) => (
        <div className="flex items-center gap-3">
          <ProductThumb src={row.image} />
          <span>
            <strong className="block text-[13px]">{row.productName}</strong>
            <small className="mt-1 block text-[11px] text-vpos-muted">
              {[row.variantName, row.sku].filter(Boolean).join(' · ')}
            </small>
          </span>
        </div>
      ),
    },
    {
      id: 'batch',
      header: 'Batch',
      searchable: (row) => row.batchCode ?? '',
      cell: (row) => <span>{row.batchCode || <span className="text-vpos-muted">No code</span>}</span>,
    },
    {
      id: 'expiry',
      header: 'Expiry',
      searchable: (row) => `${row.expiryDate ?? ''} ${expiryLabel(row.expiryDate).label}`,
      cell: (row) => {
        const status = expiryLabel(row.expiryDate)
        return (
          <span>
            <strong className="block">{formatDate(row.expiryDate)}</strong>
            <small className={cn('mt-1 block', status.tone === 'danger' ? 'font-semibold text-vpos-red' : status.tone === 'warning' ? 'font-semibold text-vpos-orange' : 'text-vpos-muted')}>
              {status.label}
            </small>
          </span>
        )
      },
    },
    { id: 'on-hand', header: 'On hand', cell: (row) => row.quantityOnHand },
    { id: 'available', header: 'Available', cell: (row) => <strong>{row.availableQuantity}</strong> },
    {
      id: 'source',
      header: 'Received from',
      hideOnMobile: true,
      searchable: (row) => `${row.sourceType} ${row.sourceReference ?? ''}`,
      cell: (row) => <span>{row.sourceReference || row.sourceType.replaceAll('_', ' ')}</span>,
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: (row) => (
        <div className="flex flex-wrap gap-2">
          {canEditBatch ? (
            <Button variant="secondary" onClick={() => openEdit(row)}>
              <Icon name="edit-line" /> {row.expiryDate ? 'Edit batch' : 'Set expiry'}
            </Button>
          ) : null}
          {canWriteOff && row.expiryDate && daysUntil(row.expiryDate) < 0 && row.availableQuantity > 0 ? (
            <Button variant="secondary" onClick={() => {
              setWriteOffBatch(row)
              setWriteOffQuantity(String(row.availableQuantity))
              setWriteOffReason('')
            }}>
              <Icon name="delete-bin-line" /> Write off
            </Button>
          ) : null}
        </div>
      ),
    },
  ], [canEditBatch, canWriteOff])

  const totalPages = batchesQuery.data?.totalPages ?? 0
  const summary = summaryQuery.data
  const error = batchesQuery.error ?? summaryQuery.error ?? productsQuery.error

  return (
    <>
      <Topbar
        title="Expiry management"
        subtitle="Track dated stock, prioritize older lots, and record expired stock write-offs"
        actions={<StoreSwitcher value={storeId} onChange={setStoreId} />}
      />
      <main className={pageContent}>
        <section className="mb-5 flex min-h-12 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1">
            <Breadcrumb items={[{ label: 'Products', to: paths.products }, { label: 'Expiry management' }]} />
          </div>
          <div className="flex shrink-0 flex-wrap gap-2.5">
            <Button variant="secondary" onClick={() => { void batchesQuery.refetch(); void summaryQuery.refetch() }}>
              <Icon name="refresh-line" /> Refresh
            </Button>
          </div>
        </section>

        <ProductsSubnav />

        {error ? (
          <div className="mt-4 rounded-[4px] border border-vpos-red/25 bg-vpos-red-bg p-4 text-[13px] text-vpos-red">
            {error instanceof Error ? error.message : 'Expiry data could not be loaded.'}
          </div>
        ) : null}

        <section className="mb-[18px] mt-[18px] grid grid-cols-1 gap-[18px] sm:grid-cols-3">
          <MetricCard label="Expired stock" value={summaryQuery.isLoading ? '—' : String(summary?.expiredUnits ?? 0)} trend={`${summary?.expiredBatchCount ?? 0} batches · write off after review`} trendAs="small" icon={<Icon name="error-warning-line" />} iconTone="danger" />
          <MetricCard label="Expires within 7 days" value={summaryQuery.isLoading ? '—' : String(summary?.within7DaysUnits ?? 0)} trend={`${summary?.within7DaysBatchCount ?? 0} batches need priority`} trendAs="small" icon={<Icon name="time-line" />} iconTone="warning" />
          <MetricCard label="Expires within 30 days" value={summaryQuery.isLoading ? '—' : String(summary?.within30DaysUnits ?? 0)} trend={`${summary?.within30DaysBatchCount ?? 0} batches`} trendAs="small" icon={<Icon name="calendar-event-line" />} iconTone="primary" />
        </section>

        {(summary?.undatedUnits ?? 0) > 0 ? (
          <div className="mb-4 flex items-start gap-3 rounded-[4px] border border-vpos-orange/25 bg-vpos-orange-bg p-4 text-[13px] text-vpos-orange">
            <Icon name="information-line" className="mt-0.5 shrink-0 text-[17px]" />
            <p className="m-0">
              <strong>{summary?.undatedUnits} units in {summary?.undatedBatchCount} batch{summary?.undatedBatchCount === 1 ? '' : 'es'} have no expiry date.</strong>{' '}
              These may be existing stock recorded before batch tracking. Use “Set expiry” to add dates where known; enter dates when receiving future goods.
            </p>
          </div>
        ) : null}

        <section className={cn(card, 'mb-4 flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between')}>
          <div>
            <h2 className="m-0 text-[15px] font-extrabold text-vpos-text">Stock batches{selectedStore ? ` · ${selectedStore.name}` : ''}</h2>
            <p className="mt-1 mb-0 text-[12px] text-vpos-muted">Sales consume the earliest valid expiry date first. Expired stock cannot be sold.</p>
          </div>
          <Select
            variant="toolbar"
            value={filter}
            onChange={(value) => { setPage(0); setFilter(value as ExpiryBatchFilter) }}
            options={FILTERS}
          />
        </section>

        <DataTable
          data={rows}
          columns={columns}
          rowKey={(row) => row.id}
          title="Expiry and batch register"
          searchPlaceholder="Search product, SKU, or batch code…"
          pageSize={PAGE_SIZE}
          isLoading={batchesQuery.isLoading || productsQuery.isLoading}
          emptyMessage={batchesQuery.isError ? 'Expiry data is unavailable.' : 'No stock batches match this filter.'}
          emptyIcon="calendar-check-line"
        />
        {totalPages > 1 ? (
          <div className="mt-3 flex items-center justify-between text-[12px] text-vpos-muted">
            <span>Page {page + 1} of {totalPages} · {batchesQuery.data?.totalElements ?? 0} batches</span>
            <div className="flex gap-2">
              <Button variant="secondary" disabled={page === 0} onClick={() => setPage((current) => Math.max(0, current - 1))}>Previous</Button>
              <Button variant="secondary" disabled={!batchesQuery.data?.hasNext} onClick={() => setPage((current) => current + 1)}>Next</Button>
            </div>
          </div>
        ) : null}
      </main>

      <Modal
        open={Boolean(editBatch)}
        onClose={() => setEditBatch(null)}
        title={editBatch?.expiryDate ? 'Edit stock batch' : 'Set stock expiry'}
        description="Keep the supplier batch code and expiry date with this stock lot."
        closeOnBackdrop={false}
        footer={(
          <>
            <Button variant="secondary" disabled={updateBatchMutation.isPending} onClick={() => setEditBatch(null)}>Cancel</Button>
            <Button variant="primary" disabled={updateBatchMutation.isPending || !expiryDate} onClick={() => void saveBatch()}>
              {updateBatchMutation.isPending ? 'Saving…' : 'Save batch'}
            </Button>
          </>
        )}
      >
        <div className="space-y-4">
          <p className="m-0 rounded-[4px] bg-vpos-subtle p-3 text-[13px] text-vpos-muted">
            {editBatch?.productName} · {editBatch?.sku} · {editBatch?.quantityOnHand} units on hand
          </p>
          <label className="block">
            <span className="mb-2 block text-[12px] font-semibold text-vpos-dark">Supplier batch code</span>
            <input value={batchCode} onChange={(event) => setBatchCode(event.target.value)} maxLength={100} className="h-[39px] w-full rounded-[4px] border border-vpos-line bg-white px-3.5 text-[14px] text-vpos-text outline-none focus:border-vpos-primary" placeholder="Optional" />
          </label>
          <label className="block">
            <span className="mb-2 block text-[12px] font-semibold text-vpos-dark">Expiry date <b className="text-vpos-red">*</b></span>
            <input type="date" value={expiryDate} onChange={(event) => setExpiryDate(event.target.value)} className="h-[39px] w-full rounded-[4px] border border-vpos-line bg-white px-3.5 text-[14px] text-vpos-text outline-none focus:border-vpos-primary" />
          </label>
        </div>
      </Modal>

      <Modal
        open={Boolean(writeOffBatch)}
        onClose={() => setWriteOffBatch(null)}
        title="Write off expired stock"
        description="This removes units from saleable inventory and records the reason in stock history."
        closeOnBackdrop={false}
        footer={(
          <>
            <Button variant="secondary" disabled={writeOffMutation.isPending} onClick={() => setWriteOffBatch(null)}>Cancel</Button>
            <Button variant="primary" disabled={writeOffMutation.isPending || !writeOffQuantity || !writeOffReason.trim()} onClick={() => void confirmWriteOff()}>
              {writeOffMutation.isPending ? 'Saving…' : 'Confirm write-off'}
            </Button>
          </>
        )}
      >
        <div className="space-y-4">
          <div className="rounded-[4px] border border-vpos-red/20 bg-vpos-red-bg p-3 text-[13px] text-vpos-red">
            {writeOffBatch?.productName} · {writeOffBatch?.batchCode || `Batch #${writeOffBatch?.id}`} · expired {formatDate(writeOffBatch?.expiryDate)}
          </div>
          <label className="block">
            <span className="mb-2 block text-[12px] font-semibold text-vpos-dark">Unreserved quantity <b className="text-vpos-red">*</b></span>
            <input type="number" min={1} max={writeOffBatch?.availableQuantity ?? 0} step={1} value={writeOffQuantity} onChange={(event) => setWriteOffQuantity(event.target.value)} className="h-[39px] w-full rounded-[4px] border border-vpos-line bg-white px-3.5 text-[14px] text-vpos-text outline-none focus:border-vpos-primary" />
            <small className="mt-1 block text-[11px] text-vpos-muted">Up to {writeOffBatch?.availableQuantity ?? 0} units are not reserved by an order.</small>
          </label>
          <label className="block">
            <span className="mb-2 block text-[12px] font-semibold text-vpos-dark">Reason <b className="text-vpos-red">*</b></span>
            <textarea value={writeOffReason} onChange={(event) => setWriteOffReason(event.target.value)} rows={3} maxLength={500} className="w-full rounded-[4px] border border-vpos-line bg-white p-3 text-[14px] text-vpos-text outline-none focus:border-vpos-primary" placeholder="For example: removed from shelf after expiry inspection" />
          </label>
        </div>
      </Modal>
    </>
  )
}
