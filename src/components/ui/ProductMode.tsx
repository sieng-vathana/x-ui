import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { Icon } from './Icon'

export interface ProductModeOption {
  id: string
  title: string
  description: string
  badge?: ReactNode
}

export interface ProductModeProps {
  options: ProductModeOption[]
  value?: string
  onChange?: (id: string) => void
  className?: string
}

export function ProductMode({
  options,
  value,
  onChange,
  className,
}: ProductModeProps) {
  return (
    <div className={cn('grid grid-cols-1 gap-3.5 sm:grid-cols-2', className)}>
      {options.map((opt) => {
        const selected = opt.id === value
        return (
          <button
            key={opt.id}
            type="button"
            className={cn(
              'grid min-h-[86px] grid-cols-[24px_1fr_auto] items-center gap-3 rounded-xl border bg-white p-4 text-left transition',
              'hover:-translate-y-px hover:border-vpos-accent',
              selected
                ? 'border-vpos-primary bg-[#eef3f6] text-vpos-dark shadow-[0_0_0_3px_#1d546c1f]'
                : 'border-vpos-line text-vpos-muted',
            )}
            onClick={() => onChange?.(opt.id)}
          >
            <span className="text-[19px] text-vpos-primary" aria-hidden>
              <Icon name={selected ? 'radio-button-fill' : 'checkbox-blank-circle-line'} />
            </span>
            <span>
              <strong className="block text-[14px] text-vpos-text">
                {opt.title}
              </strong>
              <small className="mt-1.5 block text-[12px] text-vpos-muted">
                {opt.description}
              </small>
            </span>
            {opt.badge != null ? (
              <b
                className={cn(
                  'rounded-full px-2.5 py-1 text-[11px] font-bold',
                  selected
                    ? 'bg-vpos-primary text-white'
                    : 'bg-[#e6edf3] text-vpos-dark',
                )}
              >
                {opt.badge}
              </b>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}
