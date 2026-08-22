import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '../../lib/cn'
import { Icon } from '../ui/Icon'
import { paths } from '../../lib/paths'
import { useAdminStore } from '../../hooks/useAdminStore'
import { UserMenu } from './UserMenu'
import { useAuth } from '../../context/AuthContext'

export interface TopbarProps {
  title: ReactNode
  subtitle?: ReactNode
  actions?: ReactNode
  /** Rendered right after the Back button (e.g. POS calculator) */
  afterBack?: ReactNode
  className?: string
  showNotifications?: boolean
  hideNotificationsOnMobile?: boolean
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
  hideNotificationsOnMobile = false,
  showBrand = true,
  onBack,
  backLabel = 'Back',
}: TopbarProps) {
  const { sidebarCollapsed, sidebarWidth, toggleSidebar, sidebar } = useAdminStore()
  const { user } = useAuth()
  const headerOffset = !sidebar.isMobile && sidebar.config.visibility === 'show' && sidebar.config.layout !== 'horizontal' ? sidebarWidth : 0
  const renderBrand = showBrand && sidebar.config.layout === 'horizontal'
  const darkTopbar = sidebar.config.topbar === 'dark' || sidebar.config.colorMode === 'dark'

  return (
    <>
      {/* Full-width top bar — spans to left edge of the viewport */}
      <header
        data-app-topbar={darkTopbar ? 'dark' : sidebar.config.topbar}
        className={cn(
          'fixed top-0 right-0 left-0 z-30 flex h-[70px] items-center justify-between gap-2 border-b border-vpos-line bg-vpos-surface px-[clamp(16px,2vw,32px)] max-sm:px-3',
          darkTopbar && 'border-vpos-topbar-border bg-vpos-topbar-dark text-white',
          className,
        )}
        style={{ left: headerOffset }}
      >
        <div className="flex min-w-0 items-center gap-2 sm:gap-4">
          {/* Collapse / expand — top left */}
          <button
            type="button"
            onClick={toggleSidebar}
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={sidebarCollapsed ? 'Expand menu' : 'Collapse menu'}
            className={cn(
              'grid h-[38px] w-[38px] shrink-0 place-items-center rounded-[3px] text-[19px] transition-colors',
              darkTopbar
                ? 'border border-vpos-topbar-border bg-vpos-topbar-control text-vpos-topbar-text hover:bg-vpos-topbar-hover'
                : 'border border-vpos-line bg-vpos-surface text-vpos-text hover:bg-vpos-subtle hover:text-vpos-primary',
            )}
          >
            <Icon
              name={sidebarCollapsed ? 'menu-unfold-line' : 'menu-fold-line'}
            />
          </button>

          {renderBrand ? (
            <>
              <Link
                to={paths.home}
                className="flex shrink-0 items-center gap-2.5 no-underline"
              >
                <span className="grid h-10 w-10 place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-vpos-primary to-vpos-primary-2 text-[19px] text-white shadow-sm shadow-vpos-primary/20">
                  {user?.business.logoUrl ? <img src={user.business.logoUrl} alt="" className="h-full w-full object-cover" /> : <Icon name="store-3-fill" />}
                </span>
                <span className="hidden sm:block">
                  <span className="block text-[17px] font-extrabold leading-none tracking-tight text-vpos-text">
                    {user?.business.name ?? 'V-POS'}
                  </span>
                  <span className="mt-1 block text-[11px] font-bold tracking-[1.2px] text-vpos-muted">
                    {user?.business.type?.toUpperCase() ?? 'SMART BUSINESS'}
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
            <h1 className={cn('m-0 truncate text-[15px] font-bold leading-tight', darkTopbar ? 'text-white' : 'text-vpos-dark')}>{title}</h1>
            {subtitle ? <p className={cn('mt-1 mb-0 hidden text-[12px] sm:block', darkTopbar ? 'text-white/65' : 'text-vpos-muted')}>{subtitle}</p> : null}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className={cn(
                'inline-flex h-[38px] shrink-0 items-center justify-center gap-1.5 rounded-[3px] px-2 text-[13px] font-semibold transition-colors sm:px-3.5',
                darkTopbar
                  ? 'border border-vpos-topbar-border bg-vpos-topbar-control text-vpos-topbar-text hover:bg-vpos-topbar-hover'
                  : 'border border-vpos-line bg-vpos-surface text-vpos-text hover:bg-vpos-subtle',
              )}
            >
              <Icon name="arrow-left-line" className="text-[17px]" />
              <span className="hidden sm:inline">{backLabel}</span>
            </button>
          ) : null}
          {afterBack}
          {actions}
          {showNotifications ? (
            <button
              type="button"
              className={cn(
                'relative grid h-[38px] w-[38px] place-items-center rounded-[3px] text-[19px] transition-colors',
                darkTopbar
                  ? 'border border-vpos-topbar-border bg-vpos-topbar-control text-vpos-topbar-text hover:bg-vpos-topbar-hover'
                  : 'border-0 bg-vpos-subtle text-vpos-text hover:bg-vpos-sand hover:text-vpos-primary',
                hideNotificationsOnMobile && 'max-md:hidden',
              )}
              aria-label="Notifications"
            >
              <Icon name="notification-3-line" />
              <span className={cn(
                'absolute top-[11px] right-[11px] h-[7px] w-[7px] rounded-full bg-vpos-red',
                darkTopbar ? 'shadow-[0_0_0_3px_var(--app-topbar-dark-bg)]' : 'shadow-[0_0_0_3px_var(--app-surface)]',
              )} />
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => sidebar.setSettingsOpen(true)}
            className={cn(
              'grid h-[38px] w-[38px] place-items-center rounded-[3px] text-[19px] transition-colors',
              darkTopbar
                ? 'border border-vpos-topbar-border bg-vpos-topbar-control text-vpos-topbar-text hover:bg-vpos-topbar-hover'
                : 'border-0 bg-vpos-subtle text-vpos-text hover:bg-vpos-sand hover:text-vpos-primary',
            )}
            aria-label="Open sidebar settings"
            title="Sidebar settings"
          >
            <Icon name="settings-3-line" />
          </button>
          {/* Greeting + username UI after notifications (all pages) */}
          <UserMenu userName={user?.name} role={user?.role} />
        </div>
      </header>
      {/* Spacer so page content is not under the fixed bar */}
      <div className={cn('h-[70px] shrink-0', sidebar.config.position === 'scrollable' && 'hidden')} aria-hidden />
    </>
  )
}
