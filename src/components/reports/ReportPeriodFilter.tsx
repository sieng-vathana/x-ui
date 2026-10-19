import { Button, Icon } from '..'
import { cn } from '../../lib/cn'
import {
  localDateValue,
  periodContaining,
  periodIncludesToday,
  periodLabel,
  shiftPeriod,
  type ReportPeriod,
  type ReportPeriodKind,
} from '../../lib/reporting'

const KINDS: Array<{ kind: ReportPeriodKind; label: string; current: string }> = [
  { kind: 'day', label: 'Daily', current: 'Today' },
  { kind: 'week', label: 'Weekly', current: 'This week' },
  { kind: 'month', label: 'Monthly', current: 'This month' },
  { kind: 'year', label: 'Yearly', current: 'This year' },
  { kind: 'custom', label: 'Custom', current: '' },
]

const dateInput = 'h-9 rounded-[4px] border border-vpos-line bg-white px-2.5 text-[13px] font-semibold text-vpos-text outline-none focus:border-vpos-primary'

/** Daily, weekly, monthly or yearly report periods with previous / next, or a custom date range. */
export function ReportPeriodFilter({
  period,
  onChange,
  onRefresh,
}: {
  period: ReportPeriod
  onChange: (period: ReportPeriod) => void
  onRefresh?: () => void
}) {
  const current = KINDS.find((item) => item.kind === period.kind)
  const atLatest = periodIncludesToday(period)

  const choose = (kind: ReportPeriodKind) => {
    if (kind === period.kind) return
    // Keep looking at the same time: the week, month or year around the day being viewed, or today.
    const anchor = period.to >= localDateValue() ? localDateValue() : period.to
    onChange(kind === 'custom' ? { kind, from: period.from, to: period.to } : periodContaining(kind, anchor))
  }

  return (
    <div className="flex flex-wrap items-center gap-2.5 rounded-[4px] border border-vpos-line bg-white p-3 shadow-vpos">
      <div role="radiogroup" aria-label="Report period" className="flex flex-wrap rounded-[4px] bg-vpos-subtle p-1">
        {KINDS.map((item) => (
          <button
            key={item.kind}
            type="button"
            role="radio"
            aria-checked={period.kind === item.kind}
            onClick={() => choose(item.kind)}
            className={cn(
              'rounded-[3px] px-3 py-1.5 text-[13px] font-semibold transition-colors',
              period.kind === item.kind ? 'bg-white text-vpos-text shadow-vpos' : 'text-vpos-muted hover:text-vpos-text',
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {period.kind === 'custom' ? (
        <div className="flex flex-wrap items-center gap-2">
          <input type="date" aria-label="From" value={period.from} max={period.to} onChange={(event) => event.target.value && onChange({ ...period, from: event.target.value })} className={dateInput} />
          <span className="text-[12px] text-vpos-muted">to</span>
          <input type="date" aria-label="To" value={period.to} min={period.from} onChange={(event) => event.target.value && onChange({ ...period, to: event.target.value })} className={dateInput} />
        </div>
      ) : (
        <div className="flex items-center gap-1">
          <button type="button" aria-label="Previous period" onClick={() => onChange(shiftPeriod(period, -1))} className="grid h-9 w-9 place-items-center rounded-[4px] border border-vpos-line text-vpos-text hover:bg-vpos-subtle">
            <Icon name="arrow-left-s-line" />
          </button>
          <strong className="min-w-[150px] px-2 text-center text-[14px] text-vpos-text" aria-live="polite">{periodLabel(period)}</strong>
          <button type="button" aria-label="Next period" disabled={atLatest} onClick={() => onChange(shiftPeriod(period, 1))} className="grid h-9 w-9 place-items-center rounded-[4px] border border-vpos-line text-vpos-text hover:bg-vpos-subtle disabled:cursor-not-allowed disabled:opacity-40">
            <Icon name="arrow-right-s-line" />
          </button>
          {!atLatest && current?.current ? (
            <button type="button" onClick={() => onChange(periodContaining(period.kind as Exclude<ReportPeriodKind, 'custom'>))} className="ml-1 rounded-[4px] px-2.5 py-2 text-[12px] font-semibold text-vpos-primary hover:bg-vpos-subtle">
              {current.current}
            </button>
          ) : null}
        </div>
      )}

      {onRefresh ? <Button variant="secondary" className="ml-auto h-9" onClick={onRefresh}><Icon name="refresh-line" /> Refresh</Button> : null}
    </div>
  )
}
