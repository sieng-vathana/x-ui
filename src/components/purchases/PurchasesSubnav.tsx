import { NavLink } from 'react-router-dom'
import { cn } from '../../lib/cn'
import { paths } from '../../lib/paths'

const items: Array<{ to: string; label: string; end?: boolean }> = [
  { to: paths.purchases, label: 'Purchase orders', end: true },
  { to: paths.purchaseReceive, label: 'Receive goods' },
  { to: paths.purchaseSuppliers, label: 'Suppliers' },
  { to: paths.purchaseReturns, label: 'Supplier returns' },
]

export function PurchasesSubnav() {
  return (
    <div className="mb-[18px] flex flex-wrap gap-1 border-b border-vpos-line">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) =>
            cn(
              '-mb-px rounded-t-lg border-0 border-b-2 bg-transparent px-3.5 py-3 text-[12px] font-bold no-underline transition-colors',
              isActive
                ? 'border-vpos-primary text-vpos-dark'
                : 'border-transparent text-vpos-muted hover:text-vpos-text',
            )
          }
        >
          {item.label}
        </NavLink>
      ))}
    </div>
  )
}
