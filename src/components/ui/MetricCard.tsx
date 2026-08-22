import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/cn'

export type MetricTone = 'primary' | 'positive' | 'warning' | 'danger'

export interface MetricCardProps extends HTMLAttributes<HTMLElement> {
  label: string
  value: ReactNode
  trend?: ReactNode
  trendAs?: 'trend' | 'small'
  trendTone?: MetricTone
  icon?: ReactNode
  iconTone?: MetricTone
  miniBars?: number[]
}

const iconTone: Record<MetricTone, string> = {
  primary: 'bg-vpos-primary-soft text-vpos-text',
  positive: 'bg-vpos-green-bg text-vpos-green',
  warning: 'bg-vpos-orange-bg text-vpos-orange',
  danger: 'bg-vpos-red-bg text-vpos-red',
}

const trendTextClass: Record<MetricTone, string> = {
  primary: 'text-vpos-primary',
  positive: 'text-vpos-green',
  warning: 'text-vpos-orange',
  danger: 'text-vpos-red',
}

export function MetricCard({
  label,
  value,
  trend,
  trendAs = 'trend',
  trendTone = 'positive',
  icon,
  iconTone: iconT = 'primary',
  miniBars,
  className,
  ...rest
}: MetricCardProps) {
  const maxBar = Math.max(1, ...(miniBars ?? []))
  const compact = miniBars != null

  return (
    <article
      className={cn(
        'metric-card animate-slide-up flex min-h-[106px] flex-col justify-between rounded-[3px] border border-vpos-line bg-vpos-surface p-4 shadow-vpos',
        className,
      )}
      {...rest}
    >
      <div className="flex items-center justify-between gap-2 text-[12px] font-medium text-vpos-muted">
        <span className="flex min-w-0 items-center gap-1.5 truncate">
          {icon ? <span className="shrink-0 text-[14px] text-vpos-muted">{icon}</span> : null}
          <span className="truncate">{label}</span>
        </span>
        {trend != null && trendAs !== 'small' ? (
          <span className={cn('shrink-0 text-[12px] font-semibold', trendTextClass[trendTone])}>
            {trend}
          </span>
        ) : null}
      </div>

      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <strong className="block truncate text-[25px] font-medium leading-none tracking-[-0.04em] text-vpos-text">
            {value}
          </strong>
          {trend != null && trendAs === 'small' ? (
            <small className={cn('mt-2 block truncate text-[11px] font-medium', trendTextClass[trendTone])}>{trend}</small>
          ) : null}
          {!compact ? (
            <span className="mt-2 block text-[12px] font-medium text-vpos-primary underline">View details</span>
          ) : null}
        </div>

        {compact ? (
          <span className="dashboard-mini-bars shrink-0" aria-hidden="true">
            {(miniBars ?? []).map((bar, index) => (
              <span
                key={index}
                style={{ height: Math.max(5, Math.round((bar / maxBar) * 36)) }}
              />
            ))}
          </span>
        ) : icon != null ? (
          <span
            className={cn(
              'grid h-10 w-10 shrink-0 place-items-center rounded-[3px] text-[19px] font-extrabold',
              iconTone[iconT],
            )}
          >
            {icon}
          </span>
        ) : null}
      </div>
    </article>
  )
}
