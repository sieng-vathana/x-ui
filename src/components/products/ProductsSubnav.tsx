import { NavLink } from 'react-router-dom'
import { cn } from '../../lib/cn'
import { paths } from '../../lib/paths'
import { useAuth } from '../../context/AuthContext'

const items: Array<{ to: string; label: string; end?: boolean; permission?: string }> = [
  { to: paths.products, label: 'All products', end: true },
  { to: paths.productUnits, label: 'Units', permission: 'x-product:unit' },
  { to: paths.productBrands, label: 'Brands', permission: 'x-product:brand' },
  { to: paths.productCategories, label: 'Categories', permission: 'x-product:category' },
  { to: paths.productOptions, label: 'Options' },
  { to: paths.productStockMovement, label: 'Stock movement' },
  { to: paths.productLowStock, label: 'Low stock' },
]

export function ProductsSubnav() {
  const { user } = useAuth()
  const visibleItems = items.filter(
    (item) => !item.permission || user?.permissions.includes(item.permission),
  )

  return (
    <div className="mb-5 flex flex-wrap gap-1.5 rounded-[4px] border border-vpos-line bg-white p-1.5 shadow-vpos">
      {visibleItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) =>
            cn(
              'rounded-[4px] border-0 bg-transparent px-3.5 py-2 text-[13px] font-semibold no-underline transition-colors',
              isActive
                ? 'bg-vpos-sand text-vpos-primary-2'
                : 'text-vpos-muted hover:bg-vpos-subtle hover:text-vpos-text',
            )
          }
        >
          {item.label}
        </NavLink>
      ))}
    </div>
  )
}
