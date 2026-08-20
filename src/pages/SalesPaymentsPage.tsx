import { useMemo, useState } from 'react'
import { Breadcrumb, Button, Icon, MetricCard, StoreSwitcher, Topbar } from '../components'
import { PaymentBreakdownTable } from '../components/reports/PaymentBreakdownTable'
import { ReportDateFilter } from '../components/reports/ReportDateFilter'
import { SalesSubnav } from '../components/sales/SalesSubnav'
import { useAuth } from '../context/AuthContext'
import { usePaymentBreakdown } from '../features/payments/usePayments'
import { useAdminStore } from '../hooks/useAdminStore'
import { formatCurrency } from '../lib/currency'
import { defaultReportFrom, localDateValue, reportDateTimeRange } from '../lib/reporting'
import { card, pageContent } from '../lib/ui'

export function SalesPaymentsPage() {
  const { user } = useAuth()
  const { storeId, setStoreId } = useAdminStore()
  const [from, setFrom] = useState(defaultReportFrom)
  const [to, setTo] = useState(() => localDateValue())
  const range = useMemo(() => reportDateTimeRange(from, to), [from, to])
  const query = usePaymentBreakdown(storeId, range.from, range.to)
  const rows = query.data ?? []
  const currency = (user?.business.defaultCurrencyCode || 'USD').toUpperCase()
  const collected = rows.reduce((total, row) => total + Number(row.totalAmount || 0), 0)
  const refunded = rows.reduce((total, row) => total + Number(row.refundedAmount || 0), 0)
  const paymentCount = rows.reduce((total, row) => total + Number(row.paymentCount || 0), 0)

  return (
    <>
      <Topbar title="Payments" subtitle="Payment methods and settled amounts for the selected store" actions={<StoreSwitcher value={storeId} onChange={setStoreId} />} />
      <main className={pageContent}>
        <section className="mb-5 flex min-h-12 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Breadcrumb items={[{ label: 'Sales', to: '/sales' }, { label: 'Payments' }]} />
          <Button variant="secondary" onClick={() => void query.refetch()}><Icon name="refresh-line" /> Refresh payments</Button>
        </section>
        <SalesSubnav />
        <ReportDateFilter from={from} to={to} onFromChange={setFrom} onToChange={setTo} onRefresh={() => void query.refetch()} />
        {query.isError ? <div className="mt-4 rounded-[4px] border border-vpos-red/25 bg-vpos-red-bg p-4 text-[13px] text-vpos-red">{query.error instanceof Error ? query.error.message : 'Payments could not be loaded.'}</div> : null}
        <section className="mt-[18px] grid grid-cols-1 gap-[18px] sm:grid-cols-3">
          <MetricCard label="Collected" value={formatCurrency(collected, currency)} trend="Settled payments" trendAs="small" icon={<Icon name="funds-line" />} iconTone="positive" />
          <MetricCard label="Refunded" value={formatCurrency(refunded, currency)} trend="Included in period" trendAs="small" icon={<Icon name="refund-2-line" />} iconTone="warning" />
          <MetricCard label="Payments" value={String(paymentCount)} trend="Across methods" trendAs="small" icon={<Icon name="bank-card-line" />} />
        </section>
        <section className={`${card} mt-[18px] overflow-hidden p-0`}>
          <header className="border-b border-vpos-line px-5 py-4"><h2 className="m-0 text-[15px] font-extrabold text-vpos-text">Payment summary</h2><p className="mt-1 mb-0 text-[12px] text-vpos-muted">Cash, card, and QR totals grouped by provider.</p></header>
          <PaymentBreakdownTable rows={rows} currency={currency} />
        </section>
      </main>
    </>
  )
}
