import { cn } from '../../lib/cn'
import { formatCurrency } from '../../lib/currency'
import { card } from '../../lib/ui'
import type { ReportBucket } from '../../features/orders/types'

export interface BreakdownRow {
  key: string
  label: string
  orderCount: number
  subtotal: number
  discount: number
  tax: number
  grandTotal: number
  refunded: number
}

const BUCKET_TEXT: Record<ReportBucket, { title: string; unit: string }> = {
  HOUR: { title: 'Sales by hour', unit: 'Hour' },
  DAY: { title: 'Sales by day', unit: 'Day' },
  MONTH: { title: 'Sales by month', unit: 'Month' },
}

/** A bar for every hour, day or month of the period, and a table of orders, discounts, tax, net sales and refunds. */
export function SalesBreakdownPanel({
  rows,
  bucket,
  currency,
  isLoading,
}: {
  rows: BreakdownRow[]
  bucket: ReportBucket
  currency: string
  isLoading?: boolean
}) {
  const max = Math.max(0, ...rows.map((row) => row.grandTotal))
  const totals = rows.reduce(
    (sum, row) => ({
      orderCount: sum.orderCount + row.orderCount,
      subtotal: sum.subtotal + row.subtotal,
      discount: sum.discount + row.discount,
      tax: sum.tax + row.tax,
      grandTotal: sum.grandTotal + row.grandTotal,
      refunded: sum.refunded + row.refunded,
    }),
    { orderCount: 0, subtotal: 0, discount: 0, tax: 0, grandTotal: 0, refunded: 0 },
  )
  // A day has 24 hours; listing the quiet ones only makes the table long.
  const tableRows = bucket === 'HOUR' ? rows.filter((row) => row.orderCount > 0 || row.refunded > 0) : rows
  const text = BUCKET_TEXT[bucket]
  const money = (value: number) => formatCurrency(value, currency)

  return (
    <section className={`${card} mt-[18px] overflow-hidden p-0`}>
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-vpos-line px-5 py-4">
        <div>
          <h2 className="m-0 text-[15px] font-extrabold text-vpos-text">{text.title}</h2>
          <p className="mt-1 mb-0 text-[12px] text-vpos-muted">Completed sales in your time zone. Refunds count in the period of the payment they reverse.</p>
        </div>
      </header>

      {isLoading ? (
        <p className="m-0 px-5 py-10 text-center text-[13px] text-vpos-muted">Loading the breakdown…</p>
      ) : (
        <>
          <div className="px-5 pt-5 pb-2">
            <div className="flex h-[150px] items-end gap-[3px]" role="img" aria-label={`${text.title} chart`}>
              {rows.map((row) => (
                <div key={row.key} className="group relative flex h-full min-w-0 flex-1 flex-col justify-end">
                  <div
                    className={cn('w-full rounded-t-[2px] transition-colors', row.grandTotal > 0 ? 'bg-vpos-primary group-hover:bg-vpos-primary-2' : 'bg-vpos-subtle')}
                    style={{ height: max > 0 && row.grandTotal > 0 ? `${Math.max(3, (row.grandTotal / max) * 100)}%` : '3px' }}
                  />
                  <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded-[3px] bg-vpos-dark px-2 py-1 text-[11px] font-semibold text-white group-hover:block">
                    {row.label}: {money(row.grandTotal)} · {row.orderCount} {row.orderCount === 1 ? 'order' : 'orders'}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-1.5 flex justify-between text-[10px] font-semibold text-vpos-muted">
              <span>{rows[0]?.label}</span>
              {rows.length > 2 ? <span>{rows[Math.floor(rows.length / 2)]?.label}</span> : null}
              <span>{rows[rows.length - 1]?.label}</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-[13px]">
              <thead className="border-y border-vpos-line bg-vpos-subtle text-[11px] font-bold tracking-[0.04em] text-vpos-muted uppercase">
                <tr>
                  <th className="px-5 py-2.5">{text.unit}</th>
                  <th className="px-3 py-2.5 text-right">Orders</th>
                  <th className="px-3 py-2.5 text-right">Subtotal</th>
                  <th className="px-3 py-2.5 text-right">Discounts</th>
                  <th className="px-3 py-2.5 text-right">Tax</th>
                  <th className="px-3 py-2.5 text-right">Net sales</th>
                  <th className="px-5 py-2.5 text-right">Refunds</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-vpos-line">
                {tableRows.length === 0 ? (
                  <tr><td colSpan={7} className="px-5 py-8 text-center text-vpos-muted">No completed sales in this period.</td></tr>
                ) : tableRows.map((row) => (
                  <tr key={row.key} className={row.orderCount === 0 && row.refunded === 0 ? 'text-vpos-muted' : 'text-vpos-text'}>
                    <td className="px-5 py-2.5 font-semibold">{row.label}</td>
                    <td className="px-3 py-2.5 text-right">{row.orderCount}</td>
                    <td className="px-3 py-2.5 text-right">{money(row.subtotal)}</td>
                    <td className="px-3 py-2.5 text-right">{money(row.discount)}</td>
                    <td className="px-3 py-2.5 text-right">{money(row.tax)}</td>
                    <td className="px-3 py-2.5 text-right font-bold">{money(row.grandTotal)}</td>
                    <td className={cn('px-5 py-2.5 text-right', row.refunded > 0 && 'text-vpos-red')}>{money(row.refunded)}</td>
                  </tr>
                ))}
              </tbody>
              {tableRows.length > 0 ? (
                <tfoot className="border-t-2 border-vpos-line bg-vpos-subtle font-bold text-vpos-text">
                  <tr>
                    <td className="px-5 py-3">Total</td>
                    <td className="px-3 py-3 text-right">{totals.orderCount}</td>
                    <td className="px-3 py-3 text-right">{money(totals.subtotal)}</td>
                    <td className="px-3 py-3 text-right">{money(totals.discount)}</td>
                    <td className="px-3 py-3 text-right">{money(totals.tax)}</td>
                    <td className="px-3 py-3 text-right">{money(totals.grandTotal)}</td>
                    <td className={cn('px-5 py-3 text-right', totals.refunded > 0 && 'text-vpos-red')}>{money(totals.refunded)}</td>
                  </tr>
                </tfoot>
              ) : null}
            </table>
          </div>
        </>
      )}
    </section>
  )
}
