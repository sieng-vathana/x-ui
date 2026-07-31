import type { HTMLAttributes, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '../../lib/cn'
import { Icon } from './Icon'
import { paths } from '../../lib/paths'

export interface BreadcrumbItem {
  label: ReactNode
  /** When set, item is a link; last item is usually current (no `to`) */
  to?: string
}

export interface BreadcrumbProps extends HTMLAttributes<HTMLElement> {
  items: BreadcrumbItem[]
  /** Show home as first crumb (default true) */
  showHome?: boolean
  homeTo?: string
  homeLabel?: string
}

export function Breadcrumb({
  items,
  showHome = true,
  homeTo = paths.home,
  homeLabel = 'Home',
  className,
  ...rest
}: BreadcrumbProps) {
  const crumbs: BreadcrumbItem[] = showHome
    ? [{ label: homeLabel, to: homeTo }, ...items]
    : [...items]

  if (crumbs.length === 0) return null

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn('block w-full text-[14px] leading-normal', className)}
      {...rest}
    >
      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
        {crumbs.map((item, index) => {
          const isLast = index === crumbs.length - 1
          const isHome = showHome && index === 0
          const canLink = Boolean(item.to) && !isLast

          return (
            <span key={index} className="inline-flex items-center gap-1.5">
              {index > 0 ? (
                <Icon
                  name="arrow-right-s-line"
                  className="shrink-0 text-[17px] text-[#9aa8b7]"
                />
              ) : null}

              {canLink ? (
                <Link
                  to={item.to!}
                  className="inline-flex items-center gap-1 font-bold text-vpos-primary-2 no-underline hover:text-vpos-primary"
                >
                  {isHome ? (
                    <Icon name="home-4-line" className="text-[16px]" />
                  ) : null}
                  <span>{item.label}</span>
                </Link>
              ) : (
                <span
                  className="inline-flex items-center gap-1 font-bold text-vpos-text"
                  aria-current={isLast ? 'page' : undefined}
                >
                  {isHome ? (
                    <Icon name="home-4-line" className="text-[16px]" />
                  ) : null}
                  <span>{item.label}</span>
                </span>
              )}
            </span>
          )
        })}
      </div>
    </nav>
  )
}
