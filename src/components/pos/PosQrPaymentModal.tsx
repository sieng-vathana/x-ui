import { useEffect, useRef, useState } from 'react'
import type { PosOrder } from '../../features/orders/types'
import type { QrPaymentResponse } from '../../features/payments/types'
import { cn } from '../../lib/cn'
import { formatCurrency } from '../../lib/currency'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'
import { Modal } from '../ui/Modal'

const SUCCESS_DISPLAY_MS = 1000
/** Bakong KHQR codes made by the payment service live this long. */
const DEFAULT_QR_LIFETIME_MS = 10 * 60 * 1000

export interface PosQrPaymentModalProps {
  checkout: QrPaymentResponse | null
  orderNo?: string
  /** The order being paid, for the totals beside the QR. */
  order?: PosOrder | null
  /** Shown on the KHQR card, as banking apps show it. */
  merchantName?: string
  storeName?: string
  onClose: () => void
  /** Bakong KHQR only: the cashier saw the money arrive in the shop's bank app. */
  onConfirmPaid?: () => void
  confirming?: boolean
  /** Why the automatic Bakong check is not running, e.g. no API token on the server. */
  autoCheckError?: string
  /** Keep the order waiting so it can be continued later from Recent orders. */
  onHold?: () => void
  /** The customer pays this order in cash instead. */
  onSwitchToCash?: () => void
  /** Makes a fresh KHQR for the same order once this one has expired. */
  onRenewQr?: () => void
  renewing?: boolean
}

/** The KHQR checkout: the code on a KHQR card on the left, what is being paid for on the right. */
export function PosQrPaymentModal({
  checkout,
  orderNo,
  order,
  merchantName,
  storeName,
  onClose,
  onConfirmPaid,
  confirming = false,
  autoCheckError,
  onHold,
  onSwitchToCash,
  onRenewQr,
  renewing = false,
}: PosQrPaymentModalProps) {
  const qrImageSource = checkout?.qrImageDataUrl
  const qrImageUrl = checkout?.qrImageUrl
  const [qrImageFailed, setQrImageFailed] = useState(false)
  const isPaid = checkout?.payment.status === 'PAID'
  const isFailed = checkout?.payment.status === 'FAILED' || checkout?.payment.status === 'CANCELLED'
  const isSimulated = checkout?.payment.provider === 'SIMULATED'
  const isBakong = checkout?.payment.provider === 'BAKONG'
  const remainingMs = useCountdown(checkout, isBakong)
  const isExpired = remainingMs !== null && remainingMs <= 0 && !isPaid && !isFailed
  const waiting = !isPaid && !isFailed && !isExpired
  // Bakong payments are confirmed automatically; the manual button only appears when that check cannot run.
  const canConfirm = isBakong && waiting && Boolean(autoCheckError) && Boolean(onConfirmPaid)
  const currency = checkout?.payment.currencyCode ?? order?.currencyCode ?? 'USD'
  const money = (value: number | undefined | null) => formatCurrency(Number(value ?? 0), currency)
  const discount = Number(order?.discount ?? 0)

  useEffect(() => {
    if (!isPaid || !(isSimulated || isBakong)) return
    const timeoutId = window.setTimeout(onClose, SUCCESS_DISPLAY_MS)
    return () => window.clearTimeout(timeoutId)
  }, [isBakong, isPaid, isSimulated, onClose])

  return (
    <Modal
      open={Boolean(checkout)}
      onClose={onClose}
      size="2xl"
      title={<span className="text-[20px] font-extrabold tracking-[-0.02em]">{isSimulated ? 'Simulated Payment' : 'Processing Payment'}</span>}
      description={[merchantName, storeName].filter(Boolean).join(' · ') || undefined}
      panelClassName="max-h-[calc(100dvh-2rem)] max-w-[900px]"
      bodyClassName="!px-0 !py-0 [@media(min-height:820px)]:!max-h-none"
      footer={
        <>
          {onSwitchToCash ? (
            <PaymentMethodMenu disabled={!waiting && !isExpired} onSwitchToCash={onSwitchToCash} />
          ) : <span className="mr-auto" />}
          {canConfirm ? (
            <Button variant="secondary" onClick={onConfirmPaid} disabled={confirming}>
              <Icon name="check-line" />
              {confirming ? 'Confirming…' : 'Customer paid'}
            </Button>
          ) : null}
          <Button variant="secondary" onClick={onClose}>{isPaid ? 'Done' : 'Close'}</Button>
          {onHold && !isPaid ? (
            <Button variant="primary" onClick={onHold}>
              <Icon name="time-line" /> Hold in Queue
            </Button>
          ) : null}
        </>
      }
    >
      {checkout ? (
        <div className="grid md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="flex flex-col items-center justify-center gap-4 px-6 py-7 md:border-r md:border-vpos-line">
            {/* The card stays white in every theme, like the printed KHQR stand, so banking apps can read the code. */}
            <div className="w-full max-w-[330px] overflow-hidden rounded-[18px] shadow-[0_18px_45px_rgba(0,0,0,.28)]" style={{ backgroundColor: '#ffffff', color: '#111111' }}>
              <div className="relative grid h-[58px] place-items-center bg-[#E1232E]">
                <span className="text-[24px] font-black tracking-[0.12em] text-white" aria-label="KHQR">KHQR</span>
              </div>
              <div className="relative px-5 pt-4 pb-3">
                {/* The folded corner of the KHQR card */}
                <span aria-hidden className="absolute top-0 right-0 h-0 w-0 border-t-[26px] border-l-[26px] border-t-[#E1232E] border-l-transparent" />
                <p className="m-0 truncate pr-6 text-[14px] font-bold uppercase" data-locale-ignore>{merchantName || 'Merchant'}</p>
                <p className="m-0 mt-1.5 text-[30px] leading-tight font-extrabold tracking-[-0.02em]" data-locale-ignore>
                  {money(checkout.payment.amount)}
                </p>
              </div>
              <div className="mx-0 border-t-2 border-dashed border-[#e3e3e3]" />
              <div className="relative grid aspect-square place-items-center p-5">
                {qrImageSource && !qrImageFailed ? (
                  <img
                    key={checkout.transactionId}
                    src={qrImageSource}
                    alt={`KHQR payment code for ${orderNo ?? 'this order'}`}
                    width="280"
                    height="280"
                    className={cn('block h-full w-full object-contain [grid-area:1/1]', (isPaid || isExpired || isFailed) && 'opacity-[0.06]')}
                    onError={() => setQrImageFailed(true)}
                  />
                ) : (
                  <span className="px-5 text-center [grid-area:1/1]">
                    <Icon name="error-warning-line" className="text-[30px] text-[#E1232E]" />
                    <strong className="mt-2 block text-[13px]">QR image failed to load</strong>
                    {qrImageUrl ? (
                      <a href={qrImageUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-bold text-[#E1232E]">
                        <Icon name="external-link-line" /> Open QR image
                      </a>
                    ) : null}
                  </span>
                )}
                {isPaid ? (
                  <span className="grid place-items-center gap-2 [grid-area:1/1]" aria-label="Payment completed">
                    <span className="grid h-24 w-24 place-items-center rounded-full bg-emerald-500 text-white shadow-[0_12px_30px_rgba(16,185,129,.35)]">
                      <Icon name="check-line" className="text-[60px]" />
                    </span>
                    <strong className="text-[15px] text-emerald-700">Paid</strong>
                  </span>
                ) : isExpired ? (
                  <span className="grid place-items-center gap-2 px-6 text-center [grid-area:1/1]">
                    <Icon name="time-line" className="text-[40px] text-[#E1232E]" />
                    <strong className="text-[15px]">This QR has expired</strong>
                    {onRenewQr ? (
                      <button type="button" onClick={onRenewQr} disabled={renewing} className="mt-1 inline-flex items-center gap-1.5 rounded-[8px] border-0 bg-[#E1232E] px-3.5 py-2 text-[13px] font-bold text-white disabled:opacity-60">
                        <Icon name={renewing ? 'loader-4-line' : 'refresh-line'} className={renewing ? 'animate-spin' : ''} /> New QR
                      </button>
                    ) : null}
                  </span>
                ) : isFailed ? (
                  <span className="grid place-items-center gap-2 [grid-area:1/1]">
                    <Icon name="close-circle-line" className="text-[48px] text-[#E1232E]" />
                    <strong className="text-[15px]">Payment not completed</strong>
                  </span>
                ) : null}
              </div>
            </div>
            <StatusLine
              isPaid={isPaid}
              isFailed={isFailed}
              isExpired={isExpired}
              isSimulated={isSimulated}
              remainingMs={remainingMs}
            />
          </div>

          <div className="flex flex-col px-6 py-7">
            <span className="text-[12px] font-extrabold tracking-[0.08em] text-vpos-muted uppercase">{isPaid ? 'Total paid' : 'Total due'}</span>
            <strong className="mt-1 text-[34px] leading-tight tracking-[-0.03em] text-vpos-text" data-locale-ignore>{money(checkout.payment.amount)}</strong>

            <dl className="m-0 mt-5 space-y-3 border-t border-vpos-line pt-5 text-[14px]">
              <SummaryRow label="Subtotal" value={money(order?.subtotal ?? checkout.payment.amount)} />
              <SummaryRow label="Total Item Discount" value={discount > 0 ? `−${money(discount)}` : money(0)} />
              <SummaryRow label="Total VAT" value={money(order?.tax)} />
              {Number(order?.deliveryFee ?? 0) > 0 ? <SummaryRow label="Delivery fee" value={money(order?.deliveryFee)} /> : null}
            </dl>

            <dl className="m-0 mt-5 space-y-3 border-t border-vpos-line pt-5 text-[13px]">
              <CopyRow label="Order ID" value={orderNo ?? order?.orderNo ?? String(checkout.payment.orderId)} />
              <CopyRow label="Payment ID" value={`PMT-${checkout.payment.id}`} />
            </dl>

            <p className={cn(
              'm-0 mt-auto rounded-[8px] px-3 py-2.5 text-[12px] leading-5',
              autoCheckError && waiting ? 'bg-vpos-orange-bg text-vpos-orange' : 'bg-vpos-subtle text-vpos-muted',
            )}>
              {isPaid
                ? 'Payment received. The POS is completing the order.'
                : isFailed
                  ? 'The provider reported that this payment did not complete.'
                  : isExpired
                    ? 'Make a new QR for the same order, switch to cash, or hold the order for later.'
                    : isSimulated
                      ? 'The payment will be marked successful automatically after a short delay.'
                      : isBakong
                        ? autoCheckError
                          ? `Automatic check unavailable: ${autoCheckError} Check your bank app, then tap Customer paid.`
                          : 'Ask the customer to scan with any Cambodian banking app. The payment is confirmed automatically.'
                        : 'Keep this QR visible until the customer finishes in their bank app.'}
            </p>
          </div>
        </div>
      ) : null}
    </Modal>
  )
}

const METHODS = [
  { id: 'qr', icon: 'qr-code-line', label: 'QR Code', hint: 'Customer scans the KHQR' },
  { id: 'cash', icon: 'money-dollar-circle-line', label: 'Cash', hint: 'Take dollars or riel instead' },
] as const

/** Picks how this order is paid; choosing Cash leaves the KHQR for the cash window. Opens upwards from the footer. */
function PaymentMethodMenu({ disabled, onSwitchToCash }: { disabled: boolean; onSwitchToCash: () => void }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const closeOutside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', closeOutside)
    return () => document.removeEventListener('pointerdown', closeOutside)
  }, [open])

  return (
    <div ref={rootRef} className="relative mr-auto">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Payment method"
        disabled={disabled}
        onClick={() => setOpen((value) => !value)}
        className={cn(
          'inline-flex h-10 min-w-[170px] items-center gap-2 rounded-[8px] border bg-vpos-subtle px-3 text-[13px] font-semibold text-vpos-text transition-colors disabled:cursor-not-allowed disabled:opacity-50',
          open ? 'border-vpos-primary' : 'border-vpos-line hover:border-vpos-muted',
        )}
      >
        <Icon name="qr-code-line" className="text-[16px] text-vpos-muted" />
        <span className="flex-1 text-left">QR Code</span>
        <Icon name="arrow-down-s-line" className={cn('text-[18px] text-vpos-muted transition-transform', open && 'rotate-180')} />
      </button>
      {open ? (
        <div role="menu" className="absolute bottom-[calc(100%+8px)] left-0 z-10 w-[260px] overflow-hidden rounded-[10px] border border-vpos-line bg-white p-1.5 shadow-vpos">
          {METHODS.map((method) => {
            const current = method.id === 'qr'
            return (
              <button
                key={method.id}
                type="button"
                role="menuitemradio"
                aria-checked={current}
                onClick={() => {
                  setOpen(false)
                  if (!current) onSwitchToCash()
                }}
                className={cn(
                  'flex w-full items-center gap-3 rounded-[8px] border-0 px-2.5 py-2 text-left transition-colors',
                  current ? 'bg-vpos-subtle' : 'bg-transparent hover:bg-vpos-subtle',
                )}
              >
                <span className={cn('grid h-8 w-8 shrink-0 place-items-center rounded-[8px] text-[17px]', current ? 'bg-vpos-primary text-white' : 'bg-vpos-subtle text-vpos-muted')}>
                  <Icon name={method.icon} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-bold text-vpos-text">{method.label}</span>
                  <span className="block truncate text-[11px] text-vpos-muted">{method.hint}</span>
                </span>
                {current ? <Icon name="check-line" className="text-[17px] text-vpos-primary" /> : null}
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}

function StatusLine({ isPaid, isFailed, isExpired, isSimulated, remainingMs }: {
  isPaid: boolean; isFailed: boolean; isExpired: boolean; isSimulated: boolean; remainingMs: number | null
}) {
  if (isPaid) return <Status dot="bg-emerald-500" text="Payment received" />
  if (isFailed) return <Status dot="bg-vpos-red" text="Payment failed" />
  if (isExpired) return <Status dot="bg-vpos-red" text="Expired" />
  if (remainingMs !== null) {
    const seconds = Math.max(0, Math.ceil(remainingMs / 1000))
    const clock = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
    return <Status dot={seconds <= 60 ? 'bg-vpos-red animate-pulse' : 'bg-amber-500'} text={`Expires in ${clock}`} />
  }
  return <Status dot="bg-amber-500 animate-pulse" text={isSimulated ? 'Simulating payment…' : 'Waiting for payment…'} />
}

function Status({ dot, text }: { dot: string; text: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-[14px] font-bold text-vpos-text">
      <span className={cn('h-2 w-2 rounded-full', dot)} />
      {text}
    </span>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-vpos-muted">{label}</dt>
      <dd className="m-0 font-bold text-vpos-text" data-locale-ignore>{value}</dd>
    </div>
  )
}

function CopyRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    void navigator.clipboard?.writeText(value).then(() => {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    }).catch(() => undefined)
  }
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-vpos-muted">{label}:</dt>
      <dd className="m-0 flex min-w-0 items-center gap-2 font-bold text-vpos-text">
        <span className="truncate" data-locale-ignore>{value}</span>
        <button type="button" onClick={copy} aria-label={`Copy ${label}`} className="grid h-7 w-7 shrink-0 place-items-center rounded-[6px] border-0 bg-transparent text-vpos-muted hover:bg-vpos-subtle hover:text-vpos-text">
          <Icon name={copied ? 'check-line' : 'file-copy-line'} />
        </button>
      </dd>
    </div>
  )
}

/**
 * Milliseconds until the KHQR expires, counted from when it was shown. The server's expiry has no time zone,
 * so only the QR's lifetime (expiry minus creation, both server times) is used. Null when there is no expiry.
 */
function useCountdown(checkout: QrPaymentResponse | null, isBakong: boolean): number | null {
  const shownAt = useRef(Date.now())
  const lifetime = (() => {
    if (!checkout) return null
    const expires = checkout.expiresAt ? Date.parse(checkout.expiresAt) : NaN
    const created = checkout.payment.createdAt ? Date.parse(checkout.payment.createdAt) : NaN
    const span = expires - created
    if (Number.isFinite(span) && span > 0 && span <= 24 * 60 * 60 * 1000) return span
    return isBakong ? DEFAULT_QR_LIFETIME_MS : null
  })()
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    if (lifetime === null) return
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [lifetime])
  return lifetime === null ? null : lifetime - (now - shownAt.current)
}
