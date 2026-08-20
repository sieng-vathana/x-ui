import type { PaymentBreakdown } from '../../features/payments/types'
import { formatCurrency } from '../../lib/currency'

export function PaymentBreakdownTable({ rows, currency }: { rows: PaymentBreakdown[]; currency: string }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="px-4 py-3 text-left text-[11px] font-extrabold uppercase tracking-[0.06em] text-vpos-muted">Method</th>
            <th className="px-4 py-3 text-left text-[11px] font-extrabold uppercase tracking-[0.06em] text-vpos-muted">Provider</th>
            <th className="px-4 py-3 text-right text-[11px] font-extrabold uppercase tracking-[0.06em] text-vpos-muted">Payments</th>
            <th className="px-4 py-3 text-right text-[11px] font-extrabold uppercase tracking-[0.06em] text-vpos-muted">Collected</th>
            <th className="px-4 py-3 text-right text-[11px] font-extrabold uppercase tracking-[0.06em] text-vpos-muted">Refunded</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${row.method}-${row.provider}`} className="border-t border-vpos-line">
              <td className="px-4 py-3 text-[13px] font-bold text-vpos-text">{paymentMethodLabel(row.method)}</td>
              <td className="px-4 py-3 text-[13px] text-vpos-muted">{providerLabel(row.provider)}</td>
              <td className="px-4 py-3 text-right text-[13px] text-vpos-text">{row.paymentCount}</td>
              <td className="px-4 py-3 text-right text-[13px] font-bold text-vpos-text">{formatCurrency(row.totalAmount, currency)}</td>
              <td className="px-4 py-3 text-right text-[13px] text-vpos-muted">{formatCurrency(row.refundedAmount, currency)}</td>
            </tr>
          ))}
          {rows.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-4 py-12 text-center text-[13px] text-vpos-muted">No settled payments found for this period.</td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  )
}

function paymentMethodLabel(method: string): string {
  if (method === 'CASH') return 'Cash'
  if (method === 'CARD') return 'Card'
  if (method === 'QR') return 'QR'
  return method
}

function providerLabel(provider: string): string {
  if (provider === 'NONE') return 'Cash drawer'
  if (provider === 'SIMULATED') return 'Simulated'
  if (provider === 'KHQRPAY') return 'KHQRPay'
  if (provider === 'OTHER') return 'Manual'
  return provider
}
