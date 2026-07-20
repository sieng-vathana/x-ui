import type { HTMLAttributes } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { cn } from '../../lib/cn'
import { paths } from '../../lib/paths'
import { navPrimary } from '../../data/mockup'
import { Icon } from '../ui/Icon'

export interface SidebarProps extends HTMLAttributes<HTMLElement> {
  collapsed?: boolean
  /** Kept for API compat — toggle lives in Topbar top-left */
  onToggle?: () => void
}

const navMeta: Record<string, { hint: string }> = {
  dashboard: { hint: 'Business overview & metrics' },
  pos: { hint: 'Sell products at the register' },
  products: { hint: 'Catalog, stock movement & low stock' },
  stores: { hint: 'Locations, hours & managers' },
  sales: { hint: 'Orders and invoices' },
  purchases: { hint: 'Supplier orders & receipts' },
  customers: { hint: 'Customer directory' },
  reports: { hint: 'Analytics & exports' },
  settings: { hint: 'Store configuration' },
  users: { hint: 'Team access & roles' },
}

/** Flyout card when sidebar is collapsed */
function CollapseFlyout({
  icon,
  label,
  hint,
  active,
}: {
  icon: string
  label: string
  hint?: string
  active?: boolean
}) {
  return (
    <span
      className={cn(
        'pointer-events-none absolute top-1/2 left-[calc(100%+12px)] z-[100]',
        '-translate-y-1/2 translate-x-1 opacity-0',
        'invisible flex w-max max-w-[240px] items-center gap-3 rounded-xl border border-white/10',
        'bg-vpos-dark px-3 py-2.5 text-left shadow-[0_12px_40px_rgba(8,31,56,.45)]',
        'ring-1 ring-black/20 transition-all duration-150 ease-out',
        'group-hover:visible group-hover:translate-x-0 group-hover:opacity-100',
        'group-focus-visible:visible group-focus-visible:translate-x-0 group-focus-visible:opacity-100',
      )}
      role="tooltip"
    >
      {/* Arrow pointing to the icon */}
      <span
        className="absolute top-1/2 -left-1.5 h-3 w-3 -translate-y-1/2 rotate-45 border-b border-l border-white/10 bg-vpos-dark"
        aria-hidden
      />
      <span
        className={cn(
          'grid h-9 w-9 shrink-0 place-items-center rounded-lg text-[16px]',
          active
            ? 'bg-vpos-primary text-white'
            : 'bg-white/10 text-white',
        )}
      >
        <Icon name={icon} />
      </span>
      <span className="min-w-0 pr-1">
        <span className="block text-[13px] font-extrabold text-white">
          {label}
        </span>
        {hint ? (
          <span className="mt-0.5 block text-[11px] font-medium text-white/55">
            {hint}
          </span>
        ) : null}
      </span>
    </span>
  )
}

function NavItem({
  to,
  icon,
  label,
  end,
  collapsed,
  hint,
}: {
  to: string
  icon: string
  label: string
  end?: boolean
  collapsed?: boolean
  hint?: string
}) {
  return (
    <NavLink
      to={to}
      end={end}
      aria-label={label}
      className={({ isActive }) =>
        cn(
          'group relative flex items-center rounded-xl no-underline transition-all duration-150',
          collapsed
            ? 'mx-auto h-11 w-11 justify-center'
            : 'h-11 w-full gap-3 px-3',
          isActive
            ? collapsed
              ? 'bg-vpos-primary text-white shadow-md shadow-vpos-primary/30'
              : 'bg-vpos-primary text-white shadow-[inset_3px_0_0_#f4f4f4]'
            : collapsed
              ? 'text-white/70 hover:bg-white/10 hover:text-white'
              : 'text-[#d7d5e4] hover:bg-white/10 hover:text-white',
        )
      }
    >
      {({ isActive }) => (
        <>
          {collapsed ? (
            <Icon name={icon} className="text-[20px]" />
          ) : (
            <>
              <span
                className={cn(
                  'grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[15px]',
                  isActive ? 'bg-white/20 text-white' : 'bg-white/10 text-white/90',
                )}
              >
                <Icon name={icon} />
              </span>
              <span className="truncate text-[14px] font-semibold">{label}</span>
            </>
          )}
          {collapsed ? (
            <CollapseFlyout
              icon={icon}
              label={label}
              hint={hint}
              active={isActive}
            />
          ) : null}
        </>
      )}
    </NavLink>
  )
}

function StaticNavItem({
  icon,
  label,
  collapsed,
  hint,
}: {
  icon: string
  label: string
  collapsed?: boolean
  hint?: string
}) {
  return (
    <button
      type="button"
      aria-label={label}
      className={cn(
        'group relative flex items-center rounded-xl border-0 bg-transparent transition-all duration-150',
        collapsed
          ? 'mx-auto h-11 w-11 justify-center text-white/70 hover:bg-white/10 hover:text-white'
          : 'h-11 w-full gap-3 px-3 text-[#d7d5e4] hover:bg-white/10 hover:text-white',
      )}
    >
      {collapsed ? (
        <Icon name={icon} className="text-[20px]" />
      ) : (
        <>
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/10 text-[15px] text-white/90">
            <Icon name={icon} />
          </span>
          <span className="truncate text-[14px] font-semibold">{label}</span>
        </>
      )}
      {collapsed ? (
        <CollapseFlyout icon={icon} label={label} hint={hint} />
      ) : null}
    </button>
  )
}

const keyToPath: Record<string, string> = {
  dashboard: paths.dashboard,
  pos: paths.pos,
  products: paths.products,
  stores: paths.stores,
  sales: paths.sales,
  purchases: paths.purchases,
  customers: paths.customers,
  reports: paths.reports,
  settings: paths.settings,
  users: paths.users,
}

const productSubItems: Array<{ to: string; label: string; end?: boolean }> = [
  { to: paths.products, label: 'All products', end: true },
  { to: paths.productVariants, label: 'Variants' },
  { to: paths.productStockMovement, label: 'Stock movement' },
  { to: paths.productLowStock, label: 'Low stock' },
]

function ProductsNavGroup({ collapsed }: { collapsed?: boolean }) {
  const location = useLocation()
  const inProducts =
    location.pathname === '/products' ||
    location.pathname.startsWith('/products/')

  if (collapsed) {
    return (
      <NavItem
        to={paths.products}
        icon="shopping-bag-3-line"
        label="Products"
        collapsed
        hint={navMeta.products?.hint}
      />
    )
  }

  return (
    <div className="flex flex-col gap-0.5">
      <NavItem
        to={paths.products}
        icon="shopping-bag-3-line"
        label="Products"
        hint={navMeta.products?.hint}
      />
      {inProducts
        ? productSubItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'ml-4 flex h-9 items-center rounded-lg px-3 text-[12px] font-semibold no-underline transition-colors',
                  isActive
                    ? 'bg-white/15 text-white'
                    : 'text-white/55 hover:bg-white/10 hover:text-white',
                )
              }
            >
              {item.label}
            </NavLink>
          ))
        : null}
    </div>
  )
}

const staticItems: Array<{
  key: string
  icon: string
  label: string
}> = [
  { key: 'sales', icon: 'line-chart-line', label: 'Sales' },
  { key: 'customers', icon: 'user-heart-line', label: 'Customers' },
  { key: 'reports', icon: 'bar-chart-box-line', label: 'Reports' },
]

const purchaseSubItems: Array<{ to: string; label: string; end?: boolean }> = [
  { to: paths.purchases, label: 'Purchase orders', end: true },
  { to: paths.purchaseReceive, label: 'Receive goods' },
  { to: paths.purchaseSuppliers, label: 'Suppliers' },
  { to: paths.purchaseReturns, label: 'Supplier returns' },
]

function PurchasesNavGroup({ collapsed }: { collapsed?: boolean }) {
  const location = useLocation()
  const inPurchases = location.pathname.startsWith('/purchases')

  if (collapsed) {
    return (
      <NavItem
        to={paths.purchases}
        icon="truck-line"
        label="Purchases"
        collapsed
        hint={navMeta.purchases?.hint}
      />
    )
  }

  return (
    <div className="flex flex-col gap-0.5">
      <NavItem
        to={paths.purchases}
        icon="truck-line"
        label="Purchases"
        hint={navMeta.purchases?.hint}
      />
      {inPurchases
        ? purchaseSubItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'ml-4 flex h-9 items-center rounded-lg px-3 text-[12px] font-semibold no-underline transition-colors',
                  isActive
                    ? 'bg-white/15 text-white'
                    : 'text-white/55 hover:bg-white/10 hover:text-white',
                )
              }
            >
              {item.label}
            </NavLink>
          ))
        : null}
    </div>
  )
}

const managementItems: Array<{
  key: string
  icon: string
  label: string
  linked?: boolean
}> = [
  {
    key: 'stores',
    icon: 'building-2-line',
    label: 'Store management',
    linked: true,
  },
  { key: 'settings', icon: 'settings-3-line', label: 'Settings' },
  { key: 'users', icon: 'group-line', label: 'Users & Roles' },
]

/** Top bar height — sidebar sits below it */
const TOPBAR_H = 80

export function Sidebar({
  collapsed = false,
  onToggle: _onToggle,
  className,
  ...rest
}: SidebarProps) {
  return (
    <aside
      className={cn(
        'fixed bottom-0 left-0 z-20 flex flex-col bg-vpos-dark text-white transition-[width] duration-200 ease-out',
        // overflow visible when collapsed so flyouts can paint outside
        collapsed ? 'w-[72px] overflow-visible' : 'w-[248px] overflow-hidden',
        className,
      )}
      style={{ top: TOPBAR_H }}
      {...rest}
    >
      <nav
        className={cn(
          'flex flex-1 flex-col py-3',
          collapsed
            ? 'items-center gap-1.5 overflow-visible px-0'
            : 'gap-1 overflow-y-auto overflow-x-hidden px-3',
        )}
        aria-label="Primary navigation"
      >
        {navPrimary
          .filter((item) => item.key !== 'products')
          .map((item) => (
            <NavItem
              key={item.key}
              to={keyToPath[item.key] ?? paths.home}
              icon={item.icon}
              label={item.label}
              end={item.key === 'dashboard'}
              collapsed={collapsed}
              hint={navMeta[item.key]?.hint}
            />
          ))}

        <ProductsNavGroup collapsed={collapsed} />

        <StaticNavItem
          icon="line-chart-line"
          label="Sales"
          collapsed={collapsed}
          hint={navMeta.sales?.hint}
        />
        <PurchasesNavGroup collapsed={collapsed} />
        {staticItems
          .filter((item) => item.key !== 'sales')
          .map((item) => (
            <StaticNavItem
              key={item.key}
              icon={item.icon}
              label={item.label}
              collapsed={collapsed}
              hint={navMeta[item.key]?.hint}
            />
          ))}

        <div
          className={cn(
            'my-2 h-px shrink-0 bg-white/10',
            collapsed ? 'w-8' : 'mx-1 w-auto',
          )}
        />

        {!collapsed ? (
          <p className="mb-1 px-3 text-[10px] font-extrabold tracking-[1.2px] text-white/40">
            MANAGEMENT
          </p>
        ) : null}

        {managementItems.map((item) =>
          item.linked ? (
            <NavItem
              key={item.key}
              to={keyToPath[item.key] ?? paths.home}
              icon={item.icon}
              label={item.label}
              collapsed={collapsed}
              hint={navMeta[item.key]?.hint}
            />
          ) : (
            <StaticNavItem
              key={item.key}
              icon={item.icon}
              label={item.label}
              collapsed={collapsed}
              hint={navMeta[item.key]?.hint}
            />
          ),
        )}
      </nav>
    </aside>
  )
}
