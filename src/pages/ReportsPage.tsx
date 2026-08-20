import { useMemo, useState } from 'react'
import {
  Breadcrumb,
  Button,
  DataTable,
  Icon,
  MetricCard,
  StoreSwitcher,
  Topbar,
  type DataTableColumn,
} from '../components'
import { PaymentBreakdownTable } from '../components/reports/PaymentBreakdownTable'
import { ReportDateFilter } from '../components/reports/ReportDateFilter'
import { ReportsSubnav } from '../components/reports/ReportsSubnav'
import { useAuth } from '../context/AuthContext'
import { usePaymentBreakdown } from '../features/payments/usePayments'
import { useSalesSummary, useTopProducts } from '../features/orders/useOrders'
import type { TopProduct } from '../features/orders/types'
import { useAdminStore } from '../hooks/useAdminStore'
import { formatCurrency } from '../lib/currency'
import { defaultReportFrom, reportDateTimeRange, localDateValue } from '../lib/reporting'
import { paths } from '../lib/paths'
import { card, pageContent } from '../lib/ui'

export type ReportsSection = 'overview' | 'products' | 'payments' | 'stores' | 'tax'

export function ReportsPage({ section = 'overview' }: { section?: ReportsSection }) {
  const { user } = useAuth()
  const { storeId, setStoreId } = useAdminStore()
  const [from, setFrom] = useState(defaultReportFrom)
  const [to, setTo] = useState(() => localDateValue())
  const range = useMemo(() => reportDateTimeRange(from, to), [from, to])
  const currency = (user?.business.defaultCurrencyCode || 'USD').toUpperCase()
  const showSummary = section !== 'products' && section !== 'payments'
  const showProducts = section === 'overview' || section === 'products'
  const showPayments = section === 'overview' || section === 'payments'
  const summaryQuery = useSalesSummary(storeId, range.from, range.to, showSummary)
  const productsQuery = useTopProducts(storeId, range.from, range.to, 10, showProducts)
  const paymentsQuery = usePaymentBreakdown(storeId, range.from, range.to, showPayments)
  const summary = summaryQuery.data
  const products = productsQuery.data ?? []
  const payments = paymentsQuery.data ?? []
  const title = sectionTitle(section)
  const subtitle = sectionSubtitle(section)
  const columns = useMemo<DataTableColumn<TopProduct>[]>(() => [
    {
      id: 'product',
      header: 'Product',
      searchable: (row) => `${row.productName} ${row.sku ?? ''}`,
      cell: (row) => <div><strong className="block text-[13px] text-vpos-text">{row.productName}</strong><small className="text-[11px] text-vpos-muted">{row.sku || `Variant #${row.variantId}`}</small></div>,
    },
    { id: 'quantity', header: 'Units sold', cell: (row) => row.quantity },
    { id: 'sales', header: 'Sales', cell: (row) => <strong>{formatCurrency(row.salesAmount, currency)}</strong> },
  ], [currency])

  const paymentTotal = payments.reduce((total, row) => total + Number(row.totalAmount || 0), 0)
  const refundedTotal = payments.reduce((total, row) => total + Number(row.refundedAmount || 0), 0)
  const orderCount = Number(summary?.orderCount || 0)
  const averageOrder = orderCount > 0 ? Number(summary?.grandTotal || 0) / orderCount : 0

  return (
    <>
      <Topbar title={title} subtitle={subtitle} actions={<StoreSwitcher value={storeId} onChange={setStoreId} />} />
      <main className={pageContent}>
        <section className="mb-5 flex min-h-12 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Breadcrumb items={[{ label: 'Reports', to: paths.reports }, { label: title }]} />
          <Button variant="secondary" onClick={() => { void Promise.all([summaryQuery.refetch(), productsQuery.refetch(), paymentsQuery.refetch()]) }}>
            <Icon name="refresh-line" /> Refresh report
          </Button>
        </section>

        <ReportsSubnav />
        <ReportDateFilter from={from} to={to} onFromChange={setFrom} onToChange={setTo} onRefresh={() => { void Promise.all([summaryQuery.refetch(), productsQuery.refetch(), paymentsQuery.refetch()]) }} />

        {summaryQuery.isError || productsQuery.isError || paymentsQuery.isError ? (
          <div className="mt-4 rounded-[4px] border border-vpos-red/25 bg-vpos-red-bg p-4 text-[13px] text-vpos-red">
            {(summaryQuery.error || productsQuery.error || paymentsQuery.error) instanceof Error
              ? (summaryQuery.error || productsQuery.error || paymentsQuery.error)?.message
              : 'The report could not be loaded.'}
          </div>
        ) : null}

        {showSummary ? (
          <section className="mt-[18px] grid grid-cols-1 gap-[18px] sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Net sales" value={formatCurrency(summary?.grandTotal ?? 0, currency)} trend={`${orderCount} completed orders`} trendAs="small" icon={<Icon name="funds-line" />} iconTone="positive" />
            <MetricCard label="Subtotal" value={formatCurrency(summary?.subtotal ?? 0, currency)} trend="Before discounts and tax" trendAs="small" icon={<Icon name="shopping-bag-3-line" />} />
            <MetricCard label="Discounts" value={formatCurrency(summary?.discount ?? 0, currency)} trend="Applied to completed sales" trendAs="small" icon={<Icon name="price-tag-3-line" />} iconTone="warning" />
            <MetricCard label="Average order" value={formatCurrency(averageOrder, currency)} trend={formatCurrency(summary?.tax ?? 0, currency) + ' tax'} trendAs="small" icon={<Icon name="bar-chart-box-line" />} />
          </section>
        ) : null}

        {section === 'overview' ? (
          <div className="mt-[18px] grid gap-[18px] xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,.85fr)]">
            <section className={`${card} overflow-hidden p-0`}>
              <header className="flex items-center justify-between border-b border-vpos-line px-5 py-4"><div><h2 className="m-0 text-[15px] font-extrabold text-vpos-text">Top products</h2><p className="mt-1 mb-0 text-[12px] text-vpos-muted">Units and sales for the selected period.</p></div><Icon name="line-chart-line" className="text-[20px] text-vpos-primary" /></header>
              <DataTable data={products} columns={columns} rowKey={(row) => row.variantId} searchable={false} pageSize={5} isLoading={productsQuery.isLoading} emptyMessage="No completed product sales found." />
            </section>
            <section className={`${card} overflow-hidden p-0`}>
              <header className="border-b border-vpos-line px-5 py-4"><h2 className="m-0 text-[15px] font-extrabold text-vpos-text">Payment & cash</h2><p className="mt-1 mb-0 text-[12px] text-vpos-muted">Collected and refunded amounts by method.</p></header>
              <PaymentBreakdownTable rows={payments} currency={currency} />
            </section>
          </div>
        ) : null}

        {section === 'products' ? (
          <section className={`${card} mt-[18px] overflow-hidden p-0`}>
            <header className="border-b border-vpos-line px-5 py-4"><h2 className="m-0 text-[15px] font-extrabold text-vpos-text">Product performance</h2><p className="mt-1 mb-0 text-[12px] text-vpos-muted">Completed sales ranked by units sold.</p></header>
            <DataTable data={products} columns={columns} rowKey={(row) => row.variantId} searchPlaceholder="Search product or SKU…" pageSize={10} isLoading={productsQuery.isLoading} emptyMessage="No completed product sales found." />
          </section>
        ) : null}

        {section === 'payments' ? (
          <section className={`${card} mt-[18px] overflow-hidden p-0`}>
            <header className="flex flex-wrap items-center justify-between gap-3 border-b border-vpos-line px-5 py-4"><div><h2 className="m-0 text-[15px] font-extrabold text-vpos-text">Payment & cash report</h2><p className="mt-1 mb-0 text-[12px] text-vpos-muted">Settled payments recorded for the selected store.</p></div><div className="text-right"><strong className="block text-[16px] text-vpos-text">{formatCurrency(paymentTotal, currency)}</strong><small className="text-[11px] text-vpos-muted">{formatCurrency(refundedTotal, currency)} refunded</small></div></header>
            <PaymentBreakdownTable rows={payments} currency={currency} />
          </section>
        ) : null}

        {section === 'stores' ? (
          <section className={`${card} mt-[18px] p-5`}>
            <div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-vpos-sand text-[20px] text-vpos-primary"><Icon name="building-2-line" /></span><div><h2 className="m-0 text-[15px] font-extrabold text-vpos-text">Store & cashier</h2><p className="mt-1 mb-0 text-[13px] leading-6 text-vpos-muted">This report is scoped to the selected store. Cashier-level aggregation will be enabled when cashier reporting is exposed by the order service.</p></div></div>
            <div className="mt-5 rounded-[4px] border border-vpos-line bg-vpos-subtle p-4 text-[13px] text-vpos-text"><strong>Selected store:</strong> {storeId || 'No store selected'}<span className="mx-2 text-vpos-muted">·</span><strong>Completed sales:</strong> {orderCount}</div>
          </section>
        ) : null}

        {section === 'tax' ? (
          <section className={`${card} mt-[18px] p-5`}>
            <div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-vpos-orange-bg text-[20px] text-vpos-orange"><Icon name="file-list-3-line" /></span><div><h2 className="m-0 text-[15px] font-extrabold text-vpos-text">Tax, discounts & refunds</h2><p className="mt-1 mb-0 text-[13px] leading-6 text-vpos-muted">The current order report provides tax and discounts for completed sales. Refund detail will appear here as refund workflows are used.</p></div></div>
            <div className="mt-5 grid gap-3 sm:grid-cols-3"><SummaryLine label="Tax collected" value={formatCurrency(summary?.tax ?? 0, currency)} /><SummaryLine label="Discounts" value={formatCurrency(summary?.discount ?? 0, currency)} /><SummaryLine label="Refunds" value={formatCurrency(refundedTotal, currency)} /></div>
          </section>
        ) : null}
      </main>
    </>
  )
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return <div className="rounded-[4px] border border-vpos-line bg-vpos-subtle p-4"><span className="block text-[11px] font-bold uppercase tracking-[0.06em] text-vpos-muted">{label}</span><strong className="mt-2 block text-[18px] text-vpos-text">{value}</strong></div>
}

function sectionTitle(section: ReportsSection): string {
  if (section === 'products') return 'Product performance'
  if (section === 'payments') return 'Payment & cash'
  if (section === 'stores') return 'Store & cashier'
  if (section === 'tax') return 'Tax, discounts & refunds'
  return 'Sales overview'
}

function sectionSubtitle(section: ReportsSection): string {
  if (section === 'products') return 'Find the products and variants driving sales.'
  if (section === 'payments') return 'Reconcile payment methods and refunded amounts.'
  if (section === 'stores') return 'Review performance for the selected store.'
  if (section === 'tax') return 'Review tax and discount impact on completed sales.'
  return 'Understand sales performance for the selected period.'
}
