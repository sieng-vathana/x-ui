import { Button, Icon } from '..'

export function ReportDateFilter({
  from,
  to,
  onFromChange,
  onToChange,
  onRefresh,
}: {
  from: string
  to: string
  onFromChange: (value: string) => void
  onToChange: (value: string) => void
  onRefresh?: () => void
}) {
  return (
    <div className="flex flex-wrap items-end gap-2.5 rounded-[4px] border border-vpos-line bg-white p-3 shadow-vpos">
      <label className="grid gap-1 text-[11px] font-bold text-vpos-muted">
        From
        <input
          type="date"
          value={from}
          onChange={(event) => onFromChange(event.target.value)}
          className="h-9 rounded-[4px] border border-vpos-line bg-white px-2.5 text-[13px] font-semibold text-vpos-text outline-none focus:border-vpos-primary"
        />
      </label>
      <label className="grid gap-1 text-[11px] font-bold text-vpos-muted">
        To
        <input
          type="date"
          value={to}
          onChange={(event) => onToChange(event.target.value)}
          className="h-9 rounded-[4px] border border-vpos-line bg-white px-2.5 text-[13px] font-semibold text-vpos-text outline-none focus:border-vpos-primary"
        />
      </label>
      {onRefresh ? <Button variant="secondary" className="h-9" onClick={onRefresh}><Icon name="refresh-line" /> Refresh</Button> : null}
    </div>
  )
}
