import type { HTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

/**
 * Remix Icon wrapper.
 * Pass the icon id without the `ri-` prefix, e.g. `search-line` → `ri-search-line`.
 * @see https://remixicon.com
 */
export interface IconProps extends HTMLAttributes<HTMLElement> {
  /** Remix icon name without `ri-` prefix (e.g. `dashboard-line`) */
  name: string
  /** Optional size utility class, default inherits font-size */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
}

const sizeClass = {
  xs: 'text-[13px]',
  sm: 'text-[15px]',
  md: 'text-[17px]',
  lg: 'text-[21px]',
  xl: 'text-[25px]',
}

export function Icon({ name, size, className, ...rest }: IconProps) {
  const ri = name.startsWith('ri-') ? name : `ri-${name}`
  return (
    <i
      className={cn(ri, 'inline-block leading-none', size && sizeClass[size], className)}
      aria-hidden
      {...rest}
    />
  )
}
