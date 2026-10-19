/**
 * The services run in UTC and send times such as "2026-10-19T12:33:05" without a zone. Browsers read a time
 * without a zone as local time, which put every sale seven hours early in Cambodia. A date-time with no zone
 * is therefore read as UTC; one that already says Z or +07:00, and a plain date, are read as written.
 */
const DATE_TIME_WITHOUT_ZONE = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/

export function parseServerTime(value: string | number | Date | null | undefined): Date {
  if (value instanceof Date) return value
  if (value === null || value === undefined || value === '') return new Date(NaN)
  if (typeof value === 'number') return new Date(value)
  const text = value.trim()
  return new Date(DATE_TIME_WITHOUT_ZONE.test(text) ? `${text.replace(' ', 'T')}Z` : text)
}
