import { useMemo, useState } from 'react'
import {
  Breadcrumb,
  Button,
  DataTable,
  Icon,
  MetricCard,
  Select,
  Status,
  StoreSwitcher,
  Topbar,
  type DataTableColumn,
} from '../components'
import { SalesSubnav } from '../components/sales/SalesSubnav'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useRecentOrders } from '../features/orders/useOrders'
import { orderApi } from '../features/orders/orderApi'
import type { PosOrder } from '../features/orders/types'
import { useStoresRaw } from '../features/stores/useStores'
import { useAdminStore } from '../hooks/useAdminStore'
import { formatCurrency } from '../lib/currency'
import { formatReportDate } from '../lib/reporting'
import { openReceiptWindow, printReceipt } from '../lib/receipt'
import { readPosSettings } from '../features/pos/posSettings'
import { pageContent } from '../lib/ui'
import { OrderDetailModal } from '../components/orders/OrderDetailModal'
import { BookCourierModal } from '../components/deliveries/BookCourierModal'

const channels = ['All channels', 'ONLINE', 'POS'] as const
const statuses = [
  'All status',
  'PENDING_CONFIRMATION',
  'CONFIRMED',
  'PACKING',
  'SHIPPED',
  'DELIVERED',
  'COMPLETED',
  'CANCELLED',
] as const
const payments = ['All payments', 'CASH', 'CARD', 'QR'] as const

export function SalesPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const { storeId, setStoreId } = useAdminStore()
  const storesQuery = useStoresRaw()

  const [channel, setChannel] = useState<(typeof channels)[number]>('All channels')
  const [status, setStatus] = useState<(typeof statuses)[number]>('All status')
  const [payment, setPayment] = useState<(typeof payments)[number]>('All payments')

  const [selectedOrderForDetail, setSelectedOrderForDetail] = useState<PosOrder | null>(null)
  const [selectedOrderForCourier, setSelectedOrderForCourier] = useState<PosOrder | null>(null)

  const ordersQuery = useRecentOrders({
    storeId,
    channel: channel === 'All channels' ? undefined : channel,
    status: status === 'All status' ? undefined : status,
    size: 100,
  })

  const orders = useMemo(() => ordersQuery.data?.content ?? [], [ordersQuery.data])
  const currency = (user?.business.defaultCurrencyCode || 'USD').toUpperCase()
  const selectedStore = storesQuery.data?.find((store) => String(store.id) === String(storeId))

  const filteredOrders = useMemo(() => orders.filter((order) => (
    (payment === 'All payments' || order.paymentMethod === payment)
  )), [orders, payment])

  const onlineCount = orders.filter((order) => order.orderChannel === 'ONLINE').length
  const completedCount = orders.filter((order) => order.orderStatus === 'COMPLETED').length
  const loadedSales = orders
    .filter((order) => order.orderStatus === 'COMPLETED')
    .reduce((sum, order) => sum + Number(order.grandTotal || 0), 0)

  const printOrder = async (order: PosOrder) => {
    const receiptWindow = openReceiptWindow()
    if (!receiptWindow) {
      toast('The receipt window was blocked. Allow pop-ups for this POS site and try again.', 'warning')
      return
    }
    try {
      const fullOrder = order.items?.length ? order : await orderApi.get(order.id)
      const settings = readPosSettings(user?.business.id)
      if (!printReceipt(fullOrder, {
        paperSize: settings.receiptPaperSize,
        businessName: user?.business.name,
        taxRegistrationNumber: user?.business.taxRegistrationNumber,
        taxRegistrationLabel: user?.business.taxRegistrationLabel,
        businessLogoUrl: user?.business.logoUrl,
        store: selectedStore,
        cashierName: user?.name,
        customerName: Number(fullOrder.customerId) > 0 ? `Customer #${fullOrder.customerId}` : 'Walk-in customer',
        paymentMethod: fullOrder.paymentMethod,
        usdToKhrRate: Number(user?.business.usdToKhrExchangeRate || 4000),
        showLogo: settings.receiptShowLogo,
        showSku: settings.receiptShowSku,
        showCustomer: settings.receiptShowCustomer,
        footer: settings.receiptFooter,
      }, receiptWindow)) {
        toast('The receipt window was closed before it could be printed.', 'warning')
      }
    } catch (error) {
      receiptWindow.close()
      toast(error instanceof Error ? error.message : 'The receipt could not be loaded.', 'error')
    }
  }

  const columns = useMemo<DataTableColumn<PosOrder>[]>(() => [
    {
      id: 'orderNo',
      header: 'Order',
      searchable: (order) => `${order.orderNo} ${order.id}`,
      cell: (order) => (
        <div>
          <button
            type="button"
            className="text-left font-bold text-vpos-primary hover:underline"
            onClick={() => setSelectedOrderForDetail(order)}
          >
            {order.orderNo || `#${order.id}`}
          </button>
          <div className="text-[11px] text-vpos-muted">
            {order.orderChannel === 'ONLINE' ? '🌐 Online' : '🏪 In-Store'}
          </div>
        </div>
      ),
    },
    { id: 'date', header: 'Date', hideOnMobile: true, cell: (order) => formatReportDate(order.completedAt || order.createdAt) },
    {
      id: 'customer',
      header: 'Customer',
      hideOnMobile: true,
      cell: (order) => order.deliveryAddress?.receiverName || (Number(order.customerId) > 0 ? `Customer #${order.customerId}` : 'Walk-in customer'),
    },
    { id: 'payment', header: 'Payment', cell: (order) => paymentLabel(order.paymentMethod) },
    { id: 'total', header: 'Total', cell: (order) => <strong>{formatCurrency(order.grandTotal, order.currencyCode || currency)}</strong> },
    {
      id: 'status',
      header: 'Status',
      searchable: (order) => order.orderStatus,
      cell: (order) => <Status value={statusLabel(order.orderStatus)} />,
    },
    {
      id: 'actions',
      header: '',
      cell: (order) => (
        <div className="flex items-center justify-end gap-1">
          <Button variant="secondary" onClick={() => setSelectedOrderForDetail(order)}>
            <Icon name="eye-line" /> Details
          </Button>
          {order.orderStatus === 'CONFIRMED' && order.orderChannel === 'ONLINE' && (
            <Button
              variant="secondary"
              onClick={() => setSelectedOrderForCourier(order)}
            >
              <Icon name="truck-line" /> Courier
            </Button>
          )}
          <Button variant="text" onClick={() => void printOrder(order)}>
            <Icon name="printer-line" /> Receipt
          </Button>
        </div>
      ),
    },
  ], [currency, selectedStore, toast, user])

  return (
    <>
      <Topbar
        title="Sales & Orders"
        subtitle="Manage in-store POS sales, online orders, delivery fulfillment, and receipts"
        actions={<StoreSwitcher value={storeId} onChange={setStoreId} />}
      />
      <main className={pageContent}>
        <section className="mb-5 flex min-h-12 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Breadcrumb items={[{ label: 'Sales' }, { label: 'All orders & sales' }]} />
          <Button variant="secondary" onClick={() => void ordersQuery.refetch()}>
            <Icon name="refresh-line" /> Refresh orders
          </Button>
        </section>
        <SalesSubnav />

        {ordersQuery.isError ? (
          <div className="mb-4 rounded-[4px] border border-vpos-red/25 bg-vpos-red-bg p-4 text-[13px] text-vpos-red">
            {ordersQuery.error instanceof Error ? ordersQuery.error.message : 'Orders could not be loaded.'}
          </div>
        ) : null}

        <section className="mb-[18px] grid grid-cols-1 gap-[18px] sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Total Orders"
            value={String(ordersQuery.data?.totalElements ?? orders.length)}
            trend="Selected store"
            trendAs="small"
            icon={<Icon name="file-list-3-line" />}
          />
          <MetricCard
            label="Online Orders"
            value={String(onlineCount)}
            trend="Marketplace / Delivery"
            trendAs="small"
            icon={<Icon name="global-line" />}
            iconTone="primary"
          />
          <MetricCard
            label="Completed Sales"
            value={formatCurrency(loadedSales, currency)}
            trend={`${completedCount} completed`}
            trendAs="small"
            icon={<Icon name="funds-line" />}
            iconTone="positive"
          />
          <MetricCard
            label="Store"
            value={selectedStore?.name || String(storeId || '—')}
            trend="Current active store"
            trendAs="small"
            icon={<Icon name="store-2-line" />}
          />
        </section>

        <DataTable
          data={filteredOrders}
          columns={columns}
          rowKey={(order) => order.id}
          title="All orders & sales"
          searchPlaceholder="Search order number or ID…"
          pageSize={10}
          isLoading={ordersQuery.isLoading}
          emptyMessage="No orders match the selected filters."
          toolbar={
            <>
              <Select
                variant="toolbar"
                value={channel === 'All channels' ? '' : channel}
                onChange={(value) => setChannel((value || 'All channels') as (typeof channels)[number])}
                placeholder="All channels"
                options={channels.slice(1).map((value) => ({ value, label: value === 'ONLINE' ? 'Online / Marketplace' : 'In-Store POS' }))}
              />
              <Select
                variant="toolbar"
                value={status === 'All status' ? '' : status}
                onChange={(value) => setStatus((value || 'All status') as (typeof statuses)[number])}
                placeholder="All status"
                options={statuses.slice(1).map((value) => ({ value, label: statusLabel(value) }))}
              />
              <Select
                variant="toolbar"
                value={payment === 'All payments' ? '' : payment}
                onChange={(value) => setPayment((value || 'All payments') as (typeof payments)[number])}
                placeholder="All payments"
                options={payments.slice(1).map((value) => ({ value, label: paymentLabel(value) }))}
              />
            </>
          }
        />

        {/* Modals */}
        <OrderDetailModal
          order={selectedOrderForDetail}
          store={selectedStore}
          isOpen={Boolean(selectedOrderForDetail)}
          onClose={() => {
            setSelectedOrderForDetail(null)
            void ordersQuery.refetch()
          }}
          onBookDelivery={(order) => {
            setSelectedOrderForDetail(null)
            setSelectedOrderForCourier(order)
          }}
        />

        <BookCourierModal
          order={selectedOrderForCourier}
          isOpen={Boolean(selectedOrderForCourier)}
          onClose={() => {
            setSelectedOrderForCourier(null)
            void ordersQuery.refetch()
          }}
          onSuccess={() => void ordersQuery.refetch()}
        />
      </main>
    </>
  )
}

function statusLabel(value: string): string {
  return value.toLowerCase().replace(/(^|_)([a-z])/g, (_, prefix, letter) => `${prefix ? ' ' : ''}${letter.toUpperCase()}`)
}

function paymentLabel(value?: string | null): string {
  if (value === 'CASH') return 'Cash'
  if (value === 'CARD') return 'Card'
  if (value === 'QR') return 'QR'
  return value || 'Unpaid'
}
