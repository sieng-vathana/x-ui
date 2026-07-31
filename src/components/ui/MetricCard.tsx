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
}

const iconTone: Record<MetricTone, string> = {
  primary: 'bg-vpos-sand text-vpos-primary',
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
  className,
  ...rest
}: MetricCardProps) {
  return (
    <article
      className={cn(
        'animate-slide-up flex min-h-[132px] flex-col justify-between rounded-[4px] border border-vpos-line bg-white p-4 shadow-vpos',
        className,
      )}
      {...rest}
    >
      <div className="flex items-center justify-between gap-2 text-[13px] font-semibold text-vpos-muted">
        <span className="text-[11px] uppercase tracking-[0.06em]">{label}</span>
        {trend != null && trendAs !== 'small' ? (
          <span className={cn('text-[13px] font-bold', trendTextClass[trendTone])}>
            {trend}
          </span>
        ) : null}
      </div>
      <div className="flex items-center justify-between gap-2.5">
        <div>
          <strong className="text-[24px] tracking-[-0.03em] text-vpos-text">
            {value}
          </strong>
          {trend != null && trendAs === 'small' ? (
            <small className="ml-2 text-[12px] font-bold text-vpos-muted">{trend}</small>
          ) : null}
          <span className="mt-2 block text-[13px] text-vpos-primary underline">View details</span>
        </div>
        {icon != null ? (
          <span
            className={cn(
              'grid h-11 w-11 place-items-center rounded-md text-[21px] font-extrabold',
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
