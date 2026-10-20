import { NavLink } from 'react-router-dom'
import { cn } from '../../lib/cn'
import { paths } from '../../lib/paths'
import { useAdminStore } from '../../hooks/useAdminStore'
import { useStoresRaw } from '../../features/stores/useStores'
import { storeSupportsOnline, storeSupportsPos } from '../../features/stores/salesChannel'

const items: Array<{ to: string; label: string; end?: boolean; channel?: 'ONLINE' | 'POS' }> = [
  { to: paths.sales, label: 'All orders & sales', end: true },
  { to: paths.salesShipments, label: 'Shipments & fulfillment', channel: 'ONLINE' },
  { to: paths.salesPayments, label: 'Payments' },
  { to: paths.salesReturns, label: 'Returns & refunds' },
  { to: paths.salesCashRegister, label: 'Cash register', channel: 'POS' },
]

export function SalesSubnav() {
  const { storeId } = useAdminStore()
  const storesQuery = useStoresRaw()
  const selectedStore = storesQuery.data?.find((store) => String(store.id) === String(storeId))
  const canUseOnline = storeSupportsOnline(selectedStore?.salesChannel)
  const canUsePos = storeSupportsPos(selectedStore?.salesChannel)
  const visibleItems = items.filter((item) => item.channel !== 'ONLINE' || canUseOnline)
    .filter((item) => item.channel !== 'POS' || canUsePos)

  return (
    <div className="mb-5 flex flex-wrap gap-1.5 rounded-[4px] border border-vpos-line bg-white p-1.5 shadow-vpos">
      {visibleItems.map((item) => (
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
