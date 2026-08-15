import { useEffect, useMemo, useState } from 'react'
import { Button } from '../ui/Button'
import { Chip } from '../ui/Chip'
import { Icon } from '../ui/Icon'
import { Modal } from '../ui/Modal'
import { useRecentOrders } from '../../features/orders/useOrders'
import type { PosOrder } from '../../features/orders/types'
import { formatCurrency } from '../../lib/currency'
import { cn } from '../../lib/cn'

type ActivityMode = 'hold' | 'recent'
type RecentOrderStatus = 'Completed' | 'Pending' | 'Cancelled'
type RecentOrderFilter = 'All' | 'Cash' | 'QR' | 'Card'

export interface HeldOrder {
  id: string
  orderId: number
  customer: string
  items: string
  itemCount: number
  total: number
  currencyCode: string
  age: string
  ageMinutes: number
  note: string
}

interface RecentOrder {
  id: string
  customer: string
  items: string
  total: number
  currencyCode: string
  channel: string
  method: string
  status: RecentOrderStatus
  time: string
}

export interface PosActivityModalProps {
  mode: ActivityMode | null
  onClose: () => void
  storeId?: string | number
  customerNames?: ReadonlyMap<number, string>
  heldOrders?: HeldOrder[]
  heldLoading?: boolean
  heldError?: string
  onHeldRetry?: () => void
  onAction?: (action: 'resume' | 'discard' | 'receipt' | 'reorder', id: string) => void
}

export function PosActivityModal({
  mode,
  onClose,
  storeId,
  customerNames,
  heldOrders = [],
  heldLoading = false,
  heldError,
  onHeldRetry,
  onAction,
}: PosActivityModalProps) {
  const [query, setQuery] = useState('')
  const [recentFilter, setRecentFilter] = useState<RecentOrderFilter>('All')
  const recentQuery = useRecentOrders(storeId, mode === 'recent')

  useEffect(() => {
    if (!mode) return
    setQuery('')
    setRecentFilter('All')
  }, [mode])

  const filteredHeldOrders = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return heldOrders
    return heldOrders.filter((order) =>
      [order.id, order.customer, order.items, order.note].some((value) => value.toLowerCase().includes(normalized)),
    )
  }, [heldOrders, query])

  const recentOrders = useMemo(
    () => (recentQuery.data?.content ?? []).map((order) => toRecentOrder(order, customerNames)),
    [customerNames, recentQuery.data?.content],
  )

  const filteredRecentOrders = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return recentOrders.filter((order) => {
      const matchesFilter = recentFilter === 'All' || order.method === recentFilter
      const matchesQuery = !normalized || [order.id, order.customer, order.items, order.channel, order.method, order.status]
        .some((value) => value.toLowerCase().includes(normalized))
      return matchesFilter && matchesQuery
    })
  }, [query, recentFilter, recentOrders])

  const isHold = mode === 'hold'

  return (
    <Modal
      open={Boolean(mode)}
      onClose={onClose}
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
              {isHold ? 'Pick up a paused checkout when the customer is ready.' : 'Review the latest orders for this store.'}
            </span>
          </span>
          <span className={cn(
            'ml-auto hidden rounded-full bg-vpos-green-bg px-2.5 py-1 text-[10px] font-extrabold tracking-wide text-vpos-green uppercase sm:inline-flex',
          )}>
            {isHold ? 'Server data' : 'Live data'}
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
          isLoading={heldLoading}
          error={heldError}
          onQueryChange={setQuery}
          onRetry={onHeldRetry}
          onAction={onAction}
        />
      ) : (
        <RecentOrdersView
          orders={filteredRecentOrders}
          allOrders={recentOrders}
          filter={recentFilter}
          query={query}
          isLoading={recentQuery.isLoading}
          error={recentQuery.isError && recentOrders.length === 0
            ? recentQuery.error instanceof Error ? recentQuery.error.message : 'Recent orders could not be loaded.'
            : undefined}
          onFilterChange={setRecentFilter}
          onQueryChange={setQuery}
          onRetry={() => { void recentQuery.refetch() }}
          onAction={onAction}
        />
      )}
    </Modal>
  )
}

function HeldOrdersView({
  orders,
  query,
  isLoading,
  error,
  onQueryChange,
  onRetry,
  onAction,
}: {
  orders: HeldOrder[]
  query: string
  isLoading: boolean
  error?: string
  onQueryChange: (value: string) => void
  onRetry?: () => void
  onAction?: PosActivityModalProps['onAction']
}) {
  const total = orders.reduce((sum, order) => sum + order.total, 0)
  const oldestMinutes = orders.reduce((oldest, order) => Math.max(oldest, order.ageMinutes), 0)
  const oldestLabel = orders.length > 0 ? formatAgeMinutes(oldestMinutes) : '—'

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <ActivityStat icon="pause-line" label="On hold" value={String(orders.length)} detail="active checkouts" tone="orange" />
        <ActivityStat icon="wallet-3-line" label="Open value" value={formatCurrency(total, orders[0]?.currencyCode)} detail="across held orders" tone="blue" />
        <ActivityStat icon="time-line" label="Oldest hold" value={oldestLabel} detail={orders.length > 0 ? 'needs attention' : 'no active holds'} tone="red" />
      </div>

      <ActivityToolbar query={query} onQueryChange={onQueryChange} placeholder="Search held orders..." />

      <div className="overflow-hidden rounded-[14px] border border-vpos-line bg-white">
        <div className="hidden grid-cols-[1fr_110px_140px_110px] gap-4 border-b border-vpos-line bg-vpos-subtle px-4 py-3 text-[11px] font-extrabold tracking-wide text-vpos-muted uppercase md:grid">
          <span>Checkout</span><span>Items</span><span>Held</span><span className="text-right">Total</span>
        </div>
        {isLoading ? <ActivityEmpty icon="loader-4-line" label="Loading held sales..." /> : error ? <ActivityError message={error} onRetry={() => onRetry?.()} /> : orders.length === 0 ? <ActivityEmpty label="No held orders match your search." /> : orders.map((order, index) => (
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
              <strong className="text-[14px] text-vpos-primary">{formatCurrency(order.total, order.currencyCode)}</strong>
              <div className="flex items-center gap-1">
                <button type="button" aria-label={`Resume ${order.id}`} onClick={() => onAction?.('resume', String(order.orderId))} className="grid h-8 w-8 place-items-center rounded-lg border-0 bg-vpos-primary text-white transition hover:bg-vpos-primary-2">
                  <Icon name="play-line" />
                </button>
                <button type="button" aria-label={`Discard ${order.id}`} onClick={() => onAction?.('discard', String(order.orderId))} className="grid h-8 w-8 place-items-center rounded-lg border-0 bg-vpos-subtle text-vpos-muted transition hover:bg-vpos-red/10 hover:text-vpos-red">
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
  allOrders,
  filter,
  query,
  isLoading,
  error,
  onFilterChange,
  onQueryChange,
  onRetry,
  onAction,
}: {
  orders: RecentOrder[]
  allOrders: RecentOrder[]
  filter: RecentOrderFilter
  query: string
  isLoading: boolean
  error?: string
  onFilterChange: (value: RecentOrderFilter) => void
  onQueryChange: (value: string) => void
  onRetry: () => void
  onAction?: PosActivityModalProps['onAction']
}) {
  const loadedTotal = allOrders.reduce((sum, order) => sum + order.total, 0)
  const completedCount = allOrders.filter((order) => order.status === 'Completed').length

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <ActivityStat icon="receipt-line" label="Loaded" value={String(allOrders.length)} detail="latest orders" tone="blue" />
        <ActivityStat icon="line-chart-line" label="Sales value" value={formatCurrency(loadedTotal, allOrders[0]?.currencyCode)} detail="loaded orders" tone="green" />
        <ActivityStat icon="checkbox-circle-line" label="Completed" value={`${completedCount}/${allOrders.length}`} detail="orders settled" tone="purple" />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-1.5">
          {(['All', 'Cash', 'QR', 'Card'] as const).map((option) => (
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
        {isLoading ? <ActivityEmpty icon="loader-4-line" label="Loading recent orders..." /> : error ? <ActivityError message={error} onRetry={onRetry} /> : orders.length === 0 ? <ActivityEmpty label="No recent orders match your filters." /> : orders.map((order, index) => (
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
            <span className="text-[13px] text-vpos-muted"><Icon name={paymentIcon(order.method)} className="mr-1 align-[-1px]" />{order.method}</span>
            <span className={cn(
              'w-fit rounded-full px-2.5 py-1 text-[11px] font-extrabold',
              order.status === 'Completed'
                ? 'bg-vpos-green-bg text-vpos-green'
                : order.status === 'Cancelled' ? 'bg-vpos-red/10 text-vpos-red' : 'bg-vpos-orange-bg text-vpos-orange',
            )}>{order.status}</span>
            <strong className="text-[14px] text-vpos-primary">{formatCurrency(order.total, order.currencyCode)}</strong>
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

function ActivityEmpty({ icon = 'inbox-line', label }: { icon?: string; label: string }) {
  return (
    <div className="px-4 py-14 text-center">
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-vpos-subtle text-[21px] text-vpos-muted"><Icon name={icon} /></span>
      <p className="mb-0 mt-3 text-[13px] text-vpos-muted">{label}</p>
    </div>
  )
}

function ActivityError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-12 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-full bg-vpos-red/10 text-[21px] text-vpos-red"><Icon name="error-warning-line" /></span>
      <p className="mb-0 text-[13px] text-vpos-muted">{message}</p>
      <Button variant="secondary" onClick={onRetry}>Try again</Button>
    </div>
  )
}

function formatAgeMinutes(minutes: number): string {
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hr`
  return `${Math.floor(hours / 24)} day`
}

function toRecentOrder(order: PosOrder, customerNames?: ReadonlyMap<number, string>): RecentOrder {
  const itemCount = (order.items ?? []).reduce((sum, item) => sum + Math.max(0, Number(item.quantity ?? item.qty ?? 0)), 0)
  const customerId = Number(order.customerId)
  const customer = customerId > 0
    ? customerNames?.get(customerId) ?? `Customer #${customerId}`
    : 'Walk-in customer'

  return {
    id: order.orderNo || `Order #${order.id}`,
    customer,
    items: `${itemCount} ${itemCount === 1 ? 'item' : 'items'}`,
    total: Number(order.grandTotal ?? 0),
    currencyCode: (order.currencyCode || 'USD').toUpperCase(),
    channel: formatOrderChannel(order.orderChannel),
    method: formatPaymentMethod(order.paymentMethod),
    status: formatOrderStatus(order),
    time: formatOrderTime(order.createdAt),
  }
}

function formatOrderStatus(order: PosOrder): RecentOrderStatus {
  const orderStatus = String(order.orderStatus ?? '').toUpperCase()
  const paymentStatus = String(order.paymentStatus ?? '').toUpperCase()

  if (orderStatus.includes('CANCEL') || orderStatus.includes('VOID') || paymentStatus.includes('CANCEL')) return 'Cancelled'
  if (
    orderStatus.includes('COMPLETE') ||
    paymentStatus === 'PAID' ||
    paymentStatus === 'SUCCESS' ||
    paymentStatus === 'COMPLETED' ||
    paymentStatus === 'SETTLED'
  ) return 'Completed'
  return 'Pending'
}

function formatOrderChannel(channel?: string): string {
  const normalized = String(channel ?? '').trim()
  if (!normalized) return 'POS'
  if (normalized.toUpperCase() === 'POS') return 'POS'
  return normalized
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function formatPaymentMethod(method?: string | null): string {
  const normalized = String(method ?? '').trim().toUpperCase()
  if (!normalized) return '—'
  if (normalized === 'CASH') return 'Cash'
  if (normalized === 'QR') return 'QR'
  if (normalized === 'CARD') return 'Card'
  return normalized
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function paymentIcon(method: string): string {
  if (method === 'Cash') return 'money-dollar-circle-line'
  if (method === 'QR') return 'qr-code-line'
  return 'wallet-3-line'
}

function formatOrderTime(createdAt?: string): string {
  if (!createdAt) return 'Time unavailable'
  const date = new Date(createdAt)
  if (Number.isNaN(date.getTime())) return 'Time unavailable'

  const time = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(date)
  const now = new Date()
  if (date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate()) {
    return `Today, ${time}`
  }
  const day = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date)
  return `${day}, ${time}`
}
