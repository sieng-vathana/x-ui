import { useEffect, useMemo, useState } from 'react'
import { Button } from '../ui/Button'
import { Chip } from '../ui/Chip'
import { Icon } from '../ui/Icon'
import { Modal } from '../ui/Modal'
import { formatCurrency } from '../../lib/currency'
import { cn } from '../../lib/cn'

type ActivityMode = 'hold' | 'recent'

interface HeldOrder {
  id: string
  customer: string
  items: string
  itemCount: number
  total: number
  age: string
  note: string
}

interface RecentOrder {
  id: string
  customer: string
  items: string
  total: number
  method: 'Cash' | 'QR'
  status: 'Completed' | 'Pending'
  time: string
}

const HELD_ORDERS: HeldOrder[] = [
  {
    id: 'HOLD-1042',
    customer: 'Sokha Market',
    items: 'Iced latte, croissant, sparkling water',
    itemCount: 4,
    total: 18.5,
    age: '18 min ago',
    note: 'Customer stepped away to take a call',
  },
  {
    id: 'HOLD-1041',
    customer: 'Walk-in customer',
    items: 'Chicken sandwich, Americano',
    itemCount: 2,
    total: 9.75,
    age: '31 min ago',
    note: 'Waiting for a second order',
  },
  {
    id: 'HOLD-1038',
    customer: 'Dara V.',
    items: 'Cold brew, blueberry muffin',
    itemCount: 2,
    total: 8.25,
    age: '52 min ago',
    note: 'Pickup details to confirm',
  },
]

const RECENT_ORDERS: RecentOrder[] = [
  { id: 'POS-10081', customer: 'Walk-in customer', items: '3 items', total: 14.25, method: 'Cash', status: 'Completed', time: 'Today, 10:42 AM' },
  { id: 'POS-10080', customer: 'Sokha Market', items: '6 items', total: 31.8, method: 'QR', status: 'Completed', time: 'Today, 10:35 AM' },
  { id: 'POS-10079', customer: 'Dara V.', items: '2 items', total: 8.25, method: 'Cash', status: 'Completed', time: 'Today, 10:19 AM' },
  { id: 'POS-10078', customer: 'Walk-in customer', items: '1 item', total: 3.5, method: 'QR', status: 'Pending', time: 'Today, 9:58 AM' },
  { id: 'POS-10077', customer: 'Maly R.', items: '5 items', total: 22.4, method: 'Cash', status: 'Completed', time: 'Today, 9:41 AM' },
]

export interface PosActivityModalProps {
  mode: ActivityMode | null
  onClose: () => void
  onAction?: (action: 'resume' | 'discard' | 'receipt' | 'reorder', id: string) => void
}

export function PosActivityModal({ mode, onClose, onAction }: PosActivityModalProps) {
  const [query, setQuery] = useState('')
  const [recentFilter, setRecentFilter] = useState<'All' | 'Cash' | 'QR'>('All')

  useEffect(() => {
    if (!mode) return
    setQuery('')
    setRecentFilter('All')
  }, [mode])

  const filteredHeldOrders = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return HELD_ORDERS
    return HELD_ORDERS.filter((order) =>
      [order.id, order.customer, order.items, order.note].some((value) => value.toLowerCase().includes(normalized)),
    )
  }, [query])

  const filteredRecentOrders = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return RECENT_ORDERS.filter((order) => {
      const matchesFilter = recentFilter === 'All' || order.method === recentFilter
      const matchesQuery = !normalized || [order.id, order.customer, order.items, order.method, order.status]
        .some((value) => value.toLowerCase().includes(normalized))
      return matchesFilter && matchesQuery
    })
  }, [query, recentFilter])

  const isHold = mode === 'hold'

  return (
    <Modal
      open={Boolean(mode)}
      onClose={onClose}
      contained
      size="xl"
      title={
        <div className="flex items-center gap-3">
          <span className={cn(
            'grid h-10 w-10 place-items-center rounded-[12px] text-[20px]',
            isHold ? 'bg-vpos-orange-bg text-vpos-orange' : 'bg-vpos-sand text-vpos-primary',
          )}>
            <Icon name={isHold ? 'pause-circle-line' : 'history-line'} />
          </span>
          <span>
            <span className="block text-[16px] font-extrabold text-vpos-text">
              {isHold ? 'Held orders' : 'Recent orders'}
            </span>
            <span className="mt-0.5 block text-[12px] font-normal text-vpos-muted">
              {isHold ? 'Pick up a paused checkout when the customer is ready.' : 'Review the latest activity at this counter.'}
            </span>
          </span>
          <span className="ml-auto hidden rounded-full border border-dashed border-vpos-line bg-vpos-subtle px-2.5 py-1 text-[10px] font-extrabold tracking-wide text-vpos-muted uppercase sm:inline-flex">
            Demo records
          </span>
        </div>
      }
      footer={
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      }
    >
      {isHold ? (
        <HeldOrdersView
          orders={filteredHeldOrders}
          query={query}
          onQueryChange={setQuery}
          onAction={onAction}
        />
      ) : (
        <RecentOrdersView
          orders={filteredRecentOrders}
          filter={recentFilter}
          query={query}
          onFilterChange={setRecentFilter}
          onQueryChange={setQuery}
          onAction={onAction}
        />
      )}
    </Modal>
  )
}

function HeldOrdersView({
  orders,
  query,
  onQueryChange,
  onAction,
}: {
  orders: HeldOrder[]
  query: string
  onQueryChange: (value: string) => void
  onAction?: PosActivityModalProps['onAction']
}) {
  const total = HELD_ORDERS.reduce((sum, order) => sum + order.total, 0)

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <ActivityStat icon="pause-line" label="On hold" value={String(HELD_ORDERS.length)} detail="active checkouts" tone="orange" />
        <ActivityStat icon="wallet-3-line" label="Open value" value={formatCurrency(total)} detail="across held orders" tone="blue" />
        <ActivityStat icon="time-line" label="Oldest hold" value="52 min" detail="needs attention" tone="red" />
      </div>

      <ActivityToolbar query={query} onQueryChange={onQueryChange} placeholder="Search held orders..." />

      <div className="overflow-hidden rounded-[14px] border border-vpos-line bg-white">
        <div className="hidden grid-cols-[1fr_110px_140px_110px] gap-4 border-b border-vpos-line bg-vpos-subtle px-4 py-3 text-[11px] font-extrabold tracking-wide text-vpos-muted uppercase md:grid">
          <span>Checkout</span><span>Items</span><span>Held</span><span className="text-right">Total</span>
        </div>
        {orders.length === 0 ? <ActivityEmpty label="No held orders match your search." /> : orders.map((order, index) => (
          <div
            key={order.id}
            className={cn(
              'group grid gap-4 px-4 py-4 transition-colors hover:bg-vpos-subtle/60 md:grid-cols-[1fr_110px_140px_110px] md:items-center',
              index < orders.length - 1 && 'border-b border-vpos-line/70',
            )}
          >
            <div className="flex min-w-0 items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] bg-vpos-orange-bg text-vpos-orange">
                <Icon name="pause-line" />
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <strong className="text-[14px] text-vpos-text">{order.id}</strong>
                  <span className="rounded-full bg-vpos-orange-bg px-2 py-0.5 text-[10px] font-extrabold text-vpos-orange">Held</span>
                </div>
                <p className="mt-1 truncate text-[13px] text-vpos-muted">{order.customer} · {order.items}</p>
                <p className="mt-1 text-[11px] text-vpos-muted"><Icon name="information-line" className="mr-1 align-[-1px]" />{order.note}</p>
              </div>
            </div>
            <span className="text-[13px] text-vpos-muted"><span className="md:hidden">Items · </span>{order.itemCount}</span>
            <span className="text-[13px] text-vpos-muted"><Icon name="time-line" className="mr-1 align-[-1px]" />{order.age}</span>
            <div className="flex items-center justify-between gap-2 md:justify-end">
              <strong className="text-[14px] text-vpos-primary">{formatCurrency(order.total)}</strong>
              <div className="flex items-center gap-1">
                <button type="button" aria-label={`Resume ${order.id}`} onClick={() => onAction?.('resume', order.id)} className="grid h-8 w-8 place-items-center rounded-lg border-0 bg-vpos-primary text-white transition hover:bg-vpos-primary-2">
                  <Icon name="play-line" />
                </button>
                <button type="button" aria-label={`Discard ${order.id}`} onClick={() => onAction?.('discard', order.id)} className="grid h-8 w-8 place-items-center rounded-lg border-0 bg-vpos-subtle text-vpos-muted transition hover:bg-vpos-red/10 hover:text-vpos-red">
                  <Icon name="delete-bin-line" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function RecentOrdersView({
  orders,
  filter,
  query,
  onFilterChange,
  onQueryChange,
  onAction,
}: {
  orders: RecentOrder[]
  filter: 'All' | 'Cash' | 'QR'
  query: string
  onFilterChange: (value: 'All' | 'Cash' | 'QR') => void
  onQueryChange: (value: string) => void
  onAction?: PosActivityModalProps['onAction']
}) {
  const todayTotal = RECENT_ORDERS.reduce((sum, order) => sum + order.total, 0)

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <ActivityStat icon="receipt-line" label="Today" value={String(RECENT_ORDERS.length)} detail="recent orders" tone="blue" />
        <ActivityStat icon="line-chart-line" label="Sales value" value={formatCurrency(todayTotal)} detail="demo total today" tone="green" />
        <ActivityStat icon="checkbox-circle-line" label="Completed" value={`${RECENT_ORDERS.filter((order) => order.status === 'Completed').length}/${RECENT_ORDERS.length}`} detail="orders settled" tone="purple" />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-1.5">
          {(['All', 'Cash', 'QR'] as const).map((option) => (
            <Chip key={option} selected={filter === option} onClick={() => onFilterChange(option)}>
              {option}
            </Chip>
          ))}
        </div>
        <ActivityToolbar query={query} onQueryChange={onQueryChange} placeholder="Search recent orders..." />
      </div>

      <div className="overflow-hidden rounded-[14px] border border-vpos-line bg-white">
        <div className="hidden grid-cols-[1fr_120px_125px_105px_86px] gap-4 border-b border-vpos-line bg-vpos-subtle px-4 py-3 text-[11px] font-extrabold tracking-wide text-vpos-muted uppercase md:grid">
          <span>Order</span><span>Payment</span><span>Status</span><span>Total</span><span />
        </div>
        {orders.length === 0 ? <ActivityEmpty label="No recent orders match your filters." /> : orders.map((order, index) => (
          <div
            key={order.id}
            className={cn(
              'grid gap-3 px-4 py-4 transition-colors hover:bg-vpos-subtle/60 md:grid-cols-[1fr_120px_125px_105px_86px] md:items-center',
              index < orders.length - 1 && 'border-b border-vpos-line/70',
            )}
          >
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] bg-vpos-sand text-vpos-primary">
                <Icon name="receipt-line" />
              </span>
              <div className="min-w-0">
                <strong className="block truncate text-[14px] text-vpos-text">{order.id}</strong>
                <span className="mt-1 block truncate text-[12px] text-vpos-muted">{order.customer} · {order.items} · {order.time}</span>
              </div>
            </div>
            <span className="text-[13px] text-vpos-muted"><Icon name={order.method === 'Cash' ? 'money-dollar-circle-line' : 'qr-code-line'} className="mr-1 align-[-1px]" />{order.method}</span>
            <span className={cn(
              'w-fit rounded-full px-2.5 py-1 text-[11px] font-extrabold',
              order.status === 'Completed' ? 'bg-vpos-green-bg text-vpos-green' : 'bg-vpos-orange-bg text-vpos-orange',
            )}>{order.status}</span>
            <strong className="text-[14px] text-vpos-primary">{formatCurrency(order.total)}</strong>
            <div className="flex gap-1 md:justify-end">
              <button type="button" aria-label={`View receipt ${order.id}`} onClick={() => onAction?.('receipt', order.id)} className="grid h-8 w-8 place-items-center rounded-lg border-0 bg-vpos-subtle text-vpos-muted transition hover:bg-vpos-sand hover:text-vpos-primary">
                <Icon name="file-list-3-line" />
              </button>
              <button type="button" aria-label={`Reorder ${order.id}`} onClick={() => onAction?.('reorder', order.id)} className="grid h-8 w-8 place-items-center rounded-lg border-0 bg-vpos-subtle text-vpos-muted transition hover:bg-vpos-sand hover:text-vpos-primary">
                <Icon name="refresh-line" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ActivityToolbar({
  query,
  onQueryChange,
  placeholder,
}: {
  query: string
  onQueryChange: (value: string) => void
  placeholder: string
}) {
  return (
    <label className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-[10px] border border-vpos-line bg-vpos-subtle px-3 sm:max-w-[280px]">
      <Icon name="search-line" className="shrink-0 text-vpos-muted" />
      <input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder={placeholder} className="w-full border-0 bg-transparent text-[13px] text-vpos-text outline-none placeholder:text-vpos-muted" />
      {query ? <button type="button" aria-label="Clear search" onClick={() => onQueryChange('')} className="border-0 bg-transparent text-vpos-muted hover:text-vpos-text"><Icon name="close-line" /></button> : null}
    </label>
  )
}

function ActivityStat({
  icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: string
  label: string
  value: string
  detail: string
  tone: 'orange' | 'blue' | 'red' | 'green' | 'purple'
}) {
  const iconTone = {
    orange: 'bg-vpos-orange-bg text-vpos-orange',
    blue: 'bg-vpos-sand text-vpos-primary',
    red: 'bg-vpos-red/10 text-vpos-red',
    green: 'bg-vpos-green-bg text-vpos-green',
    purple: 'bg-vpos-primary/10 text-vpos-primary',
  }[tone]
  return (
    <div className="flex items-center gap-3 rounded-[14px] border border-vpos-line bg-vpos-subtle/55 p-3.5">
      <span className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-[11px] text-[19px]', iconTone)}><Icon name={icon} /></span>
      <span className="min-w-0">
        <span className="block text-[11px] font-extrabold tracking-wide text-vpos-muted uppercase">{label}</span>
        <strong className="mt-0.5 block text-[19px] leading-tight text-vpos-text">{value}</strong>
        <span className="mt-0.5 block truncate text-[11px] text-vpos-muted">{detail}</span>
      </span>
    </div>
  )
}

function ActivityEmpty({ label }: { label: string }) {
  return (
    <div className="px-4 py-14 text-center">
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-vpos-subtle text-[21px] text-vpos-muted"><Icon name="inbox-line" /></span>
      <p className="mb-0 mt-3 text-[13px] text-vpos-muted">{label}</p>
    </div>
  )
}
