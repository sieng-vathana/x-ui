import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Breadcrumb,
  Button,
  DataTable,
  Icon,
  MetricCard,
  Select,
  Status,
  Topbar,
  type DataTableColumn,
} from '../components'
import { useToast } from '../context/ToastContext'
import type { Payment, PaymentStatus } from '../features/payments/types'
import { usePaymentsForOrder } from '../features/payments/usePayments'
import { formatCurrency } from '../lib/currency'
import { paths } from '../lib/paths'
import { card, pageContent, searchField } from '../lib/ui'

type StatusFilter = PaymentStatus | 'ALL'
const EMPTY_PAYMENTS: Payment[] = []

const STATUS_OPTIONS: Array<{ value: StatusFilter; label: string }> = [
  { value: 'ALL', label: 'All statuses' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'PAID', label: 'Paid' },
  { value: 'FAILED', label: 'Failed' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'PARTIALLY_REFUNDED', label: 'Partially refunded' },
  { value: 'REFUNDED', label: 'Refunded' },
]

const dateFormatter = new Intl.DateTimeFormat('en-GB', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

function formatDate(value?: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : dateFormatter.format(date)
}

function paymentEvents(payment: Payment) {
  const events = [{
    label: 'Payment initiated',
    detail: `${payment.method} · ${payment.provider}`,
    time: payment.createdAt,
    tone: 'bg-vpos-primary',
  }]
  if (payment.paidAt) {
    events.push({
      label: 'Payment confirmed',
      detail: 'Funds marked as paid',
      time: payment.paidAt,
      tone: 'bg-vpos-green',
    })
  }
  if (payment.refundedAmount > 0) {
    events.push({
      label: payment.status === 'REFUNDED' ? 'Payment refunded' : 'Partial refund recorded',
      detail: formatCurrency(payment.refundedAmount, payment.currencyCode),
      time: payment.updatedAt,
      tone: 'bg-vpos-orange',
    })
  } else if (payment.status === 'FAILED' || payment.status === 'CANCELLED') {
    events.push({
      label: payment.status === 'FAILED' ? 'Payment failed' : 'Payment cancelled',
      detail: payment.note || 'No reason supplied',
      time: payment.updatedAt,
      tone: 'bg-vpos-red',
    })
  }
  return events
}

export function PaymentsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { toast } = useToast()
  const initialOrderId = Number(searchParams.get('orderId')) || undefined
  const [orderInput, setOrderInput] = useState(initialOrderId ? String(initialOrderId) : '')
  const [orderId, setOrderId] = useState<number | undefined>(initialOrderId)
  const [status, setStatus] = useState<StatusFilter>('ALL')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const paymentsQuery = usePaymentsForOrder(orderId)
  const payments = paymentsQuery.data ?? EMPTY_PAYMENTS

  const filteredPayments = useMemo(
    () => status === 'ALL' ? payments : payments.filter((payment) => payment.status === status),
    [payments, status],
  )
  const selectedPayment = payments.find((payment) => payment.id === selectedId) ?? payments[0]

  useEffect(() => {
    if (payments.length > 0 && !payments.some((payment) => payment.id === selectedId)) {
      setSelectedId(payments[0].id)
    }
  }, [payments, selectedId])

  const columns = useMemo<DataTableColumn<Payment>[]>(() => [
    {
      id: 'reference',
      header: 'Reference',
      searchable: (payment) => `${payment.id} ${payment.externalReference ?? ''} ${payment.idempotencyKey}`,
      cell: (payment) => (
        <button
          type="button"
          onClick={() => setSelectedId(payment.id)}
          className="border-0 bg-transparent p-0 text-left font-extrabold text-vpos-primary hover:underline"
        >
          PAY-{payment.id}
        </button>
      ),
    },
    {
      id: 'method',
      header: 'Method',
      searchable: (payment) => `${payment.method} ${payment.provider}`,
      cell: (payment) => (
        <span className="inline-flex items-center gap-2 font-semibold">
          <Icon name={payment.method === 'QR' ? 'qr-code-line' : 'money-dollar-circle-line'} />
          {payment.method === 'QR' ? 'KHQRPay' : 'Cash'}
        </span>
      ),
    },
    {
      id: 'amount',
      header: 'Amount',
      cell: (payment) => <strong>{formatCurrency(payment.amount, payment.currencyCode)}</strong>,
    },
    {
      id: 'status',
      header: 'Status',
      searchable: (payment) => payment.status,
      cell: (payment) => <Status value={payment.status.replaceAll('_', ' ')} />,
    },
    {
      id: 'created',
      header: 'Created',
      hideOnMobile: true,
      cell: (payment) => formatDate(payment.createdAt),
    },
    {
      id: 'updated',
      header: 'Last activity',
      hideOnMobile: true,
      cell: (payment) => formatDate(payment.updatedAt),
    },
    {
      id: 'action',
      header: '',
      cell: (payment) => (
        <Button variant="text" onClick={() => setSelectedId(payment.id)}>
          Inspect
        </Button>
      ),
    },
  ], [])

  const submitOrder = (event: FormEvent) => {
    event.preventDefault()
    const nextOrderId = Number(orderInput)
    if (!Number.isSafeInteger(nextOrderId) || nextOrderId <= 0) {
      toast('Enter a valid positive order ID.', 'warning')
      return
    }
    setOrderId(nextOrderId)
    setSelectedId(null)
    setSearchParams({ orderId: String(nextOrderId) })
  }

  const totalValue = payments.reduce((sum, payment) => sum + Number(payment.amount), 0)
  const paidCount = payments.filter((payment) => payment.status === 'PAID').length
  const pendingCount = payments.filter((payment) => payment.status === 'PENDING').length

  return (
    <>
      <Topbar
        title="Payment activity"
        subtitle="Trace cash and KHQRPay attempts from checkout to settlement"
      />
      <main className={pageContent}>
        <section className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Breadcrumb items={[{ label: 'Sales', to: paths.sales }, { label: 'Payment activity' }]} />
            <p className="mt-3 max-w-[680px] text-[13px] leading-6 text-vpos-muted">
              Search an order to see every payment record and the exact lifecycle events stored by the payment service.
            </p>
          </div>
          <form onSubmit={submitOrder} className="flex w-full max-w-[460px] gap-2">
            <label className={`${searchField} flex-1`}>
              <Icon name="receipt-line" className="text-vpos-muted" />
              <input
                inputMode="numeric"
                value={orderInput}
                onChange={(event) => setOrderInput(event.target.value)}
                placeholder="Enter order ID"
                aria-label="Order ID"
                className="h-full min-w-0 flex-1 border-0 bg-transparent text-[13px] outline-none"
              />
            </label>
            <Button type="submit">
              <Icon name="search-line" /> Find activity
            </Button>
          </form>
        </section>

        {orderId ? (
          <>
            <section className="mb-[18px] grid grid-cols-1 gap-[18px] sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard label="Attempts" value={String(payments.length)} trend={`Order #${orderId}`} trendAs="small" icon={<Icon name="stack-line" />} />
              <MetricCard label="Paid" value={String(paidCount)} trend="Confirmed records" trendAs="small" icon={<Icon name="checkbox-circle-line" />} iconTone="positive" />
              <MetricCard label="Pending" value={String(pendingCount)} trend="Awaiting confirmation" trendAs="small" icon={<Icon name="time-line" />} iconTone="warning" />
              <MetricCard label="Attempted value" value={payments[0] ? formatCurrency(totalValue, payments[0].currencyCode) : '—'} trend="All attempts" trendAs="small" icon={<Icon name="funds-line" />} />
            </section>

            {paymentsQuery.isError ? (
              <section className={`${card} mb-[18px] flex items-center justify-between gap-4 border-vpos-red/30 p-4`}>
                <span className="flex items-center gap-3 text-[13px] font-semibold text-vpos-red">
                  <Icon name="error-warning-line" className="text-[20px]" />
                  {paymentsQuery.error instanceof Error ? paymentsQuery.error.message : 'Payment activity could not be loaded.'}
                </span>
                <Button variant="secondary" onClick={() => void paymentsQuery.refetch()}>Try again</Button>
              </section>
            ) : null}

            <section className="grid gap-[18px] xl:grid-cols-[minmax(0,1fr)_340px]">
              <DataTable
                data={filteredPayments}
                columns={columns}
                rowKey={(payment) => String(payment.id)}
                title={`Payment records · order #${orderId}`}
                searchPlaceholder="Search reference, method, status…"
                emptyMessage={paymentsQuery.isLoading ? 'Loading payment activity…' : 'No payment records found for this order.'}
                emptyIcon={paymentsQuery.isLoading ? 'loader-4-line' : 'receipt-line'}
                toolbar={(
                  <Select
                    variant="toolbar"
                    value={status === 'ALL' ? '' : status}
                    placeholder="All statuses"
                    onChange={(value) => setStatus((value || 'ALL') as StatusFilter)}
                    options={STATUS_OPTIONS.filter((option) => option.value !== 'ALL')}
                  />
                )}
                actions={(
                  <Button variant="secondary" disabled={paymentsQuery.isFetching} onClick={() => void paymentsQuery.refetch()}>
                    <Icon name="refresh-line" className={paymentsQuery.isFetching ? 'animate-spin' : ''} />
                    Refresh
                  </Button>
                )}
              />

              <PaymentTrail payment={selectedPayment} />
            </section>
          </>
        ) : (
          <section className={`${card} relative overflow-hidden p-8 sm:p-12`}>
            <div className="absolute top-0 bottom-0 left-0 w-1 bg-vpos-primary" />
            <span className="grid h-12 w-12 place-items-center rounded-md bg-vpos-sand text-[24px] text-vpos-primary">
              <Icon name="file-search-line" />
            </span>
            <h2 className="mt-5 text-[22px] font-extrabold text-vpos-text">Start with an order ID</h2>
            <p className="mt-2 max-w-[560px] text-[14px] leading-6 text-vpos-muted">
              Payment records are grouped by order. Enter an order ID to inspect cash receipts, KHQRPay references, pending confirmations, and refunds.
            </p>
          </section>
        )}
      </main>
    </>
  )
}

function PaymentTrail({ payment }: { payment?: Payment }) {
  if (!payment) {
    return (
      <aside className={`${card} min-h-[320px] p-6`}>
        <span className="text-[13px] text-vpos-muted">Select a payment to inspect its activity.</span>
      </aside>
    )
  }
  const events = paymentEvents(payment)
  return (
    <aside className={`${card} self-start overflow-hidden`}>
      <header className="border-b border-dashed border-vpos-line bg-vpos-subtle px-5 py-4">
        <span className="text-[10px] font-extrabold tracking-[0.16em] text-vpos-muted uppercase">Processing trail</span>
        <div className="mt-2 flex items-center justify-between gap-3">
          <strong className="text-[18px] text-vpos-text">PAY-{payment.id}</strong>
          <Status value={payment.status.replaceAll('_', ' ')} />
        </div>
      </header>
      <div className="space-y-3 border-b border-dashed border-vpos-line px-5 py-4 text-[12px]">
        <DetailRow label="Order" value={`#${payment.orderId}`} />
        <DetailRow label="Amount" value={formatCurrency(payment.amount, payment.currencyCode)} />
        <DetailRow label="Method" value={payment.method === 'QR' ? 'KHQRPay' : 'Cash'} />
        <DetailRow label="Transaction" value={payment.externalReference || '—'} mono />
      </div>
      <ol className="px-5 py-5">
        {events.map((event, index) => (
          <li key={`${event.label}-${event.time}`} className="relative flex gap-3 pb-6 last:pb-0">
            {index < events.length - 1 ? <span className="absolute top-3 bottom-0 left-[5px] w-px bg-vpos-line" /> : null}
            <span className={`relative mt-1 h-[11px] w-[11px] shrink-0 rounded-full ring-4 ring-white ${event.tone}`} />
            <span className="min-w-0">
              <strong className="block text-[13px] text-vpos-text">{event.label}</strong>
              <span className="mt-0.5 block text-[12px] text-vpos-muted">{event.detail}</span>
              <time className="mt-1 block text-[11px] font-semibold text-vpos-muted">{formatDate(event.time)}</time>
            </span>
          </li>
        ))}
      </ol>
      {payment.note ? (
        <footer className="border-t border-dashed border-vpos-line bg-vpos-subtle px-5 py-4 text-[12px] leading-5 text-vpos-muted">
          <strong className="mb-1 block text-[10px] tracking-[0.12em] uppercase">Items / note</strong>
          {payment.note}
        </footer>
      ) : null}
    </aside>
  )
}

function DetailRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-vpos-muted">{label}</span>
      <span className={`max-w-[210px] break-all text-right font-bold text-vpos-text ${mono ? 'font-mono text-[11px]' : ''}`}>{value}</span>
    </div>
  )
}
