import { useEffect, useMemo, useState } from 'react'
import {
  Breadcrumb,
  Button,
  DataTable,
  FormField,
  Icon,
  MetricCard,
  Modal,
  SelectField,
  Status,
  StoreSwitcher,
  TextAreaField,
  Topbar,
  type DataTableColumn,
} from '../components'
import { SalesSubnav } from '../components/sales/SalesSubnav'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useRecentOrders } from '../features/orders/useOrders'
import type { PosOrder } from '../features/orders/types'
import { usePaymentsForOrder, useRefundPayment } from '../features/payments/usePayments'
import type { Payment, PaymentStatus } from '../features/payments/types'
import { useAdminStore } from '../hooks/useAdminStore'
import { formatCurrency } from '../lib/currency'
import { formatReportDate } from '../lib/reporting'
import { card, pageContent } from '../lib/ui'

const refundableStatuses = new Set<PaymentStatus>(['PAID', 'PARTIALLY_REFUNDED'])

export function RefundsPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const { storeId, setStoreId } = useAdminStore()
  const ordersQuery = useRecentOrders(storeId, true, 0, 100)
  const refundMutation = useRefundPayment()
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null)
  const [selectedPaymentId, setSelectedPaymentId] = useState('')
  const [refundAmount, setRefundAmount] = useState('')
  const [reason, setReason] = useState('')

  const orders = useMemo(() => ordersQuery.data?.content ?? [], [ordersQuery.data])
  const currency = (user?.business.defaultCurrencyCode || 'USD').toUpperCase()
  const selectedOrder = useMemo(
    () => orders.find((order) => order.id === selectedOrderId) ?? null,
    [orders, selectedOrderId],
  )
  const paymentsQuery = usePaymentsForOrder(selectedOrderId ?? undefined)
  const payments = useMemo(() => paymentsQuery.data ?? [], [paymentsQuery.data])
  const selectedPayment = useMemo(
    () => payments.find((payment) => String(payment.id) === selectedPaymentId) ?? null,
    [payments, selectedPaymentId],
  )
  const completedOrders = orders.filter((order) => order.orderStatus === 'COMPLETED')
  const completedValue = completedOrders.reduce((total, order) => total + Number(order.grandTotal || 0), 0)

  useEffect(() => {
    if (!selectedOrderId) return
    setSelectedPaymentId('')
    setRefundAmount('')
    setReason('')
  }, [selectedOrderId])

  useEffect(() => {
    const firstRefundable = payments.find(canRefundPayment)
    if (!firstRefundable) return
    setSelectedPaymentId((current) => {
      const currentPayment = payments.find((payment) => String(payment.id) === current)
      return currentPayment && canRefundPayment(currentPayment) ? current : String(firstRefundable.id)
    })
  }, [payments])

  useEffect(() => {
    if (!selectedPayment) return
    setRefundAmount(formatAmount(remainingAmount(selectedPayment)))
  }, [selectedPayment])

  const openRefund = (order: PosOrder) => {
    setSelectedOrderId(order.id)
  }

  const closeRefund = () => {
    setSelectedOrderId(null)
    setSelectedPaymentId('')
    setRefundAmount('')
    setReason('')
  }

  const submitRefund = async () => {
    if (!selectedOrder || !selectedPayment) return
    const amount = parseAmount(refundAmount)
    const remaining = remainingAmount(selectedPayment)

    if (!canRefundPayment(selectedPayment)) {
      toast(refundBlockReason(selectedPayment), 'warning')
      return
    }
    if (amount == null || amount <= 0) {
      toast('Enter a refund amount greater than zero.', 'warning')
      return
    }
    if (amount > remaining) {
      toast(`The maximum refundable amount is ${formatCurrency(remaining, currency)}.`, 'warning')
      return
    }

    try {
      await refundMutation.mutateAsync({
        id: selectedPayment.id,
        input: { amount, reason: reason.trim() || undefined },
      })
      toast(`${formatCurrency(amount, currency)} refunded for ${selectedOrder.orderNo || `#${selectedOrder.id}`}.`, 'success')
      closeRefund()
    } catch (error) {
      toast(error instanceof Error ? error.message : 'The payment could not be refunded.', 'error')
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
    { id: 'payment', header: 'Payment', cell: (order) => paymentMethodLabel(order.paymentMethod) },
    { id: 'total', header: 'Sale total', cell: (order) => <strong>{formatCurrency(order.grandTotal, order.currencyCode || currency)}</strong> },
    { id: 'status', header: 'Status', searchable: (order) => `${order.orderStatus} ${order.paymentStatus}`, cell: (order) => <Status value={statusLabel(order.orderStatus)} /> },
    {
      id: 'actions',
      header: '',
      cell: (order) => order.orderStatus === 'COMPLETED'
        ? <Button variant="small" onClick={() => openRefund(order)}><Icon name="refund-2-line" /> Review refund</Button>
        : <span className="text-[12px] text-vpos-muted">Sale not completed</span>,
    },
  ], [currency])

  return (
    <>
      <Topbar
        title="Returns & refunds"
        subtitle="Refund a settled payment from a completed sale"
        actions={<StoreSwitcher value={storeId} onChange={setStoreId} />}
      />
      <main className={pageContent}>
        <section className="mb-5 flex min-h-12 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Breadcrumb items={[{ label: 'Sales', to: '/sales' }, { label: 'Returns & refunds' }]} />
          <Button variant="secondary" onClick={() => void ordersQuery.refetch()} disabled={ordersQuery.isFetching}>
            <Icon name={ordersQuery.isFetching ? 'loader-4-line' : 'refresh-line'} className={ordersQuery.isFetching ? 'animate-spin' : ''} />
            Refresh sales
          </Button>
        </section>
        <SalesSubnav />

        {ordersQuery.isError ? (
          <div className="mb-4 rounded-[4px] border border-vpos-red/25 bg-vpos-red-bg p-4 text-[13px] text-vpos-red">
            {ordersQuery.error instanceof Error ? ordersQuery.error.message : 'Sales could not be loaded.'}
          </div>
        ) : null}

        <section className="mb-[18px] grid grid-cols-1 gap-[18px] sm:grid-cols-3">
          <MetricCard label="Completed sales" value={String(completedOrders.length)} trend="Ready for review" trendAs="small" icon={<Icon name="checkbox-circle-line" />} iconTone="positive" />
          <MetricCard label="Sales value" value={formatCurrency(completedValue, currency)} trend="Loaded page" trendAs="small" icon={<Icon name="funds-line" />} />
          <MetricCard label="Store" value={String(storeId || '—')} trend="Current filter" trendAs="small" icon={<Icon name="store-2-line" />} />
        </section>

        <section className={`${card} mb-[18px] border-vpos-primary/20 bg-vpos-primary/5 p-4`}>
          <div className="flex items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-vpos-sand text-[18px] text-vpos-primary"><Icon name="information-line" /></span>
            <div>
              <h2 className="m-0 text-[14px] font-extrabold text-vpos-text">Payment refund workflow</h2>
              <p className="mt-1 mb-0 text-[12px] leading-5 text-vpos-muted">Choose a completed sale to load its payment activity. You can issue a partial or full refund up to the amount still refundable. KHQRPay refunds must be completed through the receiving bank or provider.</p>
            </div>
          </div>
        </section>

        <DataTable
          data={orders}
          columns={columns}
          rowKey={(order) => order.id}
          title="Sales available for refund"
          searchPlaceholder="Search order number or ID…"
          pageSize={10}
          isLoading={ordersQuery.isLoading}
          emptyMessage="No sales are available for refund in this store."
        />
        <p className="mt-3 text-[12px] text-vpos-muted">Payment details are requested only after you select a sale, so opening this page does not trigger one payment request per row.</p>
      </main>

      <Modal
        open={Boolean(selectedOrder)}
        onClose={closeRefund}
        title={selectedOrder ? `Refund ${selectedOrder.orderNo || `#${selectedOrder.id}`}` : 'Refund payment'}
        description="Review the payment and confirm the amount to return to the customer."
        size="lg"
        closeOnBackdrop={!refundMutation.isPending}
        hideClose={refundMutation.isPending}
        footer={(
          <div className="flex w-full items-center justify-end gap-2.5">
            <Button variant="secondary" onClick={closeRefund} disabled={refundMutation.isPending}>Cancel</Button>
            <Button variant="danger" onClick={() => void submitRefund()} disabled={!canSubmitRefund(selectedPayment, refundAmount) || refundMutation.isPending}>
              {refundMutation.isPending ? <Icon name="loader-4-line" className="animate-spin" /> : <Icon name="refund-2-line" />}
              {refundMutation.isPending ? 'Processing…' : 'Confirm refund'}
            </Button>
          </div>
        )}
      >
        {selectedOrder ? (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <SummaryItem label="Sale total" value={formatCurrency(selectedOrder.grandTotal, selectedOrder.currencyCode || currency)} />
              <SummaryItem label="Customer" value={Number(selectedOrder.customerId) > 0 ? `#${selectedOrder.customerId}` : 'Walk-in'} />
              <SummaryItem label="Sale status" value={statusLabel(selectedOrder.orderStatus)} />
              <SummaryItem label="Payment" value={paymentMethodLabel(selectedOrder.paymentMethod)} />
            </div>

            {paymentsQuery.isError ? (
              <div className="rounded-[4px] border border-vpos-red/25 bg-vpos-red-bg p-4 text-[13px] text-vpos-red">
                {paymentsQuery.error instanceof Error ? paymentsQuery.error.message : 'Payment activity could not be loaded.'}
              </div>
            ) : null}
            {paymentsQuery.isLoading ? (
              <div className="rounded-[4px] border border-vpos-line bg-vpos-subtle p-5 text-center text-[13px] text-vpos-muted">Loading payment activity…</div>
            ) : null}
            {!paymentsQuery.isLoading && !paymentsQuery.isError && payments.length === 0 ? (
              <div className="rounded-[4px] border border-vpos-line bg-vpos-subtle p-5 text-center text-[13px] text-vpos-muted">No payment record was found for this sale.</div>
            ) : null}

            {payments.length > 0 ? (
              <div className="space-y-4">
                {payments.length > 1 ? (
                  <SelectField
                    label="Payment record"
                    value={selectedPaymentId}
                    onChange={(event) => setSelectedPaymentId(event.target.value)}
                    options={payments.map((payment) => ({ value: String(payment.id), label: paymentOptionLabel(payment, currency) }))}
                  />
                ) : null}
                {selectedPayment ? (
                  <PaymentDetails payment={selectedPayment} currency={currency} />
                ) : null}
                {selectedPayment && canRefundPayment(selectedPayment) ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      label={`Refund amount (${currency})`}
                      required
                      type="number"
                      min="0.01"
                      max={remainingAmount(selectedPayment)}
                      step="0.01"
                      value={refundAmount}
                      onChange={(event) => setRefundAmount(event.target.value)}
                    />
                    <TextAreaField
                      label="Reason"
                      showToolbar={false}
                      rows={3}
                      maxLength={500}
                      placeholder="Optional note for the refund record"
                      value={reason}
                      onChange={(event) => setReason(event.target.value)}
                    />
                  </div>
                ) : null}
                {selectedPayment && !canRefundPayment(selectedPayment) ? (
                  <div className="rounded-[4px] border border-vpos-orange/25 bg-vpos-orange-bg p-4 text-[13px] text-vpos-orange">{refundBlockReason(selectedPayment)}</div>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </Modal>
    </>
  )
}

function PaymentDetails({ payment, currency }: { payment: Payment; currency: string }) {
  const refunded = Number(payment.refundedAmount || 0)
  const remaining = remainingAmount(payment)
  return (
    <div className="rounded-[4px] border border-vpos-line bg-vpos-subtle/60 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="m-0 text-[12px] font-semibold text-vpos-muted">{paymentMethodLabel(payment.method)}{payment.provider !== 'NONE' ? ` · ${payment.provider}` : ''}</p>
          <p className="mt-1 mb-0 text-[18px] font-extrabold text-vpos-text">{formatCurrency(payment.amount, currency)}</p>
        </div>
        <Status value={statusLabel(payment.status)} />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 text-[12px] sm:grid-cols-3">
        <SummaryItem label="Paid" value={formatCurrency(payment.amount, currency)} />
        <SummaryItem label="Already refunded" value={formatCurrency(refunded, currency)} />
        <SummaryItem label="Remaining" value={formatCurrency(remaining, currency)} />
      </div>
    </div>
  )
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[4px] border border-vpos-line bg-white p-3">
      <span className="block text-[10px] font-bold uppercase tracking-[0.06em] text-vpos-muted">{label}</span>
      <strong className="mt-1 block truncate text-[13px] text-vpos-text">{value}</strong>
    </div>
  )
}

function canRefundPayment(payment: Payment): boolean {
  return refundableStatuses.has(payment.status) && payment.provider !== 'KHQRPAY' && remainingAmount(payment) > 0
}

function refundBlockReason(payment: Payment): string {
  if (payment.provider === 'KHQRPAY') return 'KHQRPay refunds must be completed through the receiving bank or provider.'
  if (!refundableStatuses.has(payment.status)) return 'Only a paid payment can be refunded.'
  return 'This payment has already been fully refunded.'
}

function canSubmitRefund(payment: Payment | null, amount: string): boolean {
  const parsed = parseAmount(amount)
  return Boolean(payment && canRefundPayment(payment) && parsed != null && parsed > 0 && parsed <= remainingAmount(payment))
}

function remainingAmount(payment: Payment): number {
  return roundMoney(Math.max(0, Number(payment.amount || 0) - Number(payment.refundedAmount || 0)))
}

function parseAmount(value: string): number | null {
  const amount = Number(value)
  return Number.isFinite(amount) ? roundMoney(amount) : null
}

function formatAmount(value: number): string {
  return value.toFixed(2)
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

function statusLabel(value?: string | null): string {
  if (!value) return 'Unknown'
  return value.toLowerCase().replace(/(^|_)([a-z])/g, (_, prefix, letter) => `${prefix ? ' ' : ''}${letter.toUpperCase()}`)
}

function paymentMethodLabel(value?: string | null): string {
  if (value === 'CASH') return 'Cash'
  if (value === 'CARD') return 'Card'
  if (value === 'QR') return 'QR'
  return value || 'Unpaid'
}

function paymentOptionLabel(payment: Payment, currency: string): string {
  return `${paymentMethodLabel(payment.method)} · ${formatCurrency(payment.amount, currency)} · ${statusLabel(payment.status)}`
}
