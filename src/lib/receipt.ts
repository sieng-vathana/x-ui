import type { PosOrder } from '../features/orders/types'
import type { BffStore } from '../features/stores/types'
import { formatCashMix } from './cashTender'
import { canConvertCurrency, convertCurrency, formatCurrency } from './currency'
import { parseServerTime } from './serverTime'

export type ReceiptPaymentMethod = 'cash' | 'card' | 'qr' | string | null | undefined

export interface ReceiptOptions {
  paperSize: '58mm' | '80mm'
  language?: 'en' | 'km'
  businessName?: string
  taxRegistrationNumber?: string
  taxRegistrationLabel?: string
  businessLogoUrl?: string
  store?: Pick<BffStore, 'name' | 'addressLine1' | 'addressLine2' | 'city' | 'countryCode' | 'phone' | 'email'>
  cashierName?: string
  customerName?: string
  paymentMethod?: ReceiptPaymentMethod
  usdToKhrRate?: number
  /** Cash handed over and change given back, printed under the total of a cash sale. */
  cash?: ReceiptCash
  /** Loyalty points the sale used and earned. */
  loyalty?: { redeemed: number; earned: number }
  showLogo?: boolean
  showSku?: boolean
  showCustomer?: boolean
  footer?: string
}

export interface ReceiptCash {
  receivedUsd: number
  receivedKhr: number
  changeUsd: number
  changeKhr: number
}

const RECEIPT_STRINGS_KM: Record<string, string> = {
  'Preparing receipt': 'កំពុងរៀបចំបង្កាន់ដៃ',
  'Preparing receipt…': 'កំពុងរៀបចំបង្កាន់ដៃ…',
  'SALES RECEIPT': 'បង្កាន់ដៃលក់',
  'Receipt': 'លេខបង្កាន់ដៃ',
  'Date': 'កាលបរិច្ឆេទ',
  'Cashier': 'អ្នកគិតលុយ',
  'Customer': 'អតិថិជន',
  'Payment': 'វិធីទូទាត់',
  'Subtotal': 'សរុបរង',
  'Discount': 'បញ្ចុះតម្លៃ',
  'Tax / VAT': 'ពន្ធអាករ / VAT',
  'Rounding': 'បង្គត់',
  'Total': 'សរុប',
  'Cash received': 'ប្រាក់ទទួលបាន',
  'Change': 'ប្រាក់អាប់',
  'Points used': 'ពិន្ទុបានប្រើ',
  'Points earned': 'ពិន្ទុទទួលបាន',
  'Thank you for shopping with us.': 'សូមអរគុណដែលបានទិញទំនិញជាមួយយើង។',
  'No line items': 'គ្មានទំនិញ',
  'Date unavailable': 'កាលបរិច្ឆេទមិនមាន',
  'Tax registration': 'ការចុះបញ្ជីពន្ធ',
  'Cash': 'សាច់ប្រាក់',
  'Card': 'កាត',
  'QR payment': 'ការទូទាត់តាម QR',
  'Paid': 'បានបង់ប្រាក់',
}

export function openReceiptWindow(): Window | null {
  const screenWidth = window.screen?.availWidth || window.innerWidth || 1280
  const screenHeight = window.screen?.availHeight || window.innerHeight || 900
  const isKm = typeof window !== 'undefined' && window.localStorage.getItem('vpos.portal-language') === 'km'
  const printWindow = window.open(
    '',
    '_blank',
    `popup=yes,width=${screenWidth},height=${screenHeight},left=0,top=0,resizable=yes,scrollbars=yes`,
  )
  if (!printWindow) return null
  printWindow.focus()
  printWindow.document.open()
  printWindow.document.write(`<!doctype html><html><head><title>${isKm ? 'កំពុងរៀបចំបង្កាន់ដៃ' : 'Preparing receipt'}</title></head><body style="font:14px Arial,sans-serif;padding:24px">${isKm ? 'កំពុងរៀបចំបង្កាន់ដៃ…' : 'Preparing receipt…'}</body></html>`)
  printWindow.document.close()
  return printWindow
}

export function printReceipt(order: PosOrder, options: ReceiptOptions, targetWindow?: Window | null): boolean {
  const printWindow = targetWindow === undefined ? openReceiptWindow() : targetWindow
  if (!printWindow || printWindow.closed) return false

  const isKm = (options.language ?? (typeof window !== 'undefined' && window.localStorage.getItem('vpos.portal-language') === 'km' ? 'km' : 'en')) === 'km'
  const tx = (key: string): string => (isKm ? (RECEIPT_STRINGS_KM[key] ?? key) : key)

  const currency = (order.currencyCode || 'USD').toUpperCase()
  const rate = Number(options.usdToKhrRate || 0)
  const secondaryCurrency = currency === 'USD' ? 'KHR' : currency === 'KHR' ? 'USD' : undefined
  const secondaryTotal = secondaryCurrency && canConvertCurrency(currency, secondaryCurrency) && rate > 0
    ? convertCurrency(Number(order.grandTotal ?? 0), currency, secondaryCurrency, rate)
    : undefined
  const store = options.store
  const storeLines = [
    store?.addressLine1,
    store?.addressLine2,
    [store?.city, store?.countryCode].filter(Boolean).join(', '),
    store?.phone,
    store?.email,
  ].filter((value): value is string => Boolean(value?.trim()))
  const itemRows = (order.items ?? []).map((item) => {
    const quantity = Number(item.quantity ?? item.qty ?? 0)
    const unitPrice = Number(item.unitPrice ?? 0)
    const lineTotal = Number(item.total ?? unitPrice * quantity)
    const discount = Number(item.discountAmount ?? 0)
    const variant = item.variantName && item.variantName !== item.productName
      ? `<span class="item-variant">${escapeReceiptText(item.variantName)}</span>`
      : ''
    const sku = options.showSku && item.sku
      ? `<span class="item-meta">SKU: ${escapeReceiptText(item.sku)}</span>`
      : ''
    const discountLine = discount > 0
      ? `<span class="item-meta discount">${tx('Discount')} −${formatCurrency(discount, currency)}</span>`
      : ''
    return `<div class="item"><div class="item-copy"><strong>${escapeReceiptText(item.productName || item.variantName || 'Item')}</strong>${variant}${sku}<span class="item-meta">${quantity} × ${formatCurrency(unitPrice, currency)}${discountLine}</span></div><strong class="item-total">${formatCurrency(lineTotal, currency)}</strong></div>`
  }).join('')
  const subtotal = Number(order.subtotal ?? 0)
  const discount = Number(order.discount ?? 0)
  const tax = Number(order.tax ?? 0)
  const total = Number(order.grandTotal ?? 0)
  const beforeRounding = subtotal - discount + tax
  const rounding = total - beforeRounding
  const paymentLabel = formatPaymentMethod(options.paymentMethod, isKm)
  const logo = options.showLogo && options.businessLogoUrl
    ? `<img class="logo" src="${escapeReceiptText(options.businessLogoUrl)}" alt="" />`
    : ''
  const taxRegistration = options.taxRegistrationNumber?.trim()
    ? `<div class="muted">${escapeReceiptText(options.taxRegistrationLabel?.trim() || tx('Tax registration'))}: ${escapeReceiptText(options.taxRegistrationNumber.trim())}</div>`
    : ''
  const customer = options.showCustomer !== false && options.customerName
    ? detailRow(tx('Customer'), options.customerName)
    : ''
  const cashLines = options.cash
    ? `<div class="line"><span class="label">${tx('Cash received')}</span><strong>${formatCashMix(options.cash.receivedUsd, options.cash.receivedKhr)}</strong></div><div class="line"><span class="label">${tx('Change')}</span><strong>${formatCashMix(options.cash.changeUsd, options.cash.changeKhr)}</strong></div>`
    : ''
  const loyaltyLines = options.loyalty
    ? [
        options.loyalty.redeemed > 0 ? `<div class="line"><span class="label">${tx('Points used')}</span><strong>${options.loyalty.redeemed.toLocaleString('en-US')}</strong></div>` : '',
        options.loyalty.earned > 0 ? `<div class="line"><span class="label">${tx('Points earned')}</span><strong>${options.loyalty.earned.toLocaleString('en-US')}</strong></div>` : '',
      ].join('')
    : ''
  const footer = options.footer?.trim() ? (isKm && options.footer.trim() === 'Thank you for shopping with us.' ? tx('Thank you for shopping with us.') : options.footer.trim()) : tx('Thank you for shopping with us.')
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeReceiptText(order.orderNo || tx('Receipt'))}</title><style>
@page{size:${options.paperSize} auto;margin:0}*{box-sizing:border-box}body{width:${options.paperSize};max-width:100%;margin:0 auto;padding:12px 9px;font:12px/1.4 Arial,sans-serif;color:#111;background:#fff}.center{text-align:center}.logo{display:block;width:52px;height:52px;margin:0 auto 6px;object-fit:contain}.business{font-size:16px;font-weight:800}.store{margin-top:2px;color:#444;font-size:11px;font-weight:700}.muted{color:#666;font-size:10px}.rule{border-top:1px dashed #888;margin:10px 0}.details{display:grid;gap:3px;margin-top:10px}.detail{display:flex;justify-content:space-between;gap:8px;font-size:10px}.detail span:first-child{color:#666}.detail span:last-child{text-align:right;font-weight:700}.items{display:grid;gap:9px}.item{display:flex;align-items:flex-start;justify-content:space-between;gap:8px}.item-copy{min-width:0;display:grid;gap:1px}.item-copy strong{font-size:11px}.item-variant,.item-meta{color:#666;font-size:10px}.item-total{white-space:nowrap;font-size:11px}.discount{color:#a22}.summary{display:grid;gap:5px}.summary .line{display:flex;justify-content:space-between;gap:8px}.summary .label{color:#666}.grand{border-top:1px solid #111;margin-top:3px;padding-top:7px;font-size:15px;font-weight:800}.secondary{text-align:right;color:#666;font-size:10px}.footer{margin-top:14px;text-align:center;color:#666;font-size:10px;white-space:pre-line}
</style></head><body><div class="center">${logo}<div class="business">${escapeReceiptText(options.businessName || 'TinhLuk')}</div>${store?.name ? `<div class="store">${escapeReceiptText(store.name)}</div>` : ''}${storeLines.map((line) => `<div class="muted">${escapeReceiptText(line)}</div>`).join('')}${taxRegistration}<div class="muted">${tx('SALES RECEIPT')}</div></div><div class="details">${detailRow(tx('Receipt'), order.orderNo || `#${order.id}`)}${detailRow(tx('Date'), formatReceiptDate(order.completedAt || order.createdAt, isKm))}${options.cashierName ? detailRow(tx('Cashier'), options.cashierName) : ''}${customer}${detailRow(tx('Payment'), paymentLabel)}</div><div class="rule"></div><div class="items">${itemRows || `<div class="muted">${tx('No line items')}</div>`}</div><div class="rule"></div><div class="summary"><div class="line"><span class="label">${tx('Subtotal')}</span><strong>${formatCurrency(subtotal, currency)}</strong></div>${discount > 0 ? `<div class="line"><span class="label">${tx('Discount')}</span><strong>−${formatCurrency(discount, currency)}</strong></div>` : ''}<div class="line"><span class="label">${tx('Tax / VAT')}</span><strong>${formatCurrency(tax, currency)}</strong></div>${Math.abs(rounding) >= 0.005 ? `<div class="line"><span class="label">${tx('Rounding')}</span><strong>${rounding > 0 ? '+' : '−'}${formatCurrency(Math.abs(rounding), currency)}</strong></div>` : ''}<div class="line grand"><span>${tx('Total')}</span><strong>${formatCurrency(total, currency)}</strong></div>${secondaryTotal !== undefined ? `<div class="secondary">≈ ${formatCurrency(secondaryTotal, secondaryCurrency)} · ${isKm ? 'អត្រាប្តូរប្រាក់' : 'Rate'} 1 USD = ${rate.toLocaleString('en-US')} KHR</div>` : ''}${cashLines}${loyaltyLines}</div><div class="footer">${escapeReceiptText(footer)}</div><script>window.onload=()=>{window.print();window.onafterprint=()=>window.close()}</script></body></html>`
  printWindow.document.open()
  printWindow.document.write(html)
  printWindow.document.close()
  return true
}

function detailRow(label: string, value: string | undefined): string {
  return value ? `<div class="detail"><span>${escapeReceiptText(label)}</span><span>${escapeReceiptText(value)}</span></div>` : ''
}

function formatPaymentMethod(method: ReceiptPaymentMethod, isKm = false): string {
  if (method === 'cash' || method === 'CASH') return isKm ? 'សាច់ប្រាក់' : 'Cash'
  if (method === 'card' || method === 'CARD') return isKm ? 'កាត' : 'Card'
  if (method === 'qr' || method === 'QR') return isKm ? 'ការទូទាត់តាម QR' : 'QR payment'
  return method ? String(method) : (isKm ? 'បានបង់ប្រាក់' : 'Paid')
}

function formatReceiptDate(value?: string, isKm = false): string {
  if (!value) return isKm ? 'កាលបរិច្ឆេទមិនមាន' : 'Date unavailable'
  const date = parseServerTime(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat(isKm ? 'km-KH' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

function escapeReceiptText(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character] ?? character)
}
