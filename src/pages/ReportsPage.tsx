import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  Breadcrumb,
  Button,
  DataTable,
  Icon,
  MetricCard,
  Select,
  StoreSwitcher,
  Topbar,
  type DataTableColumn,
} from '../components'
import { PaymentBreakdownTable } from '../components/reports/PaymentBreakdownTable'
import { ReportPeriodFilter } from '../components/reports/ReportPeriodFilter'
import { SalesBreakdownPanel, type BreakdownRow } from '../components/reports/SalesBreakdownPanel'
import { ReportsSubnav } from '../components/reports/ReportsSubnav'
import { useAuth } from '../context/AuthContext'
import { usePaymentBreakdown, usePaymentPeriods } from '../features/payments/usePayments'
import { useSalesBreakdown, useSalesSummary, useTopProducts } from '../features/orders/useOrders'
import type { TopProduct } from '../features/orders/types'
import { useAdminStore } from '../hooks/useAdminStore'
import { formatCurrency } from '../lib/currency'
import {
  bucketFor,
  bucketLabel,
  downloadCsv,
  percentChange,
  periodBuckets,
  periodContaining,
  periodLabel,
  reportDateTimeRange,
  shiftPeriod,
  type ReportPeriod,
} from '../lib/reporting'
import { paths } from '../lib/paths'
import { card, pageContent } from '../lib/ui'

export type ReportsSection = 'overview' | 'products' | 'payments' | 'stores' | 'tax'

export function ReportsPage({ section = 'overview' }: { section?: ReportsSection }) {
  const { user } = useAuth()
  const { storeId, setStoreId } = useAdminStore()
  const businessCurrency = (user?.business.defaultCurrencyCode || 'USD').toUpperCase()
  const [currency, setCurrency] = useState(businessCurrency)
  const [period, setPeriodState] = useState<ReportPeriod>(loadPeriod)
  const setPeriod = (next: ReportPeriod) => {
    setPeriodState(next)
    savePeriod(next)
  }
  const range = useMemo(() => reportDateTimeRange(period.from, period.to), [period])
  const previous = useMemo(() => shiftPeriod(period, -1), [period])
  const previousRange = useMemo(() => reportDateTimeRange(previous.from, previous.to), [previous])
  const bucket = bucketFor(period)
  const showSummary = section !== 'products' && section !== 'payments'
  const showProducts = section === 'overview' || section === 'products'
  const showPayments = section === 'overview' || section === 'payments'
  const showBreakdown = section === 'overview' || section === 'tax'
  const summaryQuery = useSalesSummary(storeId, range.from, range.to, currency, showSummary)
  const previousSummaryQuery = useSalesSummary(storeId, previousRange.from, previousRange.to, currency, showSummary)
  const productsQuery = useTopProducts(storeId, range.from, range.to, currency, section === 'products' ? 100 : 10, showProducts)
  const paymentsQuery = usePaymentBreakdown(storeId, range.from, range.to, currency, showPayments)
  const breakdownQuery = useSalesBreakdown(storeId, range.from, range.to, currency, bucket, showBreakdown)
  const refundPeriodsQuery = usePaymentPeriods(storeId, range.from, range.to, currency, bucket, showBreakdown)
  const breakdownRows = useMemo<BreakdownRow[]>(() => {
    const sales = new Map((breakdownQuery.data ?? []).map((row) => [row.period, row]))
    const refunds = new Map((refundPeriodsQuery.data ?? []).map((row) => [row.period, Number(row.refundedAmount || 0)]))
    const multiDay = period.from !== period.to
    return periodBuckets(period, bucket).map((key) => {
      const row = sales.get(key)
      return {
        key,
        label: bucketLabel(key, bucket, multiDay),
        orderCount: Number(row?.orderCount || 0),
        subtotal: Number(row?.subtotal || 0),
        discount: Number(row?.discount || 0),
        tax: Number(row?.tax || 0),
        grandTotal: Number(row?.grandTotal || 0),
        refunded: refunds.get(key) ?? 0,
      }
    })
  }, [breakdownQuery.data, refundPeriodsQuery.data, period, bucket])
  const queryClient = useQueryClient()
  // Only the reports shown on this tab are fetched again.
  const refreshAll = () => { void queryClient.invalidateQueries({ queryKey: ['reports'] }) }
  const summary = summaryQuery.data
  const previousSummary = previousSummaryQuery.data
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
  const previousOrderCount = Number(previousSummary?.orderCount || 0)
  const previousAverage = previousOrderCount > 0 ? Number(previousSummary?.grandTotal || 0) / previousOrderCount : 0
  const versus = `vs ${PREVIOUS_LABEL[period.kind]}`
  /** "▲ 12% vs previous week", green when sales went up (red for discounts going up), or null with nothing to compare. */
  const compare = (current: number, before: number, upIsGood = true) => {
    if (!previousSummary) return null
    const change = percentChange(current, before)
    if (change === null) return current > 0 ? { text: `New ${versus}`, tone: 'positive' as const } : null
    if (Math.abs(change) < 0.05) return { text: `No change ${versus}`, tone: 'primary' as const }
    const up = change > 0
    return { text: `${up ? '▲' : '▼'} ${Math.abs(change).toFixed(1)}% ${versus}`, tone: up === upIsGood ? 'positive' as const : 'danger' as const }
  }
  const salesChange = compare(Number(summary?.grandTotal || 0), Number(previousSummary?.grandTotal || 0))
  const ordersChange = compare(orderCount, previousOrderCount)
  const discountChange = compare(Number(summary?.discount || 0), Number(previousSummary?.discount || 0), false)
  const averageChange = compare(averageOrder, previousAverage)

  const fileStem = `tinhluk-${section}-${period.from}${period.to !== period.from ? `_${period.to}` : ''}-${currency}`
  const reportHeader = (name: string) => [[`TinhLuk ${name}`], ['Period', periodLabel(period)], ['Currency', currency], []]
  const exportReport = () => {
    if (section === 'products') {
      downloadCsv(`${fileStem}.csv`, [...reportHeader('product performance'), ['Product', 'SKU', 'Units sold', 'Sales'],
        ...products.map((row) => [row.productName, row.sku ?? '', row.quantity, Number(row.salesAmount || 0)])])
    } else if (section === 'payments') {
      downloadCsv(`${fileStem}.csv`, [...reportHeader('payment & cash report'), ['Method', 'Provider', 'Payments', 'Collected', 'Refunded'],
        ...payments.map((row) => [row.method, row.provider, row.paymentCount, Number(row.totalAmount || 0), Number(row.refundedAmount || 0)])])
    } else {
      const total = (pick: (row: BreakdownRow) => number) => breakdownRows.reduce((sum, row) => sum + pick(row), 0)
      downloadCsv(`${fileStem}.csv`, [...reportHeader(section === 'tax' ? 'tax, discounts & refunds' : 'sales report'),
        [bucket === 'HOUR' ? 'Hour' : bucket === 'DAY' ? 'Day' : 'Month', 'Orders', 'Subtotal', 'Discounts', 'Tax', 'Net sales', 'Refunds'],
        ...breakdownRows.map((row) => [row.key, row.orderCount, row.subtotal, row.discount, row.tax, row.grandTotal, row.refunded]),
        ['Total', total((row) => row.orderCount), total((row) => row.subtotal), total((row) => row.discount), total((row) => row.tax), total((row) => row.grandTotal), total((row) => row.refunded)]])
    }
  }
  const canExport = section !== 'stores'

  return (
    <>
      <Topbar title={title} subtitle={subtitle} actions={(
        <div className="flex items-end gap-3">
          <Select label="Report currency" value={currency} onChange={setCurrency} variant="toolbar" className="w-[190px]" options={[
            { value: 'USD', label: 'USD / US Dollar' },
            { value: 'KHR', label: 'KHR / Cambodian Riel' },
          ]} />
          <StoreSwitcher value={storeId} onChange={setStoreId} />
        </div>
      )} />
      <main className={pageContent}>
        <section className="mb-5 flex min-h-12 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Breadcrumb items={[{ label: 'Reports', to: paths.reports }, { label: title }]} />
          {canExport ? (
            <Button variant="secondary" onClick={exportReport}>
              <Icon name="file-excel-2-line" /> Export to Excel
            </Button>
          ) : null}
        </section>

        <ReportsSubnav />
        <ReportPeriodFilter period={period} onChange={setPeriod} onRefresh={refreshAll} />

        {summaryQuery.isError || productsQuery.isError || paymentsQuery.isError ? (
          <div className="mt-4 rounded-[4px] border border-vpos-red/25 bg-vpos-red-bg p-4 text-[13px] text-vpos-red">
            {(summaryQuery.error || productsQuery.error || paymentsQuery.error) instanceof Error
              ? (summaryQuery.error || productsQuery.error || paymentsQuery.error)?.message
              : 'The report could not be loaded.'}
          </div>
        ) : null}

        {showSummary ? (
          <section className="mt-[18px] grid grid-cols-1 gap-[18px] sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Net sales" value={formatCurrency(summary?.grandTotal ?? 0, currency)} trend={salesChange?.text ?? `${formatCurrency(previousSummary?.grandTotal ?? 0, currency)} ${versus}`} trendTone={salesChange?.tone ?? 'primary'} trendAs="small" icon={<Icon name="funds-line" />} iconTone="positive" />
            <MetricCard label="Completed orders" value={orderCount} trend={ordersChange?.text ?? `${previousOrderCount} ${versus}`} trendTone={ordersChange?.tone ?? 'primary'} trendAs="small" icon={<Icon name="shopping-bag-3-line" />} />
            <MetricCard label="Discounts" value={formatCurrency(summary?.discount ?? 0, currency)} trend={discountChange?.text ?? `${formatCurrency(summary?.tax ?? 0, currency)} tax collected`} trendTone={discountChange?.tone ?? 'primary'} trendAs="small" icon={<Icon name="price-tag-3-line" />} iconTone="warning" />
            <MetricCard label="Average order" value={formatCurrency(averageOrder, currency)} trend={averageChange?.text ?? `${formatCurrency(previousAverage, currency)} ${versus}`} trendTone={averageChange?.tone ?? 'primary'} trendAs="small" icon={<Icon name="bar-chart-box-line" />} />
          </section>
        ) : null}


        {section === 'overview' ? (
          <SalesBreakdownPanel rows={breakdownRows} bucket={bucket} currency={currency} isLoading={breakdownQuery.isLoading || refundPeriodsQuery.isLoading} />
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
            <div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-vpos-orange-bg text-[20px] text-vpos-orange"><Icon name="file-list-3-line" /></span><div><h2 className="m-0 text-[15px] font-extrabold text-vpos-text">Tax, discounts & refunds</h2><p className="mt-1 mb-0 text-[13px] leading-6 text-vpos-muted">Tax and discounts on completed sales, and refunds of payments taken in {periodLabel(period)}. The table below splits them by {bucket === 'HOUR' ? 'hour' : bucket === 'DAY' ? 'day' : 'month'}.</p></div></div>
            <div className="mt-5 grid gap-3 sm:grid-cols-3"><SummaryLine label="Tax collected" value={formatCurrency(summary?.tax ?? 0, currency)} /><SummaryLine label="Discounts" value={formatCurrency(summary?.discount ?? 0, currency)} /><SummaryLine label="Refunds" value={formatCurrency(breakdownRows.reduce((total, row) => total + row.refunded, 0), currency)} /></div>
          </section>
        ) : null}

        {section === 'tax' ? (
          <SalesBreakdownPanel rows={breakdownRows} bucket={bucket} currency={currency} isLoading={breakdownQuery.isLoading || refundPeriodsQuery.isLoading} />
        ) : null}
      </main>
    </>
  )
}

const PREVIOUS_LABEL: Record<ReportPeriod['kind'], string> = {
  day: 'previous day',
  week: 'previous week',
  month: 'previous month',
  year: 'previous year',
  custom: 'previous period',
}

const PERIOD_STORAGE_KEY = 'vpos.report-period'

/** The period last looked at in this tab, so it stays the same when moving between report pages; this week otherwise. */
function loadPeriod(): ReportPeriod {
  try {
    const saved = JSON.parse(sessionStorage.getItem(PERIOD_STORAGE_KEY) ?? 'null') as ReportPeriod | null
    const isDate = (value: unknown) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
    if (saved && saved.kind in PREVIOUS_LABEL && isDate(saved.from) && isDate(saved.to) && saved.from <= saved.to) return saved
  } catch {
    // Storage can be unavailable or hold something else; the default is fine.
  }
  return periodContaining('week')
}

function savePeriod(period: ReportPeriod) {
  try {
    sessionStorage.setItem(PERIOD_STORAGE_KEY, JSON.stringify(period))
  } catch {
    // Remembering the period is only a convenience.
  }
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
