import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
import {
  money,
  poTotal,
  purchaseOrders,
  type PoStatus,
  type PurchaseOrder,
} from '../../data/purchases-mockup'
import { useAdminStore } from '../../hooks/useAdminStore'
import { paths } from '../../lib/paths'
import { pageContent } from '../../lib/ui'

const STATUSES: Array<PoStatus | 'All status'> = [
  'All status',
  'Draft',
  'Ordered',
  'Partial',
  'Received',
  'Closed',
  'Cancelled',
]

export function PurchaseOrdersPage() {
  const navigate = useNavigate()
  const { storeId, setStoreId } = useAdminStore()
  const [status, setStatus] = useState<(typeof STATUSES)[number]>('All status')

  const baseRows = useMemo(() => {
    if (status === 'All status') return purchaseOrders
    return purchaseOrders.filter((po) => po.status === status)
  }, [status])

  const openCount = purchaseOrders.filter(
    (p) =>
      p.status === 'Ordered' || p.status === 'Partial' || p.status === 'Draft',
  ).length
  const orderedValue = purchaseOrders
    .filter((p) => p.status === 'Ordered' || p.status === 'Partial')
    .reduce((s, p) => s + poTotal(p), 0)
  const receivedMonth = purchaseOrders.filter(
    (p) => p.status === 'Received',
  ).length

  const columns: DataTableColumn<PurchaseOrder>[] = useMemo(
    () => [
      {
        id: 'ref',
        header: 'PO #',
        searchable: (po) => po.ref,
        cell: (po) => (
          <strong className="text-vpos-primary">{po.ref}</strong>
        ),
      },
      {
        id: 'supplier',
        header: 'Supplier',
        searchable: (po) => po.supplierName,
        cell: (po) => po.supplierName,
      },
      {
        id: 'store',
        header: 'Store',
        searchable: (po) => po.store,
        hideOnMobile: true,
        cell: (po) => po.store,
      },
      {
        id: 'orderDate',
        header: 'Order date',
        hideOnMobile: true,
        cell: (po) => po.orderDate,
      },
      {
        id: 'expected',
        header: 'Expected',
        cell: (po) => po.expectedDate,
      },
      {
        id: 'lines',
        header: 'Lines',
        cell: (po) => po.lines.length,
      },
      {
        id: 'total',
        header: 'Total',
        cell: (po) => <strong>{money(poTotal(po))}</strong>,
      },
      {
        id: 'status',
        header: 'Status',
        searchable: (po) => po.status,
        cell: (po) => <Status value={po.status} />,
      },
      {
        id: 'actions',
        header: '',
        cell: (po) => (
          <div className="flex gap-1">
            <Button
              variant="text"
              onClick={() => navigate(paths.purchaseOrder(po.id))}
            >
              View
            </Button>
            {(po.status === 'Ordered' || po.status === 'Partial') && (
              <Button
                variant="text"
                onClick={() =>
                  navigate(
                    `${paths.purchaseReceive}?po=${encodeURIComponent(po.id)}`,
                  )
                }
              >
                Receive
              </Button>
            )}
          </div>
        ),
      },
    ],
    [navigate],
  )

  return (
    <>
      <Topbar
        title="Purchases"
        subtitle="Supplier orders, receiving, and vendor management"
        actions={<StoreSwitcher value={storeId} onChange={setStoreId} />}
      />
      <main className={pageContent}>
        <section className="mb-5 flex min-h-12 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1">
            <Breadcrumb
              items={[
                { label: 'Purchases', to: paths.purchases },
                { label: 'Purchase orders' },
              ]}
            />
          </div>
          <div className="flex shrink-0 flex-wrap gap-2.5">
            <Button
              variant="secondary"
              onClick={() => navigate(paths.purchaseReceive)}
            >
              <Icon name="inbox-unarchive-line" /> Receive goods
            </Button>
            <Button
              variant="primary"
              onClick={() => navigate(paths.purchaseOrderNew)}
            >
              <Icon name="add-line" /> New purchase order
            </Button>
          </div>
        </section>

        <PurchasesSubnav />

        <section className="mb-[18px] grid grid-cols-1 gap-[18px] sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Open orders"
            value={String(openCount)}
            trend="Draft + ordered + partial"
            trendAs="small"
            icon={<Icon name="file-list-3-line" />}
            iconTone="primary"
          />
          <MetricCard
            label="On-order value"
            value={money(orderedValue)}
            trend="Awaiting receipt"
            trendAs="small"
            icon={<Icon name="funds-line" />}
            iconTone="primary"
          />
          <MetricCard
            label="Received"
            value={String(receivedMonth)}
            trend="Fully received POs"
            trendAs="small"
            icon={<Icon name="checkbox-circle-line" />}
            iconTone="primary"
          />
          <MetricCard
            label="Suppliers"
            value="4"
            trend="Active vendors"
            trendAs="small"
            icon={<Icon name="truck-line" />}
            iconTone="primary"
          />
        </section>

        <DataTable
          data={baseRows}
          columns={columns}
          rowKey={(po) => po.id}
          title="Purchase orders"
          searchPlaceholder="Search PO, supplier, store…"
          pageSize={5}
          emptyMessage="No purchase orders match your filters."
          toolbar={
            <Select
              variant="toolbar"
              placeholder="All status"
              value={status === 'All status' ? '' : status}
              onChange={(v) =>
                setStatus((v || 'All status') as (typeof STATUSES)[number])
              }
              options={STATUSES.filter((s) => s !== 'All status').map((s) => ({
                value: s,
                label: s,
              }))}
            />
          }
        />
      </main>
    </>
  )
}
