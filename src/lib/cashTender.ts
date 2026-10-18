/** The smallest riel note in circulation. Riel amounts are rounded to it. */
export const SMALLEST_RIEL_NOTE = 100

/** Cash a customer hands over: dollars, riel, or both. */
export interface CashReceived {
  usd: number
  khr: number
}

export interface CashTender {
  /** True when the cash covers the amount due. */
  enough: boolean
  /** What to record as tendered, in the order currency. Never below the amount due once enough was paid. */
  tendered: number
  /** Still to collect, in riel, rounded up to the smallest note. */
  shortKhr: number
  /** Change as whole dollars plus riel, the usual way to give it back. Dollars are 0 for riel orders. */
  changeUsd: number
  changeKhr: number
  /** The same change paid entirely in riel. */
  changeAllKhr: number
}

export function roundRiel(amount: number): number {
  return Math.round(amount / SMALLEST_RIEL_NOTE) * SMALLEST_RIEL_NOTE
}

/**
 * Compares cash received in dollars and riel with the amount due.
 * Both sides are compared in riel with the amount due rounded to the smallest note,
 * so a customer who pays the rounded riel price has paid in full.
 */
export function evaluateCashTender(
  due: number,
  currency: string,
  received: CashReceived,
  usdToKhrRate: number,
): CashTender {
  const isRielOrder = currency.trim().toUpperCase() === 'KHR'
  const usd = Math.max(0, received.usd || 0)
  const khr = Math.max(0, received.khr || 0)
  const dueKhr = roundRiel(isRielOrder ? due : due * usdToKhrRate)
  const receivedKhr = usd * usdToKhrRate + khr
  const enough = receivedKhr >= dueKhr

  const receivedInOrderCurrency = isRielOrder
    ? Math.round(receivedKhr)
    : Math.round((usd + khr / usdToKhrRate) * 100) / 100
  const changeAllKhr = enough ? roundRiel(receivedKhr - dueKhr) : 0
  const changeUsd = isRielOrder ? 0 : Math.floor(changeAllKhr / usdToKhrRate)

  return {
    enough,
    tendered: enough ? Math.max(due, receivedInOrderCurrency) : receivedInOrderCurrency,
    shortKhr: enough ? 0 : Math.ceil((dueKhr - receivedKhr) / SMALLEST_RIEL_NOTE) * SMALLEST_RIEL_NOTE,
    changeUsd,
    changeKhr: roundRiel(changeAllKhr - changeUsd * usdToKhrRate),
    changeAllKhr,
  }
}

/** "$5 + ៛ 20,000", "$5" or "៛ 20,000"; "៛ 0" when nothing. */
export function formatCashMix(usd: number, khr: number): string {
  const parts = [
    usd > 0 ? `$${usd.toLocaleString('en-US', { maximumFractionDigits: 2 })}` : '',
    khr > 0 ? `៛ ${Math.round(khr).toLocaleString('en-US')}` : '',
  ].filter(Boolean)
  return parts.length > 0 ? parts.join(' + ') : '៛ 0'
}
