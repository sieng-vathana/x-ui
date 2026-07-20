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

const trendToneClass: Record<MetricTone, string> = {
  primary: 'bg-[#ededf3] text-vpos-primary',
  positive: 'bg-vpos-green-bg text-vpos-green',
  warning: 'bg-vpos-orange-bg text-vpos-orange',
  danger: 'bg-vpos-red-bg text-vpos-red',
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
        'flex min-h-[128px] flex-col justify-between rounded-[14px] border border-vpos-line bg-white p-5 shadow-vpos',
        className,
      )}
      {...rest}
    >
      <div className="flex items-center justify-start gap-2.5 text-[13px] font-semibold text-vpos-muted">
        {icon != null ? (
          <span
            className={cn(
              'grid h-[38px] w-[38px] place-items-center rounded-[10px] text-[14px] font-extrabold',
              iconTone[iconT],
            )}
          >
            {icon}
          </span>
        ) : null}
        <span>{label}</span>
      </div>
      <div className="flex items-center justify-between gap-2.5">
        <strong className="text-[28px] tracking-tight text-vpos-text">
          {value}
        </strong>
        {trend != null ? (
          trendAs === 'small' ? (
            <small className="text-[11px] font-bold text-vpos-muted">{trend}</small>
          ) : (
            <span
              className={cn(
                'rounded-full px-2.5 py-1.5 text-[11px] font-extrabold',
                trendToneClass[trendTone],
              )}
            >
              {trend}
            </span>
          )
        ) : null}
      </div>
    </article>
  )
}
