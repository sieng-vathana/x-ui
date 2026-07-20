import { useMemo, useState } from 'react'
import {
  Breadcrumb,
  Button,
  Icon,
  StoreSwitcher,
  Topbar,
} from '../components'
import { stores, type MockStore, type StoreStatus } from '../data/mockup'
import { useAdminStore } from '../hooks/useAdminStore'
import { cn } from '../lib/cn'
import {
  card,
  filterBar,
  pageContent,
  searchField,
  selectClass,
} from '../lib/ui'

function statusTone(status: StoreStatus): string {
  if (status === 'Open') return 'bg-vpos-green-bg text-vpos-green'
  if (status === 'Maintenance') return 'bg-vpos-orange-bg text-vpos-orange'
  return 'bg-[#ededf0] text-vpos-muted'
}

function typeIcon(type: MockStore['type']): string {
  switch (type) {
    case 'Flagship':
      return 'building-4-line'
    case 'Warehouse':
      return 'archive-2-line'
    case 'Kiosk':
      return 'store-3-line'
    default:
      return 'store-2-line'
  }
}

export function StoresPage() {
  const { storeId, setStoreId } = useAdminStore()
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('All status')
  const [typeFilter, setTypeFilter] = useState('All types')
  const [view, setView] = useState<'grid' | 'list'>('grid')

  const filtered = useMemo(() => {
    return stores.filter((s) => {
      if (statusFilter !== 'All status' && s.status !== statusFilter) return false
      if (typeFilter !== 'All types' && s.type !== typeFilter) return false
      if (!query.trim()) return true
      const q = query.toLowerCase()
      return (
        s.name.toLowerCase().includes(q) ||
        s.address.toLowerCase().includes(q) ||
        s.city.toLowerCase().includes(q) ||
        s.manager.toLowerCase().includes(q)
      )
    })
  }, [query, statusFilter, typeFilter])

  const openCount = stores.filter((s) => s.status === 'Open').length
  const totalStaff = stores.reduce((n, s) => n + s.staff, 0)

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
            <Button variant="secondary">
              <Icon name="download-2-line" /> Export
            </Button>
            <Button variant="primary">
              <Icon name="add-line" /> Add store
            </Button>
          </div>
        </section>

        {/* Summary metrics */}
        <section className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            {
              label: 'Total stores',
              value: String(stores.length),
              icon: 'store-2-line',
              tone: 'bg-vpos-sand text-vpos-primary',
            },
            {
              label: 'Open now',
              value: String(openCount),
              icon: 'checkbox-circle-line',
              tone: 'bg-vpos-green-bg text-vpos-green',
            },
            {
              label: 'Team members',
              value: String(totalStaff),
              icon: 'group-line',
              tone: 'bg-vpos-subtle text-vpos-primary-2',
            },
            {
              label: 'Cities',
              value: String(new Set(stores.map((s) => s.city)).size),
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
                  'grid h-11 w-11 place-items-center rounded-xl text-[18px]',
                  m.tone,
                )}
              >
                <Icon name={m.icon} />
              </span>
              <span>
                <small className="block text-[11px] font-semibold text-vpos-muted">
                  {m.label}
                </small>
                <strong className="block text-[20px] text-vpos-text">{m.value}</strong>
              </span>
            </article>
          ))}
        </section>

        <section className={filterBar}>
          <label className={searchField}>
            <Icon name="search-line" className="text-vpos-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search store, city, or manager…"
              className="w-full border-0 bg-transparent text-[13px] outline-none"
            />
          </label>
          <select
            className={selectClass}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option>All status</option>
            <option>Open</option>
            <option>Closed</option>
            <option>Maintenance</option>
          </select>
          <select
            className={selectClass}
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option>All types</option>
            <option>Flagship</option>
            <option>Retail</option>
            <option>Warehouse</option>
            <option>Kiosk</option>
          </select>
          <div className="ml-auto flex gap-1 rounded-xl border border-vpos-line bg-vpos-subtle p-1">
            <button
              type="button"
              aria-label="Grid view"
              onClick={() => setView('grid')}
              className={cn(
                'grid h-9 w-9 place-items-center rounded-lg border-0 text-[16px]',
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
                'grid h-9 w-9 place-items-center rounded-lg border-0 text-[16px]',
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
              className="mb-2 text-[28px] text-vpos-muted"
            />
            <p className="m-0 text-[14px] font-semibold text-vpos-muted">
              No stores match your filters.
            </p>
          </div>
        ) : view === 'grid' ? (
          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((store) => (
              <StoreCard
                key={store.id}
                store={store}
                active={store.id === storeId}
                onSelect={() => setStoreId(store.id)}
              />
            ))}
          </section>
        ) : (
          <section className={cn(card, 'overflow-hidden p-0')}>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-vpos-subtle text-left text-[11px] font-extrabold text-vpos-muted">
                    <th className="px-4 py-3">Store</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Manager</th>
                    <th className="px-4 py-3">Hours</th>
                    <th className="px-4 py-3">Staff</th>
                    <th className="px-4 py-3">Sales</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((store) => (
                    <tr
                      key={store.id}
                      className="border-t border-[#eeeef1] text-[12px]"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={store.image}
                            alt=""
                            className="h-11 w-14 rounded-lg object-cover"
                          />
                          <span>
                            <strong className="block text-vpos-text">
                              {store.name}
                            </strong>
                            <small className="text-vpos-muted">{store.city}</small>
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-vpos-text">{store.type}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <img
                            src={store.managerAvatar}
                            alt=""
                            className="h-7 w-7 rounded-full object-cover"
                          />
                          {store.manager}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-vpos-muted">{store.hours}</td>
                      <td className="px-4 py-3">{store.staff}</td>
                      <td className="px-4 py-3 font-bold text-vpos-text">
                        {store.monthlySales}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            'inline-flex rounded-full px-2.5 py-1 text-[10px] font-extrabold',
                            statusTone(store.status),
                          )}
                        >
                          {store.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Button
                          variant="text"
                          onClick={() => setStoreId(store.id)}
                        >
                          {store.id === storeId ? 'Active' : 'Select'}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>
    </>
  )
}

function StoreCard({
  store,
  active,
  onSelect,
}: {
  store: MockStore
  active: boolean
  onSelect: () => void
}) {
  return (
    <article
      className={cn(
        card,
        'overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lg',
        active && 'ring-2 ring-vpos-primary/40',
      )}
    >
      <div className="relative h-40 overflow-hidden bg-vpos-subtle">
        <img
          src={store.image}
          alt={store.name}
          className="h-full w-full object-cover"
          loading="lazy"
        />
        <span
          className={cn(
            'absolute top-3 left-3 rounded-full px-2.5 py-1 text-[10px] font-extrabold backdrop-blur-sm',
            statusTone(store.status),
          )}
        >
          {store.status}
        </span>
        <span className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-full bg-black/50 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur-sm">
          <Icon name={typeIcon(store.type)} />
          {store.type}
        </span>
      </div>

      <div className="p-4">
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="m-0 truncate text-[16px] font-extrabold text-vpos-text">
              {store.name}
            </h3>
            <p className="mt-1 mb-0 flex items-start gap-1 text-[12px] text-vpos-muted">
              <Icon name="map-pin-line" className="mt-0.5 shrink-0" />
              <span>
                {store.address}
                <br />
                {store.city}
              </span>
            </p>
          </div>
          {active ? (
            <span className="shrink-0 rounded-full bg-vpos-sand px-2 py-1 text-[10px] font-extrabold text-vpos-primary">
              Current
            </span>
          ) : null}
        </div>

        <div className="mb-3 flex items-center gap-2.5 rounded-xl bg-vpos-subtle px-3 py-2">
          <img
            src={store.managerAvatar}
            alt=""
            className="h-9 w-9 rounded-full object-cover ring-2 ring-white"
          />
          <span className="min-w-0">
            <small className="block text-[10px] font-semibold text-vpos-muted">
              Store manager
            </small>
            <strong className="block truncate text-[12px] text-vpos-text">
              {store.manager}
            </strong>
          </span>
        </div>

        <div className="mb-4 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg bg-vpos-subtle px-1 py-2">
            <strong className="block text-[13px] text-vpos-text">{store.staff}</strong>
            <small className="text-[10px] text-vpos-muted">Staff</small>
          </div>
          <div className="rounded-lg bg-vpos-subtle px-1 py-2">
            <strong className="block text-[13px] text-vpos-text">
              {store.registers}
            </strong>
            <small className="text-[10px] text-vpos-muted">Registers</small>
          </div>
          <div className="rounded-lg bg-vpos-subtle px-1 py-2">
            <strong className="block text-[12px] text-vpos-primary">
              {store.monthlySales}
            </strong>
            <small className="text-[10px] text-vpos-muted">/ mo</small>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-vpos-muted">
          <span className="inline-flex items-center gap-1">
            <Icon name="time-line" /> {store.hours}
          </span>
          <span className="inline-flex items-center gap-1">
            <Icon name="phone-line" /> {store.phone}
          </span>
        </div>

        <div className="flex gap-2">
          <Button
            variant={active ? 'soft' : 'primary'}
            className="flex-1"
            onClick={onSelect}
          >
            <Icon name={active ? 'check-line' : 'store-2-line'} />
            {active ? 'Selected' : 'Select store'}
          </Button>
          <Button variant="secondary" aria-label="Edit store">
            <Icon name="edit-line" />
          </Button>
        </div>
      </div>
    </article>
  )
}
