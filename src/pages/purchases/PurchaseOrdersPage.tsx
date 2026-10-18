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
import { usePurchaseOrders, useSuppliers } from '../../features/purchases/usePurchases'
import {
  isReceivable,
  orderStatusLabel,
  supplierIsActive,
  type PurchaseOrder,
  type PurchaseOrderStatus,
} from '../../features/purchases/types'
import { useStoresRaw } from '../../features/stores/useStores'
import { useAdminStore } from '../../hooks/useAdminStore'
import { formatCurrency } from '../../lib/currency'
import { paths } from '../../lib/paths'
import { pageContent } from '../../lib/ui'

const STATUSES: PurchaseOrderStatus[] = ['DRAFT', 'ORDERED', 'PARTIAL', 'RECEIVED', 'CLOSED', 'CANCELLED']

/** Totals per currency, e.g. "$120.00 + ៛ 40,000". */
function sumByCurrency(orders: PurchaseOrder[]): string {
  const totals = new Map<string, number>()
  orders.forEach((order) => totals.set(order.currencyCode, (totals.get(order.currencyCode) ?? 0) + order.totalCost))
  if (totals.size === 0) return formatCurrency(0, 'USD')
  return Array.from(totals, ([currency, total]) => formatCurrency(total, currency)).join(' + ')
}

export function PurchaseOrdersPage() {
  const navigate = useNavigate()
  const { storeId, setStoreId } = useAdminStore()
  const [status, setStatus] = useState<PurchaseOrderStatus | ''>('')
  const ordersQuery = usePurchaseOrders(Number(storeId) || undefined)
  const suppliersQuery = useSuppliers()
  const storesQuery = useStoresRaw()
  const orders = useMemo(() => ordersQuery.data ?? [], [ordersQuery.data])
  const storeNames = useMemo(() => new Map((storesQuery.data ?? []).map((store) => [store.id, store.name])), [storesQuery.data])

  const rows = useMemo(() => (status ? orders.filter((order) => order.status === status) : orders), [orders, status])
  const openOrders = orders.filter((order) => order.status === 'DRAFT' || isReceivable(order))
  const onOrder = orders.filter(isReceivable)
  const received = orders.filter((order) => order.status === 'RECEIVED')
  const activeSuppliers = (suppliersQuery.data ?? []).filter(supplierIsActive).length

  const columns: DataTableColumn<PurchaseOrder>[] = useMemo(
    () => [
      { id: 'ref', header: 'PO #', searchable: (po) => po.poNumber, cell: (po) => <strong className="text-vpos-primary">{po.poNumber}</strong> },
      { id: 'supplier', header: 'Supplier', searchable: (po) => po.supplierName, cell: (po) => po.supplierName },
      {
        id: 'store',
        header: 'Store',
        searchable: (po) => storeNames.get(po.storeId) ?? '',
        hideOnMobile: true,
        cell: (po) => storeNames.get(po.storeId) ?? `Store #${po.storeId}`,
      },
      { id: 'orderDate', header: 'Order date', hideOnMobile: true, cell: (po) => po.orderDate },
      { id: 'expected', header: 'Expected', cell: (po) => po.expectedDate || '—' },
      { id: 'units', header: 'Received', cell: (po) => `${po.unitsReceived} / ${po.unitsOrdered}` },
      { id: 'total', header: 'Total', cell: (po) => <strong>{formatCurrency(po.totalCost, po.currencyCode)}</strong> },
      { id: 'status', header: 'Status', searchable: (po) => orderStatusLabel(po.status), cell: (po) => <Status value={orderStatusLabel(po.status)} /> },
      {
        id: 'actions',
        header: '',
        cell: (po) => (
          <div className="flex gap-1">
            <Button variant="text" onClick={() => navigate(paths.purchaseOrder(String(po.id)))}>View</Button>
            {isReceivable(po) ? (
              <Button variant="text" onClick={() => navigate(`${paths.purchaseReceive}?po=${po.id}`)}>Receive</Button>
            ) : null}
          </div>
        ),
      },
    ],
    [navigate, storeNames],
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
            <Breadcrumb items={[{ label: 'Purchases', to: paths.purchases }, { label: 'Purchase orders' }]} />
          </div>
          <div className="flex shrink-0 flex-wrap gap-2.5">
            <Button variant="secondary" onClick={() => navigate(paths.purchaseReceive)}>
              <Icon name="inbox-unarchive-line" /> Receive goods
            </Button>
            <Button variant="primary" onClick={() => navigate(paths.purchaseOrderNew)}>
              <Icon name="add-line" /> New purchase order
            </Button>
          </div>
        </section>

        <PurchasesSubnav />

        {ordersQuery.isError ? (
          <p className="mb-4 rounded-lg border border-vpos-red/25 bg-vpos-red-bg px-3 py-2.5 text-[13px] text-vpos-red">
            {ordersQuery.error instanceof Error ? ordersQuery.error.message : 'Purchase orders could not be loaded.'}
          </p>
        ) : null}

        <section className="mb-[18px] grid grid-cols-1 gap-[18px] sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Open orders" value={String(openOrders.length)} trend="Draft, ordered and partly received" trendAs="small" icon={<Icon name="file-list-3-line" />} iconTone="primary" />
          <MetricCard label="On-order value" value={sumByCurrency(onOrder)} trend="Waiting for delivery" trendAs="small" icon={<Icon name="funds-line" />} iconTone="primary" />
          <MetricCard label="Received" value={String(received.length)} trend="Fully received orders" trendAs="small" icon={<Icon name="checkbox-circle-line" />} iconTone="primary" />
          <MetricCard label="Suppliers" value={String(activeSuppliers)} trend="Active suppliers" trendAs="small" icon={<Icon name="truck-line" />} iconTone="primary" />
        </section>

        <DataTable
          data={rows}
          columns={columns}
          rowKey={(po) => String(po.id)}
          title="Purchase orders"
          searchPlaceholder="Search PO, supplier, store…"
          pageSize={10}
          emptyMessage={ordersQuery.isLoading ? 'Loading purchase orders…' : 'No purchase orders yet. Create one to order stock from a supplier.'}
          toolbar={
            <Select
              variant="toolbar"
              placeholder="All status"
              value={status}
              onChange={(value) => setStatus(value as PurchaseOrderStatus | '')}
              options={STATUSES.map((value) => ({ value, label: orderStatusLabel(value) }))}
            />
          }
        />
      </main>
    </>
  )
}
