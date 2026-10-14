import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Breadcrumb, Button, Icon, MetricCard, Modal, Status, Topbar } from '../components'
import { useToast } from '../context/ToastContext'
import { formatCurrency } from '../lib/currency'
import { pageContent, searchField, selectClass } from '../lib/ui'
import { paths } from '../lib/paths'

type OrderStatus = 'PENDING_CONFIRMATION' | 'CONFIRMED' | 'PACKING' | 'SHIPPED' | 'DELIVERED' | 'COMPLETED' | 'CANCELLED'
type PaymentStatus = 'PAID' | 'PENDING' | 'UNPAID'
type Fulfillment = 'Delivery' | 'Pickup'

interface DemoOrderItem {
  name: string
  variant?: string
  quantity: number
  unitPrice: number
}

interface DemoOrder {
  id: string
  customer: string
  phone: string
  email?: string
  placedAt: string
  channel: 'Online' | 'POS'
  fulfillment: Fulfillment
  address?: string
  area: string
  paymentMethod: string
  paymentStatus: PaymentStatus
  status: OrderStatus
  note?: string
  rejectionReason?: string
  subtotal: number
  deliveryFee: number
  discount: number
  items: DemoOrderItem[]
}

const initialOrders: DemoOrder[] = [
  {
    id: 'ORD-26013', customer: 'Sokha Meas', phone: '+855 12 345 678', email: 'sokha@example.com', placedAt: '2026-10-13T10:42:00+07:00',
    channel: 'Online', fulfillment: 'Delivery', address: 'House 42, Street 310, BKK 1', area: 'Chamkarmon, Phnom Penh', paymentMethod: 'KHQR · demo', paymentStatus: 'PAID', status: 'PENDING_CONFIRMATION',
    note: 'Please call when you arrive.', subtotal: 18.5, deliveryFee: 1.5, discount: 0,
    items: [{ name: 'Iced Latte', variant: 'Large · Oat milk', quantity: 2, unitPrice: 5.5 }, { name: 'Butter Croissant', quantity: 2, unitPrice: 3.75 }],
  },
  {
    id: 'ORD-26012', customer: 'Dara Kim', phone: '+855 96 222 4411', placedAt: '2026-10-13T10:18:00+07:00',
    channel: 'Online', fulfillment: 'Delivery', address: 'Building B, #08-12, Street 2004', area: 'Sen Sok, Phnom Penh', paymentMethod: 'Cash on delivery', paymentStatus: 'UNPAID', status: 'CONFIRMED',
    subtotal: 24, deliveryFee: 2, discount: 2,
    items: [{ name: 'Chicken Sandwich', quantity: 2, unitPrice: 6 }, { name: 'Fresh Lemon Tea', variant: 'Iced', quantity: 4, unitPrice: 3 }],
  },
  {
    id: 'ORD-26011', customer: 'Sreyneang Pich', phone: '+855 10 555 203', placedAt: '2026-10-13T09:56:00+07:00',
    channel: 'Online', fulfillment: 'Pickup', area: 'BKK 1, Phnom Penh', paymentMethod: 'Cash at pickup', paymentStatus: 'PENDING', status: 'PACKING',
    note: 'Pickup around 11:30 AM.', subtotal: 13.25, deliveryFee: 0, discount: 0,
    items: [{ name: 'Matcha Latte', variant: 'Regular · Iced', quantity: 1, unitPrice: 4.75 }, { name: 'Blueberry Muffin', quantity: 2, unitPrice: 4.25 }],
  },
  {
    id: 'ORD-26010', customer: 'Vannak Chhay', phone: '+855 89 011 620', placedAt: '2026-10-13T09:21:00+07:00',
    channel: 'Online', fulfillment: 'Delivery', address: 'Street 6, Krous Village', area: 'Svay Dangkum, Siem Reap', paymentMethod: 'KHQR · demo', paymentStatus: 'PAID', status: 'SHIPPED',
    subtotal: 15, deliveryFee: 1.25, discount: 0,
    items: [{ name: 'Cold Brew', quantity: 2, unitPrice: 4.5 }, { name: 'Cheese Danish', quantity: 2, unitPrice: 3 }],
  },
  {
    id: 'ORD-26009', customer: 'Chenda Lim', phone: '+855 17 908 411', placedAt: '2026-10-13T08:48:00+07:00',
    channel: 'POS', fulfillment: 'Pickup', area: 'Toul Kork, Phnom Penh', paymentMethod: 'Cash', paymentStatus: 'PAID', status: 'COMPLETED',
    subtotal: 9.5, deliveryFee: 0, discount: 0,
    items: [{ name: 'Cappuccino', variant: 'Regular · Hot', quantity: 1, unitPrice: 4.25 }, { name: 'Chocolate Cake', quantity: 1, unitPrice: 5.25 }],
  },
  {
    id: 'ORD-26008', customer: 'Kim Coffee', phone: '+855 70 888 201', placedAt: '2026-10-12T17:32:00+07:00',
    channel: 'Online', fulfillment: 'Delivery', address: 'No. 16, National Road 6A', area: 'Chroy Changvar, Phnom Penh', paymentMethod: 'KHQR · demo', paymentStatus: 'PAID', status: 'DELIVERED',
    subtotal: 28, deliveryFee: 2, discount: 0,
    items: [{ name: 'Iced Americano', quantity: 4, unitPrice: 4 }, { name: 'Seasonal Pastry Box', quantity: 1, unitPrice: 12 }],
  },
  {
    id: 'ORD-26007', customer: 'Rithy Sok', phone: '+855 92 707 606', placedAt: '2026-10-12T16:04:00+07:00',
    channel: 'Online', fulfillment: 'Delivery', address: 'Street 9, Wat Bo Village', area: 'Sala Kamreuk, Siem Reap', paymentMethod: 'Cash on delivery', paymentStatus: 'UNPAID', status: 'CANCELLED',
    note: 'Customer requested cancellation before dispatch.', subtotal: 11, deliveryFee: 1.5, discount: 0,
    items: [{ name: 'Tuna Sandwich', quantity: 1, unitPrice: 6 }, { name: 'Orange Juice', quantity: 2, unitPrice: 2.5 }],
  },
  {
    id: 'ORD-26006', customer: 'Sokha Retail', phone: '+855 11 321 999', placedAt: '2026-10-12T14:15:00+07:00',
    channel: 'POS', fulfillment: 'Pickup', area: 'Daun Penh, Phnom Penh', paymentMethod: 'KHQR · demo', paymentStatus: 'PAID', status: 'COMPLETED',
    subtotal: 21, deliveryFee: 0, discount: 1,
    items: [{ name: 'Iced Americano', quantity: 2, unitPrice: 4 }, { name: 'Chai Latte', quantity: 2, unitPrice: 4.5 }, { name: 'Bagel', quantity: 2, unitPrice: 2 }],
  },
]

const statusLabels: Record<OrderStatus, string> = {
  PENDING_CONFIRMATION: 'Awaiting acceptance', CONFIRMED: 'Confirmed', PACKING: 'Preparing', SHIPPED: 'On the way',
  DELIVERED: 'Delivered', COMPLETED: 'Completed', CANCELLED: 'Cancelled',
}

const statusSteps: OrderStatus[] = ['PENDING_CONFIRMATION', 'CONFIRMED', 'PACKING', 'SHIPPED', 'DELIVERED', 'COMPLETED']

function total(order: DemoOrder) {
  return order.subtotal + order.deliveryFee - order.discount
}

function formatPlacedAt(value: string) {
  return new Intl.DateTimeFormat('en-KH', {
    timeZone: 'Asia/Phnom_Penh', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true,
  }).format(new Date(value))
}

function nextStatus(status: OrderStatus): OrderStatus | null {
  const index = statusSteps.indexOf(status)
  return index >= 0 && index < statusSteps.length - 1 ? statusSteps[index + 1] : null
}

function nextActionLabel(status: OrderStatus) {
  const labels: Partial<Record<OrderStatus, string>> = {
    PENDING_CONFIRMATION: 'Accept order', CONFIRMED: 'Start preparing', PACKING: 'Mark as shipped', SHIPPED: 'Mark delivered', DELIVERED: 'Complete',
  }
  return labels[status]
}

function orderStatusLabel(order: DemoOrder) {
  return order.status === 'CANCELLED' && order.rejectionReason ? 'Rejected by merchant' : statusLabels[order.status]
}

function paymentStatusLabel(status: PaymentStatus) {
  if (status === 'PAID') return 'Paid'
  if (status === 'UNPAID') return 'Unpaid'
  return 'Pending'
}

function orderStatusClass(status: OrderStatus) {
  const styles: Record<OrderStatus, string> = {
    PENDING_CONFIRMATION: 'bg-vpos-orange-bg text-vpos-orange',
    CONFIRMED: 'bg-vpos-primary-soft text-vpos-primary',
    PACKING: 'bg-vpos-orange-bg text-vpos-orange',
    SHIPPED: 'bg-vpos-primary-soft text-vpos-primary',
    DELIVERED: 'bg-vpos-green-bg text-vpos-green',
    COMPLETED: 'bg-vpos-green-bg text-vpos-green',
    CANCELLED: 'bg-vpos-red-bg text-vpos-red',
  }
  return styles[status]
}

function paymentStatusClass(status: PaymentStatus) {
  return status === 'UNPAID' ? 'bg-vpos-orange-bg text-vpos-orange' : undefined
}

export function OrderManagementPage() {
  const { toast } = useToast()
  const [orders, setOrders] = useState(initialOrders)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('All orders')
  const [channelFilter, setChannelFilter] = useState('All channels')
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
  const [rejectingOrderId, setRejectingOrderId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [rejectNote, setRejectNote] = useState('')

  const selectedOrder = orders.find((order) => order.id === selectedOrderId) ?? null
  const rejectingOrder = orders.find((order) => order.id === rejectingOrderId) ?? null
  const visibleOrders = useMemo(() => {
    const search = query.trim().toLowerCase()
    return orders.filter((order) => {
      const matchesSearch = !search || [order.id, order.customer, order.phone, order.area].some((value) => value.toLowerCase().includes(search))
      const matchesStatus = statusFilter === 'All orders'
        || (statusFilter === 'Needs attention' ? order.status === 'PENDING_CONFIRMATION' || order.paymentStatus !== 'PAID' : order.status === statusFilter)
      const matchesChannel = channelFilter === 'All channels' || order.channel === channelFilter
      return matchesSearch && matchesStatus && matchesChannel
    })
  }, [orders, query, statusFilter, channelFilter])

  const todayOrders = orders.filter((order) => order.placedAt.startsWith('2026-10-13'))
  const needsAttention = orders.filter((order) => order.status === 'PENDING_CONFIRMATION' || (order.paymentStatus !== 'PAID' && order.status !== 'CANCELLED')).length
  const inProgress = orders.filter((order) => ['CONFIRMED', 'PACKING', 'SHIPPED', 'DELIVERED'].includes(order.status)).length
  const todaySales = todayOrders.filter((order) => order.paymentStatus === 'PAID' && order.status !== 'CANCELLED').reduce((sum, order) => sum + total(order), 0)

  const advanceOrder = (order: DemoOrder) => {
    const status = nextStatus(order.status)
    if (!status) return
    setOrders((current) => current.map((item) => item.id === order.id ? { ...item, status } : item))
    const message = order.status === 'PENDING_CONFIRMATION' ? 'accepted' : `marked ${statusLabels[status].toLowerCase()}`
    toast(`${order.id} ${message}. This change is only in the demo preview.`, 'success')
  }

  const openRejectDialog = (orderId: string) => {
    setRejectReason('')
    setRejectNote('')
    setRejectingOrderId(orderId)
  }

  const rejectOrder = () => {
    if (!rejectingOrder || !rejectReason || (rejectReason === 'Other' && !rejectNote.trim())) return
    const reason = rejectReason === 'Other' ? rejectNote.trim() : rejectNote.trim() ? `${rejectReason}: ${rejectNote.trim()}` : rejectReason
    setOrders((current) => current.map((item) => item.id === rejectingOrder.id
      ? { ...item, status: 'CANCELLED', rejectionReason: reason }
      : item))
    setRejectingOrderId(null)
    setSelectedOrderId(null)
    toast(`${rejectingOrder.id} rejected by merchant. This change is only in the demo preview.`, 'warning')
  }

  const clearFilters = () => {
    setQuery('')
    setStatusFilter('All orders')
    setChannelFilter('All channels')
  }

  const statusCounts = useMemo(() => orders.reduce<Record<string, number>>((counts, order) => {
    counts[order.status] = (counts[order.status] || 0) + 1
    if (order.status === 'PENDING_CONFIRMATION' || (order.paymentStatus !== 'PAID' && order.status !== 'CANCELLED')) counts['Needs attention'] = (counts['Needs attention'] || 0) + 1
    counts['All orders'] = (counts['All orders'] || 0) + 1
    return counts
  }, {}), [orders])

  return (
    <>
      <Topbar
        title="Order management"
        subtitle="Review new orders and keep fulfillment moving"
        actions={<Link to={paths.pos} className="inline-flex h-[38px] items-center gap-2 rounded-[4px] bg-vpos-primary px-3.5 text-[13px] font-semibold text-white no-underline hover:bg-vpos-primary-2 sm:px-4"><Icon name="add-line" /> <span className="hidden sm:inline">Create sale</span></Link>}
      />
      <main className={pageContent}>
        <section className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Breadcrumb items={[{ label: 'Orders' }, { label: 'Order management' }]} />
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-vpos-orange/25 bg-vpos-orange-bg px-3 py-1.5 text-[11px] font-bold text-vpos-orange">
            <Icon name="flask-line" /> Static preview · sample data
          </span>
        </section>

        <section className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Order overview">
          <MetricCard label="Orders today" value={todayOrders.length} trend="Across all channels" trendAs="small" icon={<Icon name="file-list-3-line" />} />
          <MetricCard label="Needs attention" value={needsAttention} trend="Confirm or collect payment" trendAs="small" trendTone="warning" iconTone="warning" icon={<Icon name="notification-3-line" />} />
          <MetricCard label="In progress" value={inProgress} trend="Preparing or being delivered" trendAs="small" icon={<Icon name="truck-line" />} />
          <MetricCard label="Paid today" value={formatCurrency(todaySales, 'USD')} trend="Paid demo orders" trendAs="small" trendTone="positive" iconTone="positive" icon={<Icon name="funds-line" />} />
        </section>

        <section className="mb-4 overflow-hidden rounded-[4px] border border-vpos-orange/20 bg-vpos-orange-bg/60 px-4 py-3.5 sm:flex sm:items-center sm:gap-3" aria-label="Static data notice">
          <span className="mb-1 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white text-vpos-orange sm:mb-0"><Icon name="information-line" /></span>
          <p className="m-0 text-[12px] leading-relaxed text-vpos-text"><strong>Preview only.</strong> These Cambodia-based examples are not connected to live orders. Status updates stay in this browser session. KHQR entries are labels for demo data, not real payments.</p>
        </section>

        <section className="overflow-hidden rounded-[4px] border border-vpos-line bg-vpos-surface shadow-vpos">
          <div className="flex flex-col gap-4 border-b border-vpos-line p-4 sm:p-5">
            <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
              <div>
                <h2 className="m-0 text-[16px] font-bold text-vpos-text">Orders</h2>
                <p className="mb-0 mt-1 text-[12px] text-vpos-muted">{visibleOrders.length} of {orders.length} sample orders</p>
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
                <option>All channels</option><option>Online</option><option>POS</option>
              </select>
            </div>
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[850px] border-collapse text-left">
              <thead><tr className="bg-vpos-subtle/70 text-[10px] font-bold uppercase tracking-[.08em] text-vpos-muted">
                <th className="px-5 py-3">Order / Customer</th><th className="px-4 py-3">Placed</th><th className="px-4 py-3">Channel & fulfillment</th><th className="px-4 py-3">Payment</th><th className="px-4 py-3">Total</th><th className="px-4 py-3">Status</th><th className="px-5 py-3 text-right">Action</th>
              </tr></thead>
              <tbody className="divide-y divide-vpos-line">
                {visibleOrders.map((order) => <tr key={order.id} className="transition-colors hover:bg-vpos-subtle/35">
                  <td className="px-5 py-3.5"><button type="button" onClick={() => setSelectedOrderId(order.id)} className="border-0 bg-transparent p-0 text-left text-[13px] font-bold text-vpos-primary hover:underline">{order.id}</button><span className="mt-1 block text-[12px] text-vpos-text">{order.customer}</span><span className="mt-0.5 block text-[11px] text-vpos-muted">{order.area}</span></td>
                  <td className="px-4 py-3.5 text-[12px] text-vpos-text">{formatPlacedAt(order.placedAt)}</td>
                  <td className="px-4 py-3.5"><span className="text-[12px] font-semibold text-vpos-text">{order.channel}</span><span className="mt-1 block text-[11px] text-vpos-muted">{order.fulfillment}</span></td>
                  <td className="px-4 py-3.5"><span className="text-[12px] text-vpos-text">{order.paymentMethod}</span><span className="mt-1 block"><Status value={paymentStatusLabel(order.paymentStatus)} className={`min-w-0 px-2 py-0.5 text-[10px] ${paymentStatusClass(order.paymentStatus) ?? ''}`} /></span></td>
                  <td className="px-4 py-3.5 text-[13px] font-bold text-vpos-text">{formatCurrency(total(order), 'USD')}</td>
                  <td className="px-4 py-3.5"><Status value={orderStatusLabel(order)} className={`min-w-0 whitespace-nowrap px-2.5 py-1 text-[11px] ${orderStatusClass(order.status)}`} /></td>
                  <td className="px-5 py-3.5"><div className="flex justify-end gap-2"><Button variant="secondary" className="min-h-[32px] px-2.5 text-[11px]" onClick={() => setSelectedOrderId(order.id)}><Icon name="eye-line" /> View</Button>{order.status === 'PENDING_CONFIRMATION' ? <Button variant="danger" className="min-h-[32px] px-2.5 text-[11px]" onClick={() => openRejectDialog(order.id)}>Reject</Button> : null}{nextActionLabel(order.status) ? <Button variant="small" className="min-h-[32px] px-2.5 text-[11px]" onClick={() => advanceOrder(order)}>{nextActionLabel(order.status)}</Button> : null}</div></td>
                </tr>)}
              </tbody>
            </table>
          </div>

          <div className="divide-y divide-vpos-line md:hidden">
            {visibleOrders.map((order) => <article key={order.id} className="space-y-3 p-4">
              <div className="flex items-start justify-between gap-3"><div><button type="button" onClick={() => setSelectedOrderId(order.id)} className="border-0 bg-transparent p-0 text-left text-[13px] font-bold text-vpos-primary">{order.id}</button><p className="mb-0 mt-1 text-[13px] font-semibold text-vpos-text">{order.customer}</p><p className="mb-0 mt-0.5 text-[11px] text-vpos-muted">{formatPlacedAt(order.placedAt)} · {order.area}</p></div><Status value={orderStatusLabel(order)} className={`min-w-0 px-2 py-1 text-[10px] ${orderStatusClass(order.status)}`} /></div>
              <div className="flex items-end justify-between gap-2"><div><p className="m-0 text-[11px] text-vpos-muted">{order.channel} · {order.fulfillment}</p><p className="mb-0 mt-1 text-[13px] font-bold text-vpos-text">{formatCurrency(total(order), 'USD')} <span className="font-normal text-vpos-muted">· {paymentStatusLabel(order.paymentStatus)}</span></p></div><div className="flex gap-2"><Button variant="secondary" className="min-h-[32px] px-2.5 text-[11px]" onClick={() => setSelectedOrderId(order.id)}>Details</Button>{order.status === 'PENDING_CONFIRMATION' ? <Button variant="danger" className="min-h-[32px] px-2.5 text-[11px]" onClick={() => openRejectDialog(order.id)}>Reject</Button> : null}{nextActionLabel(order.status) ? <Button variant="small" className="min-h-[32px] px-2.5 text-[11px]" onClick={() => advanceOrder(order)}>{nextActionLabel(order.status)}</Button> : null}</div></div>
            </article>)}
          </div>

          {visibleOrders.length === 0 ? <div className="px-5 py-14 text-center"><span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-vpos-subtle text-[20px] text-vpos-muted"><Icon name="file-search-line" /></span><h3 className="mb-1 mt-3 text-[14px] font-bold text-vpos-text">No matching orders</h3><p className="m-0 text-[12px] text-vpos-muted">Try another search or clear the filters.</p><Button variant="secondary" className="mt-4" onClick={clearFilters}>Clear filters</Button></div> : null}
          <div className="flex flex-col gap-1 border-t border-vpos-line bg-vpos-subtle/35 px-4 py-3 text-[11px] text-vpos-muted sm:flex-row sm:items-center sm:justify-between sm:px-5"><span>Sample orders use Phnom Penh time (ICT, UTC+7).</span><span>KHQR rows are demo labels only.</span></div>
        </section>

        <Modal open={Boolean(selectedOrder)} onClose={() => setSelectedOrderId(null)} size="3xl" title={selectedOrder ? `Order ${selectedOrder.id}` : undefined} description={selectedOrder ? `${selectedOrder.customer} · Placed ${formatPlacedAt(selectedOrder.placedAt)}` : undefined} footer={selectedOrder ? <div className="flex w-full flex-col-reverse justify-between gap-2 sm:flex-row sm:items-center"><span className="text-[11px] text-vpos-muted">Demo status changes are temporary.</span><div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setSelectedOrderId(null)}>Close</Button>{selectedOrder.status === 'PENDING_CONFIRMATION' ? <Button variant="danger" onClick={() => { setSelectedOrderId(null); openRejectDialog(selectedOrder.id) }}>Reject order</Button> : null}{nextActionLabel(selectedOrder.status) ? <Button variant="primary" onClick={() => advanceOrder(selectedOrder)}>{nextActionLabel(selectedOrder.status)}</Button> : null}</div></div> : undefined}>
          {selectedOrder ? <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-[4px] border border-vpos-line bg-vpos-subtle/40 p-3.5"><div className="flex flex-wrap items-center gap-2"><Status value={orderStatusLabel(selectedOrder)} className={orderStatusClass(selectedOrder.status)} /><Status value={paymentStatusLabel(selectedOrder.paymentStatus)} className={paymentStatusClass(selectedOrder.paymentStatus)} /><span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-vpos-muted">{selectedOrder.channel} · {selectedOrder.fulfillment}</span></div><strong className="text-[17px] text-vpos-text">{formatCurrency(total(selectedOrder), 'USD')}</strong></div>

            {selectedOrder.status !== 'CANCELLED' ? <section className="rounded-[4px] border border-vpos-line p-4"><h3 className="mb-4 mt-0 text-[12px] font-bold uppercase tracking-[.06em] text-vpos-muted">Fulfillment progress</h3><div className="grid grid-cols-3 gap-y-4 sm:grid-cols-6">{statusSteps.map((step, index) => { const currentIndex = statusSteps.indexOf(selectedOrder.status); const complete = currentIndex >= index; const active = currentIndex === index; return <div key={step} className="relative flex flex-col items-center text-center"><span className={`relative z-10 grid h-7 w-7 place-items-center rounded-full text-[11px] font-bold ${active ? 'bg-vpos-primary text-white ring-4 ring-vpos-primary/10' : complete ? 'bg-vpos-green text-white' : 'bg-vpos-subtle text-vpos-muted'}`}>{complete && !active ? <Icon name="check-line" /> : index + 1}</span><span className={`mt-2 text-[10px] ${active ? 'font-bold text-vpos-primary' : 'text-vpos-muted'}`}>{['Placed', 'Confirmed', 'Preparing', 'On the way', 'Delivered', 'Completed'][index]}</span>{index < statusSteps.length - 1 ? <span className={`absolute left-[calc(50%+17px)] top-3.5 hidden h-px w-[calc(100%-34px)] sm:block ${currentIndex > index ? 'bg-vpos-green' : 'bg-vpos-line'}`} /> : null}</div> })}</div></section> : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <section className="rounded-[4px] border border-vpos-line p-4"><h3 className="mb-3 mt-0 flex items-center gap-2 text-[12px] font-bold text-vpos-text"><Icon name="user-3-line" className="text-vpos-primary" /> Customer</h3><p className="mb-1 text-[13px] font-semibold text-vpos-text">{selectedOrder.customer}</p><p className="mb-1 text-[12px] text-vpos-muted">{selectedOrder.phone}</p>{selectedOrder.email ? <p className="m-0 text-[12px] text-vpos-muted">{selectedOrder.email}</p> : null}</section>
              <section className="rounded-[4px] border border-vpos-line p-4"><h3 className="mb-3 mt-0 flex items-center gap-2 text-[12px] font-bold text-vpos-text"><Icon name={selectedOrder.fulfillment === 'Pickup' ? 'store-2-line' : 'map-pin-line'} className="text-vpos-primary" /> {selectedOrder.fulfillment}</h3>{selectedOrder.address ? <p className="mb-1 text-[12px] leading-relaxed text-vpos-text">{selectedOrder.address}</p> : <p className="mb-1 text-[12px] text-vpos-text">Customer pickup</p>}<p className="m-0 text-[12px] text-vpos-muted">{selectedOrder.area}</p>{selectedOrder.note ? <p className="mb-0 mt-2 rounded bg-vpos-subtle px-2.5 py-2 text-[11px] text-vpos-text"><strong>Note:</strong> {selectedOrder.note}</p> : null}{selectedOrder.rejectionReason ? <p className="mb-0 mt-2 rounded bg-vpos-red-bg px-2.5 py-2 text-[11px] text-vpos-red"><strong>Merchant rejection reason:</strong> {selectedOrder.rejectionReason}</p> : null}</section>
            </div>

            <section className="overflow-hidden rounded-[4px] border border-vpos-line"><div className="flex items-center justify-between border-b border-vpos-line bg-vpos-subtle/50 px-4 py-3"><h3 className="m-0 text-[12px] font-bold text-vpos-text">Items ({selectedOrder.items.reduce((sum, item) => sum + item.quantity, 0)})</h3><span className="text-[11px] text-vpos-muted">Payment: {selectedOrder.paymentMethod}</span></div><div className="divide-y divide-vpos-line">{selectedOrder.items.map((item) => <div key={`${selectedOrder.id}-${item.name}`} className="flex items-center justify-between gap-4 px-4 py-3"><div><p className="m-0 text-[12px] font-semibold text-vpos-text">{item.name}</p>{item.variant ? <p className="mb-0 mt-0.5 text-[10px] text-vpos-muted">{item.variant}</p> : null}<p className="mb-0 mt-1 text-[10px] text-vpos-muted">Qty {item.quantity} × {formatCurrency(item.unitPrice, 'USD')}</p></div><strong className="shrink-0 text-[12px] text-vpos-text">{formatCurrency(item.quantity * item.unitPrice, 'USD')}</strong></div>)}</div><div className="space-y-2 border-t border-vpos-line bg-vpos-subtle/30 px-4 py-3 text-[12px]"><div className="flex justify-between text-vpos-muted"><span>Subtotal</span><span>{formatCurrency(selectedOrder.subtotal, 'USD')}</span></div>{selectedOrder.discount > 0 ? <div className="flex justify-between text-vpos-muted"><span>Discount</span><span>−{formatCurrency(selectedOrder.discount, 'USD')}</span></div> : null}<div className="flex justify-between text-vpos-muted"><span>Delivery fee</span><span>{formatCurrency(selectedOrder.deliveryFee, 'USD')}</span></div><div className="flex justify-between border-t border-vpos-line pt-2 text-[14px] font-bold text-vpos-text"><span>Total</span><span>{formatCurrency(total(selectedOrder), 'USD')}</span></div></div></section>
          </div> : null}
        </Modal>

        <Modal
          open={Boolean(rejectingOrder)}
          onClose={() => setRejectingOrderId(null)}
          size="md"
          title="Reject this order?"
          description={rejectingOrder ? `${rejectingOrder.id} · ${rejectingOrder.customer}` : undefined}
          footer={<div className="flex w-full justify-end gap-2"><Button variant="secondary" onClick={() => setRejectingOrderId(null)}>Keep order</Button><Button variant="danger" disabled={!rejectReason || (rejectReason === 'Other' && !rejectNote.trim())} onClick={rejectOrder}><Icon name="close-circle-line" /> Reject order</Button></div>}
        >
          {rejectingOrder ? <div className="space-y-4">
            <div className="rounded-[4px] border border-vpos-red/20 bg-vpos-red-bg p-3 text-[12px] leading-relaxed text-vpos-red">Rejecting will mark this sample order as <strong>Rejected by merchant</strong>. The customer will need to be contacted outside this demo.</div>
            <label className="block text-[12px] font-semibold text-vpos-dark" htmlFor="merchant-reject-reason">Reason for rejecting <span className="text-vpos-red">*</span>
              <select id="merchant-reject-reason" className={`${selectClass} mt-2 w-full`} value={rejectReason} onChange={(event) => setRejectReason(event.target.value)}>
                <option value="">Choose a reason</option><option>Out of stock</option><option>Outside delivery area</option><option>Store is closing</option><option>Unable to fulfill</option><option>Other</option>
              </select>
            </label>
            <label className="block text-[12px] font-semibold text-vpos-dark" htmlFor="merchant-reject-note">{rejectReason === 'Other' ? 'Explain the reason' : 'Note for the order'}{rejectReason === 'Other' ? <span className="text-vpos-red"> *</span> : <span className="font-normal text-vpos-muted"> · optional</span>}
              <textarea id="merchant-reject-note" className="mt-2 min-h-[84px] w-full resize-y rounded-[4px] border border-vpos-line bg-white px-3 py-2.5 text-[13px] font-normal text-vpos-text outline-none focus:border-vpos-primary focus:ring-2 focus:ring-vpos-primary/10" value={rejectNote} onChange={(event) => setRejectNote(event.target.value)} placeholder="Add details to help your team follow up" />
            </label>
          </div> : null}
        </Modal>
      </main>
    </>
  )
}
