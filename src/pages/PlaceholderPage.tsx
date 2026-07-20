import { Breadcrumb, StoreSwitcher, Topbar } from '../components'
import { useAdminStore } from '../hooks/useAdminStore'
import { pageContent } from '../lib/ui'

export function PlaceholderPage({
  title,
  description,
}: {
  title: string
  description?: string
}) {
  const { storeId, setStoreId } = useAdminStore()

  return (
    <>
      <Topbar
        title={title}
        subtitle={description ?? 'Coming soon — scaffolded route.'}
        actions={<StoreSwitcher value={storeId} onChange={setStoreId} />}
      />
      <main className={pageContent}>
        <section className="mb-6">
          <Breadcrumb items={[{ label: title }]} />
        </section>
        <div className="rounded-[14px] border border-vpos-line bg-white p-8 shadow-vpos">
          <p className="m-0 text-[13px] text-vpos-muted">
            This route is registered. Wire the full screen here when ready.
          </p>
        </div>
      </main>
    </>
  )
}
