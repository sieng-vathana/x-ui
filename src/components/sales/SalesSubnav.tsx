import { NavLink } from 'react-router-dom'
import { cn } from '../../lib/cn'
import { paths } from '../../lib/paths'

const items: Array<{ to: string; label: string; end?: boolean }> = [
  { to: paths.sales, label: 'All sales', end: true },
  { to: paths.salesPayments, label: 'Payments' },
  { to: paths.salesReturns, label: 'Returns & refunds' },
  { to: paths.salesCashRegister, label: 'Cash register' },
]

export function SalesSubnav() {
  return (
    <div className="mb-5 flex flex-wrap gap-1.5 rounded-[4px] border border-vpos-line bg-white p-1.5 shadow-vpos">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) => cn(
            'rounded-[4px] border-0 bg-transparent px-3.5 py-2 text-[13px] font-semibold no-underline transition-colors',
            isActive
              ? 'bg-vpos-sand text-vpos-primary-2'
              : 'text-vpos-muted hover:bg-vpos-subtle hover:text-vpos-text',
          )}
        >
          {item.label}
        </NavLink>
      ))}
    </div>
  )
}
