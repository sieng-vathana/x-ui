export function formatCurrency(amount: number, currency = 'USD'): string {
  const normalized = currency.trim().toUpperCase() || 'USD'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: normalized,
    minimumFractionDigits: normalized === 'KHR' ? 0 : 2,
    maximumFractionDigits: normalized === 'KHR' ? 0 : 2,
  }).format(amount)
}

export function formatUsd(amount: number): string {
  return formatCurrency(amount, 'USD')
}

export function formatKhr(amount: number, rate = 4000): string {
  return `៛${Math.round(amount * rate).toLocaleString('en-US')}`
}
