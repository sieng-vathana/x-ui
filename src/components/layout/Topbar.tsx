import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '../../lib/cn'
import { Icon } from '../ui/Icon'
import { paths } from '../../lib/paths'
import { useAdminStore } from '../../hooks/useAdminStore'
import { UserMenu } from './UserMenu'

export interface TopbarProps {
  title: ReactNode
  subtitle?: ReactNode
  actions?: ReactNode
  /** Rendered right after the Back button (e.g. POS calculator) */
  afterBack?: ReactNode
  className?: string
  showNotifications?: boolean
  /** Show brand (logo + company name) — default true */
  showBrand?: boolean
  /**
   * Show a Back control before the store switcher / actions (right side).
   * Only pass this on pages that need it (e.g. POS).
   */
  onBack?: () => void
  backLabel?: string
}

export function Topbar({
  title,
  subtitle,
  actions,
  afterBack,
  className,
  showNotifications = true,
  showBrand = true,
  onBack,
  backLabel = 'Back',
}: TopbarProps) {
  const { sidebarCollapsed, toggleSidebar } = useAdminStore()

  return (
    <>
      {/* Full-width top bar — spans to left edge of the viewport */}
      <header
        className={cn(
          'fixed top-0 right-0 left-0 z-30 flex h-20 items-center justify-between border-b border-[#e7e7ec] bg-white px-[clamp(16px,2vw,32px)]',
          className,
        )}
      >
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          {/* Collapse / expand — top left */}
          <button
            type="button"
            onClick={toggleSidebar}
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={sidebarCollapsed ? 'Expand menu' : 'Collapse menu'}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-vpos-line bg-vpos-subtle text-[18px] text-vpos-text transition-colors hover:bg-vpos-sand hover:text-vpos-primary"
          >
            <Icon
              name={sidebarCollapsed ? 'menu-unfold-line' : 'menu-fold-line'}
            />
          </button>

          {showBrand ? (
            <>
              <Link
                to={paths.home}
                className="flex shrink-0 items-center gap-2.5 no-underline"
              >
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-vpos-primary to-vpos-primary-2 text-[18px] text-white shadow-sm shadow-vpos-primary/20">
                  <Icon name="store-3-fill" />
                </span>
                <span className="hidden sm:block">
                  <span className="block text-[16px] font-extrabold leading-none tracking-tight text-vpos-text">
                    V-POS
                  </span>
                  <span className="mt-1 block text-[10px] font-bold tracking-[1.2px] text-vpos-muted">
                    SMART BUSINESS
                  </span>
                </span>
              </Link>
              <span
                className="hidden h-9 w-px shrink-0 bg-vpos-line sm:block"
                aria-hidden
              />
            </>
          ) : null}

          <div className="min-w-0">
            <h1 className="m-0 text-[22px] leading-tight tracking-tight text-vpos-text">
              {title}
            </h1>
            {subtitle ? (
              <p className="mt-1 mb-0 text-[13px] text-vpos-muted">{subtitle}</p>
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-[10px] border border-vpos-line bg-white px-3.5 text-[12px] font-bold text-vpos-text transition-colors hover:bg-vpos-subtle"
            >
              <Icon name="arrow-left-line" className="text-[16px]" />
              {backLabel}
            </button>
          ) : null}
          {afterBack}
          {actions}
          {showNotifications ? (
            <button
              type="button"
              className="relative grid h-10 w-10 place-items-center rounded-[10px] border-0 bg-vpos-subtle text-[18px] text-vpos-text"
              aria-label="Notifications"
            >
              <Icon name="notification-3-line" />
              <span className="absolute top-[11px] right-[11px] h-[7px] w-[7px] rounded-full bg-[#f04438] shadow-[0_0_0_3px_#fff]" />
            </button>
          ) : null}
          {/* Greeting + username UI after notifications (all pages) */}
          <UserMenu userName="Vathana Sieng" role="Administrator" />
        </div>
      </header>
      {/* Spacer so page content is not under the fixed bar */}
      <div className="h-20 shrink-0" aria-hidden />
    </>
  )
}
