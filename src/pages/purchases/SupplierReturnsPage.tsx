import { useMemo, useState } from 'react'
import {
  Breadcrumb,
  Button,
  DataTable,
  Icon,
  MetricCard,
  Status,
  StoreSwitcher,
  Topbar,
  type DataTableColumn,
} from '../../components'
import { PurchasesSubnav } from '../../components/purchases/PurchasesSubnav'
import {
  money,
  supplierReturns,
  type SupplierReturn,
} from '../../data/purchases-mockup'
import { useAdminStore } from '../../hooks/useAdminStore'
import { cn } from '../../lib/cn'
import { paths } from '../../lib/paths'
import { pageContent, selectClass } from '../../lib/ui'

export function SupplierReturnsPage() {
  const { storeId, setStoreId } = useAdminStore()
  const [status, setStatus] = useState('All status')

  const baseRows = useMemo(() => {
    if (status === 'All status') return supplierReturns
    return supplierReturns.filter((r) => r.status === status)
  }, [status])

  const pending = supplierReturns.filter((r) => r.status === 'Pending').length
  const value = supplierReturns.reduce((s, r) => s + r.total, 0)

  const columns: DataTableColumn<SupplierReturn>[] = useMemo(
    () => [
      {
        id: 'ref',
        header: 'Return #',
        searchable: (r) => r.ref,
        cell: (r) => (
          <strong className="text-vpos-primary">{r.ref}</strong>
        ),
      },
      {
        id: 'supplier',
        header: 'Supplier',
        searchable: (r) => r.supplierName,
        cell: (r) => r.supplierName,
      },
      {
        id: 'store',
        header: 'Store',
        searchable: (r) => r.store,
        hideOnMobile: true,
        cell: (r) => r.store,
      },
      {
        id: 'date',
        header: 'Date',
        cell: (r) => r.date,
      },
      {
        id: 'items',
        header: 'Items',
        cell: (r) => r.items,
      },
      {
        id: 'total',
        header: 'Value',
        cell: (r) => <strong>{money(r.total)}</strong>,
      },
      {
        id: 'reason',
        header: 'Reason',
        searchable: (r) => r.reason,
        className: 'max-w-[200px] whitespace-normal',
        cell: (r) => r.reason,
      },
      {
        id: 'status',
        header: 'Status',
        searchable: (r) => r.status,
        cell: (r) => <Status value={r.status} />,
      },
      {
        id: 'actions',
        header: '',
        cell: () => <Button variant="text">View</Button>,
      },
    ],
    [],
  )

  return (
    <>
      <Topbar
        title="Purchases"
        subtitle="Return damaged or incorrect stock to suppliers"
        actions={<StoreSwitcher value={storeId} onChange={setStoreId} />}
      />
      <main className={pageContent}>
        <section className="mb-5 flex min-h-12 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1">
            <Breadcrumb
              items={[
                { label: 'Purchases', to: paths.purchases },
                { label: 'Supplier returns' },
              ]}
            />
          </div>
          <div className="flex shrink-0 flex-wrap gap-2.5">
            <Button variant="primary">
              <Icon name="add-line" /> New return
            </Button>
          </div>
        </section>

        <PurchasesSubnav />

        <section className="mb-[18px] grid grid-cols-1 gap-[18px] sm:grid-cols-2 xl:grid-cols-3">
          <MetricCard
            label="Open returns"
            value={String(pending)}
            trend="Awaiting approval"
            trendAs="small"
            icon={<Icon name="arrow-go-back-line" />}
            iconTone="warning"
          />
          <MetricCard
            label="All returns"
            value={String(supplierReturns.length)}
            trend="Demo records"
            trendAs="small"
            icon={<Icon name="file-list-line" />}
            iconTone="primary"
          />
          <MetricCard
            label="Return value"
            value={money(value)}
            trend="Listed returns"
            trendAs="small"
            icon={<Icon name="funds-line" />}
            iconTone="primary"
          />
        </section>

        <DataTable
          data={baseRows}
          columns={columns}
          rowKey={(r) => r.id}
          title="Supplier returns"
          searchPlaceholder="Search return #, supplier, reason…"
          pageSize={10}
          emptyMessage="No returns match your filters."
          toolbar={
            <select
              className={cn(selectClass)}
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option>All status</option>
              <option>Pending</option>
              <option>Approved</option>
              <option>Shipped</option>
              <option>Completed</option>
              <option>Rejected</option>
            </select>
          }
        />
      </main>
    </>
  )
}
