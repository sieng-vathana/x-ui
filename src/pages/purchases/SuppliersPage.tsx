import { useMemo, useState } from 'react'
import {
  Breadcrumb,
  Button,
  DataTable,
  Icon,
  MetricCard,
  Select,
  Status,
  StoreSwitcher,
  Topbar,
  type DataTableColumn,
} from '../../components'
import { PurchasesSubnav } from '../../components/purchases/PurchasesSubnav'
import { money, suppliers, type Supplier } from '../../data/purchases-mockup'
import { useAdminStore } from '../../hooks/useAdminStore'
import { paths } from '../../lib/paths'
import { pageContent } from '../../lib/ui'

export function SuppliersPage() {
  const { storeId, setStoreId } = useAdminStore()
  const [status, setStatus] = useState('All status')

  const baseRows = useMemo(() => {
    if (status === 'All status') return suppliers
    return suppliers.filter((s) => s.status === status)
  }, [status])

  const active = suppliers.filter((s) => s.status === 'Active').length
  const openOrders = suppliers.reduce((n, s) => n + s.openOrders, 0)
  const spend = suppliers.reduce((n, s) => n + s.totalSpend, 0)

  const columns: DataTableColumn<Supplier>[] = useMemo(
    () => [
      {
        id: 'name',
        header: 'Supplier',
        searchable: (s) => `${s.name} ${s.email}`,
        cell: (s) => (
          <>
            <strong className="block">{s.name}</strong>
            <small className="text-[11px] text-vpos-muted">{s.email}</small>
          </>
        ),
      },
      {
        id: 'contact',
        header: 'Contact',
        searchable: (s) => s.contact,
        cell: (s) => s.contact,
      },
      {
        id: 'phone',
        header: 'Phone',
        searchable: (s) => s.phone,
        hideOnMobile: true,
        cell: (s) => s.phone,
      },
      {
        id: 'city',
        header: 'City',
        searchable: (s) => s.city,
        cell: (s) => s.city,
      },
      {
        id: 'terms',
        header: 'Terms',
        hideOnMobile: true,
        cell: (s) => s.paymentTerms,
      },
      {
        id: 'products',
        header: 'Products',
        cell: (s) => s.products,
      },
      {
        id: 'open',
        header: 'Open POs',
        cell: (s) => s.openOrders,
      },
      {
        id: 'spend',
        header: 'Spend',
        cell: (s) => <strong>{money(s.totalSpend)}</strong>,
      },
      {
        id: 'status',
        header: 'Status',
        searchable: (s) => s.status,
        cell: (s) => <Status value={s.status} />,
      },
      {
        id: 'actions',
        header: '',
        cell: () => <Button variant="text">Edit</Button>,
      },
    ],
    [],
  )

  return (
    <>
      <Topbar
        title="Purchases"
        subtitle="Supplier directory and purchase history"
        actions={<StoreSwitcher value={storeId} onChange={setStoreId} />}
      />
      <main className={pageContent}>
        <section className="mb-5 flex min-h-12 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1">
            <Breadcrumb
              items={[
                { label: 'Purchases', to: paths.purchases },
                { label: 'Suppliers' },
              ]}
            />
          </div>
          <div className="flex shrink-0 flex-wrap gap-2.5">
            <Button variant="secondary">Import</Button>
            <Button variant="primary">
              <Icon name="add-line" /> Add supplier
            </Button>
          </div>
        </section>

        <PurchasesSubnav />

        <section className="mb-[18px] grid grid-cols-1 gap-[18px] sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Suppliers"
            value={String(suppliers.length)}
            trend={`${active} active`}
            trendAs="small"
            icon={<Icon name="truck-line" />}
            iconTone="primary"
          />
          <MetricCard
            label="Open POs"
            value={String(openOrders)}
            trend="Across all vendors"
            trendAs="small"
            icon={<Icon name="file-list-3-line" />}
            iconTone="primary"
          />
          <MetricCard
            label="Total spend"
            value={money(spend)}
            trend="Year-to-date (demo)"
            trendAs="small"
            icon={<Icon name="funds-line" />}
            iconTone="primary"
          />
          <MetricCard
            label="Inactive"
            value={String(suppliers.length - active)}
            trend="Not ordering"
            trendAs="small"
            icon={<Icon name="user-unfollow-line" />}
            iconTone="warning"
          />
        </section>

        <DataTable
          data={baseRows}
          columns={columns}
          rowKey={(s) => s.id}
          title="Suppliers"
          searchPlaceholder="Search supplier, contact, city…"
          pageSize={10}
          emptyMessage="No suppliers match your filters."
          toolbar={
            <Select
              variant="toolbar"
              placeholder="All status"
              value={status === 'All status' ? '' : status}
              onChange={(v) => setStatus(v || 'All status')}
              options={[
                { value: 'Active', label: 'Active' },
                { value: 'Inactive', label: 'Inactive' },
              ]}
            />
          }
        />
      </main>
    </>
  )
}
