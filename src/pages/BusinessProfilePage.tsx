import { BusinessBrandForm } from '../components/business/BusinessBrandForm'
import { Breadcrumb, Icon, StoreSwitcher, Topbar } from '../components'
import { useAuth } from '../context/AuthContext'
import { useAdminStore } from '../hooks/useAdminStore'
import { card, pageContent } from '../lib/ui'

export function BusinessProfilePage() {
  const { user } = useAuth()
  const { storeId, setStoreId } = useAdminStore()

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
      </main>
    </>
  )
}
