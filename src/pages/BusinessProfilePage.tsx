import { useEffect } from 'react'
import { BusinessBrandForm } from '../components/business/BusinessBrandForm'
import { PosConfigurationForm } from '../components/business/PosConfigurationForm'
import { Breadcrumb, Icon, StoreSwitcher, Topbar } from '../components'
import { useAuth } from '../context/AuthContext'
import { useStores } from '../features/stores/useStores'
import { useAdminStore } from '../hooks/useAdminStore'
import { card, pageContent } from '../lib/ui'

export function BusinessProfilePage() {
  const { user, updateBusinessSettings } = useAuth()
  const { storeId, setStoreId, sidebar } = useAdminStore()
  const { data: stores = [] } = useStores()

  useEffect(() => {
    if (sidebar.config.position !== 'fixed') sidebar.updateConfig({ position: 'fixed' })
  }, [sidebar.updateConfig])

  return (
    <>
      <Topbar title="Business profile" subtitle="Control the identity your staff sees throughout the workspace." actions={<StoreSwitcher value={storeId} onChange={setStoreId} />} />
      <main className={pageContent}>
        <section className="mb-6"><Breadcrumb items={[{ label: 'Settings' }, { label: 'Business profile' }]} /></section>
        <section className={`${card} overflow-hidden p-0`}>
          <div className="border-b border-vpos-line bg-[linear-gradient(105deg,#f5faf8,white_62%)] px-6 py-6 sm:px-7">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3"><span className="grid h-12 w-12 place-items-center overflow-hidden rounded-xl bg-vpos-primary text-[22px] text-white">{user?.business.logoUrl ? <img src={user.business.logoUrl} alt="Current business logo" className="h-full w-full object-cover" /> : <Icon name="store-3-fill" />}</span><span><h2 className="m-0 text-[19px] font-extrabold text-vpos-text">Business identity</h2><p className="mt-1 mb-0 text-[13px] text-vpos-muted">Name and logo are reused in the left navigation.</p></span></div>
              <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-vpos-green-bg px-3 py-1.5 text-[12px] font-bold text-vpos-green"><Icon name="checkbox-circle-line" /> Workspace owner</span>
            </div>
          </div>
          <div className="p-6 sm:p-7"><BusinessBrandForm /></div>
        </section>
        {user ? (
          <section className={`${card} mt-5 overflow-hidden p-0`}>
            <div className="border-b border-vpos-line bg-vpos-subtle/45 px-6 py-5 sm:px-7">
              <h2 className="m-0 text-[17px] font-extrabold text-vpos-text">POS and currency</h2>
              <p className="mt-1 mb-0 text-[13px] text-vpos-muted">Set the register currency, exchange rate, payment methods, and checkout behavior.</p>
            </div>
            <div className="p-5 sm:p-7">
              <PosConfigurationForm business={user.business} stores={stores} updateBusinessSettings={updateBusinessSettings} />
            </div>
          </section>
        ) : null}
        <section className={`${card} mt-5 overflow-hidden p-0`}>
          <div className="border-b border-vpos-line bg-vpos-subtle/45 px-6 py-5 sm:px-7">
            <h2 className="m-0 text-[17px] font-extrabold text-vpos-text">Workspace layout</h2>
            <p className="mt-1 mb-0 text-[13px] text-vpos-muted">Keep the POS order panel visible while you browse the menu.</p>
          </div>
          <div className="grid gap-3 p-6 sm:grid-cols-2 sm:p-7">
            <button
              type="button"
              onClick={() => sidebar.updateConfig({ position: 'fixed' })}
              className={`rounded-xl border p-4 text-left transition-colors ${sidebar.config.position === 'fixed' ? 'border-vpos-primary bg-vpos-sand' : 'border-vpos-line bg-white hover:border-vpos-primary/45'}`}
              aria-pressed={sidebar.config.position === 'fixed'}
            >
              <span className="flex items-center justify-between gap-3">
                <strong className="text-[14px] text-vpos-text">Fixed</strong>
                {sidebar.config.position === 'fixed' ? <Icon name="checkbox-circle-fill" className="text-vpos-primary" /> : null}
              </span>
              <span className="mt-1 block text-[12px] leading-relaxed text-vpos-muted">Recommended for POS. The navigation and order panel stay anchored while the page scrolls.</span>
            </button>
            <button
              type="button"
              onClick={() => sidebar.updateConfig({ position: 'scrollable' })}
              className={`rounded-xl border p-4 text-left transition-colors ${sidebar.config.position === 'scrollable' ? 'border-vpos-primary bg-vpos-sand' : 'border-vpos-line bg-white hover:border-vpos-primary/45'}`}
              aria-pressed={sidebar.config.position === 'scrollable'}
            >
              <span className="flex items-center justify-between gap-3">
                <strong className="text-[14px] text-vpos-text">Scrollable</strong>
                {sidebar.config.position === 'scrollable' ? <Icon name="checkbox-circle-fill" className="text-vpos-primary" /> : null}
              </span>
              <span className="mt-1 block text-[12px] leading-relaxed text-vpos-muted">Let the navigation move with the page content.</span>
            </button>
          </div>
        </section>
      </main>
    </>
  )
}
