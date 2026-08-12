import { useState } from 'react'
import type { QrPaymentResponse } from '../../features/payments/types'
import { formatCurrency } from '../../lib/currency'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'
import { Modal } from '../ui/Modal'

export interface PosQrPaymentModalProps {
  checkout: QrPaymentResponse | null
  orderNo?: string
  onClose: () => void
}

export function PosQrPaymentModal({ checkout, orderNo, onClose }: PosQrPaymentModalProps) {
  const [copied, setCopied] = useState(false)
  const qrImageUrl = checkout?.qrImageUrl

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
      title={orderNo ? `KHQR payment · ${orderNo}` : 'KHQR payment'}
      description="Ask the customer to scan this code with a Cambodian banking app."
      panelClassName="max-w-[500px]"
      footer={
        <>
          {checkout?.qrPayload ? (
            <Button variant="secondary" onClick={() => void copyQrData()}>
              <Icon name={copied ? 'check-line' : 'file-copy-line'} />
              {copied ? 'Copied' : 'Copy KHQR data'}
            </Button>
          ) : null}
          <Button variant="primary" onClick={onClose}>Done</Button>
        </>
      }
    >
      {checkout && qrImageUrl ? (
        <div className="overflow-hidden rounded-[10px] border border-vpos-line bg-white shadow-[0_18px_45px_rgba(15,34,58,.12)]">
          <div className="flex items-center justify-between bg-[#d9222a] px-5 py-3 text-white">
            <span className="flex items-center gap-2 text-[18px] font-black tracking-[-0.03em]">
              <Icon name="qr-code-line" className="text-[22px]" /> KHQR
            </span>
            <span className="text-[10px] font-extrabold tracking-[0.14em] uppercase">Scan to pay</span>
          </div>

          <div className="px-5 py-5 text-center sm:px-8">
            <span className="text-[10px] font-extrabold tracking-[0.14em] text-vpos-muted uppercase">
              Amount due
            </span>
            <strong className="mt-1 block text-[30px] tracking-[-0.04em] text-vpos-text">
              {formatCurrency(checkout.payment.amount, checkout.payment.currencyCode)}
            </strong>

            <div className="mx-auto mt-4 aspect-square w-full max-w-[300px] rounded-[8px] border border-vpos-line bg-white p-2">
              <img
                key={checkout.transactionId}
                src={qrImageUrl}
                alt={`KHQR payment code for transaction ${checkout.transactionId}`}
                width="300"
                height="300"
                decoding="async"
                className="h-full w-full object-contain"
              />
            </div>

            <strong className="mt-4 block text-[14px] text-vpos-text">Waiting for customer payment</strong>
            <span className="mt-1 block text-[12px] leading-5 text-vpos-muted">
              The order has been created. Keep this QR visible until the customer finishes in their bank app.
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
