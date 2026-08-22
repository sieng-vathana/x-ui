import type { HTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

export interface StatusProps extends HTMLAttributes<HTMLSpanElement> {
  value: string
}

const statusStyles: Record<string, string> = {
  active: 'bg-vpos-green-bg text-vpos-green',
  completed: 'bg-vpos-green-bg text-vpos-green',
  paid: 'bg-vpos-green-bg text-vpos-green',
  received: 'bg-vpos-green-bg text-vpos-green',
  approved: 'bg-vpos-green-bg text-vpos-green',
  shipped: 'bg-vpos-green-bg text-vpos-green',
  closed: 'bg-vpos-subtle text-vpos-muted',
  inactive: 'bg-vpos-subtle text-vpos-muted',
  draft: 'bg-vpos-subtle text-vpos-muted',
  pending: 'bg-vpos-orange-bg text-vpos-orange',
  ordered: 'bg-vpos-orange-bg text-vpos-orange',
  partial: 'bg-vpos-orange-bg text-vpos-orange',
  'partially-refunded': 'bg-vpos-orange-bg text-vpos-orange',
  'low-stock': 'bg-vpos-orange-bg text-vpos-orange',
  'out-of-stock': 'bg-vpos-red-bg text-vpos-red',
  cancelled: 'bg-vpos-red-bg text-vpos-red',
  rejected: 'bg-vpos-red-bg text-vpos-red',
  refunded: 'bg-vpos-subtle text-vpos-muted',
}

export function Status({ value, className, ...rest }: StatusProps) {
  const slug = value.toLowerCase().replaceAll(' ', '-')
  return (
    <span
      className={cn(
        'inline-flex min-w-[78px] items-center justify-center rounded-full px-2.5 py-1.5 text-[12px] font-extrabold',
        statusStyles[slug] ?? 'bg-vpos-subtle text-vpos-muted',
        className,
      )}
      {...rest}
    >
      {value}
    </span>
  )
}
