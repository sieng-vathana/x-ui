import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Breadcrumb, Button, Icon, MetricCard, Modal, Status, StoreSwitcher, Topbar } from '../components'
import { useToast } from '../context/ToastContext'
import { formatCurrency } from '../lib/currency'
import { pageContent, searchField, selectClass } from '../lib/ui'
import { paths } from '../lib/paths'
import { parseServerTime } from '../lib/serverTime'
import { useAdminStore } from '../hooks/useAdminStore'
import { useStoresRaw } from '../features/stores/useStores'
import { storeSupportsOnline, storeSupportsPos } from '../features/stores/salesChannel'
import { orderApi } from '../features/orders/orderApi'
import { paymentApi } from '../features/payments/paymentApi'
import { useAuth } from '../context/AuthContext'
import type { PosOrder } from '../features/orders/types'

/** How many of the latest orders the page loads; filters and counts apply to these. */
const PAGE_SIZE = 100

type Action = 'confirm' | 'pack' | 'ship' | 'deliver' | 'complete' | 'cancel'

const statusLabels: Record<string, string> = {
  DRAFT: 'Draft', PENDING_CONFIRMATION: 'Awaiting acceptance', PENDING_PAYMENT: 'Awaiting payment', CONFIRMED: 'Confirmed',
  PACKING: 'Preparing', SHIPPED: 'On the way', DELIVERED: 'Delivered', COMPLETED: 'Completed', CANCELLED: 'Cancelled',
}

const paymentLabels: Record<string, string> = {
  UNPAID: 'Unpaid', PAID: 'Paid', COD_PENDING: 'Cash due', COD_COLLECTED: 'Cash collected', REMITTED: 'Remitted', REFUNDED: 'Refunded',
}

const ACTIVE_STATUSES = ['CONFIRMED', 'PACKING', 'SHIPPED', 'DELIVERED']

const isPickup = (order: PosOrder) => !order.fulfillmentType || order.fulfillmentType === 'CUSTOMER_PICKUP'
const isOnline = (order: PosOrder) => String(order.orderChannel ?? '').toUpperCase() === 'ONLINE'
const needsAttention = (order: PosOrder) => order.orderStatus === 'PENDING_CONFIRMATION'
  || (isOnline(order) && order.paymentStatus === 'UNPAID' && !['CANCELLED', 'COMPLETED'].includes(order.orderStatus))

function humanize(value?: string | null) {
  if (!value) return ''
  return value.toLowerCase().replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase())
}

function customerName(order: PosOrder) {
  return order.contactName || order.deliveryAddress?.receiverName || (order.customerId ? `Customer #${order.customerId}` : 'Walk-in customer')
}

function customerPhone(order: PosOrder) {
  return order.contactPhone || order.deliveryAddress?.phone || ''
}

function area(order: PosOrder) {
  const address = order.deliveryAddress
  if (!address) return isPickup(order) ? 'Pickup at the store' : ''
  return [address.district, address.provinceCity].filter(Boolean).join(', ')
}

function fulfillmentLabel(order: PosOrder) {
  if (isPickup(order)) return 'Pickup'
  return order.fulfillmentType === 'OWN_RIDER' ? 'Delivery · store rider' : 'Delivery · partner'
}

function paymentMethodLabel(order: PosOrder) {
  const method = String(order.paymentMethod ?? '').toUpperCase()
  if (method.includes('QR') || method.includes('BAKONG')) return 'KHQR'
  if (method.includes('COD') || order.paymentStatus === 'COD_PENDING' || order.paymentStatus === 'COD_COLLECTED') {
    return isPickup(order) ? 'Cash at pickup' : 'Cash on delivery'
  }
  if (method.includes('CASH')) return 'Cash'
  return method ? humanize(method) : isOnline(order) ? 'KHQR' : 'Cash'
}

function formatPlacedAt(value?: string) {
  if (!value) return ''
  return new Intl.DateTimeFormat('en-KH', {
    timeZone: 'Asia/Phnom_Penh', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true,
  }).format(parseServerTime(value))
}

function isToday(value?: string) {
  if (!value) return false
  const day = (date: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Phnom_Penh' }).format(date)
  return day(parseServerTime(value)) === day(new Date())
}

/** The next step for an online order; pickup orders are completed once prepared, deliveries go out first. */
function nextAction(order: PosOrder): { action: Action; label: string } | null {
  if (!isOnline(order)) return null
  switch (order.orderStatus) {
    case 'PENDING_CONFIRMATION': return { action: 'confirm', label: 'Accept order' }
    case 'CONFIRMED': return { action: 'pack', label: 'Start preparing' }
    case 'PACKING': return isPickup(order) ? { action: 'complete', label: 'Mark collected' } : { action: 'ship', label: 'Mark as shipped' }
    case 'SHIPPED': return { action: 'deliver', label: 'Mark delivered' }
    case 'DELIVERED': return { action: 'complete', label: 'Complete' }
    default: return null
  }
}

function steps(order: PosOrder) {
  return isPickup(order)
    ? [['PENDING_CONFIRMATION', 'Placed'], ['CONFIRMED', 'Confirmed'], ['PACKING', 'Preparing'], ['COMPLETED', 'Collected']]
    : [['PENDING_CONFIRMATION', 'Placed'], ['CONFIRMED', 'Confirmed'], ['PACKING', 'Preparing'], ['SHIPPED', 'On the way'], ['DELIVERED', 'Delivered'], ['COMPLETED', 'Completed']]
}

function orderStatusClass(status: string) {
  if (status === 'PENDING_CONFIRMATION' || status === 'PACKING' || status === 'PENDING_PAYMENT') return 'bg-vpos-orange-bg text-vpos-orange'
  if (status === 'DELIVERED' || status === 'COMPLETED') return 'bg-vpos-green-bg text-vpos-green'
  if (status === 'CANCELLED') return 'bg-vpos-red-bg text-vpos-red'
  return 'bg-vpos-primary-soft text-vpos-primary'
}

function paymentStatusClass(status: string) {
  return status === 'UNPAID' || status === 'COD_PENDING' ? 'bg-vpos-orange-bg text-vpos-orange' : undefined
}

const ACTION_MESSAGES: Record<Action, string> = {
  confirm: 'accepted', pack: 'is being prepared', ship: 'marked as shipped', deliver: 'marked delivered', complete: 'completed', cancel: 'rejected',
}

/** Paid totals per currency, e.g. "៛ 6,500 + $2.00", since a store can sell in riel and dollars. */
function formatTotals(orders: PosOrder[]) {
  const sums = new Map<string, number>()
  orders.forEach((order) => {
    const code = (order.currencyCode || 'USD').toUpperCase()
    sums.set(code, (sums.get(code) ?? 0) + Number(order.grandTotal || 0))
  })
  if (sums.size === 0) return formatCurrency(0, 'USD')
  return [...sums.entries()].map(([code, sum]) => formatCurrency(sum, code)).join(' + ')
}

export function OrderManagementPage() {
  const { toast } = useToast()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { storeId, setStoreId } = useAdminStore()
  const storesQuery = useStoresRaw()
  const selectedStore = storesQuery.data?.find((store) => String(store.id) === String(storeId))
  const hasOnline = storeSupportsOnline(selectedStore?.salesChannel)
  const hasPos = storeSupportsPos(selectedStore?.salesChannel)
  const numericStoreId = Number(storeId)
  const validStore = Number.isInteger(numericStoreId) && numericStoreId > 0

  const ordersQuery = useQuery({
    queryKey: ['orders', 'management', numericStoreId],
    queryFn: () => orderApi.list({ storeId: numericStoreId, page: 0, size: PAGE_SIZE }),
    enabled: validStore && hasOnline,
    // New marketplace orders show up without a reload.
    refetchInterval: 30 * 1000,
    staleTime: 10 * 1000,
  })
  const orders = useMemo(() => ordersQuery.data?.content ?? [], [ordersQuery.data])

  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('All orders')
  const [channelFilter, setChannelFilter] = useState('All channels')
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null)
  const [rejectingOrderId, setRejectingOrderId] = useState<number | null>(null)
  const [collectingOrderId, setCollectingOrderId] = useState<number | null>(null)

  const updateOrder = useMutation({
    mutationFn: ({ order, action }: { order: PosOrder; action: Action }) => orderApi[action](order.id),
    onSuccess: (_updated, { order, action }) => {
      toast(`${order.orderNo || order.id} ${ACTION_MESSAGES[action]}.`, action === 'cancel' ? 'warning' : 'success')
      void queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
    onError: (error) => toast(error instanceof Error ? error.message : 'The order could not be updated.', 'error'),
  })
  // An unpaid order is paid at the counter before it is completed: cash is recorded as a paid payment first.
  const collectCash = useMutation({
    mutationFn: async (order: PosOrder) => {
      await paymentApi.createCash({
        orderId: order.id, businessId: order.businessId, storeId: order.storeId, cashierId: Number(user?.id),
        amount: Number(order.grandTotal), tenderedAmount: Number(order.grandTotal), currencyCode: order.currencyCode,
        method: 'CASH', provider: 'NONE', idempotencyKey: `order-${order.id}-cash-at-handover`,
        note: `Collected for ${order.orderNo || order.id}`,
      })
      return orderApi.complete(order.id)
    },
    onSuccess: (_updated, order) => {
      toast(`Cash recorded and ${order.orderNo || order.id} completed.`, 'success')
      setCollectingOrderId(null)
      void queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
    onError: (error) => toast(error instanceof Error ? error.message : 'The payment could not be recorded.', 'error'),
  })
  // A shopper's KHQR goes to the merchant's Bakong account. Bakong is asked once more; when it cannot answer
  // (for example its daily check limit) or has not seen the money, the merchant can confirm it from their bank app.
  const [khqrNotice, setKhqrNotice] = useState<string | null>(null)
  const pendingKhqr = async (order: PosOrder) => {
    const payments = await paymentApi.listForOrder(order.id)
    return payments.find((payment) => payment.method === 'QR' && payment.provider === 'BAKONG' && payment.status === 'PENDING')
      ?? payments.find((payment) => payment.method === 'QR' && payment.status === 'PAID')
  }
  const finishPaid = (order: PosOrder) => {
    setCollectingOrderId(null)
    setKhqrNotice(null)
    updateOrder.mutate({ order, action: 'complete' })
  }
  const checkKhqr = useMutation({
    mutationFn: async (order: PosOrder) => {
      const payment = await pendingKhqr(order)
      if (!payment) throw new Error('This order has no KHQR payment. Use Cash received if the customer paid in cash.')
      if (payment.status === 'PAID') return payment
      try {
        return await paymentApi.checkBakong(payment.id)
      } catch (error) {
        throw new Error(`Bakong could not confirm the payment right now${error instanceof Error && error.message ? ` (${error.message})` : ''}.`)
      }
    },
    onSuccess: (payment, order) => {
      if (payment.status === 'PAID') finishPaid(order)
      else setKhqrNotice('Bakong has not seen this payment yet.')
    },
    onError: (error) => setKhqrNotice(error instanceof Error ? error.message : 'Bakong could not be reached.'),
  })
  const confirmKhqr = useMutation({
    mutationFn: async (order: PosOrder) => {
      const payment = await pendingKhqr(order)
      if (!payment) throw new Error('This order has no KHQR payment to confirm.')
      if (payment.status === 'PAID') return payment
      // Keep the QR's own reference so the payment can still be matched to the bank transaction.
      return paymentApi.confirm({ id: payment.id, externalReference: payment.externalReference || `confirmed-by-merchant-${order.id}` })
    },
    onSuccess: (_payment, order) => finishPaid(order),
    onError: (error) => toast(error instanceof Error ? error.message : 'The payment could not be confirmed.', 'error'),
  })
  const busyOrderId = updateOrder.isPending ? updateOrder.variables?.order.id : collectCash.isPending ? collectCash.variables?.id : null
  const collectingOrder = orders.find((order) => order.id === collectingOrderId) ?? null

  const storeOrders = useMemo(() => orders.filter((order) => isOnline(order) ? hasOnline : hasPos), [hasOnline, hasPos, orders])
  useEffect(() => {
    if ((channelFilter === 'Online' && !hasOnline) || (channelFilter === 'POS' && !hasPos)) setChannelFilter('All channels')
  }, [channelFilter, hasOnline, hasPos])

  const selectedOrder = orders.find((order) => order.id === selectedOrderId) ?? null
  const rejectingOrder = orders.find((order) => order.id === rejectingOrderId) ?? null
  const visibleOrders = useMemo(() => {
    const search = query.trim().toLowerCase()
    return storeOrders.filter((order) => {
      const matchesSearch = !search || [order.orderNo, String(order.id), customerName(order), customerPhone(order), area(order)]
        .some((value) => (value ?? '').toLowerCase().includes(search))
      const matchesStatus = statusFilter === 'All orders'
        || (statusFilter === 'Needs attention' ? needsAttention(order) : order.orderStatus === statusFilter)
      const matchesChannel = channelFilter === 'All channels' || (channelFilter === 'Online' ? isOnline(order) : !isOnline(order))
      return matchesSearch && matchesStatus && matchesChannel
    })
  }, [storeOrders, query, statusFilter, channelFilter])

  const todayOrders = storeOrders.filter((order) => isToday(order.createdAt))
  const attentionCount = storeOrders.filter(needsAttention).length
  const inProgress = storeOrders.filter((order) => ACTIVE_STATUSES.includes(order.orderStatus)).length
  const paidToday = todayOrders.filter((order) => ['PAID', 'COD_COLLECTED', 'REMITTED'].includes(order.paymentStatus) && order.orderStatus !== 'CANCELLED')

  const run = (order: PosOrder, action: Action) => {
    // Completing needs the full amount paid, so an unpaid order asks how the customer paid.
    if (action === 'complete' && order.paymentStatus === 'UNPAID') {
      setCollectingOrderId(order.id)
      return
    }
    updateOrder.mutate({ order, action })
  }

  const rejectOrder = () => {
    if (!rejectingOrder) return
    run(rejectingOrder, 'cancel')
    setRejectingOrderId(null)
    setSelectedOrderId(null)
  }

  const clearFilters = () => {
    setQuery('')
    setStatusFilter('All orders')
    setChannelFilter('All channels')
  }

  const statusCounts = useMemo(() => storeOrders.reduce<Record<string, number>>((counts, order) => {
    counts[order.orderStatus] = (counts[order.orderStatus] || 0) + 1
    if (needsAttention(order)) counts['Needs attention'] = (counts['Needs attention'] || 0) + 1
    counts['All orders'] = (counts['All orders'] || 0) + 1
    return counts
  }, {}), [storeOrders])

  const actionButtons = (order: PosOrder, compact = true) => {
    const next = nextAction(order)
    const busy = busyOrderId === order.id
    const size = compact ? 'min-h-[32px] px-2.5 text-[11px]' : ''
    return <>
      {order.orderStatus === 'PENDING_CONFIRMATION' && isOnline(order) ? <Button variant="danger" className={size} disabled={busy} onClick={() => setRejectingOrderId(order.id)}>Reject</Button> : null}
      {next ? <Button variant={compact ? 'small' : 'primary'} className={size} disabled={busy} onClick={() => run(order, next.action)}>{busy ? 'Saving…' : next.label}</Button> : null}
    </>
  }

  if (!hasOnline) {
    return (
      <>
        <Topbar title="Order management" subtitle="Online order acceptance is not enabled for this store" actions={<StoreSwitcher value={storeId} onChange={setStoreId} />} />
        <main className={pageContent}>
          <Breadcrumb items={[{ label: 'Orders' }, { label: 'Order management' }]} />
          <section className="mx-auto mt-6 max-w-2xl rounded-[4px] border border-vpos-line bg-vpos-surface p-6 text-center shadow-vpos">
            <Icon name="global-line" className="text-3xl text-vpos-muted" />
            <h1 className="mt-3 text-lg font-extrabold text-vpos-text">Online orders are not enabled for this store</h1>
            <p className="mt-2 text-sm leading-6 text-vpos-muted">Choose an online-enabled store to review customer orders and manage acceptance or fulfillment.</p>
          </section>
        </main>
      </>
    )
  }

  return (
    <>
      <Topbar
        title="Order management"
        subtitle="Review online orders and keep fulfillment moving"
        actions={<div className="flex items-center gap-2">{hasPos ? <Link to={paths.pos} className="inline-flex h-[38px] items-center gap-2 rounded-[4px] bg-vpos-primary px-3.5 text-[13px] font-semibold text-white no-underline hover:bg-vpos-primary-2 sm:px-4"><Icon name="add-line" /> <span className="hidden sm:inline">Create sale</span></Link> : null}<StoreSwitcher value={storeId} onChange={setStoreId} /></div>}
      />
      <main className={pageContent}>
        <section className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Breadcrumb items={[{ label: 'Orders' }, { label: 'Order management' }]} />
          <button type="button" onClick={() => void ordersQuery.refetch()} disabled={ordersQuery.isFetching} className="inline-flex w-fit items-center gap-2 rounded-full border border-vpos-line bg-vpos-surface px-3 py-1.5 text-[11px] font-bold text-vpos-muted hover:text-vpos-text">
            <Icon name="refresh-line" className={ordersQuery.isFetching ? 'animate-spin' : ''} /> {ordersQuery.isFetching ? 'Refreshing…' : 'Refresh'}
          </button>
        </section>

        <section className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Order overview">
          <MetricCard label="Orders today" value={todayOrders.length} trend={hasPos ? 'Across all channels' : 'Online orders'} trendAs="small" icon={<Icon name="file-list-3-line" />} />
          <MetricCard label="Needs attention" value={attentionCount} trend="Accept or collect payment" trendAs="small" trendTone="warning" iconTone="warning" icon={<Icon name="notification-3-line" />} />
          <MetricCard label="In progress" value={inProgress} trend="Preparing or being delivered" trendAs="small" icon={<Icon name="truck-line" />} />
          <MetricCard label="Paid today" value={formatTotals(paidToday)} trend={`${paidToday.length} paid ${paidToday.length === 1 ? 'order' : 'orders'}`} trendAs="small" trendTone="positive" iconTone="positive" icon={<Icon name="funds-line" />} />
        </section>

        <section className="overflow-hidden rounded-[4px] border border-vpos-line bg-vpos-surface shadow-vpos">
          <div className="flex flex-col gap-4 border-b border-vpos-line p-4 sm:p-5">
            <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
              <div>
                <h2 className="m-0 text-[16px] font-bold text-vpos-text">Orders</h2>
                <p className="mb-0 mt-1 text-[12px] text-vpos-muted">
                  {visibleOrders.length} of {storeOrders.length} orders
                  {(ordersQuery.data?.totalElements ?? 0) > PAGE_SIZE ? ` · latest ${PAGE_SIZE} of ${ordersQuery.data?.totalElements}` : ''}
                </p>
              </div>
              <button type="button" onClick={clearFilters} className="inline-flex w-fit items-center gap-1 border-0 bg-transparent p-1 text-[12px] font-semibold text-vpos-primary hover:underline"><Icon name="restart-line" /> Clear filters</button>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Filter orders by status">
              {[
                { value: 'All orders', label: 'All orders' },
                { value: 'Needs attention', label: 'Needs attention' },
                { value: 'PENDING_CONFIRMATION', label: 'Awaiting acceptance' },
                { value: 'CONFIRMED', label: 'Confirmed' },
                { value: 'PACKING', label: 'Preparing' },
                { value: 'SHIPPED', label: 'On the way' },
                { value: 'DELIVERED', label: 'Delivered' },
                { value: 'COMPLETED', label: 'Completed' },
                { value: 'CANCELLED', label: 'Cancelled' },
              ].map((tab) => {
                const active = statusFilter === tab.value
                return <button key={tab.value} type="button" aria-pressed={active} onClick={() => setStatusFilter(tab.value)} className={`inline-flex min-h-[35px] shrink-0 items-center gap-2 rounded-full border px-3 text-[12px] font-semibold transition-colors ${active ? 'border-vpos-primary bg-vpos-primary text-white' : 'border-vpos-line bg-white text-vpos-muted hover:border-vpos-primary/40 hover:text-vpos-text'}`}>
                  {tab.label}<span className={`text-[10px] ${active ? 'text-white/75' : 'text-vpos-muted'}`}>{statusCounts[tab.value] ?? 0}</span>
                </button>
              })}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <label className={`${searchField} w-full flex-1 sm:max-w-[420px]`}>
                <Icon name="search-line" className="shrink-0 text-[16px] text-vpos-muted" />
                <input className="h-full w-full min-w-0 border-0 bg-transparent text-[13px] text-vpos-text outline-none placeholder:text-vpos-muted" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search order, customer, phone or area" aria-label="Search orders" />
                {query ? <button type="button" aria-label="Clear search" onClick={() => setQuery('')} className="border-0 bg-transparent p-1 text-vpos-muted"><Icon name="close-circle-line" /></button> : null}
              </label>
              <label className="sr-only" htmlFor="order-channel">Sales channel</label>
              <select id="order-channel" className={`${selectClass} w-full sm:w-[170px]`} value={channelFilter} onChange={(event) => setChannelFilter(event.target.value)}>
                <option>All channels</option><option>Online</option>{hasPos ? <option>POS</option> : null}
              </select>
            </div>
          </div>

          {ordersQuery.isLoading ? <div className="px-5 py-14 text-center text-[13px] text-vpos-muted">Loading orders…</div> : null}
          {ordersQuery.isError ? <div className="px-5 py-14 text-center"><h3 className="mb-1 mt-0 text-[14px] font-bold text-vpos-red">Orders could not be loaded</h3><p className="m-0 text-[12px] text-vpos-muted">{ordersQuery.error instanceof Error ? ordersQuery.error.message : 'Please try again.'}</p><Button variant="secondary" className="mt-4" onClick={() => void ordersQuery.refetch()}>Try again</Button></div> : null}

          {!ordersQuery.isLoading && !ordersQuery.isError ? <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[850px] border-collapse text-left">
                <thead><tr className="bg-vpos-subtle/70 text-[10px] font-bold uppercase tracking-[.08em] text-vpos-muted">
                  <th className="px-5 py-3">Order / Customer</th><th className="px-4 py-3">Placed</th><th className="px-4 py-3">Channel & fulfillment</th><th className="px-4 py-3">Payment</th><th className="px-4 py-3">Total</th><th className="px-4 py-3">Status</th><th className="px-5 py-3 text-right">Action</th>
                </tr></thead>
                <tbody className="divide-y divide-vpos-line">
                  {visibleOrders.map((order) => <tr key={order.id} className="transition-colors hover:bg-vpos-subtle/35">
                    <td className="px-5 py-3.5"><button type="button" onClick={() => setSelectedOrderId(order.id)} className="border-0 bg-transparent p-0 text-left text-[13px] font-bold text-vpos-primary hover:underline">{order.orderNo || `#${order.id}`}</button><span className="mt-1 block text-[12px] text-vpos-text">{customerName(order)}</span><span className="mt-0.5 block text-[11px] text-vpos-muted">{customerPhone(order) || area(order)}</span></td>
                    <td className="px-4 py-3.5 text-[12px] text-vpos-text">{formatPlacedAt(order.createdAt)}</td>
                    <td className="px-4 py-3.5"><span className="text-[12px] font-semibold text-vpos-text">{isOnline(order) ? 'Online' : 'POS'}</span><span className="mt-1 block text-[11px] text-vpos-muted">{fulfillmentLabel(order)}</span></td>
                    <td className="px-4 py-3.5"><span className="text-[12px] text-vpos-text">{paymentMethodLabel(order)}</span><span className="mt-1 block"><Status value={paymentLabels[order.paymentStatus] ?? humanize(order.paymentStatus)} className={`min-w-0 px-2 py-0.5 text-[10px] ${paymentStatusClass(order.paymentStatus) ?? ''}`} /></span></td>
                    <td className="px-4 py-3.5 text-[13px] font-bold text-vpos-text">{formatCurrency(Number(order.grandTotal), order.currencyCode)}</td>
                    <td className="px-4 py-3.5"><Status value={statusLabels[order.orderStatus] ?? humanize(order.orderStatus)} className={`min-w-0 whitespace-nowrap px-2.5 py-1 text-[11px] ${orderStatusClass(order.orderStatus)}`} /></td>
                    <td className="px-5 py-3.5"><div className="flex justify-end gap-2"><Button variant="secondary" className="min-h-[32px] px-2.5 text-[11px]" onClick={() => setSelectedOrderId(order.id)}><Icon name="eye-line" /> View</Button>{actionButtons(order)}</div></td>
                  </tr>)}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-vpos-line md:hidden">
              {visibleOrders.map((order) => <article key={order.id} className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-3"><div><button type="button" onClick={() => setSelectedOrderId(order.id)} className="border-0 bg-transparent p-0 text-left text-[13px] font-bold text-vpos-primary">{order.orderNo || `#${order.id}`}</button><p className="mb-0 mt-1 text-[13px] font-semibold text-vpos-text">{customerName(order)}</p><p className="mb-0 mt-0.5 text-[11px] text-vpos-muted">{formatPlacedAt(order.createdAt)}{customerPhone(order) ? ` · ${customerPhone(order)}` : ''}</p></div><Status value={statusLabels[order.orderStatus] ?? humanize(order.orderStatus)} className={`min-w-0 px-2 py-1 text-[10px] ${orderStatusClass(order.orderStatus)}`} /></div>
                <div className="flex items-end justify-between gap-2"><div><p className="m-0 text-[11px] text-vpos-muted">{isOnline(order) ? 'Online' : 'POS'} · {fulfillmentLabel(order)}</p><p className="mb-0 mt-1 text-[13px] font-bold text-vpos-text">{formatCurrency(Number(order.grandTotal), order.currencyCode)} <span className="font-normal text-vpos-muted">· {paymentLabels[order.paymentStatus] ?? humanize(order.paymentStatus)}</span></p></div><div className="flex gap-2"><Button variant="secondary" className="min-h-[32px] px-2.5 text-[11px]" onClick={() => setSelectedOrderId(order.id)}>Details</Button>{actionButtons(order)}</div></div>
              </article>)}
            </div>

            {visibleOrders.length === 0 ? <div className="px-5 py-14 text-center"><span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-vpos-subtle text-[20px] text-vpos-muted"><Icon name="file-search-line" /></span><h3 className="mb-1 mt-3 text-[14px] font-bold text-vpos-text">{storeOrders.length ? 'No matching orders' : 'No orders yet'}</h3><p className="m-0 text-[12px] text-vpos-muted">{storeOrders.length ? 'Try another search or clear the filters.' : 'Orders from the marketplace will appear here.'}</p>{storeOrders.length ? <Button variant="secondary" className="mt-4" onClick={clearFilters}>Clear filters</Button> : null}</div> : null}
          </> : null}
          <div className="flex flex-col gap-1 border-t border-vpos-line bg-vpos-subtle/35 px-4 py-3 text-[11px] text-vpos-muted sm:flex-row sm:items-center sm:justify-between sm:px-5"><span>Times are in Phnom Penh time (ICT, UTC+7).</span><span>The list refreshes every 30 seconds.</span></div>
        </section>

        <Modal open={Boolean(selectedOrder)} onClose={() => setSelectedOrderId(null)} size="3xl" title={selectedOrder ? `Order ${selectedOrder.orderNo || selectedOrder.id}` : undefined} description={selectedOrder ? `${customerName(selectedOrder)} · Placed ${formatPlacedAt(selectedOrder.createdAt)}` : undefined} footer={selectedOrder ? <div className="flex w-full justify-end gap-2"><Button variant="secondary" onClick={() => setSelectedOrderId(null)}>Close</Button>{actionButtons(selectedOrder, false)}</div> : undefined}>
          {selectedOrder ? <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-[4px] border border-vpos-line bg-vpos-subtle/40 p-3.5"><div className="flex flex-wrap items-center gap-2"><Status value={statusLabels[selectedOrder.orderStatus] ?? humanize(selectedOrder.orderStatus)} className={orderStatusClass(selectedOrder.orderStatus)} /><Status value={paymentLabels[selectedOrder.paymentStatus] ?? humanize(selectedOrder.paymentStatus)} className={paymentStatusClass(selectedOrder.paymentStatus)} /><span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-vpos-muted">{isOnline(selectedOrder) ? 'Online' : 'POS'} · {fulfillmentLabel(selectedOrder)}</span></div><strong className="text-[17px] text-vpos-text">{formatCurrency(Number(selectedOrder.grandTotal), selectedOrder.currencyCode)}</strong></div>

            {selectedOrder.orderStatus !== 'CANCELLED' && isOnline(selectedOrder) ? <section className="rounded-[4px] border border-vpos-line p-4"><h3 className="mb-4 mt-0 text-[12px] font-bold uppercase tracking-[.06em] text-vpos-muted">Fulfillment progress</h3><div className={`grid gap-y-4 ${isPickup(selectedOrder) ? 'grid-cols-4' : 'grid-cols-3 sm:grid-cols-6'}`}>{steps(selectedOrder).map(([step, label], index, all) => { const currentIndex = all.findIndex(([value]) => value === selectedOrder.orderStatus); const complete = currentIndex >= index; const active = currentIndex === index; return <div key={step} className="relative flex flex-col items-center text-center"><span className={`relative z-10 grid h-7 w-7 place-items-center rounded-full text-[11px] font-bold ${active ? 'bg-vpos-primary text-white ring-4 ring-vpos-primary/10' : complete ? 'bg-vpos-green text-white' : 'bg-vpos-subtle text-vpos-muted'}`}>{complete && !active ? <Icon name="check-line" /> : index + 1}</span><span className={`mt-2 text-[10px] ${active ? 'font-bold text-vpos-primary' : 'text-vpos-muted'}`}>{label}</span>{index < all.length - 1 ? <span className={`absolute left-[calc(50%+17px)] top-3.5 hidden h-px w-[calc(100%-34px)] sm:block ${currentIndex > index ? 'bg-vpos-green' : 'bg-vpos-line'}`} /> : null}</div> })}</div></section> : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <section className="rounded-[4px] border border-vpos-line p-4"><h3 className="mb-3 mt-0 flex items-center gap-2 text-[12px] font-bold text-vpos-text"><Icon name="user-3-line" className="text-vpos-primary" /> Customer</h3><p className="mb-1 text-[13px] font-semibold text-vpos-text">{customerName(selectedOrder)}</p>{customerPhone(selectedOrder) ? <a href={`tel:${customerPhone(selectedOrder).replace(/\s+/g, '')}`} className="text-[12px] text-vpos-primary">{customerPhone(selectedOrder)}</a> : <p className="m-0 text-[12px] text-vpos-muted">No phone given</p>}</section>
              <section className="rounded-[4px] border border-vpos-line p-4"><h3 className="mb-3 mt-0 flex items-center gap-2 text-[12px] font-bold text-vpos-text"><Icon name={isPickup(selectedOrder) ? 'store-2-line' : 'map-pin-line'} className="text-vpos-primary" /> {isPickup(selectedOrder) ? 'Pickup' : 'Delivery'}</h3>{selectedOrder.deliveryAddress ? <><p className="mb-1 text-[12px] leading-relaxed text-vpos-text">{[selectedOrder.deliveryAddress.streetAddress, selectedOrder.deliveryAddress.commune].filter(Boolean).join(', ')}</p><p className="m-0 text-[12px] text-vpos-muted">{area(selectedOrder)}</p>{selectedOrder.deliveryAddress.landmark ? <p className="mb-0 mt-1 text-[11px] text-vpos-muted">Landmark: {selectedOrder.deliveryAddress.landmark}</p> : null}</> : <p className="mb-1 text-[12px] text-vpos-text">The customer collects the order at the store.</p>}{selectedOrder.note ? <p className="mb-0 mt-2 rounded bg-vpos-subtle px-2.5 py-2 text-[11px] text-vpos-text"><strong>Note:</strong> {selectedOrder.note}</p> : null}</section>
            </div>

            <section className="overflow-hidden rounded-[4px] border border-vpos-line"><div className="flex items-center justify-between border-b border-vpos-line bg-vpos-subtle/50 px-4 py-3"><h3 className="m-0 text-[12px] font-bold text-vpos-text">Items ({(selectedOrder.items ?? []).reduce((sum, item) => sum + Number(item.quantity ?? item.qty ?? 0), 0)})</h3><span className="text-[11px] text-vpos-muted">Payment: {paymentMethodLabel(selectedOrder)}</span></div><div className="divide-y divide-vpos-line">{(selectedOrder.items ?? []).map((item) => <div key={item.id} className="flex items-center justify-between gap-4 px-4 py-3"><div><p className="m-0 text-[12px] font-semibold text-vpos-text">{item.productName}</p>{item.variantName ? <p className="mb-0 mt-0.5 text-[10px] text-vpos-muted">{item.variantName}</p> : null}<p className="mb-0 mt-1 text-[10px] text-vpos-muted">Qty {item.quantity ?? item.qty} × {formatCurrency(Number(item.unitPrice), selectedOrder.currencyCode)}</p></div><strong className="shrink-0 text-[12px] text-vpos-text">{formatCurrency(Number(item.total), selectedOrder.currencyCode)}</strong></div>)}</div><div className="space-y-2 border-t border-vpos-line bg-vpos-subtle/30 px-4 py-3 text-[12px]"><div className="flex justify-between text-vpos-muted"><span>Subtotal</span><span>{formatCurrency(Number(selectedOrder.subtotal), selectedOrder.currencyCode)}</span></div>{Number(selectedOrder.discount) > 0 ? <div className="flex justify-between text-vpos-muted"><span>Discount</span><span>−{formatCurrency(Number(selectedOrder.discount), selectedOrder.currencyCode)}</span></div> : null}{Number(selectedOrder.deliveryFee) > 0 ? <div className="flex justify-between text-vpos-muted"><span>Delivery fee</span><span>{formatCurrency(Number(selectedOrder.deliveryFee), selectedOrder.currencyCode)}</span></div> : null}<div className="flex justify-between border-t border-vpos-line pt-2 text-[14px] font-bold text-vpos-text"><span>Total</span><span>{formatCurrency(Number(selectedOrder.grandTotal), selectedOrder.currencyCode)}</span></div></div></section>
          </div> : null}
        </Modal>

        <Modal
          open={Boolean(collectingOrder)}
          onClose={() => { setCollectingOrderId(null); setKhqrNotice(null) }}
          size="md"
          title="Take payment"
          description={collectingOrder ? `${collectingOrder.orderNo || collectingOrder.id} · ${customerName(collectingOrder)}` : undefined}
          footer={collectingOrder ? <div className="flex w-full flex-col-reverse justify-end gap-2 sm:flex-row"><Button variant="secondary" onClick={() => { setCollectingOrderId(null); setKhqrNotice(null) }}>Not yet</Button><Button variant="secondary" disabled={checkKhqr.isPending || confirmKhqr.isPending || collectCash.isPending} onClick={() => { setKhqrNotice(null); checkKhqr.mutate(collectingOrder) }}><Icon name="qr-code-line" /> {checkKhqr.isPending ? 'Checking Bakong…' : 'Paid by KHQR'}</Button><Button variant="primary" disabled={collectCash.isPending} onClick={() => collectCash.mutate(collectingOrder)}><Icon name="money-dollar-circle-line" /> {collectCash.isPending ? 'Saving…' : 'Cash received'}</Button></div> : undefined}
        >
          {collectingOrder ? <div className="space-y-3 text-[13px] text-vpos-text">
            <p className="m-0">This order is not paid yet. Collect <strong>{formatCurrency(Number(collectingOrder.grandTotal), collectingOrder.currencyCode)}</strong> before handing it over.</p>
            <ul className="m-0 list-disc space-y-1 pl-5 text-[12px] text-vpos-muted">
              <li><strong className="text-vpos-text">Cash received</strong> records a cash payment and completes the order.</li>
              <li><strong className="text-vpos-text">Paid by KHQR</strong> asks Bakong whether the customer's KHQR was paid, then completes the order.</li>
            </ul>
            {khqrNotice ? <div className="space-y-2 rounded-[4px] border border-vpos-orange/25 bg-vpos-orange-bg p-3 text-[12px]">
              <p className="m-0 text-vpos-text">{khqrNotice} If <strong>{formatCurrency(Number(collectingOrder.grandTotal), collectingOrder.currencyCode)}</strong> from this customer is already in your bank app, confirm it yourself.</p>
              <Button variant="primary" className="min-h-[32px] px-2.5 text-[11px]" disabled={confirmKhqr.isPending} onClick={() => confirmKhqr.mutate(collectingOrder)}><Icon name="check-line" /> {confirmKhqr.isPending ? 'Saving…' : 'I see the money in my bank app'}</Button>
            </div> : null}
          </div> : null}
        </Modal>

        <Modal
          open={Boolean(rejectingOrder)}
          onClose={() => setRejectingOrderId(null)}
          size="md"
          title="Reject this order?"
          description={rejectingOrder ? `${rejectingOrder.orderNo || rejectingOrder.id} · ${customerName(rejectingOrder)}` : undefined}
          footer={<div className="flex w-full justify-end gap-2"><Button variant="secondary" onClick={() => setRejectingOrderId(null)}>Keep order</Button><Button variant="danger" onClick={rejectOrder}><Icon name="close-circle-line" /> Reject order</Button></div>}
        >
          {rejectingOrder ? <div className="rounded-[4px] border border-vpos-red/20 bg-vpos-red-bg p-3 text-[12px] leading-relaxed text-vpos-red">
            The order is cancelled and its reserved stock is released. This cannot be undone.{customerPhone(rejectingOrder) ? <> Call the customer on <strong>{customerPhone(rejectingOrder)}</strong> to let them know.</> : null}
          </div> : null}
        </Modal>
      </main>
    </>
  )
}
