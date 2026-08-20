import { Breadcrumb, Icon, StoreSwitcher, Topbar } from '../components'
import { SalesSubnav } from '../components/sales/SalesSubnav'
import { useAdminStore } from '../hooks/useAdminStore'
import { paths } from '../lib/paths'
import { card, pageContent } from '../lib/ui'

export function SalesOperationsPage({ section }: { section: 'returns' | 'cash-register' }) {
  const { storeId, setStoreId } = useAdminStore()
  const returns = section === 'returns'
  const title = returns ? 'Returns & refunds' : 'Cash register'
  const description = returns
    ? 'Review and process customer returns with manager approval.'
    : 'Open, reconcile, and close the cash drawer for each shift.'

  return (
    <>
      <Topbar title={title} subtitle={description} actions={<StoreSwitcher value={storeId} onChange={setStoreId} />} />
      <main className={pageContent}>
        <section className="mb-5"><Breadcrumb items={[{ label: 'Sales', to: paths.sales }, { label: title }]} /></section>
        <SalesSubnav />
        <section className={`${card} p-6`}>
          <div className="flex items-start gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-vpos-sand text-[22px] text-vpos-primary"><Icon name={returns ? 'refund-2-line' : 'safe-2-line'} /></span><div><h2 className="m-0 text-[16px] font-extrabold text-vpos-text">{title}</h2><p className="mt-2 max-w-[680px] text-[13px] leading-6 text-vpos-muted">The navigation and permission boundary are ready. The next backend workflow will add {returns ? 'return reasons, item-level stock reversal, refund method, and manager approval.' : 'opening float, paid-in and paid-out entries, expected cash, counted cash, variance, and shift close.'}</p></div></div>
          <div className="mt-5 rounded-[4px] border border-vpos-line bg-vpos-subtle p-4 text-[12px] leading-5 text-vpos-muted">No operational records are shown until the corresponding {returns ? 'returns/refunds' : 'cash-session'} API is connected. This avoids displaying placeholder financial data.</div>
        </section>
      </main>
    </>
  )
}
