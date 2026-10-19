import { useEffect, useMemo, useState } from 'react'
import {
  Breadcrumb,
  Button,
  Icon,
  Modal,
  Skeleton,
  Select,
  SelectField,
  StoreFormModal,
  StoreSwitcher,
  TextAreaField,
  Topbar,
} from '../components'
import {
  useApplyMarketplace,
  useApproveMarketplace,
  usePendingMarketplaceStores,
  useRejectMarketplace,
  useSoftDeleteStore,
  useStoresRaw,
} from '../features/stores/useStores'
import { STORE_TYPE_OPTIONS } from '../components/stores/StoreFormModal'
import { useAuth } from '../context/AuthContext'
import type { BffStore, StoreDay, StoreOpeningHours } from '../features/stores/types'
import { useToast } from '../context/ToastContext'
import { useAdminStore } from '../hooks/useAdminStore'
import { useDelayedLoading } from '../hooks/useDelayedLoading'
import { cn } from '../lib/cn'
import {
  card,
  filterBar,
  pageContent,
  searchField,
} from '../lib/ui'
import { resolveImageUrl as resolveStoredImageUrl } from '../features/files/fileApi'
import { resolveImageUrl as resolvePortalImageUrl } from '../lib/api'

const STATUS_MAP: Record<number, { label: string; className: string }> = {
  1: { label: 'Active', className: 'bg-vpos-green-bg text-vpos-green' },
  0: { label: 'Inactive', className: 'bg-vpos-subtle text-vpos-muted' },
  2: { label: 'Maintenance', className: 'bg-vpos-orange-bg text-vpos-orange' },
}

export const STORE_TYPE_LABEL_MAP: Record<string, string> = {
  CAFE_AND_BEVERAGE: 'Café & Drinks',
  RESTAURANT: 'Food & Dining',
  BAKERY: 'Bakery & Desserts',
  GROCERY: 'Groceries & Minimart',
  FASHION: 'Fashion & Accessories',
  HEALTH_BEAUTY: 'Health & Beauty',
  ELECTRONICS: 'Electronics & Tech',
  GENERAL_RETAIL: 'General Retail',
}

function marketplaceStatusBadge(status?: string): { label: string; className: string } {
  switch (status) {
    case 'APPROVED':
      return { label: 'Marketplace Live', className: 'bg-emerald-50 text-emerald-700 border border-emerald-200' }
    case 'PENDING_REVIEW':
      return { label: 'Pending Review', className: 'bg-amber-50 text-amber-700 border border-amber-200' }
    case 'REJECTED':
      return { label: 'Rejected', className: 'bg-rose-50 text-rose-700 border border-rose-200' }
    case 'NEEDS_CHANGES':
      return { label: 'Updates Requested', className: 'bg-amber-50 text-amber-800 border border-amber-200' }
    case 'NOT_LISTED':
    default:
      return { label: 'POS Only', className: 'bg-slate-100 text-slate-600 border border-slate-200' }
  }
}

function storeImage(store: BffStore): string | undefined {
  const image = store.images?.find((img) => img.isPrimary) ?? store.images?.[0]
  return image?.imageUrl
}

/** The store card logo; a photo that fails to load falls back to the store icon instead of a broken image. */
function StoreCardLogo({ src, name }: { src: string | undefined; name: string }) {
  const [failed, setFailed] = useState(false)
  useEffect(() => setFailed(false), [src])
  return src && !failed ? (
    <img src={src} alt={`${name} logo`} className="h-12 w-12 shrink-0 rounded-full border border-vpos-line object-cover" loading="lazy" onError={() => setFailed(true)} />
  ) : (
    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-vpos-sand text-[20px] text-vpos-primary"><Icon name="store-2-line" /></span>
  )
}

function StoreTableImage({ source }: { source: string | undefined }) {
  const [imageUrl, setImageUrl] = useState<string | undefined>(() => resolvePortalImageUrl(source))

  useEffect(() => {
    let active = true
    setImageUrl(resolvePortalImageUrl(source))
    void resolveStoredImageUrl(source).then((resolvedUrl) => {
      if (active) setImageUrl(resolvedUrl)
    })
    return () => { active = false }
  }, [source])

  return imageUrl ? (
    <img src={imageUrl} alt="" className="h-10 w-10 rounded-full object-cover" onError={() => setImageUrl(undefined)} />
  ) : (
    <span className="grid h-10 w-10 place-items-center rounded-full bg-vpos-sand text-[15px] text-vpos-primary">
      <Icon name="store-2-line" />
    </span>
  )
}

function storeAddress(store: BffStore): string {
  return [store.addressLine1, store.city, store.countryCode].filter(Boolean).join(', ')
}

const HOURS_DAYS: { key: StoreDay; short: string }[] = [
  { key: 'MONDAY', short: 'Mon' },
  { key: 'TUESDAY', short: 'Tue' },
  { key: 'WEDNESDAY', short: 'Wed' },
  { key: 'THURSDAY', short: 'Thu' },
  { key: 'FRIDAY', short: 'Fri' },
  { key: 'SATURDAY', short: 'Sat' },
  { key: 'SUNDAY', short: 'Sun' },
]

function storeHoursSummary(hours?: StoreOpeningHours | null): string {
  if (!hours?.days) return 'Opening hours not set'
  const runs: { start: number; end: number; value: string }[] = []
  for (let index = 0; index < HOURS_DAYS.length; index += 1) {
    const schedule = hours.days[HOURS_DAYS[index].key]
    const value = !schedule || schedule.closed
      ? 'Closed'
      : schedule.openTime && schedule.closeTime
        ? `${schedule.openTime}-${schedule.closeTime}`
        : 'Hours not set'
    const last = runs[runs.length - 1]
    if (last?.value === value) last.end = index
    else runs.push({ start: index, end: index, value })
  }
  const summary = runs.map(({ start, end, value }) => {
    const days = start === end
      ? HOURS_DAYS[start].short
      : `${HOURS_DAYS[start].short}-${HOURS_DAYS[end].short}`
    return `${days} ${value}`
  }).join(' · ')
  return `${summary} · Cambodia time`
}

function storeStatus(store: BffStore): { label: string; className: string } {
  return STATUS_MAP[store.status] ?? { label: 'Unknown', className: 'bg-vpos-subtle text-vpos-muted' }
}

function StoresPageSkeleton({ storeId, setStoreId }: { storeId: string; setStoreId: (id: string) => void }) {
  return <><Topbar title="Store management" subtitle="Loading stores…" actions={<StoreSwitcher value={storeId} onChange={setStoreId} />} /><main className={pageContent} aria-busy="true" aria-label="Loading stores"><section className="mb-6 flex min-h-12 items-center justify-between"><div><Skeleton className="h-4 w-28" /><Skeleton className="mt-3 h-8 w-52" /></div><Skeleton className="h-10 w-28" /></section><section className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">{[0, 1, 2, 3].map((item) => <Skeleton key={item} className="h-[84px]" />)}</section><section className={cn(card, 'overflow-hidden p-0')}><div className="grid grid-cols-4 gap-4 bg-vpos-subtle p-4">{[0, 1, 2, 3].map((item) => <Skeleton key={item} className="h-3" />)}</div>{[0, 1, 2, 3, 4].map((row) => <div key={row} className="grid grid-cols-4 gap-4 border-t border-vpos-line p-4">{[0, 1, 2, 3].map((cell) => <Skeleton key={cell} className="h-4" />)}</div>)}</section></main></>
}

export function StoresPage() {
  const { user } = useAuth()
  const isPlatformAdmin = Boolean(
    user?.permissions?.includes('platform:admin') ||
    user?.permissions?.includes('x-store:manage') ||
    user?.role?.toLowerCase() === 'admin'
  )
  const { storeId, setStoreId } = useAdminStore()
  const { data: stores = [], isLoading } = useStoresRaw()
  const { data: pendingStores = [] } = usePendingMarketplaceStores()
  const applyMarketplace = useApplyMarketplace()
  const approveMarketplace = useApproveMarketplace()
  const rejectMarketplace = useRejectMarketplace()

  const showLoadingSkeleton = useDelayedLoading(isLoading && stores.length === 0)
  const [activeTab, setActiveTab] = useState<'stores' | 'approvals'>('stores')
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('All status')
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [formOpen, setFormOpen] = useState(false)
  const [editingStore, setEditingStore] = useState<BffStore | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<BffStore | null>(null)
  const [applyTarget, setApplyTarget] = useState<BffStore | null>(null)
  const [applyStoreType, setApplyStoreType] = useState('GENERAL_RETAIL')
  const [rejectTarget, setRejectTarget] = useState<BffStore | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')

  const deleteStore = useSoftDeleteStore()
  const { toast } = useToast()

  const filtered = useMemo(() => {
    return stores.filter((s) => {
      const st = storeStatus(s)
      if (statusFilter !== 'All status' && st.label !== statusFilter) return false
      if (!query.trim()) return true
      const q = query.toLowerCase()
      return (
        s.name.toLowerCase().includes(q) ||
        s.addressLine1.toLowerCase().includes(q) ||
        s.city.toLowerCase().includes(q) ||
        (s.phone?.includes(q) ?? false) ||
        (s.email?.toLowerCase().includes(q) ?? false)
      )
    })
  }, [stores, query, statusFilter])

  const activeCount = stores.filter((s) => s.status === 1).length
  const cityCount = new Set(stores.map((s) => s.city).filter(Boolean)).size
  const openCreate = () => { setEditingStore(null); setFormOpen(true) }
  const openEdit = (store: BffStore) => { setEditingStore(store); setFormOpen(true) }

  const confirmSoftDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteStore.mutateAsync(deleteTarget.id)
      if (storeId === String(deleteTarget.id)) {
        setStoreId(String(stores.find((store) => store.id !== deleteTarget.id)?.id ?? ''))
      }
      toast(`${deleteTarget.name} was deleted.`, 'success')
      setDeleteTarget(null)
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to delete store.', 'error')
    }
  }

  const handleApplyMarketplace = async () => {
    if (!applyTarget) return
    try {
      await applyMarketplace.mutateAsync({ id: applyTarget.id, storeType: applyStoreType })
      toast(`Submitted ${applyTarget.name} for marketplace review!`, 'success')
      setApplyTarget(null)
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to submit application.', 'error')
    }
  }

  const handleApproveStore = async (store: BffStore) => {
    try {
      await approveMarketplace.mutateAsync(store.id)
      toast(`${store.name} approved! It is now live on the public marketplace.`, 'success')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to approve store.', 'error')
    }
  }

  const handleRejectStore = async () => {
    if (!rejectTarget) return
    try {
      await rejectMarketplace.mutateAsync({ id: rejectTarget.id, reason: rejectionReason.trim() || undefined })
      toast(`${rejectTarget.name} marketplace application rejected.`, 'info')
      setRejectTarget(null)
      setRejectionReason('')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to reject store.', 'error')
    }
  }

  if (isLoading && stores.length === 0) {
    if (showLoadingSkeleton) return <StoresPageSkeleton storeId={storeId} setStoreId={setStoreId} />
    return <><Topbar title="Store management" subtitle="Loading stores…" actions={<StoreSwitcher value={storeId} onChange={setStoreId} />} /><main className={pageContent}><section className="flex items-center justify-center py-20"><p className="text-[15px] text-vpos-muted">Loading stores…</p></section></main></>
  }

  return (
    <>
      <Topbar
        title="Store management"
        subtitle="Manage locations, hours, and store performance."
        actions={<StoreSwitcher value={storeId} onChange={setStoreId} />}
      />
      <main className={pageContent}>
        <section className="mb-6 flex min-h-12 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1">
            <Breadcrumb items={[{ label: 'Store management' }]} />
          </div>
          <div className="flex shrink-0 flex-wrap gap-2.5">
            <Button variant="primary" onClick={openCreate}>
              <Icon name="add-line" /> Add store
            </Button>
          </div>
        </section>

        <section className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            {
              label: 'Total stores',
              value: String(stores.length),
              icon: 'store-2-line',
              tone: 'bg-vpos-sand text-vpos-primary',
            },
            {
              label: 'Active',
              value: String(activeCount),
              icon: 'checkbox-circle-line',
              tone: 'bg-vpos-green-bg text-vpos-green',
            },
            {
              label: 'Inactive',
              value: String(stores.length - activeCount),
              icon: 'forbid-line',
              tone: 'bg-vpos-subtle text-vpos-primary-2',
            },
            {
              label: 'Cities',
              value: String(cityCount),
              icon: 'map-pin-line',
              tone: 'bg-vpos-orange-bg text-vpos-orange',
            },
          ].map((m) => (
            <article
              key={m.label}
              className={cn(card, 'flex items-center gap-3 rounded-[13px] p-4')}
            >
              <span
                className={cn(
                  'grid h-11 w-11 place-items-center rounded-xl text-[19px]',
                  m.tone,
                )}
              >
                <Icon name={m.icon} />
              </span>
              <span>
                <small className="block text-[12px] font-semibold text-vpos-muted">
                  {m.label}
                </small>
                <strong className="block text-[21px] text-vpos-text">{m.value}</strong>
              </span>
            </article>
          ))}
        </section>

        <div className="mb-5 flex items-center gap-2 border-b border-vpos-line">
          <button
            type="button"
            onClick={() => setActiveTab('stores')}
            className={cn(
              'flex items-center gap-2 border-b-2 px-4 py-2.5 text-[14px] font-bold transition',
              activeTab === 'stores'
                ? 'border-vpos-primary text-vpos-primary'
                : 'border-transparent text-vpos-muted hover:text-vpos-text',
            )}
          >
            <Icon name="store-2-line" /> My Stores ({stores.length})
          </button>
          {(isPlatformAdmin || pendingStores.length > 0) ? (
            <button
              type="button"
              onClick={() => setActiveTab('approvals')}
              className={cn(
                'flex items-center gap-2 border-b-2 px-4 py-2.5 text-[14px] font-bold transition',
                activeTab === 'approvals'
                  ? 'border-vpos-primary text-vpos-primary'
                  : 'border-transparent text-vpos-muted hover:text-vpos-text',
              )}
            >
              <Icon name="shield-check-line" /> Marketplace Review Queue
              {pendingStores.length > 0 ? (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-extrabold text-amber-800">
                  {pendingStores.length}
                </span>
              ) : null}
            </button>
          ) : null}
        </div>

        {activeTab === 'approvals' ? (
          <section className="space-y-4">
            <div className="rounded-xl border border-vpos-line bg-white p-4">
              <h2 className="m-0 text-[16px] font-bold text-vpos-text">Platform Marketplace Review Queue</h2>
              <p className="mt-1 mb-0 text-[13px] text-vpos-muted">
                Review and verify stores applying for public listing on the Cambodian marketplace.
                Approved stores are featured on the marketplace home and searchable by customers.
              </p>
            </div>

            {pendingStores.length === 0 ? (
              <div className={cn(card, 'p-10 text-center')}>
                <Icon name="checkbox-circle-line" className="mx-auto mb-2 text-[32px] text-emerald-500" />
                <p className="m-0 text-[15px] font-semibold text-vpos-muted">No pending marketplace applications.</p>
                <p className="mt-1 mb-0 text-[13px] text-vpos-muted">All store applications have been processed.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {pendingStores.map((pStore) => {
                  const pCat = STORE_TYPE_LABEL_MAP[pStore.storeType || 'GENERAL_RETAIL'] || pStore.storeType || 'General Retail'
                  return (
                    <article key={pStore.id} className={cn(card, 'flex flex-col justify-between p-5')}>
                      <div>
                        <div className="mb-3 flex items-start justify-between gap-2">
                          <div className="flex items-center gap-3">
                            <StoreTableImage source={storeImage(pStore)} />
                            <div>
                              <h3 className="m-0 text-[16px] font-extrabold text-vpos-text">{pStore.name}</h3>
                              <p className="m-0 text-[12px] text-vpos-muted">
                                {pStore.city}, {pStore.countryCode} &bull; Code: {pStore.code}
                              </p>
                            </div>
                          </div>
                          <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-extrabold text-amber-700">
                            Pending Review
                          </span>
                        </div>

                        <div className="mb-4 space-y-1 rounded-lg bg-vpos-subtle p-3 text-[13px]">
                          <div className="flex justify-between">
                            <span className="text-vpos-muted">Category:</span>
                            <strong className="text-vpos-text">{pCat}</strong>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-vpos-muted">Business ID:</span>
                            <span className="font-mono text-vpos-text">#{pStore.businessId}</span>
                          </div>
                          {pStore.phone ? (
                            <div className="flex justify-between">
                              <span className="text-vpos-muted">Phone:</span>
                              <span className="text-vpos-text">{pStore.phone}</span>
                            </div>
                          ) : null}
                          {pStore.email ? (
                            <div className="flex justify-between">
                              <span className="text-vpos-muted">Email:</span>
                              <span className="text-vpos-text">{pStore.email}</span>
                            </div>
                          ) : null}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 border-t border-vpos-line pt-3">
                        <Button
                          variant="primary"
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                          disabled={approveMarketplace.isPending || rejectMarketplace.isPending}
                          onClick={() => handleApproveStore(pStore)}
                        >
                          <Icon name="check-line" /> Approve for Marketplace
                        </Button>
                        <Button
                          variant="secondary"
                          className="border-rose-300 text-rose-600 hover:bg-rose-50"
                          disabled={approveMarketplace.isPending || rejectMarketplace.isPending}
                          onClick={() => { setRejectTarget(pStore); setRejectionReason('') }}
                        >
                          <Icon name="close-line" /> Reject
                        </Button>
                      </div>
                    </article>
                  )
                })}
              </div>
            )}
          </section>
        ) : (
          <>
            <section className={filterBar}>
              <label className={searchField}>
                <Icon name="search-line" className="shrink-0 text-vpos-muted" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search store, city, or phone…"
                  className="h-full w-full min-w-0 border-none bg-transparent p-0 text-[13px] text-vpos-text outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 placeholder:text-vpos-muted"
                />
              </label>
              <Select
                variant="toolbar"
                placeholder="All status"
                value={statusFilter === 'All status' ? '' : statusFilter}
                onChange={(v) => setStatusFilter(v || 'All status')}
                options={[
                  { value: 'Active', label: 'Active' },
                  { value: 'Inactive', label: 'Inactive' },
                  { value: 'Maintenance', label: 'Maintenance' },
                ]}
              />
              <div className="ml-auto flex gap-1 rounded-xl border border-vpos-line bg-vpos-subtle p-1">
                <button
                  type="button"
                  aria-label="Grid view"
                  onClick={() => setView('grid')}
                  className={cn(
                    'grid h-9 w-9 place-items-center rounded-lg border-0 text-[17px]',
                    view === 'grid'
                      ? 'bg-white text-vpos-primary shadow-sm'
                      : 'bg-transparent text-vpos-muted',
                  )}
                >
                  <Icon name="grid-line" />
                </button>
                <button
                  type="button"
                  aria-label="List view"
                  onClick={() => setView('list')}
                  className={cn(
                    'grid h-9 w-9 place-items-center rounded-lg border-0 text-[17px]',
                    view === 'list'
                      ? 'bg-white text-vpos-primary shadow-sm'
                      : 'bg-transparent text-vpos-muted',
                  )}
                >
                  <Icon name="list-check-2" />
                </button>
              </div>
            </section>

            {filtered.length === 0 ? (
              <div className={cn(card, 'p-10 text-center')}>
                <Icon
                  name="store-2-line"
                  className="mb-2 text-[29px] text-vpos-muted"
                />
                <p className="m-0 text-[15px] font-semibold text-vpos-muted">
                  No stores match your filters.
                </p>
                {stores.length === 0 ? (
                  <Button
                    variant="primary"
                    className="mt-4"
                    onClick={openCreate}
                  >
                    <Icon name="add-line" /> Create your first store
                  </Button>
                ) : null}
              </div>
            ) : view === 'grid' ? (
              <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {filtered.map((store) => (
                  <StoreCard
                    key={store.id}
                    store={store}
                    active={String(store.id) === storeId}
                    onSelect={() => setStoreId(String(store.id))}
                    onEdit={() => openEdit(store)}
                    onDelete={() => setDeleteTarget(store)}
                    onApplyMarketplace={() => {
                      setApplyTarget(store)
                      setApplyStoreType(store.storeType || 'GENERAL_RETAIL')
                    }}
                  />
                ))}
              </section>
            ) : (
              <section className={cn(card, 'overflow-hidden p-0')}>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-vpos-subtle text-left text-[12px] font-extrabold text-vpos-muted">
                        <th className="px-4 py-3">Store</th>
                        <th className="px-4 py-3">Code</th>
                        <th className="px-4 py-3">Category</th>
                        <th className="px-4 py-3">Address</th>
                        <th className="px-4 py-3">Opening hours</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Marketplace</th>
                        <th className="px-4 py-3" />
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((store) => {
                        const st = storeStatus(store)
                        const mp = marketplaceStatusBadge(store.marketplaceStatus)
                        const img = storeImage(store)
                        const storeCategory = STORE_TYPE_LABEL_MAP[store.storeType || 'GENERAL_RETAIL'] || store.storeType || 'General Retail'
                        return (
                          <tr
                            key={store.id}
                            className="border-t border-[#eeeef1] text-[13px]"
                          >
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <StoreTableImage source={img} />
                                <strong className="block text-vpos-text">{store.name}</strong>
                              </div>
                            </td>
                            <td className="px-4 py-3 font-mono text-[12px] text-vpos-muted">{store.code}</td>
                            <td className="px-4 py-3 text-[12px] font-medium text-vpos-text">{storeCategory}</td>
                            <td className="px-4 py-3 text-vpos-muted">
                              {store.addressLine1}, {store.city}
                            </td>
                            <td className="max-w-[260px] px-4 py-3 text-[11px] leading-5 text-vpos-muted">{storeHoursSummary(store.openingHours)}</td>
                            <td className="px-4 py-3">
                              <span
                                className={cn(
                                  'inline-flex rounded-full px-2.5 py-1 text-[11px] font-extrabold',
                                  st.className,
                                )}
                              >
                                {st.label}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <span
                                  className={cn(
                                    'inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-extrabold',
                                    mp.className,
                                  )}
                                >
                                  {mp.label}
                                </span>
                                {store.marketplaceStatus === 'NOT_LISTED' || !store.marketplaceStatus || store.marketplaceStatus === 'REJECTED' || store.marketplaceStatus === 'NEEDS_CHANGES' ? (
                                  <Button
                                    variant="text"
                                    className="text-[11px] text-vpos-primary font-bold"
                                    onClick={() => {
                                      setApplyTarget(store)
                                      setApplyStoreType(store.storeType || 'GENERAL_RETAIL')
                                    }}
                                  >
                                    Apply
                                  </Button>
                                ) : null}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <Button
                                  variant="text"
                                  onClick={() => setStoreId(String(store.id))}
                                >
                                  {String(store.id) === storeId ? 'Active' : 'Select'}
                                </Button>
                                <Button variant="text" onClick={() => openEdit(store)}><Icon name="edit-line" /> Edit</Button>
                                <Button variant="text" className="text-vpos-red hover:text-vpos-red" onClick={() => setDeleteTarget(store)}><Icon name="delete-bin-line" /> Delete</Button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </>
        )}

        <StoreFormModal open={formOpen} store={editingStore} onClose={() => { setFormOpen(false); setEditingStore(null) }} />
        <Modal
          open={Boolean(deleteTarget)}
          onClose={() => !deleteStore.isPending && setDeleteTarget(null)}
          title="Delete store?"
          description="This will soft-delete the store. Its historical data remains available, but the store can no longer be selected."
          size="sm"
          footer={<><Button variant="secondary" disabled={deleteStore.isPending} onClick={() => setDeleteTarget(null)}>Cancel</Button><Button variant="primary" className="bg-vpos-red hover:bg-vpos-red" disabled={deleteStore.isPending} onClick={confirmSoftDelete}>{deleteStore.isPending ? 'Deleting…' : 'Delete store'}</Button></>}
        >
          <p className="m-0 text-[14px] text-vpos-muted">{deleteTarget ? <>You are deleting <strong className="text-vpos-text">{deleteTarget.name}</strong>.</> : null}</p>
        </Modal>

        <Modal
          open={Boolean(applyTarget)}
          onClose={() => !applyMarketplace.isPending && setApplyTarget(null)}
          title="Apply for Marketplace Listing"
          description="Submit your store to be featured on the public marketplace. Platform administrators will review your application before publishing."
          size="md"
          footer={
            <>
              <Button variant="secondary" disabled={applyMarketplace.isPending} onClick={() => setApplyTarget(null)}>
                Cancel
              </Button>
              <Button variant="primary" disabled={applyMarketplace.isPending} onClick={handleApplyMarketplace}>
                {applyMarketplace.isPending ? 'Submitting…' : 'Submit Application'}
              </Button>
            </>
          }
        >
          {applyTarget ? (
            <div className="space-y-4">
              <div className="rounded-lg bg-vpos-subtle p-3 text-[13px]">
                <p className="m-0 font-bold text-vpos-text">{applyTarget.name}</p>
                <p className="mt-1 mb-0 text-vpos-muted">{storeAddress(applyTarget)}</p>
              </div>
              <SelectField
                label="Marketplace Curated Category"
                value={applyStoreType}
                onChange={(e) => setApplyStoreType(e.target.value)}
                options={STORE_TYPE_OPTIONS}
              />
              <p className="text-[12px] text-vpos-muted">
                Your store and products will be featured in this public category on the marketplace homepage.
              </p>
            </div>
          ) : null}
        </Modal>

        <Modal
          open={Boolean(rejectTarget)}
          onClose={() => !rejectMarketplace.isPending && setRejectTarget(null)}
          title="Reject Marketplace Application"
          description="Provide feedback to the store owner detailing why the application was rejected so they can correct it."
          size="md"
          footer={
            <>
              <Button variant="secondary" disabled={rejectMarketplace.isPending} onClick={() => setRejectTarget(null)}>
                Cancel
              </Button>
              <Button variant="primary" className="bg-vpos-red hover:bg-vpos-red" disabled={rejectMarketplace.isPending} onClick={handleRejectStore}>
                {rejectMarketplace.isPending ? 'Rejecting…' : 'Confirm Rejection'}
              </Button>
            </>
          }
        >
          {rejectTarget ? (
            <div className="space-y-4">
              <p className="text-[14px] text-vpos-muted">
                Rejecting application for <strong className="text-vpos-text">{rejectTarget.name}</strong>.
              </p>
              <TextAreaField
                label="Rejection Reason"
                rows={3}
                placeholder="e.g. Please upload clear photos and specify complete street address."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
              />
            </div>
          ) : null}
        </Modal>
      </main>
    </>
  )
}

function StoreCard({
  store,
  active,
  onSelect,
  onEdit,
  onDelete,
  onApplyMarketplace,
}: {
  store: BffStore
  active: boolean
  onSelect: () => void
  onEdit: () => void
  onDelete: () => void
  onApplyMarketplace: () => void
}) {
  const st = storeStatus(store)
  const mp = marketplaceStatusBadge(store.marketplaceStatus)
  const img = storeImage(store)
  const storeCategory = STORE_TYPE_LABEL_MAP[store.storeType || 'GENERAL_RETAIL'] || store.storeType || 'General Retail'

  return (
    <article
      className={cn(
        card,
        'overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lg',
        active && 'ring-2 ring-vpos-primary/40',
      )}
    >
      <div className="p-4">
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-3">
            <StoreCardLogo src={img} name={store.name} />
            <div className="min-w-0">
              <h3 className="m-0 truncate text-[17px] font-extrabold text-vpos-text">{store.name}</h3>
              <p className="mt-1 mb-0 flex items-start gap-1 text-[13px] text-vpos-muted"><Icon name="map-pin-line" className="mt-0.5 shrink-0" /><span>{storeAddress(store)}</span></p>
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <span className={cn('rounded-full px-2.5 py-1 text-[11px] font-extrabold', st.className)}>{st.label}</span>
            <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-extrabold', mp.className)}>{mp.label}</span>
            {active ? <span className="rounded-full bg-vpos-sand px-2 py-0.5 text-[10px] font-extrabold text-vpos-primary">Current</span> : null}
          </div>
        </div>

        <div className="mb-3 flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-vpos-muted">
          <span className="inline-flex items-center gap-1 font-semibold text-vpos-text">
            <Icon name="price-tag-3-line" /> {storeCategory}
          </span>
          {store.phone ? (
            <span className="inline-flex items-center gap-1">
              <Icon name="phone-line" /> {store.phone}
            </span>
          ) : null}
          <span className="inline-flex items-center gap-1">
            <Icon name="barcode-line" /> {store.code}
          </span>
        </div>

        <div className="mb-3 rounded-md bg-vpos-subtle px-3 py-2">
          <p className="m-0 mb-0.5 text-[10px] font-extrabold uppercase tracking-[.08em] text-vpos-muted">Opening hours · Cambodia time</p>
          <p className="m-0 text-[11px] leading-5 text-vpos-text">{storeHoursSummary(store.openingHours)}</p>
        </div>

        {store.marketplaceStatus === 'REJECTED' || store.marketplaceStatus === 'NEEDS_CHANGES' ? (
          <div className={`mb-3 rounded-lg border p-2.5 text-[12px] ${store.marketplaceStatus === 'NEEDS_CHANGES' ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-rose-200 bg-rose-50 text-rose-700'}`}>
            <strong className="block font-bold">{store.marketplaceStatus === 'NEEDS_CHANGES' ? 'Updates requested by marketplace review:' : 'Marketplace feedback:'}</strong>
            <span>{store.rejectionReason || 'Store application requires updates before listing.'}</span>
            {store.marketplaceStatus === 'NEEDS_CHANGES' ? <span className="mt-1 block text-[11px]">Edit this store, then submit the updated listing for review.</span> : null}
          </div>
        ) : null}

        {store.marketplaceStatus === 'PENDING_REVIEW' ? (
          <div className="mb-3 flex items-center justify-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 py-1.5 text-[12px] font-bold text-amber-700">
            <Icon name="time-line" /> Application Under Review
          </div>
        ) : null}

        {store.marketplaceStatus === 'APPROVED' ? (
          <div className="mb-3 flex items-center justify-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 py-1.5 text-[12px] font-bold text-emerald-700">
            <Icon name="checkbox-circle-line" /> Active on Marketplace
          </div>
        ) : null}

        {store.marketplaceStatus === 'NOT_LISTED' || !store.marketplaceStatus || store.marketplaceStatus === 'REJECTED' || store.marketplaceStatus === 'NEEDS_CHANGES' ? (
          <Button
            variant="secondary"
            className="mb-3 w-full border-emerald-300 text-[12px] text-emerald-700 hover:bg-emerald-50"
            onClick={onApplyMarketplace}
          >
            <Icon name="global-line" /> {store.marketplaceStatus === 'NEEDS_CHANGES' ? 'Resubmit for Review' : store.marketplaceStatus === 'REJECTED' ? 'Re-apply for Marketplace' : 'List on Marketplace'}
          </Button>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button
            variant={active ? 'soft' : 'primary'}
            className="flex-1"
            onClick={onSelect}
          >
            <Icon name={active ? 'check-line' : 'store-2-line'} />
            {active ? 'Selected' : 'Select store'}
          </Button>
          <Button variant="secondary" className="px-3" onClick={onEdit} aria-label={`Edit ${store.name}`}><Icon name="edit-line" /></Button>
          <Button variant="secondary" className="border-vpos-red/30 px-3 text-vpos-red hover:border-vpos-red hover:text-vpos-red" onClick={onDelete} aria-label={`Delete ${store.name}`}><Icon name="delete-bin-line" /></Button>
        </div>
      </div>
    </article>
  )
}
