import { useEffect, useRef } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { isDarkThemeMode, type SidebarLayoutState } from '../../hooks/useSidebarLayout'
import { navPrimary } from '../../data/mockup'
import { cn } from '../../lib/cn'
import { paths } from '../../lib/paths'
import { Icon } from '../ui/Icon'
import { useAuth } from '../../context/AuthContext'
import { usePlanFeatures } from '../../features/plans/usePlan'
import type { PlanFeature } from '../../features/plans/planApi'
import sidebarGrid from '../../assets/sidebar-grid.svg'
import sidebarOrbit from '../../assets/sidebar-orbit.svg'
import sidebarLines from '../../assets/sidebar-lines.svg'
import sidebarDots from '../../assets/sidebar-dots.svg'

export interface SidebarProps {
  state: SidebarLayoutState
}

const navMeta: Record<string, { hint: string }> = {
  dashboard: { hint: 'Business overview & metrics' }, pos: { hint: 'Sell products at the register' },
  orders: { hint: 'Review and fulfill customer orders' },
  products: { hint: 'Catalog, stock movement & low stock' }, stores: { hint: 'Locations, hours & managers' },
  sales: { hint: 'Orders and invoices' }, payments: { hint: 'Generate and test KHQRPay' }, purchases: { hint: 'Supplier orders & receipts' },
  customers: { hint: 'Customer directory' }, reports: { hint: 'Analytics & exports' },
  settings: { hint: 'Store configuration' }, users: { hint: 'Team access & roles' },
  roles: { hint: 'Custom roles & action permissions' },
}

const keyToPath: Record<string, string> = {
  dashboard: paths.dashboard, pos: paths.pos, orders: paths.orders, products: paths.products, stores: paths.stores,
  sales: paths.sales, payments: paths.payments, purchases: paths.purchases, customers: paths.customers, reports: paths.reports,
  settings: paths.settings, users: paths.users, roles: paths.roles,
}

const navigationPermissions: Record<string, string> = {
  dashboard: 'x-bff:read', pos: 'x-order:create', orders: 'x-order:read', products: 'x-product:read', stores: 'x-store:read',
  sales: 'x-order:read', payments: 'x-order:read', purchases: 'x-inventory:read', customers: 'x-customer:read',
  reports: 'x-report:read', settings: 'x-business:read', users: 'x-user:read', roles: 'x-user:read',
}

/** Menu areas that need a plan feature; they are hidden when the merchant's plan does not include it. */
const navigationPlanFeatures: Record<string, PlanFeature> = {
  purchases: 'PURCHASING', customers: 'CUSTOMERS_LOYALTY', reports: 'FULL_REPORTS',
}

const productSubItems: Array<{ to: string; label: string; end?: boolean; permission?: string; planFeature?: PlanFeature }> = [
  { to: paths.products, label: 'All products', end: true },
  { to: paths.productUnits, label: 'Unit', permission: 'x-product:unit' },
  { to: paths.productBrands, label: 'Brand', permission: 'x-product:brand' },
  { to: paths.productCategories, label: 'Category', permission: 'x-product:category' },
  { to: paths.productOptions, label: 'Options' },
  { to: paths.productStockMovement, label: 'Stock movement', planFeature: 'INVENTORY' }, { to: paths.productLowStock, label: 'Low stock', planFeature: 'INVENTORY' },
  { to: paths.productExpiry, label: 'Expiry management', permission: 'x-inventory:read', planFeature: 'INVENTORY' },
]

const purchaseSubItems = [
  { to: paths.purchases, label: 'Purchase orders', end: true }, { to: paths.purchaseReceive, label: 'Receive goods' },
  { to: paths.purchaseSuppliers, label: 'Suppliers' }, { to: paths.purchaseReturns, label: 'Supplier returns' },
]

const salesSubItems: Array<{ to: string; label: string; end?: boolean; permission?: string }> = [
  { to: paths.sales, label: 'All sales', end: true, permission: 'x-order:read' },
  { to: paths.salesPayments, label: 'Payments', permission: 'x-report:read' },
  { to: paths.salesReturns, label: 'Returns & refunds', permission: 'x-order:refund' },
  { to: paths.salesCashRegister, label: 'Cash register', permission: 'x-payment:read' },
]

const reportSubItems: Array<{ to: string; label: string; end?: boolean }> = [
  { to: paths.reports, label: 'Sales overview', end: true },
  { to: paths.reportsProducts, label: 'Product performance' },
  { to: paths.reportsPayments, label: 'Payment & cash' },
  { to: paths.reportsStores, label: 'Store & cashier' },
  { to: paths.reportsTax, label: 'Tax, discounts & refunds' },
]

const settingsSubItems: Array<{ to: string; label: string; end?: boolean; planFeature?: PlanFeature }> = [
  { to: paths.settings, label: 'Business profile', end: true },
  { to: paths.settingsPos, label: 'POS configuration' },
  { to: paths.settingsLoyalty, label: 'Loyalty', planFeature: 'CUSTOMERS_LOYALTY' },
  { to: paths.settingsPlan, label: 'Plan & usage' },
  { to: paths.settingsTelegram, label: 'Telegram alerts' },
  { to: paths.settingsSecurity, label: 'Security & 2FA' },
  { to: paths.settingsLayout, label: 'Workspace layout' },
]

const staticItems = [
  { key: 'orders', icon: 'file-list-3-line', label: 'Order management' },
  { key: 'sales', icon: 'line-chart-line', label: 'Sales' }, { key: 'customers', icon: 'user-heart-line', label: 'Customers' },
  { key: 'reports', icon: 'bar-chart-box-line', label: 'Reports' },
]

const managementItems = [
  { key: 'stores', icon: 'building-2-line', label: 'Store management', linked: true },
  { key: 'settings', icon: 'settings-3-line', label: 'Settings', linked: true },
  { key: 'users', icon: 'group-line', label: 'User management', linked: true },
  { key: 'roles', icon: 'shield-keyhole-line', label: 'Role management', linked: true },
]

function themeClasses(style: SidebarLayoutState['config']['color']) {
  if (style === 'light') return {
    shell: 'border-r border-vpos-line bg-vpos-surface text-vpos-text shadow-none',
    item: 'text-vpos-sidebar hover:bg-vpos-subtle hover:text-vpos-text',
    active: 'bg-vpos-primary text-white',
    icon: 'bg-transparent text-vpos-sidebar',
    divider: 'bg-vpos-line',
    title: 'text-vpos-sidebar-heading',
    flyout: 'border-vpos-line bg-vpos-surface text-vpos-text shadow-vpos',
    subActive: 'bg-vpos-primary-soft text-vpos-text',
    subItem: 'text-vpos-sidebar hover:bg-vpos-subtle hover:text-vpos-text',
  }
  return {
    shell: style.startsWith('gradient')
      ? 'bg-gradient-to-b from-vpos-topbar-dark to-vpos-bg text-white'
      : 'bg-vpos-topbar-dark text-white',
    item: 'text-white/70 hover:bg-white/10 hover:text-white',
    active: 'bg-vpos-primary text-white',
    icon: 'bg-white/10 text-white/90',
    divider: 'bg-white/10',
    title: 'text-white/45',
    flyout: 'border-white/10 bg-vpos-topbar-dark text-white shadow-vpos',
    subActive: 'bg-white/15 text-white',
    subItem: 'text-white/60 hover:bg-white/10 hover:text-white',
  }
}

function Tooltip({ icon, label, hint, visible, theme }: { icon: string; label: string; hint?: string; visible: boolean; theme: ReturnType<typeof themeClasses> }) {
  return <span role="tooltip" className={cn('pointer-events-none absolute top-1/2 left-[calc(100%+12px)] z-[70] flex w-max max-w-[240px] origin-left -translate-y-1/2 items-center gap-3 rounded-xl border px-3 py-2.5 text-left shadow-vpos transition-[opacity,transform,visibility] duration-200 ease-out', visible ? 'visible translate-x-0 scale-100 opacity-100' : 'invisible translate-x-1 scale-95 opacity-0', theme.flyout)}>
    <span className={cn('grid h-7 w-7 shrink-0 place-items-center rounded-md text-[15px]', theme.icon)}><Icon name={icon} /></span>
    <span className="min-w-0 pr-1"><span className="block text-[14px] font-extrabold">{label}</span>{hint ? <span className="mt-0.5 block text-[12px] font-medium opacity-60">{hint}</span> : null}</span>
  </span>
}

function SidebarBrand({ iconOnly, compact, theme }: { iconOnly: boolean; compact: boolean; theme: ReturnType<typeof themeClasses> }) {
  const { user } = useAuth()
  const business = user?.business
  const isLight = theme.divider === 'bg-vpos-line'
  return <div className={cn('flex h-[70px] shrink-0 items-center border-b px-5', compact ? 'gap-2 px-3' : 'gap-3', isLight ? 'border-vpos-line' : 'border-white/10')}>
    <span className={cn('grid shrink-0 place-items-center overflow-hidden rounded-xl', isLight ? 'bg-vpos-primary text-white' : 'bg-white/15 text-white', compact ? 'h-8 w-8 text-[17px]' : 'h-10 w-10 text-[20px]')}>{business?.logoUrl ? <img src={business.logoUrl} alt="" className="h-full w-full object-cover" /> : <Icon name="store-3-fill" />}</span>
    {!iconOnly ? <span className="min-w-0"><span className="block truncate text-[17px] font-extrabold leading-none tracking-tight">{business?.name ?? 'TinhLuk'}</span><span className={cn('mt-1 block text-[11px] font-bold tracking-[1.2px]', theme.title)}>{business?.type?.toUpperCase() ?? 'SMART BUSINESS'}</span></span> : null}
  </div>
}

function NavItem({ to, icon, label, end, iconOnly, hint, theme, onNavigate, hovered, onHover }: {
  to: string; icon: string; label: string; end?: boolean; iconOnly: boolean; hint?: string; theme: ReturnType<typeof themeClasses>; onNavigate: () => void; hovered?: boolean; onHover?: (label: string | null) => void
}) {
  return <NavLink to={to} end={end} aria-label={label} onMouseEnter={() => iconOnly && onHover?.(label)} onMouseLeave={() => iconOnly && onHover?.(null)} onFocus={() => iconOnly && onHover?.(label)} onBlur={() => iconOnly && onHover?.(null)} onClick={onNavigate} className={({ isActive }) => cn('group relative flex items-center rounded-[4px] no-underline transition-all duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vpos-primary', iconOnly ? 'mx-auto h-10 w-10 justify-center' : 'h-10 w-full gap-3 px-3', isActive ? theme.active : theme.item)}>
    {({ isActive }) => <>{iconOnly ? <Icon name={icon} className={cn('text-[19px] transition-transform duration-200', hovered && 'scale-110')} /> : <><span className={cn('grid h-7 w-7 shrink-0 place-items-center rounded-[4px] text-[16px]', isActive ? 'bg-white text-vpos-primary shadow-sm' : theme.icon)}><Icon name={icon} /></span><span className="truncate text-[15px] font-normal">{label}</span></>}{iconOnly ? <Tooltip icon={icon} label={label} hint={hint} visible={Boolean(hovered)} theme={theme} /> : null}</>}
  </NavLink>
}

function StaticNavItem({ icon, label, iconOnly, hint, theme, hovered, onHover }: { icon: string; label: string; iconOnly: boolean; hint?: string; theme: ReturnType<typeof themeClasses>; hovered?: boolean; onHover?: (label: string | null) => void }) {
  return <button type="button" aria-label={label} onMouseEnter={() => iconOnly && onHover?.(label)} onMouseLeave={() => iconOnly && onHover?.(null)} onFocus={() => iconOnly && onHover?.(label)} onBlur={() => iconOnly && onHover?.(null)} className={cn('group relative flex items-center rounded-[4px] border-0 bg-transparent transition-all duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vpos-primary', iconOnly ? 'mx-auto h-10 w-10 justify-center' : 'h-10 w-full gap-3 px-3', theme.item)}>
    {iconOnly ? <Icon name={icon} className={cn('text-[19px] transition-transform duration-200', hovered && 'scale-110')} /> : <><span className={cn('grid h-7 w-7 shrink-0 place-items-center rounded-[4px] text-[16px]', theme.icon)}><Icon name={icon} /></span><span className="truncate text-[15px] font-normal">{label}</span></>}{iconOnly ? <Tooltip icon={icon} label={label} hint={hint} visible={Boolean(hovered)} theme={theme} /> : null}
  </button>
}

function SidebarDropdownPanel({ id, icon, label, items, iconOnly, theme, onNavigate }: {
  id: string; icon: string; label: string; items: Array<{ to: string; label: string; end?: boolean; permission?: string }>; iconOnly: boolean; theme: ReturnType<typeof themeClasses>; onNavigate: () => void
}) {
  return <div id={`${id}-submenu`} className={cn(iconOnly ? 'animate-slide-in-right absolute top-0 left-[calc(100%+12px)] z-[70] w-[232px] rounded-xl border p-2 shadow-vpos' : 'flex flex-col gap-0.5', iconOnly && theme.flyout)}>
    {iconOnly ? <div className={cn('mb-1 flex items-center gap-2 rounded-lg px-2 py-1.5', theme.icon)}><span className="grid h-6 w-6 place-items-center rounded-md bg-white/10 text-[15px]"><Icon name={icon} /></span><span className="text-[13px] font-extrabold">{label}</span></div> : null}
    {items.map((item) => <NavLink key={item.to} to={item.to} end={item.end} onClick={onNavigate} className={({ isActive }) => cn(iconOnly ? 'flex h-9 items-center gap-2 rounded-lg px-3 text-[13px] font-semibold no-underline transition-colors' : 'ml-4 flex h-9 items-center gap-2 rounded-lg px-3 text-[13px] font-semibold no-underline transition-colors', isActive ? theme.subActive : theme.subItem)}>{({ isActive }) => <><span className={cn('h-1.5 w-1.5 rounded-full', isActive ? 'bg-current' : 'bg-current opacity-40')} /><span className="truncate">{item.label}</span></>}</NavLink>)}
  </div>
}

function MenuGroup({ id, icon, label, items, active, state, iconOnly, theme, onNavigate }: {
  id: string; icon: string; label: string; items: Array<{ to: string; label: string; end?: boolean; permission?: string }>; active: boolean; state: SidebarLayoutState; iconOnly: boolean; theme: ReturnType<typeof themeClasses>; onNavigate: () => void
}) {
  const closeTimer = useRef<number | null>(null)
  const open = state.openGroup === id || (!iconOnly && state.openGroup === null && active)
  const showFloatingMenu = () => {
    if (closeTimer.current !== null) window.clearTimeout(closeTimer.current)
    state.showGroup(id)
    state.setHoveredMenuItem(label)
  }
  const hideFloatingMenu = () => {
    if (closeTimer.current !== null) window.clearTimeout(closeTimer.current)
    closeTimer.current = window.setTimeout(() => {
      state.hideGroup()
      state.setHoveredMenuItem(null)
    }, 180)
  }
  const contents = <>{iconOnly ? <Icon name={icon} className="text-[19px] transition-transform duration-200 group-hover:scale-110" /> : <><span className={cn('grid h-7 w-7 shrink-0 place-items-center rounded-[4px] text-[16px]', active ? 'bg-white text-vpos-primary shadow-sm' : theme.icon)}><Icon name={icon} /></span><span className="flex-1 truncate text-[15px] font-normal">{label}</span><Icon name={open ? 'arrow-up-s-line' : 'arrow-down-s-line'} className="text-[17px]" /></>}{iconOnly ? <Tooltip icon={icon} label={label} hint={navMeta[id]?.hint} visible={state.hoveredMenuItem === label && !open} theme={theme} /> : null}</>
  return <div className="relative" onMouseEnter={() => iconOnly && showFloatingMenu()} onMouseLeave={() => iconOnly && hideFloatingMenu()} onBlur={(event) => { if (iconOnly && !event.currentTarget.contains(event.relatedTarget as Node | null)) hideFloatingMenu() }}><button type="button" aria-label={label} aria-expanded={open} aria-controls={`${id}-submenu`} onFocus={() => iconOnly && showFloatingMenu()} onClick={() => iconOnly ? showFloatingMenu() : state.toggleGroup(id)} className={cn('group relative flex items-center rounded-[4px] border-0 bg-transparent text-left transition-all duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vpos-primary', iconOnly ? 'mx-auto h-10 w-10 justify-center' : 'h-10 w-full gap-3 px-3', active ? theme.active : theme.item)}>{contents}</button>
    {open ? <SidebarDropdownPanel id={id} icon={icon} label={label} items={items} iconOnly={iconOnly} theme={theme} onNavigate={onNavigate} /> : null}
  </div>
}

export function Sidebar({ state }: SidebarProps) {
  const { user } = useAuth()
  const { config, effectiveSize, isMobile, mobileOpen, hovered, setHovered, setMobileOpen } = state
  const hoverView = effectiveSize === 'hover' && !isMobile
  const iconOnly = !isMobile && (effectiveSize === 'small' || (hoverView && !hovered))
  const width = isMobile ? 280 : iconOnly ? 70 : effectiveSize === 'compact' ? 180 : 250
  const detached = !isMobile && (config.view === 'detached' || config.layout === 'semi-box')
  const location = useLocation()
  const inProducts = location.pathname === paths.products || location.pathname.startsWith(`${paths.products}/`)
  const inSales = location.pathname === paths.sales || location.pathname.startsWith(`${paths.sales}/`)
  const inPurchases = location.pathname.startsWith(paths.purchases)
  const inReports = location.pathname === paths.reports || location.pathname.startsWith(`${paths.reports}/`)
  const inSettings = location.pathname === paths.settings || location.pathname.startsWith(`${paths.settings}/`)
  const plan = usePlanFeatures()
  const visibleProductSubItems = productSubItems.filter(
    (item) => (!item.permission || user?.permissions.includes(item.permission)) && (!item.planFeature || plan.has(item.planFeature)),
  )
  const visibleSettingsSubItems = settingsSubItems.filter((item) => !item.planFeature || plan.has(item.planFeature))
  const visibleSalesSubItems = salesSubItems.filter(
    (item) => !item.permission || user?.permissions.includes(item.permission),
  )
  const canVisit = (key: string) => (!navigationPermissions[key] || user?.permissions.includes(navigationPermissions[key]))
    && (!navigationPlanFeatures[key] || plan.has(navigationPlanFeatures[key]))
  const onNavigate = () => { if (isMobile) setMobileOpen(false) }

  const backgroundImages: Record<string, string> = { 'img-1': sidebarGrid, 'img-2': sidebarOrbit, 'img-3': sidebarLines, 'img-4': sidebarDots }
  const imageStyle = config.image === 'none' ? undefined : { backgroundImage: `linear-gradient(rgba(17,17,17,.76), rgba(17,17,17,.82)), url(${backgroundImages[config.image]})`, backgroundSize: 'cover', backgroundPosition: 'center' }

  const darkTheme = isDarkThemeMode(config.colorMode)
  const sidebarColor = darkTheme ? 'dark' : config.color

  const effectiveTheme = themeClasses(sidebarColor)

  if (!isMobile && config.layout === 'horizontal') return <HorizontalMenu darkMode={darkTheme} />
  if (!isMobile && config.visibility === 'hidden') return null
  if (!isMobile && config.layout === 'two-column') return <TwoColumnMenu state={state} theme={effectiveTheme} />

  return <aside aria-label="Primary navigation" data-sidebar-theme={sidebarColor} onMouseEnter={() => hoverView && setHovered(true)} onMouseLeave={() => hoverView && setHovered(false)} className={cn('z-40 flex flex-col transition-[width,transform,opacity] duration-200 ease-out', isMobile ? 'fixed top-0 bottom-0 left-0 shadow-2xl' : config.position === 'fixed' ? 'fixed top-0 bottom-0 left-0' : 'absolute top-0 bottom-0 left-0', detached && (config.layout === 'semi-box' ? 'top-6 bottom-6 left-4 rounded-lg shadow-vpos' : 'top-4 bottom-4 left-4 rounded-xl shadow-vpos'), effectiveTheme.shell)} style={{ width, transform: isMobile && !mobileOpen ? 'translateX(-100%)' : undefined, ...imageStyle }}>
    <SidebarBrand iconOnly={iconOnly} compact={effectiveSize === 'compact'} theme={effectiveTheme} />
    <nav className={cn('flex flex-1 flex-col', iconOnly ? 'items-center gap-1.5 overflow-visible py-3' : effectiveSize === 'compact' ? 'gap-1 overflow-y-auto overflow-x-hidden px-2 py-3' : 'gap-1 overflow-y-auto overflow-x-hidden px-3 py-3')}>
      {navPrimary.filter((item) => item.key !== 'products' && canVisit(item.key)).map((item) => <NavItem key={item.key} to={keyToPath[item.key] ?? paths.home} icon={item.icon} label={item.label} end={item.key === 'dashboard'} iconOnly={iconOnly} hint={navMeta[item.key]?.hint} theme={effectiveTheme} onNavigate={onNavigate} hovered={state.hoveredMenuItem === item.label} onHover={state.setHoveredMenuItem} />)}
      {canVisit('products') ? <MenuGroup id="products" icon="shopping-bag-3-line" label="Products" items={visibleProductSubItems} active={inProducts} state={state} iconOnly={iconOnly} theme={effectiveTheme} onNavigate={onNavigate} /> : null}
      {canVisit('sales') ? <MenuGroup id="sales" icon="line-chart-line" label="Sales" items={visibleSalesSubItems} active={inSales} state={state} iconOnly={iconOnly} theme={effectiveTheme} onNavigate={onNavigate} /> : null}
      {canVisit('purchases') ? <MenuGroup id="purchases" icon="truck-line" label="Purchases" items={purchaseSubItems} active={inPurchases} state={state} iconOnly={iconOnly} theme={effectiveTheme} onNavigate={onNavigate} /> : null}
      {canVisit('reports') ? <MenuGroup id="reports" icon="bar-chart-box-line" label="Reports" items={reportSubItems} active={inReports} state={state} iconOnly={iconOnly} theme={effectiveTheme} onNavigate={onNavigate} /> : null}
      {staticItems.filter((item) => item.key !== 'sales' && item.key !== 'reports' && canVisit(item.key)).map((item) => <NavItem key={item.key} to={keyToPath[item.key]} icon={item.icon} label={item.label} iconOnly={iconOnly} hint={navMeta[item.key]?.hint} theme={effectiveTheme} onNavigate={onNavigate} hovered={state.hoveredMenuItem === item.label} onHover={state.setHoveredMenuItem} />)}
      <div className={cn('my-2 h-px shrink-0', iconOnly ? 'w-8' : 'mx-1 w-auto', effectiveTheme.divider)} />
      {!iconOnly ? <p className={cn('mb-1 px-3 text-[11px] font-semibold tracking-[1.2px]', effectiveTheme.title)}>MANAGEMENT</p> : null}
      {managementItems.filter((item) => canVisit(item.key)).map((item) => item.key === 'settings' ? <MenuGroup key={item.key} id="settings" icon={item.icon} label={item.label} items={visibleSettingsSubItems} active={inSettings} state={state} iconOnly={iconOnly} theme={effectiveTheme} onNavigate={onNavigate} /> : item.linked ? <NavItem key={item.key} to={keyToPath[item.key] ?? paths.home} icon={item.icon} label={item.label} iconOnly={iconOnly} hint={navMeta[item.key]?.hint} theme={effectiveTheme} onNavigate={onNavigate} hovered={state.hoveredMenuItem === item.label} onHover={state.setHoveredMenuItem} /> : <StaticNavItem key={item.key} icon={item.icon} label={item.label} iconOnly={iconOnly} hint={navMeta[item.key]?.hint} theme={effectiveTheme} hovered={state.hoveredMenuItem === item.label} onHover={state.setHoveredMenuItem} />)}
    </nav>
  </aside>
}

function HorizontalMenu({ darkMode }: { darkMode: boolean }) {
  const location = useLocation()
  const { user } = useAuth()
  const theme = themeClasses(darkMode ? 'dark' : 'light')
  const items = [...navPrimary.filter(item => item.key !== 'products'), { key: 'products', label: 'Products', icon: 'shopping-bag-3-line' }, { key: 'purchases', label: 'Purchases', icon: 'truck-line' }, ...staticItems, ...managementItems]
    .filter((item) => !navigationPermissions[item.key] || user?.permissions.includes(navigationPermissions[item.key]))
  return <nav aria-label="Horizontal navigation" className={cn('fixed top-[70px] right-0 left-0 z-30 flex h-12 items-center gap-1 overflow-x-auto border-b px-6 shadow-sm', darkMode ? 'border-vpos-topbar-border bg-vpos-topbar-dark' : 'border-vpos-line bg-white')}>{items.map(item => <NavLink key={item.key} to={keyToPath[item.key] ?? paths.products} className={({ isActive }) => cn('inline-flex h-8 items-center gap-1.5 rounded-[4px] px-3 text-[14px] font-medium no-underline', isActive || (item.key === 'products' && location.pathname.startsWith('/products')) ? theme.active : theme.item)}><Icon name={item.icon} />{item.label}</NavLink>)}</nav>
}

type SubLink = { to: string; label: string; end?: boolean; permission?: string; planFeature?: PlanFeature }
/** A row in the second column: a page with an icon, or a titled list of sub-pages. */
type ColumnRow = { key: string; icon: string; label: string; to?: string; end?: boolean; links?: SubLink[] }
type ColumnSection = { id: string; label: string; icon: string; rows: ColumnRow[]; matches: (path: string) => boolean }

/** Same pages as the vertical sidebar, grouped into the icon rail's sections. */
const twoColumnSections: ColumnSection[] = [
  { id: 'overview', label: 'Overview', icon: 'dashboard-line', matches: (path) => path === paths.dashboard || path.startsWith(paths.pos), rows: [
    { key: 'dashboard', icon: 'dashboard-line', label: 'Overview', to: paths.dashboard, end: true },
    { key: 'pos', icon: 'store-2-line', label: 'Point of Sale', to: paths.pos },
  ] },
  { id: 'catalog', label: 'Products', icon: 'shopping-bag-3-line', matches: (path) => path.startsWith(paths.products), rows: [
    { key: 'products', icon: 'shopping-bag-3-line', label: 'Products', links: productSubItems },
  ] },
  { id: 'orders', label: 'Sales', icon: 'line-chart-line', matches: (path) => [paths.orders, paths.sales, paths.customers].some((root) => path.startsWith(root)), rows: [
    { key: 'orders', icon: 'file-list-3-line', label: 'Order management', to: paths.orders },
    { key: 'sales', icon: 'line-chart-line', label: 'Sales', links: salesSubItems },
    { key: 'customers', icon: 'user-heart-line', label: 'Customers', to: paths.customers },
  ] },
  { id: 'purchases', label: 'Purchases', icon: 'truck-line', matches: (path) => path.startsWith(paths.purchases), rows: [
    { key: 'purchases', icon: 'truck-line', label: 'Purchases', links: purchaseSubItems },
  ] },
  { id: 'reports', label: 'Reports', icon: 'bar-chart-box-line', matches: (path) => path.startsWith(paths.reports), rows: [
    { key: 'reports', icon: 'bar-chart-box-line', label: 'Reports', links: reportSubItems },
  ] },
  { id: 'management', label: 'Management', icon: 'settings-3-line', matches: (path) => [paths.stores, paths.settings, paths.users, paths.roles].some((root) => path.startsWith(root)), rows: [
    { key: 'stores', icon: 'building-2-line', label: 'Store management', to: paths.stores },
    { key: 'settings', icon: 'settings-3-line', label: 'Settings', links: settingsSubItems },
    { key: 'users', icon: 'group-line', label: 'User management', to: paths.users },
    { key: 'roles', icon: 'shield-keyhole-line', label: 'Role management', to: paths.roles },
  ] },
]

function TwoColumnMenu({ state, theme }: { state: SidebarLayoutState; theme: ReturnType<typeof themeClasses> }) {
  const { user } = useAuth()
  const location = useLocation()
  const plan = usePlanFeatures()
  const allowed = (permission?: string) => !permission || Boolean(user?.permissions.includes(permission))
  const inPlan = (feature?: PlanFeature) => !feature || plan.has(feature)
  const sections = twoColumnSections
    .map((section) => ({ ...section, rows: section.rows
      .filter((row) => allowed(navigationPermissions[row.key]) && inPlan(navigationPlanFeatures[row.key]))
      .map((row) => (row.links ? { ...row, links: row.links.filter((link) => allowed(link.permission) && inPlan(link.planFeature)) } : row))
      .filter((row) => !row.links || row.links.length > 0) }))
    .filter((section) => section.rows.length > 0)
  const current = sections.find((section) => section.matches(location.pathname))
  const { setTwoColumnSection } = state
  // Follow the page: opening a page from anywhere shows its section in the second column.
  useEffect(() => { if (current) setTwoColumnSection(current.id) }, [current?.id, setTwoColumnSection])
  const selected =sections.find((section) => section.id === state.twoColumnSection) ?? current ?? sections[0]
  const isLight = theme.divider === 'bg-vpos-line'
  if (!selected) return null
  return <aside aria-label="Two column navigation" className={cn('fixed top-0 bottom-0 left-0 z-40 flex overflow-hidden shadow-sm', theme.shell)} style={{ width: state.twoColumnOpen ? 290 : 70 }}>
    <div className="flex w-[70px] shrink-0 flex-col items-center gap-3 py-5">{sections.map((section) => <button key={section.id} type="button" title={section.label} aria-label={section.label} aria-pressed={selected.id === section.id} onClick={() => { state.setTwoColumnSection(section.id); state.setTwoColumnOpen(true) }} className={cn('relative grid h-10 w-10 place-items-center rounded-md border-0 bg-transparent text-[20px]', selected.id === section.id ? theme.active : theme.item)}><Icon name={section.icon} />{current?.id === section.id && selected.id !== section.id ? <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-current" /> : null}</button>)}</div>
    {state.twoColumnOpen ? <div className={cn('flex w-[220px] flex-col border-l', isLight ? 'border-vpos-line' : 'border-white/10')}>
      <div className="flex h-20 shrink-0 items-center px-5 text-[16px] font-bold">{selected.label}<button type="button" onClick={() => state.setTwoColumnOpen(false)} className="ml-auto border-0 bg-transparent text-inherit" aria-label="Collapse secondary navigation"><Icon name="arrow-left-s-line" /></button></div>
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 pb-4">{selected.rows.map((row) => row.links
        ? <div key={row.key} className="flex flex-col gap-0.5 py-1">
            <p className={cn('mb-1 flex items-center gap-2 px-3 pt-1 text-[11px] font-semibold tracking-[1.2px] uppercase', theme.title)}><Icon name={row.icon} className="text-[14px]" />{row.label}</p>
            {row.links.map((link) => <NavLink key={link.to} to={link.to} end={link.end} className={({ isActive }) => cn('flex h-9 items-center gap-2 rounded-lg px-3 text-[13px] font-semibold no-underline transition-colors', isActive ? theme.subActive : theme.subItem)}>{({ isActive }) => <><span className={cn('h-1.5 w-1.5 rounded-full bg-current', !isActive && 'opacity-40')} /><span className="truncate">{link.label}</span></>}</NavLink>)}
          </div>
        : <NavItem key={row.key} to={row.to ?? paths.dashboard} end={row.end} icon={row.icon} label={row.label} iconOnly={false} hint={navMeta[row.key]?.hint} theme={theme} onNavigate={() => undefined} />)}
      </nav>
    </div> : null}
  </aside>
}
