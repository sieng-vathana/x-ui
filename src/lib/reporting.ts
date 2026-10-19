import { parseServerTime } from './serverTime'
import type { ReportBucket } from '../features/orders/types'

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

/** The viewer's IANA time zone, e.g. Asia/Phnom_Penh; reports label hours, days and months in it. */
export function browserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

/** A local midnight as the services store times: UTC without a zone. */
function utcDateTime(localDate: string): string {
  return new Date(`${localDate}T00:00:00`).toISOString().slice(0, 19)
}

/**
 * From the start of the first local day to the end of the last one, in UTC, since the services store UTC.
 * Sending local midnight as it was moved every report seven hours late in Cambodia.
 */
export function reportDateTimeRange(from: string, to: string): { from: string; to: string } {
  return { from: utcDateTime(from), to: utcDateTime(addDays(to, 1)) }
}

export function formatReportDate(value?: string): string {
  if (!value) return '—'
  const date = parseServerTime(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

export type ReportPeriodKind = 'day' | 'week' | 'month' | 'year' | 'custom'

/** A report period as local dates; both ends are included. */
export interface ReportPeriod {
  kind: ReportPeriodKind
  from: string
  to: string
}

function parseLocalDate(value: string): Date {
  return new Date(`${value}T00:00:00`)
}

function addDays(value: string, days: number): string {
  const date = parseLocalDate(value)
  date.setDate(date.getDate() + days)
  return localDateValue(date)
}

function addMonths(value: string, months: number): string {
  const date = parseLocalDate(value)
  date.setDate(1)
  date.setMonth(date.getMonth() + months)
  return localDateValue(date)
}

function daysBetween(from: string, to: string): number {
  return Math.round((parseLocalDate(to).getTime() - parseLocalDate(from).getTime()) / 86_400_000)
}

/** The day, week (Monday to Sunday), month or year that contains the anchor date. */
export function periodContaining(kind: Exclude<ReportPeriodKind, 'custom'>, anchor: string = localDateValue()): ReportPeriod {
  const date = parseLocalDate(anchor)
  if (kind === 'day') return { kind, from: anchor, to: anchor }
  if (kind === 'week') {
    const monday = addDays(anchor, -((date.getDay() + 6) % 7))
    return { kind, from: monday, to: addDays(monday, 6) }
  }
  if (kind === 'month') {
    const first = localDateValue(new Date(date.getFullYear(), date.getMonth(), 1))
    return { kind, from: first, to: addDays(addMonths(first, 1), -1) }
  }
  return { kind, from: `${date.getFullYear()}-01-01`, to: `${date.getFullYear()}-12-31` }
}

/** The period `steps` periods later (negative for earlier); a custom range moves by its own length. */
export function shiftPeriod(period: ReportPeriod, steps: number): ReportPeriod {
  if (period.kind === 'custom') {
    const length = daysBetween(period.from, period.to) + 1
    return { kind: 'custom', from: addDays(period.from, steps * length), to: addDays(period.to, steps * length) }
  }
  if (period.kind === 'day') return periodContaining('day', addDays(period.from, steps))
  if (period.kind === 'week') return periodContaining('week', addDays(period.from, steps * 7))
  if (period.kind === 'month') return periodContaining('month', addMonths(period.from, steps))
  return periodContaining('year', addMonths(period.from, steps * 12))
}

/** True when the period has not ended yet, so there is no later one to look at. */
export function periodIncludesToday(period: ReportPeriod): boolean {
  return period.to >= localDateValue()
}

const formatDate = (value: string, options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat('en-GB', options).format(parseLocalDate(value))

export function periodLabel(period: ReportPeriod): string {
  const sameYear = period.from.slice(0, 4) === period.to.slice(0, 4)
  switch (period.kind) {
    case 'day':
      return formatDate(period.from, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
    case 'month':
      return formatDate(period.from, { month: 'long', year: 'numeric' })
    case 'year':
      return period.from.slice(0, 4)
    default:
      return `${formatDate(period.from, sameYear ? { day: 'numeric', month: 'short' } : { day: 'numeric', month: 'short', year: 'numeric' })} – ${formatDate(period.to, { day: 'numeric', month: 'short', year: 'numeric' })}`
  }
}

/** Hours for one or two days, days for up to about two months, months beyond that. */
export function bucketFor(period: ReportPeriod): ReportBucket {
  const days = daysBetween(period.from, period.to) + 1
  if (period.kind === 'day' || (period.kind === 'custom' && days <= 2)) return 'HOUR'
  if (period.kind === 'year' || days > 62) return 'MONTH'
  return 'DAY'
}

/** Every bucket key in the period, in order, matching the services' labels, so periods without sales show as zero. */
export function periodBuckets(period: ReportPeriod, bucket: ReportBucket): string[] {
  const keys: string[] = []
  if (bucket === 'MONTH') {
    for (let month = period.from.slice(0, 7) + '-01'; month <= period.to; month = addMonths(month, 1)) keys.push(month.slice(0, 7))
    return keys
  }
  for (let day = period.from; day <= period.to; day = addDays(day, 1)) {
    if (bucket === 'DAY') keys.push(day)
    else for (let hour = 0; hour < 24; hour += 1) keys.push(`${day} ${String(hour).padStart(2, '0')}:00`)
  }
  return keys
}

/** "14:00", "Mon 12 Oct" or "Oct 2026"; hours of a two-day range also name the day. */
export function bucketLabel(key: string, bucket: ReportBucket, multiDay = false): string {
  if (bucket === 'HOUR') {
    const hour = key.slice(11)
    return multiDay ? `${formatDate(key.slice(0, 10), { weekday: 'short' })} ${hour}` : hour
  }
  if (bucket === 'DAY') return formatDate(key, { weekday: 'short', day: 'numeric', month: 'short' })
  return formatDate(`${key}-01`, { month: 'short', year: 'numeric' })
}

/** Change from the previous value as a percentage, or null when there is nothing to compare with. */
export function percentChange(current: number, previous: number): number | null {
  if (!Number.isFinite(previous) || previous === 0) return null
  return ((current - previous) / Math.abs(previous)) * 100
}

/** Downloads rows as a CSV file that Excel opens with Khmer text intact (UTF-8 with a byte order mark). */
export function downloadCsv(fileName: string, rows: Array<Array<string | number>>): void {
  const escape = (value: string | number) => {
    const text = String(value)
    return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
  }
  const csv = '﻿' + rows.map((row) => row.map(escape).join(',')).join('\r\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
