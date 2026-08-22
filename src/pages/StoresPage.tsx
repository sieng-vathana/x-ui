import { useEffect, useMemo, useState } from 'react'
import {
  Breadcrumb,
  Button,
  Icon,
  Modal,
  Skeleton,
  Select,
  StoreFormModal,
  StoreSwitcher,
  Topbar,
} from '../components'
import { useSoftDeleteStore, useStoresRaw } from '../features/stores/useStores'
import type { BffStore } from '../features/stores/types'
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
import { resolveImageUrl } from '../features/files/fileApi'

const STATUS_MAP: Record<number, { label: string; className: string }> = {
  1: { label: 'Active', className: 'bg-vpos-green-bg text-vpos-green' },
  0: { label: 'Inactive', className: 'bg-vpos-subtle text-vpos-muted' },
  2: { label: 'Maintenance', className: 'bg-vpos-orange-bg text-vpos-orange' },
}

function storeImage(store: BffStore): string | undefined {
  const image = store.images?.find((img) => img.isPrimary) ?? store.images?.[0]
  return image?.imageUrl
}

function StoreTableImage({ source }: { source: string | undefined }) {
  const [imageUrl, setImageUrl] = useState<string | undefined>(() =>
    source?.startsWith('/api/v1/files/') ? undefined : source,
  )

  useEffect(() => {
    let active = true
    setImageUrl(source?.startsWith('/api/v1/files/') ? undefined : source)
    void resolveImageUrl(source).then((resolvedUrl) => {
      if (active) setImageUrl(resolvedUrl)
    })
    return () => { active = false }
  }, [source])

  return imageUrl ? (
    <img src={imageUrl} alt="" className="h-10 w-10 rounded-full object-cover" />
  ) : (
    <span className="grid h-10 w-10 place-items-center rounded-full bg-vpos-sand text-[15px] text-vpos-primary">
      <Icon name="store-2-line" />
    </span>
  )
}

function storeAddress(store: BffStore): string {
  return [store.addressLine1, store.city, store.countryCode].filter(Boolean).join(', ')
}

function storeStatus(store: BffStore): { label: string; className: string } {
  return STATUS_MAP[store.status] ?? { label: 'Unknown', className: 'bg-vpos-subtle text-vpos-muted' }
}

function StoresPageSkeleton({ storeId, setStoreId }: { storeId: string; setStoreId: (id: string) => void }) {
  return <><Topbar title="Store management" subtitle="Loading stores…" actions={<StoreSwitcher value={storeId} onChange={setStoreId} />} /><main className={pageContent} aria-busy="true" aria-label="Loading stores"><section className="mb-6 flex min-h-12 items-center justify-between"><div><Skeleton className="h-4 w-28" /><Skeleton className="mt-3 h-8 w-52" /></div><Skeleton className="h-10 w-28" /></section><section className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">{[0, 1, 2, 3].map((item) => <Skeleton key={item} className="h-[84px]" />)}</section><section className={cn(card, 'overflow-hidden p-0')}><div className="grid grid-cols-4 gap-4 bg-vpos-subtle p-4">{[0, 1, 2, 3].map((item) => <Skeleton key={item} className="h-3" />)}</div>{[0, 1, 2, 3, 4].map((row) => <div key={row} className="grid grid-cols-4 gap-4 border-t border-vpos-line p-4">{[0, 1, 2, 3].map((cell) => <Skeleton key={cell} className="h-4" />)}</div>)}</section></main></>
}

export function StoresPage() {
  const { storeId, setStoreId } = useAdminStore()
  const { data: stores = [], isLoading } = useStoresRaw()
  const showLoadingSkeleton = useDelayedLoading(isLoading && stores.length === 0)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('All status')
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [formOpen, setFormOpen] = useState(false)
  const [editingStore, setEditingStore] = useState<BffStore | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<BffStore | null>(null)
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
                    <th className="px-4 py-3">Address</th>
                    <th className="px-4 py-3">Contact</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((store) => {
                    const st = storeStatus(store)
                    const img = storeImage(store)
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
                        <td className="px-4 py-3 text-vpos-muted">
                          {store.addressLine1}, {store.city}
                        </td>
                        <td className="px-4 py-3">
                          {store.phone ? <div className="text-vpos-text">{store.phone}</div> : null}
                          {store.email ? <div className="text-vpos-muted">{store.email}</div> : null}
                        </td>
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
}: {
  store: BffStore
  active: boolean
  onSelect: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const st = storeStatus(store)
  const img = storeImage(store)

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
            {img ? <img src={img} alt={`${store.name} logo`} className="h-12 w-12 shrink-0 rounded-full border border-vpos-line object-cover" loading="lazy" /> : <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-vpos-sand text-[20px] text-vpos-primary"><Icon name="store-2-line" /></span>}
            <div className="min-w-0">
              <h3 className="m-0 truncate text-[17px] font-extrabold text-vpos-text">{store.name}</h3>
              <p className="mt-1 mb-0 flex items-start gap-1 text-[13px] text-vpos-muted"><Icon name="map-pin-line" className="mt-0.5 shrink-0" /><span>{storeAddress(store)}</span></p>
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1"><span className={cn('rounded-full px-2.5 py-1 text-[11px] font-extrabold', st.className)}>{st.label}</span>{active ? <span className="rounded-full bg-vpos-sand px-2 py-1 text-[11px] font-extrabold text-vpos-primary">Current</span> : null}</div>
        </div>

        <div className="mb-4 flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-vpos-muted">
          {store.phone ? (
            <span className="inline-flex items-center gap-1">
              <Icon name="phone-line" /> {store.phone}
            </span>
          ) : null}
          {store.email ? (
            <span className="inline-flex items-center gap-1">
              <Icon name="mail-line" /> {store.email}
            </span>
          ) : null}
          <span className="inline-flex items-center gap-1">
            <Icon name="barcode-line" /> {store.code}
          </span>
        </div>

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
