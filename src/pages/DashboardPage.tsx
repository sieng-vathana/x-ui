import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  Breadcrumb,
  Button,
  Icon,
  MetricCard,
  ProductThumb,
  Status,
  StoreSwitcher,
  Topbar,
} from '../components'
import { ReportDateFilter } from '../components/reports/ReportDateFilter'
import { useAuth } from '../context/AuthContext'
import { useCurrentCashSession, usePaymentBreakdown } from '../features/payments/usePayments'
import { useRecentOrders, useSalesSummary, useSalesTrend, useTopProducts } from '../features/orders/useOrders'
import type { SalesTrend } from '../features/orders/types'
import { useProductsList } from '../features/products/useProducts'
import type { ProductItem } from '../features/products/types'
import { usePosSettings } from '../features/pos/posSettings'
import { useAdminStore } from '../hooks/useAdminStore'
import { formatCurrency } from '../lib/currency'
import { cn } from '../lib/cn'
import { firstName } from '../lib/greeting'
import { formatReportDate, defaultReportFrom, localDateValue, reportDateTimeRange } from '../lib/reporting'
import { paths } from '../lib/paths'
import { card, pageContent, tdClass, thClass } from '../lib/ui'

interface StockAlertRow {
  id: string | number
  productName: string
  sku: string
  image?: string
  quantity: number
  threshold: number
}

interface TrendPoint {
  date: string
  orderCount: number
  grandTotal: number
}

export function DashboardPage() {
  const { user } = useAuth()
  const { storeId, setStoreId } = useAdminStore()
  const { settings } = usePosSettings(user?.business.id)
  const [from, setFrom] = useState(defaultReportFrom)
  const [to, setTo] = useState(() => localDateValue())
  const range = useMemo(() => reportDateTimeRange(from, to), [from, to])

  const permissions = user?.permissions ?? []
  const canReadReports = permissions.includes('x-report:read')
  const canReadOrders = permissions.includes('x-order:read')
  const canReadProducts = permissions.includes('x-product:read')
  const canReadPayments = permissions.includes('x-payment:read') || permissions.includes('x-payment:create')
  const businessCurrency = (user?.business.defaultCurrencyCode || 'USD').toUpperCase()
  const currency = settings.defaultCurrencyCode === 'BUSINESS' ? businessCurrency : settings.defaultCurrencyCode

  const summaryQuery = useSalesSummary(storeId, range.from, range.to, canReadReports)
  const trendQuery = useSalesTrend(storeId, range.from, range.to, canReadReports)
  const topProductsQuery = useTopProducts(storeId, range.from, range.to, 5, canReadReports)
  const paymentsQuery = usePaymentBreakdown(storeId, range.from, range.to, canReadReports && canReadPayments)
  const ordersQuery = useRecentOrders(storeId, canReadOrders, 0, 8)
  const catalogQuery = useProductsList(storeId, canReadProducts)
  const cashSessionQuery = useCurrentCashSession(storeId, user?.id, currency, canReadPayments)

  const summary = summaryQuery.data
  const paymentRows = paymentsQuery.data ?? []
  const topProducts = topProductsQuery.data ?? []
  const recentOrders = ordersQuery.data?.content ?? []
  const cashSession = cashSessionQuery.data
  const orderCount = Number(summary?.orderCount ?? 0)
  const netSales = Number(summary?.grandTotal ?? 0)
  const averageOrder = orderCount > 0 ? netSales / orderCount : 0
  const paymentTotal = paymentRows.reduce((total, row) => total + Number(row.totalAmount || 0), 0)
  const paymentCount = paymentRows.reduce((total, row) => total + Number(row.paymentCount || 0), 0)
  const displayName = firstName(user?.name || 'there')
  const reportError = [summaryQuery, trendQuery, topProductsQuery, paymentsQuery, ordersQuery, catalogQuery, cashSessionQuery]
    .find((query) => query.isError)?.error

  const trendPoints = useMemo(
    () => buildTrendPoints(from, to, trendQuery.data ?? []),
    [from, to, trendQuery.data],
  )
  const stockAlerts = useMemo(() => buildStockAlerts(catalogQuery.data ?? []), [catalogQuery.data])

  const refreshDashboard = () => {
    void Promise.all([
      summaryQuery.refetch(),
      trendQuery.refetch(),
      topProductsQuery.refetch(),
      paymentsQuery.refetch(),
      ordersQuery.refetch(),
      catalogQuery.refetch(),
      cashSessionQuery.refetch(),
    ])
  }

  const setPreset = (days: number) => {
    const end = localDateValue()
    const start = new Date(`${end}T00:00:00`)
    start.setDate(start.getDate() - days + 1)
    setFrom(localDateValue(start))
    setTo(end)
  }

  return (
    <>
      <Topbar
        title="Overview"
        subtitle="A live view of sales, payments, register status, and stock."
        actions={<StoreSwitcher value={storeId} onChange={setStoreId} />}
      />
      <main className={cn(pageContent, 'dashboard-page')}>
        <section className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <Breadcrumb items={[{ label: 'Overview' }]} />
            <h2 className="mt-4 mb-0 text-[24px] font-semibold text-vpos-text">
              Welcome back, {displayName}! <span aria-hidden="true">👋</span>
            </h2>
            <p className="mt-1 mb-0 text-[13px] text-vpos-muted">
              Here is what is happening across your store today.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to={paths.productNew}
              className="inline-flex min-h-[39px] items-center justify-center gap-2 rounded-[4px] border border-transparent bg-vpos-primary px-4 text-[14px] font-semibold text-white no-underline transition-colors hover:bg-vpos-primary-2"
            >
              <Icon name="add-circle-line" />
              Add product
            </Link>
            <Link
              to={paths.pos}
              className="inline-flex min-h-[39px] items-center justify-center gap-2 rounded-[4px] border border-vpos-line bg-white px-4 text-[14px] font-semibold text-vpos-text no-underline transition-colors hover:border-vpos-primary hover:bg-vpos-subtle"
            >
              <Icon name="store-2-line" />
              Open POS
            </Link>
          </div>
        </section>

        <section className="flex flex-col gap-3 rounded-[4px] border border-vpos-line bg-white p-3 shadow-vpos lg:flex-row lg:items-end lg:justify-between">
          <ReportDateFilter
            from={from}
            to={to}
            onFromChange={setFrom}
            onToChange={setTo}
            onRefresh={refreshDashboard}
          />
          <div className="flex flex-wrap items-center gap-1.5 lg:pb-0.5">
            <span className="mr-1 text-[11px] font-bold uppercase tracking-[0.06em] text-vpos-muted">Quick range</span>
            {[['Today', 1], ['7 days', 7], ['30 days', 30], ['90 days', 90], ['1 year', 365]].map(([label, days]) => {
              const active = days === 7 && from === defaultReportFrom() && to === localDateValue()
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => setPreset(Number(days))}
                  className={cn(
                    'rounded-[4px] border px-3 py-2 text-[12px] font-semibold transition-colors',
                    active
                      ? 'border-vpos-primary bg-vpos-sand text-vpos-primary'
                      : 'border-vpos-line bg-white text-vpos-text hover:border-vpos-primary hover:bg-vpos-subtle',
                  )}
                >
                  {label}
                </button>
              )
            })}
          </div>
        </section>

        {reportError ? (
          <div className="mt-4 flex items-start gap-2 rounded-[4px] border border-vpos-red/25 bg-vpos-red-bg p-4 text-[13px] text-vpos-red">
            <Icon name="error-warning-line" className="mt-0.5 text-[17px]" />
            <span>{reportError instanceof Error ? reportError.message : 'Some overview data could not be loaded.'}</span>
          </div>
        ) : null}

        <section className="mt-[18px] grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Net sales"
            value={summaryQuery.isLoading ? '—' : formatCurrency(netSales, currency)}
            trend={orderCount + ' completed orders'}
            trendAs="small"
            icon={<Icon name="funds-line" />}
            iconTone="positive"
            miniBars={[12, 16, 18, 14, 22, 25, 28, 30, 34]}
          />
          <MetricCard
            label="Completed orders"
            value={summaryQuery.isLoading ? '—' : orderCount.toLocaleString('en-US')}
            trend="Selected period"
            trendAs="small"
            icon={<Icon name="file-list-3-line" />}
            iconTone="primary"
            miniBars={[10, 14, 12, 18, 22, 17, 24, 29, 26]}
          />
          <MetricCard
            label="Average order"
            value={summaryQuery.isLoading ? '—' : formatCurrency(averageOrder, currency)}
            trend="Net sales ÷ orders"
            trendAs="small"
            icon={<Icon name="bar-chart-box-line" />}
            iconTone="primary"
            miniBars={[23, 18, 20, 16, 25, 21, 29, 24, 27]}
          />
          <MetricCard
            label="Collected payments"
            value={paymentsQuery.isLoading ? '—' : formatCurrency(paymentTotal, currency)}
            trend={paymentCount + ' payments'}
            trendAs="small"
            icon={<Icon name="secure-payment-line" />}
            iconTone="positive"
            miniBars={[8, 14, 11, 16, 20, 18, 23, 27, 22]}
          />
        </section>

        <section className="mt-[18px] grid grid-cols-1 gap-[18px] xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,.8fr)]">
          <article className={cn(card, 'dashboard-panel min-h-[355px] overflow-hidden p-5')}>
            <SectionHeader
              title="Sales trend"
              subtitle={`${formatDateLabel(from)} – ${formatDateLabel(to)} · completed sales`}
              action={<Icon name="line-chart-line" className="text-[21px] text-vpos-primary" />}
            />
            {trendQuery.isLoading ? (
              <LoadingPanel label="Loading sales trend…" />
            ) : trendPoints.length === 0 ? (
              <EmptyPanel icon="line-chart-line" label="No completed sales in this period." />
            ) : (
              <SalesTrendChart points={trendPoints} currency={currency} />
            )}
          </article>

          <article className={cn(card, 'dashboard-panel min-h-[355px] overflow-hidden p-5')}>
            <SectionHeader
              title="Payment mix"
              subtitle="Collected and refunded by method"
              action={<Link to={paths.salesPayments} className="text-[12px] font-semibold text-vpos-primary no-underline hover:underline">View report</Link>}
            />
            {paymentsQuery.isLoading ? (
              <LoadingPanel label="Loading payment mix…" />
            ) : paymentRows.length === 0 ? (
              <EmptyPanel icon="secure-payment-line" label="No settled payments in this period." />
            ) : (
              <div className="mt-5 space-y-4">
                {paymentRows.map((row) => {
                  const share = paymentTotal > 0 ? Math.max(2, (Number(row.totalAmount || 0) / paymentTotal) * 100) : 0
                  return (
                    <div key={`${row.method}-${row.provider}`}>
                      <div className="mb-1.5 flex items-center justify-between gap-3 text-[13px]">
                        <span className="font-semibold text-vpos-text">{paymentLabel(row.method, row.provider)}</span>
                        <strong className="text-vpos-text">{formatCurrency(Number(row.totalAmount || 0), currency)}</strong>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-vpos-subtle">
                        <span className="block h-full rounded-full bg-vpos-primary" style={{ width: `${share}%` }} />
                      </div>
                      <div className="mt-1 flex justify-between text-[11px] text-vpos-muted">
                        <span>{row.paymentCount} payments</span>
                        <span>{Number(row.refundedAmount || 0) > 0 ? `${formatCurrency(Number(row.refundedAmount), currency)} refunded` : 'No refunds'}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </article>
        </section>

        <section className="mt-[18px] grid grid-cols-1 gap-[18px] xl:grid-cols-[minmax(0,1.15fr)_minmax(330px,.85fr)]">
          <article className={cn(card, 'dashboard-panel overflow-hidden p-0')}>
            <div className="flex items-start justify-between gap-3 border-b border-vpos-line px-5 py-4">
              <SectionHeader title="Top-selling products" subtitle="Ranked by completed units sold" />
              <Link to={paths.reportsProducts} className="shrink-0 text-[12px] font-semibold text-vpos-primary no-underline hover:underline">View all</Link>
            </div>
            {topProductsQuery.isLoading ? (
              <LoadingPanel label="Loading top products…" />
            ) : topProducts.length === 0 ? (
              <EmptyPanel icon="shopping-bag-3-line" label="No completed product sales in this period." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      {['Product', 'Units', 'Sales'].map((header) => <th key={header} className={thClass}>{header}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {topProducts.map((product, index) => (
                      <tr key={product.variantId}>
                        <td className={tdClass}>
                          <div className="flex items-center gap-3">
                            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-vpos-sand text-[12px] font-extrabold text-vpos-primary">{index + 1}</span>
                            <span>
                              <strong className="block text-[13px]">{product.productName}</strong>
                              <small className="text-[11px] text-vpos-muted">{product.sku || `Variant #${product.variantId}`}</small>
                            </span>
                          </div>
                        </td>
                        <td className={tdClass}>{product.quantity.toLocaleString('en-US')}</td>
                        <td className={tdClass}><strong>{formatCurrency(Number(product.salesAmount || 0), currency)}</strong></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </article>

          <article className={cn(card, 'dashboard-panel overflow-hidden p-0')}>
            <div className="flex items-start justify-between gap-3 border-b border-vpos-line px-5 py-4">
              <SectionHeader title="Low-stock alerts" subtitle="Items that need attention" />
              <Link to={paths.productLowStock} className="shrink-0 text-[12px] font-semibold text-vpos-primary no-underline hover:underline">View all</Link>
            </div>
            {catalogQuery.isLoading ? (
              <LoadingPanel label="Loading inventory alerts…" />
            ) : stockAlerts.length === 0 ? (
              <EmptyPanel icon="checkbox-circle-line" label="No low-stock items found." />
            ) : (
              <div className="px-5">
                {stockAlerts.map((item) => (
                  <div key={item.id} className="grid grid-cols-[42px_1fr_auto] items-center gap-3 border-b border-vpos-line/70 py-3 last:border-0">
                    <ProductThumb src={item.image} />
                    <span className="min-w-0">
                      <strong className="block truncate text-[13px]">{item.productName}</strong>
                      <small className="mt-1 block truncate text-[11px] text-vpos-muted">{item.sku}</small>
                    </span>
                    <Status value={item.quantity === 0 ? 'Out of stock' : `${item.quantity} left`} />
                  </div>
                ))}
              </div>
            )}
          </article>
        </section>

        <section className="mt-[18px] grid grid-cols-1 gap-[18px] xl:grid-cols-[minmax(0,1.15fr)_minmax(330px,.85fr)]">
          <article className={cn(card, 'dashboard-panel overflow-hidden p-0')}>
            <div className="flex items-start justify-between gap-3 border-b border-vpos-line px-5 py-4">
              <SectionHeader title="Recent sales" subtitle="Latest orders for the selected store" />
              <Link to={paths.sales} className="shrink-0 text-[12px] font-semibold text-vpos-primary no-underline hover:underline">View all</Link>
            </div>
            {ordersQuery.isLoading ? (
              <LoadingPanel label="Loading recent sales…" />
            ) : recentOrders.length === 0 ? (
              <EmptyPanel icon="file-list-3-line" label="No recent sales found." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      {['Invoice', 'Payment', 'Total', 'Status', 'Completed'].map((header) => <th key={header} className={thClass}>{header}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {recentOrders.map((order) => (
                      <tr key={order.id}>
                        <td className={cn(tdClass, 'font-bold text-vpos-primary-2')}>{order.orderNo}</td>
                        <td className={tdClass}>{paymentLabel(order.paymentMethod, undefined)}</td>
                        <td className={tdClass}><strong>{formatCurrency(Number(order.grandTotal || 0), order.currencyCode || currency)}</strong></td>
                        <td className={tdClass}><Status value={formatStatus(order.orderStatus)} /></td>
                        <td className={tdClass}>{formatReportDate(order.completedAt || order.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </article>

          <article className={cn(card, 'dashboard-panel overflow-hidden p-5')}>
            <SectionHeader
              title="Cash register"
              subtitle="Your current register session"
              action={<Status value={cashSession?.status === 'OPEN' ? 'Open' : 'Not open'} />}
            />
            {cashSessionQuery.isLoading ? (
              <LoadingPanel label="Checking register status…" />
            ) : cashSession ? (
              <>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <SummaryTile label="Cash sales" value={formatCurrency(cashSession.cashSales, currency)} />
                  <SummaryTile label="Expected cash" value={formatCurrency(cashSession.expectedCash, currency)} />
                  <SummaryTile label="Payments" value={cashSession.paymentCount.toLocaleString('en-US')} />
                  <SummaryTile label="Opened" value={formatReportDate(cashSession.openedAt)} />
                </div>
                <Link to={paths.salesCashRegister} className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-vpos-primary no-underline hover:underline">Manage cash register <Icon name="arrow-right-line" /></Link>
              </>
            ) : (
              <div className="mt-5 rounded-[4px] border border-dashed border-vpos-line bg-vpos-subtle p-4">
                <strong className="block text-[14px] text-vpos-text">No open register session</strong>
                <p className="mt-1 mb-3 text-[12px] leading-5 text-vpos-muted">Open a cash session before taking cash payments at the POS.</p>
                <Link to={paths.salesCashRegister} className="inline-flex min-h-[34px] items-center justify-center gap-2 rounded-[4px] bg-vpos-primary px-3 text-[12px] font-semibold text-white no-underline hover:bg-vpos-primary-2">Open register</Link>
              </div>
            )}
          </article>
        </section>

        <section className="mt-[18px] flex flex-wrap items-center justify-between gap-3 rounded-[4px] border border-vpos-line bg-vpos-subtle px-4 py-3 text-[12px] text-vpos-muted">
          <span>All amounts are shown in <strong className="text-vpos-text">{currency}</strong> using the current POS currency setting.</span>
          <Button variant="text" onClick={refreshDashboard}><Icon name="refresh-line" /> Refresh overview</Button>
        </section>
      </main>
    </>
  )
}

function SectionHeader({
  title,
  subtitle,
  action,
}: {
  title: string
  subtitle: string
  action?: ReactNode
}) {
  return (
    <div className="flex min-w-0 items-start justify-between gap-3">
      <div className="min-w-0">
        <h3 className="m-0 text-[15px] font-extrabold text-vpos-text">{title}</h3>
        <p className="mt-1 mb-0 truncate text-[12px] text-vpos-muted">{subtitle}</p>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[4px] border border-vpos-line bg-vpos-subtle p-3">
      <span className="block text-[10px] font-bold uppercase tracking-[0.06em] text-vpos-muted">{label}</span>
      <strong className="mt-1.5 block truncate text-[15px] text-vpos-text">{value}</strong>
    </div>
  )
}

function LoadingPanel({ label }: { label: string }) {
  return <div className="grid min-h-[180px] place-items-center px-5 text-[13px] text-vpos-muted">{label}</div>
}

function EmptyPanel({ icon, label }: { icon: string; label: string }) {
  return (
    <div className="grid min-h-[180px] place-items-center gap-2 px-5 text-center text-[13px] text-vpos-muted">
      <Icon name={icon} className="text-[28px] text-vpos-primary/60" />
      <span>{label}</span>
    </div>
  )
}

function SalesTrendChart({ points, currency }: { points: TrendPoint[]; currency: string }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const width = 760
  const height = 280
  const left = 58
  const right = 18
  const top = 18
  const bottom = 42
  const plotWidth = width - left - right
  const plotHeight = height - top - bottom
  const maxValue = Math.max(1, ...points.map((point) => point.grandTotal))
  const barWidth = Math.max(6, Math.min(18, (plotWidth / Math.max(1, points.length)) * 0.62))
  const baseline = top + plotHeight
  const coordinates = points.map((point, index) => {
    const barHeight = (point.grandTotal / maxValue) * plotHeight
    return {
      point,
      x: left + ((index + 0.5) / Math.max(1, points.length)) * plotWidth,
      barHeight,
      darkHeight: Math.min(barHeight, Math.max(5, barHeight * 0.56)),
    }
  })
  const labels = trendLabelIndices(points.length)
  const peak = points.reduce((highest, point) => point.grandTotal > highest.grandTotal ? point : highest, points[0])
  const orderTotal = points.reduce((total, point) => total + point.orderCount, 0)
  const hovered = hoveredIndex == null ? null : coordinates[hoveredIndex]

  return (
    <div className="mt-4">
      <div className="relative">
        <svg
          viewBox={'0 0 ' + width + ' ' + height}
          className="h-[270px] w-full overflow-visible"
          role="img"
          aria-label="Sales trend bar chart"
          onMouseLeave={() => setHoveredIndex(null)}
        >
          {Array.from({ length: 5 }, (_, index) => {
            const ratio = index / 4
            const y = top + plotHeight - ratio * plotHeight
            return (
              <g key={'grid-' + index}>
                <line x1={left} x2={width - right} y1={y} y2={y} stroke="var(--app-chart-grid)" strokeDasharray="2 5" />
                <text x={left - 10} y={y + 4} textAnchor="end" className="fill-vpos-muted text-[11px]">
                  {formatCompactCurrency(maxValue * ratio, currency)}
                </text>
              </g>
            )
          })}

          {coordinates.map(({ point, x, barHeight, darkHeight }, index) => (
            <g key={point.date}>
              <rect
                x={x - barWidth / 2}
                y={top}
                width={barWidth}
                height={plotHeight}
                fill={hoveredIndex === index ? 'var(--app-primary-soft)' : 'transparent'}
                onMouseEnter={() => setHoveredIndex(index)}
              />
              <rect
                x={x - barWidth / 2}
                y={baseline - barHeight}
                width={barWidth}
                height={barHeight}
                rx="1.5"
                fill="var(--app-chart-muted)"
              />
              <rect
                x={x - barWidth / 2}
                y={baseline - darkHeight}
                width={barWidth}
                height={darkHeight}
                rx="1.5"
                fill="var(--app-chart)"
                className="cursor-pointer"
                onMouseEnter={() => setHoveredIndex(index)}
                aria-label={formatDateLabel(point.date) + ': ' + formatCurrency(point.grandTotal, currency) + ', ' + point.orderCount + ' orders'}
              />
            </g>
          ))}

          {labels.map((index) => {
            const { point, x } = coordinates[index]
            return (
              <text key={'label-' + point.date} x={x} y={height - 12} textAnchor="middle" className="fill-vpos-muted text-[11px]">
                {formatCompactDate(point.date)}
              </text>
            )
          })}
        </svg>

        {hovered ? (
          <div className="pointer-events-none absolute top-1 right-1 rounded-[3px] border border-vpos-line bg-vpos-surface px-3 py-2 text-right shadow-vpos">
            <strong className="block text-[13px] text-vpos-text">{formatCurrency(hovered.point.grandTotal, currency)}</strong>
            <span className="text-[11px] text-vpos-muted">{formatDateLabel(hovered.point.date)} · {hovered.point.orderCount} orders</span>
          </div>
        ) : null}
      </div>

      <div className="mt-1 flex flex-wrap items-center justify-between gap-3 border-t border-vpos-line pt-3 text-[12px] text-vpos-muted">
        <span className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-[1px] bg-vpos-chart" /> Daily net sales</span>
        <span>Peak <strong className="text-vpos-text">{formatCurrency(peak.grandTotal, currency)}</strong> on {formatCompactDate(peak.date)} · {orderTotal} orders</span>
      </div>
    </div>
  )
}

function trendLabelIndices(count: number): number[] {
  if (count <= 1) return [0]
  const labelCount = Math.min(5, count)
  return Array.from({ length: labelCount }, (_, index) => Math.round(index * (count - 1) / (labelCount - 1)))
}

function formatCompactCurrency(amount: number, currency: string): string {
  const absolute = Math.abs(amount)
  const divisor = absolute >= 1_000_000_000 ? 1_000_000_000 : absolute >= 1_000_000 ? 1_000_000 : absolute >= 1_000 ? 1_000 : 1
  const suffix = divisor === 1_000_000_000 ? 'B' : divisor === 1_000_000 ? 'M' : divisor === 1_000 ? 'K' : ''
  return `${formatCurrency(amount / divisor, currency)}${suffix}`
}

function buildTrendPoints(from: string, to: string, rows: SalesTrend[]): TrendPoint[] {
  const start = new Date(`${from}T00:00:00`)
  const end = new Date(`${to}T00:00:00`)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) return []

  const byDate = new Map(rows.map((row) => [String(row.date).slice(0, 10), row]))
  const points: TrendPoint[] = []
  const cursor = new Date(start)
  while (cursor <= end) {
    const date = localDateValue(cursor)
    const row = byDate.get(date)
    points.push({ date, orderCount: Number(row?.orderCount ?? 0), grandTotal: Number(row?.grandTotal ?? 0) })
    cursor.setDate(cursor.getDate() + 1)
  }
  return points
}

function buildStockAlerts(products: ProductItem[]): StockAlertRow[] {
  return products
    .filter((product) => product.isStockable !== false)
    .flatMap((product) => (product.variants ?? []).flatMap((variant, index) => {
      if (variant.quantity === undefined) return []
      const quantity = Number(variant.quantity)
      const threshold = Number(variant.stockAlertQty ?? 5)
      if (quantity > threshold) return []
      return [{
        id: variant.id ?? `${product.id}-${index}`,
        productName: product.productName,
        sku: variant.sku || product.productCode,
        image: variant.image || product.thumbnail || product.images?.[0]?.imageUrl,
        quantity,
        threshold,
      }]
    }))
    .sort((left, right) => left.quantity - right.quantity)
    .slice(0, 5)
}

function paymentLabel(method?: string | null, provider?: string | null): string {
  const methodText = (method || 'Unknown').toLowerCase().replaceAll('_', ' ')
  const label = methodText.charAt(0).toUpperCase() + methodText.slice(1)
  if (!provider || provider === 'NONE') return label
  const providerText = provider.toLowerCase().replaceAll('_', ' ')
  return `${label} · ${providerText.charAt(0).toUpperCase()}${providerText.slice(1)}`
}

function formatStatus(value?: string | null): string {
  const text = (value || 'Unknown').toLowerCase().replaceAll('_', ' ')
  return text.replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function formatDateLabel(value: string): string {
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date)
}

function formatCompactDate(value: string): string {
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date)
}
