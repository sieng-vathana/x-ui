import type { HTMLAttributes } from 'react'
import { cn } from '../../lib/cn'
import { resolveImageUrl } from '../../lib/api'
import type { ProductTone } from '../../data/mockup'

export interface ProductThumbProps extends HTMLAttributes<HTMLSpanElement> {
  src?: string
  tone?: ProductTone | string
  large?: boolean
}

const toneBg: Record<string, string> = {
  ice: 'bg-[#d6e8ef]',
  sand: 'bg-[#eadac7]',
  matcha: 'bg-[#dbe6d2]',
  pastry: 'bg-[#f2d39d]',
  stone: 'bg-[#d8d3ce]',
  rose: 'bg-[#ead4cf]',
  lemon: 'bg-[#f5ebc3]',
}

export function ProductThumb({
  src,
  tone = 'sand',
  large = false,
  className,
  ...rest
}: ProductThumbProps) {
  const fullSrc = resolveImageUrl(src)
  if (fullSrc) {
    return (
      <img
        src={fullSrc}
        alt=""
        className={cn(
          'shrink-0 object-cover border border-vpos-line',
          large ? 'h-[122px] w-full rounded-[10px]' : 'h-[42px] w-[42px] rounded-[9px]',
          className,
        )}
      />
    )
  }

  return (
    <span
      className={cn(
        'block shrink-0',
        large ? 'h-[122px] w-full rounded-[10px]' : 'h-[42px] w-[42px] rounded-[9px]',
        toneBg[tone] ?? toneBg.sand,
        className,
      )}
      aria-hidden
      {...rest}
    />
  )
}
