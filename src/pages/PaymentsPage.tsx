import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import {
  Breadcrumb,
  Button,
  Icon,
  Status,
  StoreSwitcher,
  Topbar,
} from '../components'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import type { QrPaymentResponse } from '../features/payments/types'
import { useCreateQrPayment, usePaymentStatus } from '../features/payments/usePayments'
import { useAdminStore } from '../hooks/useAdminStore'
import { formatCurrency } from '../lib/currency'
import { paths } from '../lib/paths'
import { card, pageContent } from '../lib/ui'

type TestLog = {
  id: string
  time: Date
  label: string
  detail: string
  tone: 'neutral' | 'success' | 'warning' | 'danger'
}

const statusTone = {
  neutral: 'bg-vpos-primary',
  success: 'bg-vpos-green',
  warning: 'bg-vpos-orange',
  danger: 'bg-vpos-red',
} as const

const clockFormatter = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
})

export function PaymentsPage() {
  const { user } = useAuth()
  const { storeId, setStoreId } = useAdminStore()
  const { toast } = useToast()
  const createQr = useCreateQrPayment()
  const [orderId, setOrderId] = useState('')
  const [amount, setAmount] = useState('1.00')
  const [checkout, setCheckout] = useState<QrPaymentResponse | null>(null)
  const [logs, setLogs] = useState<TestLog[]>([])
  const lastStatus = useRef<string | null>(null)
  const paymentQuery = usePaymentStatus(checkout?.payment.id)
  const payment = paymentQuery.data ?? checkout?.payment

  const appendLog = useCallback((entry: Omit<TestLog, 'id' | 'time'>) => {
    setLogs((current) => [{
      ...entry,
      id: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
      time: new Date(),
    }, ...current])
  }, [])

  useEffect(() => {
    if (!payment?.status || lastStatus.current === payment.status) return
    const previous = lastStatus.current
    lastStatus.current = payment.status
    if (!previous && payment.status === 'PENDING') return
    appendLog({
      label: payment.status === 'PAID' ? 'Payment confirmed' : `Status changed to ${payment.status}`,
      detail: payment.status === 'PAID'
        ? 'The payment service now reports this transaction as paid.'
        : 'The latest status came from the payment service.',
      tone: payment.status === 'PAID' ? 'success' : payment.status === 'PENDING' ? 'warning' : 'danger',
    })
  }, [appendLog, payment?.status])

  useEffect(() => {
    if (!paymentQuery.isError) return
    appendLog({
      label: 'Status check failed',
      detail: paymentQuery.error instanceof Error ? paymentQuery.error.message : 'The payment service could not be reached.',
      tone: 'danger',
    })
  }, [appendLog, paymentQuery.error, paymentQuery.isError])

  const generateCheckout = async (event: FormEvent) => {
    event.preventDefault()
    const businessId = Number(user?.business.id)
    const selectedStoreId = Number(storeId)
    const parsedOrderId = Number(orderId)
    const parsedAmount = Number(amount)
    if (!businessId || !selectedStoreId) {
      toast('Select a store before generating a payment.', 'warning')
      return
    }
    if (!Number.isSafeInteger(parsedOrderId) || parsedOrderId <= 0) {
      toast('Enter a valid positive order ID.', 'warning')
      return
    }
    if (!Number.isFinite(parsedAmount) || parsedAmount < 0.01) {
      toast('Enter an amount of at least $0.01.', 'warning')
      return
    }

    setCheckout(null)
    setLogs([])
    lastStatus.current = null
    appendLog({
      label: 'Generating QR',
      detail: `Preparing ${formatCurrency(parsedAmount, 'USD')} for order #${parsedOrderId}.`,
      tone: 'neutral',
    })
    try {
      const result = await createQr.mutateAsync({
        orderId: parsedOrderId,
        businessId,
        storeId: selectedStoreId,
        amount: parsedAmount,
        currencyCode: 'USD',
        idempotencyKey: `QR-TEST-${parsedOrderId}-${Date.now()}`,
      })
      if (!result.qrImageUrl) throw new Error('KHQRPay did not return a QR image.')
      setCheckout(result)
      lastStatus.current = result.payment.status
      appendLog({
        label: 'Payment QR generated',
        detail: `Transaction ${result.transactionId} is ready and waiting for payment.`,
        tone: 'success',
      })
    } catch (error) {
      appendLog({
        label: 'QR generation failed',
        detail: error instanceof Error ? error.message : 'The QR code could not be generated.',
        tone: 'danger',
      })
    }
  }

  const resetTest = () => {
    setCheckout(null)
    setLogs([])
    lastStatus.current = null
    createQr.reset()
  }

  const copyQrPayload = async () => {
    if (!checkout?.qrPayload) return
    await navigator.clipboard.writeText(checkout.qrPayload)
    toast('KHQR payment data copied.', 'success')
  }

  const isPaid = payment?.status === 'PAID'
  const isTerminalFailure = payment?.status === 'FAILED' || payment?.status === 'CANCELLED'

  return (
    <>
      <Topbar
        title="KHQRPay test"
        subtitle="Generate one KHQR code, scan it, and watch the real payment status"
        actions={<StoreSwitcher value={storeId} onChange={setStoreId} />}
      />
      <main className={pageContent}>
        <section className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Breadcrumb items={[{ label: 'Point of sale', to: paths.pos }, { label: 'KHQRPay test' }]} />
            <p className="mt-3 max-w-[720px] text-[13px] leading-6 text-vpos-muted">
              This page creates a real KHQR payment. It shows success only when the payment service reports <strong className="text-vpos-text">PAID</strong>.
            </p>
          </div>
          {checkout ? (
            <Button variant="secondary" onClick={resetTest}>
              <Icon name="restart-line" /> Start another test
            </Button>
          ) : null}
        </section>

        <section className="grid gap-[18px] xl:grid-cols-[360px_minmax(0,1fr)]">
          <div className="space-y-[18px]">
            <form onSubmit={generateCheckout} className={`${card} p-5`}>
              <div className="mb-5 flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-vpos-sand text-[20px] text-vpos-primary">
                  <Icon name="qr-code-line" />
                </span>
                <span>
                  <strong className="block text-[15px] text-vpos-text">Test details</strong>
                  <small className="mt-1 block text-[12px] leading-5 text-vpos-muted">Use an existing order ID and a small USD amount.</small>
                </span>
              </div>

              <Field label="Order ID" hint="Existing order number from the POS">
                <input
                  inputMode="numeric"
                  value={orderId}
                  onChange={(event) => setOrderId(event.target.value)}
                  placeholder="Example: 1042"
                  className="h-11 w-full rounded-[4px] border border-vpos-line bg-white px-3.5 text-[14px] outline-none focus:border-vpos-primary focus:ring-2 focus:ring-vpos-primary/10"
                />
              </Field>

              <Field label="Amount" hint="Direct API v1.1 accepts USD only">
                <label className="flex h-11 overflow-hidden rounded-[4px] border border-vpos-line bg-white focus-within:border-vpos-primary focus-within:ring-2 focus-within:ring-vpos-primary/10">
                  <span className="grid w-11 place-items-center border-r border-vpos-line bg-vpos-subtle font-extrabold text-vpos-primary">$</span>
                  <input
                    inputMode="decimal"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    placeholder="1.00"
                    className="min-w-0 flex-1 border-0 px-3.5 text-[14px] outline-none"
                  />
                  <span className="grid w-14 place-items-center text-[11px] font-extrabold text-vpos-muted">USD</span>
                </label>
              </Field>

              <Button type="submit" className="mt-1 min-h-11 w-full" disabled={createQr.isPending}>
                <Icon name={createQr.isPending ? 'loader-4-line' : 'qr-code-line'} className={createQr.isPending ? 'animate-spin' : ''} />
                {createQr.isPending ? 'Generating…' : 'Generate payment QR'}
              </Button>
            </form>

            <StatusPanel payment={payment} isFetching={paymentQuery.isFetching} />
          </div>

          <div className="space-y-[18px]">
            <section className={`${card} overflow-hidden`}>
              <header className="flex flex-col gap-3 border-b border-vpos-line px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <span className="text-[10px] font-extrabold tracking-[0.16em] text-vpos-muted uppercase">Live KHQR</span>
                  <h2 className="mt-1 text-[16px] font-extrabold text-vpos-text">
                    {checkout ? `Transaction ${checkout.transactionId}` : 'Generate a QR code to begin'}
                  </h2>
                </div>
                {checkout?.qrImageUrl ? (
                  <div className="flex flex-wrap gap-2">
                    {checkout.qrPayload ? (
                      <Button variant="secondary" onClick={() => void copyQrPayload()}>
                        <Icon name="file-copy-line" /> Copy KHQR data
                      </Button>
                    ) : null}
                    <a
                      href={checkout.qrImageUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex min-h-[39px] items-center justify-center gap-2 rounded-[4px] bg-vpos-primary px-4 text-[14px] font-semibold text-white no-underline hover:bg-vpos-primary-2"
                    >
                      <Icon name="external-link-line" /> Open QR
                    </a>
                  </div>
                ) : null}
              </header>

              <div className="relative min-h-[560px] bg-vpos-subtle p-3 sm:p-5">
                {checkout?.qrImageUrl ? (
                  <div className="grid min-h-[520px] place-items-center rounded-[6px] border border-vpos-line/70 bg-vpos-surface px-4 py-8">
                    <div className="w-full max-w-[430px] overflow-hidden rounded-[10px] border border-vpos-line bg-white shadow-[0_22px_55px_rgba(15,34,58,.16)]">
                      <div className="flex items-center justify-between bg-[#d9222a] px-5 py-3.5 text-white">
                        <span className="flex items-center gap-2 text-[18px] font-black tracking-[-0.03em]">
                          <Icon name="qr-code-line" className="text-[22px]" /> KHQR
                        </span>
                        <span className="text-[11px] font-bold tracking-[0.12em] uppercase">Scan to pay</span>
                      </div>
                      <div className="px-5 pb-6 pt-5 text-center sm:px-8">
                        <span className="text-[11px] font-bold tracking-[0.14em] text-vpos-muted uppercase">Payment amount</span>
                        <strong className="mt-1 block text-[30px] tracking-[-0.04em] text-vpos-text">
                          {formatCurrency(payment?.amount ?? checkout.payment.amount, checkout.payment.currencyCode)}
                        </strong>
                        <div className="mx-auto mt-4 aspect-square w-full max-w-[320px] rounded-[8px] border border-vpos-line bg-white p-3 shadow-[inset_0_0_0_1px_rgba(15,34,58,.02)]">
                          <img
                            key={checkout.transactionId}
                            src={checkout.qrImageUrl}
                            alt={`KHQR payment code for transaction ${checkout.transactionId}`}
                            width="320"
                            height="320"
                            decoding="async"
                            className="h-full w-full object-contain"
                            onLoad={() => appendLog({
                              label: 'QR code displayed',
                              detail: 'The KHQR image is ready to scan with a Cambodian banking app.',
                              tone: 'neutral',
                            })}
                            onError={() => appendLog({
                              label: 'QR image failed to load',
                              detail: 'Open the QR in a new tab or generate a new payment.',
                              tone: 'danger',
                            })}
                          />
                        </div>
                        <strong className="mt-5 block text-[14px] text-vpos-text">Scan with your banking app</strong>
                        <span className="mt-1.5 block text-[12px] leading-5 text-vpos-muted">
                          Keep this page open while the payment status is checked automatically.
                        </span>
                        <code className="mt-4 block truncate rounded-[4px] bg-vpos-subtle px-3 py-2 font-mono text-[10px] text-vpos-muted" title={checkout.transactionId}>
                          {checkout.transactionId}
                        </code>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid min-h-[520px] place-items-center rounded-[6px] border border-dashed border-vpos-line bg-vpos-surface/70 px-6 text-center">
                    <span className="max-w-[420px]">
                      <span className="mx-auto grid h-16 w-16 place-items-center rounded-[6px] bg-vpos-sand text-[30px] text-vpos-primary">
                        <Icon name="qr-scan-2-line" />
                      </span>
                      <strong className="mt-5 block text-[18px] text-vpos-text">Your generated QR will appear here</strong>
                      <span className="mt-2 block text-[13px] leading-6 text-vpos-muted">Enter the test details, generate the QR, then scan it with a Cambodian banking app.</span>
                    </span>
                  </div>
                )}
              </div>
            </section>

            <section className={`${card} overflow-hidden`}>
              <header className="flex items-center justify-between border-b border-vpos-line px-5 py-4">
                <span>
                  <span className="text-[10px] font-extrabold tracking-[0.16em] text-vpos-muted uppercase">Test log</span>
                  <strong className="mt-1 block text-[15px] text-vpos-text">Request and payment events</strong>
                </span>
                {paymentQuery.isFetching ? <Icon name="loader-4-line" className="animate-spin text-[20px] text-vpos-primary" /> : null}
              </header>
              <div className="max-h-[330px] overflow-y-auto px-5 py-2">
                {logs.length > 0 ? logs.map((log) => (
                  <div key={log.id} className="grid grid-cols-[72px_14px_1fr] gap-2 border-b border-vpos-line/70 py-3 last:border-0">
                    <time className="pt-0.5 font-mono text-[11px] text-vpos-muted">{clockFormatter.format(log.time)}</time>
                    <span className={`mt-1.5 h-2 w-2 rounded-full ${statusTone[log.tone]}`} />
                    <span>
                      <strong className="block text-[13px] text-vpos-text">{log.label}</strong>
                      <span className="mt-0.5 block text-[12px] leading-5 text-vpos-muted">{log.detail}</span>
                    </span>
                  </div>
                )) : (
                  <div className="py-10 text-center text-[13px] text-vpos-muted">Events will appear after you generate a QR code.</div>
                )}
              </div>
            </section>
          </div>
        </section>

        {checkout && !isPaid && !isTerminalFailure ? (
          <p className="mt-4 flex items-start gap-2 text-[12px] leading-5 text-vpos-muted">
            <Icon name="information-line" className="mt-0.5 shrink-0 text-[16px]" />
            The page checks the payment service every three seconds. If scanning succeeds but this remains pending, KHQRPay verification or its signed callback is not connected yet.
          </p>
        ) : null}
      </main>
    </>
  )
}

function Field({ label, hint, children }: { label: string; hint: string; children: ReactNode }) {
  return (
    <label className="mb-4 block">
      <span className="mb-1.5 flex items-baseline justify-between gap-3">
        <strong className="text-[12px] text-vpos-text">{label}</strong>
        <small className="text-right text-[10px] text-vpos-muted">{hint}</small>
      </span>
      {children}
    </label>
  )
}

function StatusPanel({ payment, isFetching }: { payment?: QrPaymentResponse['payment']; isFetching: boolean }) {
  if (!payment) {
    return (
      <section className={`${card} p-5`}>
        <span className="text-[10px] font-extrabold tracking-[0.16em] text-vpos-muted uppercase">Payment status</span>
        <div className="mt-4 flex items-center gap-3 text-vpos-muted">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-vpos-subtle text-[20px]"><Icon name="radio-button-line" /></span>
          <span className="text-[13px]">No active test</span>
        </div>
      </section>
    )
  }
  const paid = payment.status === 'PAID'
  const failed = payment.status === 'FAILED' || payment.status === 'CANCELLED'
  return (
    <section className={`${card} overflow-hidden border-l-4 ${paid ? 'border-l-vpos-green' : failed ? 'border-l-vpos-red' : 'border-l-vpos-orange'}`}>
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <span>
            <span className="text-[10px] font-extrabold tracking-[0.16em] text-vpos-muted uppercase">Payment status</span>
            <strong className={`mt-2 block text-[20px] ${paid ? 'text-vpos-green' : failed ? 'text-vpos-red' : 'text-vpos-orange'}`}>
              {paid ? 'Payment successful' : failed ? 'Payment failed' : 'Waiting for payment'}
            </strong>
          </span>
          <Status value={payment.status.replaceAll('_', ' ')} />
        </div>
        <dl className="mt-5 space-y-2 border-t border-dashed border-vpos-line pt-4 text-[12px]">
          <StatusRow label="Payment ID" value={`PAY-${payment.id}`} />
          <StatusRow label="Order" value={`#${payment.orderId}`} />
          <StatusRow label="Amount" value={formatCurrency(payment.amount, payment.currencyCode)} />
          <StatusRow label="Last check" value={isFetching ? 'Checking now…' : clockFormatter.format(new Date())} />
        </dl>
      </div>
    </section>
  )
}

function StatusRow({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between gap-3"><dt className="text-vpos-muted">{label}</dt><dd className="m-0 text-right font-bold text-vpos-text">{value}</dd></div>
}
