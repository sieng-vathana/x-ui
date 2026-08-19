import { useEffect, useState } from 'react'
import type { QrPaymentResponse } from '../../features/payments/types'
import { formatCurrency } from '../../lib/currency'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'
import { Modal } from '../ui/Modal'

const SUCCESS_DISPLAY_MS = 1000

export interface PosQrPaymentModalProps {
  checkout: QrPaymentResponse | null
  orderNo?: string
  onClose: () => void
}

export function PosQrPaymentModal({ checkout, orderNo, onClose }: PosQrPaymentModalProps) {
  const [copied, setCopied] = useState(false)
  const qrImageSource = checkout?.qrImageDataUrl
  const qrImageUrl = checkout?.qrImageUrl
  const [qrImageFailed, setQrImageFailed] = useState(false)
  const isPaid = checkout?.payment.status === 'PAID'
  const isFailed = checkout?.payment.status === 'FAILED' || checkout?.payment.status === 'CANCELLED'
  const isSimulated = checkout?.payment.provider === 'SIMULATED'
  const paymentTitle = isSimulated ? 'Simulated QR payment' : 'KHQR payment'

  useEffect(() => {
    if (!isPaid || !isSimulated) return
    const timeoutId = window.setTimeout(onClose, SUCCESS_DISPLAY_MS)
    return () => window.clearTimeout(timeoutId)
  }, [isPaid, isSimulated, onClose])

  const copyQrData = async () => {
    if (!checkout?.qrPayload) return
    await navigator.clipboard.writeText(checkout.qrPayload)
    setCopied(true)
  }

  return (
    <Modal
      open={Boolean(checkout)}
      onClose={onClose}
      size="md"
      title={orderNo ? `${paymentTitle} · ${orderNo}` : paymentTitle}
      description={isSimulated
        ? 'This is a local QR simulation. It will be verified automatically.'
        : 'Ask the customer to scan this code with a Cambodian banking app.'}
      panelClassName="max-h-[calc(100dvh-2rem)] max-w-[500px]"
      bodyClassName="[@media(min-height:800px)]:!max-h-none [@media(min-height:800px)]:!overflow-y-visible"
      footer={
        <>
          {checkout?.qrPayload && !isPaid ? (
            <Button variant="secondary" onClick={() => void copyQrData()}>
              <Icon name={copied ? 'check-line' : 'file-copy-line'} />
              {copied ? 'Copied' : 'Copy KHQR data'}
            </Button>
          ) : null}
          <Button variant="primary" onClick={onClose}>Done</Button>
        </>
      }
    >
      {checkout && qrImageSource ? (
        <div className="overflow-hidden rounded-[10px] border border-vpos-line bg-white shadow-[0_18px_45px_rgba(15,34,58,.12)]">
          <div className="flex items-center justify-between bg-[#d9222a] px-5 py-3 text-white">
            <span className="flex items-center gap-2 text-[18px] font-black tracking-[-0.03em]">
              <Icon name={isPaid ? 'check-line' : 'qr-code-line'} className="text-[22px]" /> {isPaid ? 'PAID' : 'KHQR'}
            </span>
            <span className="text-[10px] font-extrabold tracking-[0.14em] uppercase">
              {isPaid ? 'Payment received' : isFailed ? 'Payment failed' : isSimulated ? 'Simulating payment' : 'Scan to pay'}
            </span>
          </div>

          <div className="px-5 py-5 text-center sm:px-8">
            <span className="text-[10px] font-extrabold tracking-[0.14em] text-vpos-muted uppercase">
              {isPaid ? 'Amount paid' : 'Amount due'}
            </span>
            <strong className="mt-1 block text-[30px] tracking-[-0.04em] text-vpos-text">
              {formatCurrency(checkout.payment.amount, checkout.payment.currencyCode)}
            </strong>

            {isPaid ? (
              <div className="mx-auto mt-4 grid aspect-square w-full max-w-[300px] place-items-center rounded-[8px] border border-emerald-100 bg-emerald-50 p-2">
                <span
                  className="grid h-28 w-28 place-items-center rounded-full bg-emerald-500 text-white shadow-[0_12px_30px_rgba(16,185,129,.28)] animate-pulse"
                  aria-label="Payment completed"
                >
                  <Icon name="check-line" className="text-[72px]" />
                </span>
              </div>
            ) : (
              <div className="mx-auto mt-4 grid aspect-square w-full max-w-[300px] place-items-center rounded-[8px] border border-vpos-line bg-white p-2">
                {!qrImageFailed ? (
                  <img
                    key={checkout.transactionId}
                    src={qrImageSource}
                    alt={`KHQR payment code for transaction ${checkout.transactionId}`}
                    width="300"
                    height="300"
                    className="block h-full w-full object-contain [grid-area:1/1]"
                    onError={() => setQrImageFailed(true)}
                  />
                ) : (
                  <span className="px-5 text-center [grid-area:1/1]">
                    <Icon name="error-warning-line" className="text-[30px] text-vpos-red" />
                    <strong className="mt-2 block text-[13px] text-vpos-text">QR image failed to load</strong>
                    <span className="mt-1 block text-[11px] leading-5 text-vpos-muted">
                      KHQRPay did not return the QR image.
                    </span>
                    {qrImageUrl ? (
                      <a
                        href={qrImageUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-bold text-vpos-primary"
                      >
                        <Icon name="external-link-line" /> Open QR image
                      </a>
                    ) : null}
                  </span>
                )}
              </div>
            )}

            <strong className="mt-4 block text-[14px] text-vpos-text">
              {isPaid ? 'Payment completed' : isFailed ? 'Payment was not completed' : isSimulated ? 'Verifying simulated payment' : 'Waiting for customer payment'}
            </strong>
            <span className="mt-1 block text-[12px] leading-5 text-vpos-muted">
              {isPaid
                ? isSimulated
                  ? 'The simulated callback confirmed the payment. The POS is completing the order.'
                  : 'KHQRPay confirmed the payment. The POS is completing the order.'
                : isFailed
                  ? isSimulated
                    ? 'The simulated payment could not be verified.'
                    : 'The provider reported that this payment did not complete.'
                  : isSimulated
                    ? 'The payment will be marked successful automatically after a short delay.'
                    : 'Keep this QR visible until the customer finishes in their bank app.'}
            </span>
            <code
              className="mt-4 block truncate rounded-[4px] bg-vpos-subtle px-3 py-2 font-mono text-[10px] text-vpos-muted"
              title={checkout.transactionId}
            >
              {checkout.transactionId}
            </code>
          </div>
        </div>
      ) : null}
    </Modal>
  )
}
