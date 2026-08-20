export function localDateValue(date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function defaultReportFrom(): string {
  const date = new Date()
  date.setDate(date.getDate() - 6)
  return localDateValue(date)
}

export function reportDateTimeRange(from: string, to: string): { from: string; to: string } {
  const end = new Date(`${to}T00:00:00`)
  end.setDate(end.getDate() + 1)
  return {
    from: `${from}T00:00:00`,
    to: `${localDateValue(end)}T00:00:00`,
  }
}

export function formatReportDate(value?: string): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}
