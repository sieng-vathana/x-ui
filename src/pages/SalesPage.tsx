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

const statuses = ['All status', 'COMPLETED', 'DRAFT', 'CANCELLED'] as const
const payments = ['All payments', 'CASH', 'CARD', 'QR'] as const

export function SalesPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const { storeId, setStoreId } = useAdminStore()
  const storesQuery = useStoresRaw()
  const ordersQuery = useRecentOrders(storeId, true, 0, 100)
  const [status, setStatus] = useState<(typeof statuses)[number]>('All status')
  const [payment, setPayment] = useState<(typeof payments)[number]>('All payments')
  const orders = ordersQuery.data?.content ?? []
  const currency = (user?.business.defaultCurrencyCode || 'USD').toUpperCase()
  const selectedStore = storesQuery.data?.find((store) => String(store.id) === String(storeId))
  const filteredOrders = useMemo(() => orders.filter((order) => (
    (status === 'All status' || order.orderStatus === status)
    && (payment === 'All payments' || order.paymentMethod === payment)
  )), [orders, payment, status])
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
      cell: (order) => <strong className="text-vpos-primary">{order.orderNo || `#${order.id}`}</strong>,
    },
    { id: 'date', header: 'Date', hideOnMobile: true, cell: (order) => formatReportDate(order.completedAt || order.createdAt) },
    { id: 'customer', header: 'Customer', hideOnMobile: true, cell: (order) => Number(order.customerId) > 0 ? `Customer #${order.customerId}` : 'Walk-in customer' },
    { id: 'payment', header: 'Payment', cell: (order) => paymentLabel(order.paymentMethod) },
    { id: 'total', header: 'Total', cell: (order) => <strong>{formatCurrency(order.grandTotal, order.currencyCode || currency)}</strong> },
    { id: 'status', header: 'Status', searchable: (order) => order.orderStatus, cell: (order) => <Status value={statusLabel(order.orderStatus)} /> },
    { id: 'actions', header: '', cell: (order) => <Button variant="text" onClick={() => void printOrder(order)}><Icon name="printer-line" /> Receipt</Button> },
  ], [currency, selectedStore, toast, user])

  return (
    <>
      <Topbar title="Sales" subtitle="Orders, receipts, payments, and daily sales activity" actions={<StoreSwitcher value={storeId} onChange={setStoreId} />} />
      <main className={pageContent}>
        <section className="mb-5 flex min-h-12 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Breadcrumb items={[{ label: 'Sales' }, { label: 'All sales' }]} />
          <Button variant="secondary" onClick={() => void ordersQuery.refetch()}><Icon name="refresh-line" /> Refresh sales</Button>
        </section>
        <SalesSubnav />

        {ordersQuery.isError ? <div className="mb-4 rounded-[4px] border border-vpos-red/25 bg-vpos-red-bg p-4 text-[13px] text-vpos-red">{ordersQuery.error instanceof Error ? ordersQuery.error.message : 'Sales could not be loaded.'}</div> : null}
        <section className="mb-[18px] grid grid-cols-1 gap-[18px] sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Orders" value={String(ordersQuery.data?.totalElements ?? orders.length)} trend="Selected store" trendAs="small" icon={<Icon name="file-list-3-line" />} />
          <MetricCard label="Completed shown" value={String(completedCount)} trend="Loaded page" trendAs="small" icon={<Icon name="checkbox-circle-line" />} iconTone="positive" />
          <MetricCard label="Sales shown" value={formatCurrency(loadedSales, currency)} trend="Completed orders" trendAs="small" icon={<Icon name="funds-line" />} iconTone="positive" />
          <MetricCard label="Store" value={selectedStore?.name || String(storeId || '—')} trend="Current filter" trendAs="small" icon={<Icon name="store-2-line" />} />
        </section>

        <DataTable
          data={filteredOrders}
          columns={columns}
          rowKey={(order) => order.id}
          title="All sales"
          searchPlaceholder="Search order number or ID…"
          pageSize={10}
          isLoading={ordersQuery.isLoading}
          emptyMessage="No sales match the selected filters."
          toolbar={<><Select variant="toolbar" value={status === 'All status' ? '' : status} onChange={(value) => setStatus((value || 'All status') as (typeof statuses)[number])} placeholder="All status" options={statuses.slice(1).map((value) => ({ value, label: statusLabel(value) }))} /><Select variant="toolbar" value={payment === 'All payments' ? '' : payment} onChange={(value) => setPayment((value || 'All payments') as (typeof payments)[number])} placeholder="All payments" options={payments.slice(1).map((value) => ({ value, label: paymentLabel(value) }))} /></>}
        />
        <p className="mt-3 text-[12px] text-vpos-muted">The sales list loads the latest 100 orders for the selected store. Use the receipt action to reprint a completed sale.</p>
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
