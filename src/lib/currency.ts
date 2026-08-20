export const DEFAULT_USD_TO_KHR_RATE = 4000

export function formatCurrency(amount: number, currency = 'USD'): string {
  const normalized = currency.trim().toUpperCase() || 'USD'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: normalized,
    minimumFractionDigits: normalized === 'KHR' ? 0 : 2,
    maximumFractionDigits: normalized === 'KHR' ? 0 : 2,
  }).format(Number.isFinite(amount) ? amount : 0)
}

export function formatUsd(amount: number): string {
  return formatCurrency(amount, 'USD')
}

export function convertCurrency(amount: number, fromCurrency: string, toCurrency: string, usdToKhrRate = DEFAULT_USD_TO_KHR_RATE): number {
  const source = fromCurrency.trim().toUpperCase()
  const target = toCurrency.trim().toUpperCase()
  const value = Number.isFinite(amount) ? amount : 0
  if (source === target) return value
  const rate = Number.isFinite(usdToKhrRate) && usdToKhrRate > 0 ? usdToKhrRate : DEFAULT_USD_TO_KHR_RATE
  if (source === 'USD' && target === 'KHR') return value * rate
  if (source === 'KHR' && target === 'USD') return value / rate
  return value
}

export function canConvertCurrency(fromCurrency: string, toCurrency: string): boolean {
  const source = fromCurrency.trim().toUpperCase()
  const target = toCurrency.trim().toUpperCase()
  return source === target || (source === 'USD' && target === 'KHR') || (source === 'KHR' && target === 'USD')
}

export function formatKhr(amount: number, rate = DEFAULT_USD_TO_KHR_RATE): string {
  return `៛${Math.round(amount * rate).toLocaleString('en-US')}`
}
