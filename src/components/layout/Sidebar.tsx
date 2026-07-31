import { useRef } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import type { SidebarLayoutState } from '../../hooks/useSidebarLayout'
import { navPrimary } from '../../data/mockup'
import { cn } from '../../lib/cn'
import { paths } from '../../lib/paths'
import { Icon } from '../ui/Icon'
import { useAuth } from '../../context/AuthContext'
import sidebarGrid from '../../assets/sidebar-grid.svg'
import sidebarOrbit from '../../assets/sidebar-orbit.svg'
import sidebarLines from '../../assets/sidebar-lines.svg'
import sidebarDots from '../../assets/sidebar-dots.svg'

export interface SidebarProps {
  state: SidebarLayoutState
}

const navMeta: Record<string, { hint: string }> = {
  dashboard: { hint: 'Business overview & metrics' }, pos: { hint: 'Sell products at the register' },
  products: { hint: 'Catalog, stock movement & low stock' }, stores: { hint: 'Locations, hours & managers' },
  sales: { hint: 'Orders and invoices' }, purchases: { hint: 'Supplier orders & receipts' },
  customers: { hint: 'Customer directory' }, reports: { hint: 'Analytics & exports' },
  settings: { hint: 'Store configuration' }, users: { hint: 'Team access & roles' },
}

const keyToPath: Record<string, string> = {
  dashboard: paths.dashboard, pos: paths.pos, products: paths.products, stores: paths.stores,
  sales: paths.sales, purchases: paths.purchases, customers: paths.customers, reports: paths.reports,
  settings: paths.settings, users: paths.users,
}

const productSubItems = [
  { to: paths.products, label: 'All products', end: true }, { to: paths.productOptions, label: 'Variants' },
  { to: paths.productStockMovement, label: 'Stock movement' }, { to: paths.productLowStock, label: 'Low stock' },
]

const purchaseSubItems = [
  { to: paths.purchases, label: 'Purchase orders', end: true }, { to: paths.purchaseReceive, label: 'Receive goods' },
  { to: paths.purchaseSuppliers, label: 'Suppliers' }, { to: paths.purchaseReturns, label: 'Supplier returns' },
]

const staticItems = [
  { key: 'sales', icon: 'line-chart-line', label: 'Sales' }, { key: 'customers', icon: 'user-heart-line', label: 'Customers' },
  { key: 'reports', icon: 'bar-chart-box-line', label: 'Reports' },
]

const managementItems = [
  { key: 'stores', icon: 'building-2-line', label: 'Store management', linked: true },
  { key: 'settings', icon: 'settings-3-line', label: 'Settings', linked: true }, { key: 'users', icon: 'group-line', label: 'Users & Roles' },
]

function themeClasses(style: SidebarLayoutState['config']['color']) {
  if (style === 'light') return {
    shell: 'bg-white text-vpos-text border-r border-vpos-line shadow-[0_2px_4px_rgba(15,34,58,.12)]', item: 'text-[#6d7080] hover:bg-vpos-subtle hover:text-vpos-primary', active: 'bg-vpos-sand text-vpos-primary', icon: 'bg-transparent text-[#6d7080]', divider: 'bg-vpos-line', title: 'text-[#919da9]', flyout: 'bg-white text-vpos-text border-vpos-line shadow-vpos', subActive: 'bg-vpos-sand text-vpos-primary', subItem: 'text-[#6d7080] hover:bg-vpos-subtle hover:text-vpos-primary',
  }
  return {
    shell: style.startsWith('gradient') ? (style === 'gradient-2' ? 'bg-gradient-to-b from-[#022832] to-[#045064] text-white' : style === 'gradient-3' ? 'bg-gradient-to-b from-[#0c2a1b] to-[#185436] text-white' : style === 'gradient-4' ? 'bg-gradient-to-b from-[#331913] to-[#663325] text-white' : 'bg-gradient-to-b from-[#151933] to-vpos-primary text-white') : 'bg-vpos-dark text-white',
    item: 'text-[#d7d5e4] hover:bg-white/10 hover:text-white', active: 'bg-vpos-primary text-white shadow-[inset_3px_0_0_#f4f4f4]', icon: 'bg-white/10 text-white/90', divider: 'bg-white/10', title: 'text-white/40', flyout: 'bg-vpos-dark text-white border-white/10', subActive: 'bg-white/15 text-white', subItem: 'text-white/55 hover:bg-white/10 hover:text-white',
  }
}

function Tooltip({ icon, label, hint, visible, theme }: { icon: string; label: string; hint?: string; visible: boolean; theme: ReturnType<typeof themeClasses> }) {
  return <span role="tooltip" className={cn('pointer-events-none absolute top-1/2 left-[calc(100%+12px)] z-[70] flex w-max max-w-[240px] origin-left -translate-y-1/2 items-center gap-3 rounded-xl border px-3 py-2.5 text-left shadow-[0_12px_40px_rgba(8,31,56,.32)] transition-[opacity,transform,visibility] duration-200 ease-out', visible ? 'visible translate-x-0 scale-100 opacity-100' : 'invisible translate-x-1 scale-95 opacity-0', theme.flyout)}>
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
    {!iconOnly ? <span className="min-w-0"><span className="block truncate text-[17px] font-extrabold leading-none tracking-tight">{business?.name ?? 'V-POS'}</span><span className={cn('mt-1 block text-[11px] font-bold tracking-[1.2px]', theme.title)}>{business?.type?.toUpperCase() ?? 'SMART BUSINESS'}</span></span> : null}
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
  id: string; icon: string; label: string; items: Array<{ to: string; label: string; end?: boolean }>; iconOnly: boolean; theme: ReturnType<typeof themeClasses>; onNavigate: () => void
}) {
  return <div id={`${id}-submenu`} className={cn(iconOnly ? 'animate-slide-in-right absolute top-0 left-[calc(100%+12px)] z-[70] w-[232px] rounded-xl border p-2 shadow-[0_16px_42px_rgba(8,31,56,.32)]' : 'flex flex-col gap-0.5', iconOnly && theme.flyout)}>
    {iconOnly ? <div className={cn('mb-1 flex items-center gap-2 rounded-lg px-2 py-1.5', theme.icon)}><span className="grid h-6 w-6 place-items-center rounded-md bg-white/10 text-[15px]"><Icon name={icon} /></span><span className="text-[13px] font-extrabold">{label}</span></div> : null}
    {items.map((item) => <NavLink key={item.to} to={item.to} end={item.end} onClick={onNavigate} className={({ isActive }) => cn(iconOnly ? 'flex h-9 items-center gap-2 rounded-lg px-3 text-[13px] font-semibold no-underline transition-colors' : 'ml-4 flex h-9 items-center gap-2 rounded-lg px-3 text-[13px] font-semibold no-underline transition-colors', isActive ? theme.subActive : theme.subItem)}>{({ isActive }) => <><span className={cn('h-1.5 w-1.5 rounded-full', isActive ? 'bg-current' : 'bg-current opacity-40')} /><span className="truncate">{item.label}</span></>}</NavLink>)}
  </div>
}

function MenuGroup({ id, icon, label, items, active, state, iconOnly, theme, onNavigate }: {
  id: string; icon: string; label: string; items: Array<{ to: string; label: string; end?: boolean }>; active: boolean; state: SidebarLayoutState; iconOnly: boolean; theme: ReturnType<typeof themeClasses>; onNavigate: () => void
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
  const { config, effectiveSize, isMobile, mobileOpen, hovered, setHovered, setMobileOpen } = state
  const hoverView = effectiveSize === 'hover' && !isMobile
  const iconOnly = !isMobile && (effectiveSize === 'small' || (hoverView && !hovered))
  const width = isMobile ? 280 : iconOnly ? 70 : effectiveSize === 'compact' ? 180 : 250
  const detached = !isMobile && (config.view === 'detached' || config.layout === 'semi-box')
  const theme = themeClasses(config.color)
  const location = useLocation()
  const inProducts = location.pathname === paths.products || location.pathname.startsWith(`${paths.products}/`)
  const inPurchases = location.pathname.startsWith(paths.purchases)
  const onNavigate = () => { if (isMobile) setMobileOpen(false) }

  const backgroundImages: Record<string, string> = { 'img-1': sidebarGrid, 'img-2': sidebarOrbit, 'img-3': sidebarLines, 'img-4': sidebarDots }
  const imageStyle = config.image === 'none' ? undefined : { backgroundImage: `linear-gradient(rgba(39,42,58,.76), rgba(39,42,58,.82)), url(${backgroundImages[config.image]})`, backgroundSize: 'cover', backgroundPosition: 'center' }

  if (!isMobile && config.layout === 'horizontal') return <HorizontalMenu />
  if (!isMobile && config.visibility === 'hidden') return null
  if (!isMobile && config.layout === 'two-column') return <TwoColumnMenu state={state} theme={theme} />

  return <aside aria-label="Primary navigation" data-sidebar-theme={config.color} onMouseEnter={() => hoverView && setHovered(true)} onMouseLeave={() => hoverView && setHovered(false)} className={cn('z-40 flex flex-col transition-[width,transform,opacity] duration-200 ease-out', isMobile ? 'fixed top-0 bottom-0 left-0 shadow-2xl' : config.position === 'fixed' ? 'fixed top-0 bottom-0 left-0' : 'absolute top-0 bottom-0 left-0', detached && (config.layout === 'semi-box' ? 'top-6 bottom-6 left-6 rounded-lg shadow-[0_12px_30px_rgba(8,31,56,.16)]' : 'top-24 bottom-4 left-12 rounded-xl shadow-[0_12px_30px_rgba(8,31,56,.16)]'), theme.shell)} style={{ width, transform: isMobile && !mobileOpen ? 'translateX(-100%)' : undefined, ...imageStyle }}>
    <SidebarBrand iconOnly={iconOnly} compact={effectiveSize === 'compact'} theme={theme} />
    <nav className={cn('flex flex-1 flex-col', iconOnly ? 'items-center gap-1.5 overflow-visible py-3' : effectiveSize === 'compact' ? 'gap-1 overflow-y-auto overflow-x-hidden px-2 py-3' : 'gap-1 overflow-y-auto overflow-x-hidden px-3 py-3')}>
      {navPrimary.filter((item) => item.key !== 'products').map((item) => <NavItem key={item.key} to={keyToPath[item.key] ?? paths.home} icon={item.icon} label={item.label} end={item.key === 'dashboard'} iconOnly={iconOnly} hint={navMeta[item.key]?.hint} theme={theme} onNavigate={onNavigate} hovered={state.hoveredMenuItem === item.label} onHover={state.setHoveredMenuItem} />)}
      <MenuGroup id="products" icon="shopping-bag-3-line" label="Products" items={productSubItems} active={inProducts} state={state} iconOnly={iconOnly} theme={theme} onNavigate={onNavigate} />
      <StaticNavItem icon="line-chart-line" label="Sales" iconOnly={iconOnly} hint={navMeta.sales?.hint} theme={theme} hovered={state.hoveredMenuItem === 'Sales'} onHover={state.setHoveredMenuItem} />
      <MenuGroup id="purchases" icon="truck-line" label="Purchases" items={purchaseSubItems} active={inPurchases} state={state} iconOnly={iconOnly} theme={theme} onNavigate={onNavigate} />
      {staticItems.filter((item) => item.key !== 'sales').map((item) => <StaticNavItem key={item.key} icon={item.icon} label={item.label} iconOnly={iconOnly} hint={navMeta[item.key]?.hint} theme={theme} hovered={state.hoveredMenuItem === item.label} onHover={state.setHoveredMenuItem} />)}
      <div className={cn('my-2 h-px shrink-0', iconOnly ? 'w-8' : 'mx-1 w-auto', theme.divider)} />
      {!iconOnly ? <p className={cn('mb-1 px-3 text-[11px] font-semibold tracking-[1.2px]', theme.title)}>MANAGEMENT</p> : null}
      {managementItems.map((item) => item.linked ? <NavItem key={item.key} to={keyToPath[item.key] ?? paths.home} icon={item.icon} label={item.label} iconOnly={iconOnly} hint={navMeta[item.key]?.hint} theme={theme} onNavigate={onNavigate} hovered={state.hoveredMenuItem === item.label} onHover={state.setHoveredMenuItem} /> : <StaticNavItem key={item.key} icon={item.icon} label={item.label} iconOnly={iconOnly} hint={navMeta[item.key]?.hint} theme={theme} hovered={state.hoveredMenuItem === item.label} onHover={state.setHoveredMenuItem} />)}
    </nav>
  </aside>
}

function HorizontalMenu() {
  const location = useLocation()
  const items = [...navPrimary.filter(item => item.key !== 'products'), { key: 'products', label: 'Products', icon: 'shopping-bag-3-line' }, { key: 'purchases', label: 'Purchases', icon: 'truck-line' }, ...staticItems]
  return <nav aria-label="Horizontal navigation" className="fixed top-[70px] right-0 left-0 z-30 flex h-12 items-center gap-1 overflow-x-auto border-b border-vpos-line bg-white px-6 shadow-sm">{items.map(item => <NavLink key={item.key} to={keyToPath[item.key] ?? paths.products} className={({ isActive }) => cn('inline-flex h-8 items-center gap-1.5 rounded-[4px] px-3 text-[14px] font-medium no-underline', isActive || (item.key === 'products' && location.pathname.startsWith('/products')) ? 'bg-vpos-sand text-vpos-primary' : 'text-vpos-muted hover:bg-vpos-subtle')}><Icon name={item.icon} />{item.label}</NavLink>)}</nav>
}

function TwoColumnMenu({ state, theme }: { state: SidebarLayoutState; theme: ReturnType<typeof themeClasses> }) {
  const sections = [{ id: 'overview', label: 'Overview', icon: 'dashboard-line', items: navPrimary.slice(0, 2) }, { id: 'catalog', label: 'Products', icon: 'shopping-bag-3-line', items: [{ key: 'products', label: 'Products', icon: 'shopping-bag-3-line' }] }, { id: 'purchases', label: 'Purchases', icon: 'truck-line', items: [{ key: 'purchases', label: 'Purchases', icon: 'truck-line' }] }, { id: 'management', label: 'Management', icon: 'settings-3-line', items: managementItems }]
  const selected = sections.find(section => section.id === state.twoColumnSection) ?? sections[0]
  return <aside aria-label="Two column navigation" className={cn('fixed top-0 bottom-0 left-0 z-40 flex overflow-hidden shadow-sm', theme.shell)} style={{ width: state.twoColumnOpen ? 290 : 70 }}><div className="flex w-[70px] shrink-0 flex-col items-center gap-3 py-5">{sections.map(section => <button key={section.id} type="button" title={section.label} aria-label={section.label} aria-pressed={selected.id === section.id} onClick={() => { state.setTwoColumnSection(section.id); state.setTwoColumnOpen(true) }} className={cn('grid h-10 w-10 place-items-center rounded-md border-0 bg-transparent text-[20px]', selected.id === section.id ? theme.active : theme.item)}><Icon name={section.icon} /></button>)}</div>{state.twoColumnOpen ? <div className="flex w-[220px] flex-col border-l border-white/10"><div className="flex h-20 items-center px-5 text-[16px] font-bold">{selected.label}<button type="button" onClick={() => state.setTwoColumnOpen(false)} className="ml-auto border-0 bg-transparent text-inherit" aria-label="Collapse secondary navigation"><Icon name="arrow-left-s-line" /></button></div><nav className="flex-1 overflow-y-auto px-3 py-3">{selected.items.map(item => <NavItem key={item.key} to={keyToPath[item.key] ?? paths.dashboard} icon={item.icon} label={item.label} iconOnly={false} hint={navMeta[item.key]?.hint} theme={theme} onNavigate={() => undefined} />)}</nav></div> : null}</aside>
}
