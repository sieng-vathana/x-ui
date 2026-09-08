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
} from '../components'
import { SalesSubnav } from '../components/sales/SalesSubnav'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useStoresRaw } from '../features/stores/useStores'
import { useAdminStore } from '../hooks/useAdminStore'
import {
  useDeliveries,
  useUpdateDeliveryStatus,
} from '../features/deliveries/useDeliveries'
import type { Delivery, DeliveryStatus } from '../features/deliveries/types'
import { CodRemittanceModal } from '../components/deliveries/CodRemittanceModal'
import { OrderDetailModal } from '../components/orders/OrderDetailModal'
import { useOrder } from '../features/orders/useOrders'
import { formatCurrency } from '../lib/currency'
import { pageContent } from '../lib/ui'

const statusOptions = [
  'All status',
  'BOOKING',
  'ASSIGNED',
  'PICKED_UP',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'RETURNED',
  'CANCELLED',
] as const

const providerOptions = ['All providers', 'GRAB', 'VIREAK_BUNTHAM', 'OWN_RIDER'] as const

export function ShipmentsPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const { storeId, setStoreId } = useAdminStore()
  const storesQuery = useStoresRaw()

  const [statusFilter, setStatusFilter] = useState<(typeof statusOptions)[number]>('All status')
  const [providerFilter, setProviderFilter] = useState<(typeof providerOptions)[number]>('All providers')

  const [selectedDeliveryForRemittance, setSelectedDeliveryForRemittance] = useState<Delivery | null>(null)
  const [viewOrderId, setViewOrderId] = useState<number | null>(null)

  const selectedStore = storesQuery.data?.find((store) => String(store.id) === String(storeId))
  const currency = (user?.business.defaultCurrencyCode || 'USD').toUpperCase()

  const deliveriesQuery = useDeliveries({
    storeId: storeId ? Number(storeId) : undefined,
    status: statusFilter === 'All status' ? undefined : statusFilter,
    providerType: providerFilter === 'All providers' ? undefined : providerFilter,
    size: 100,
  })

  const updateStatusMutation = useUpdateDeliveryStatus()
  const orderDetailQuery = useOrder(viewOrderId ?? undefined, Boolean(viewOrderId))

  const deliveries = useMemo(() => deliveriesQuery.data?.content ?? [], [deliveriesQuery.data])

  const activeCount = deliveries.filter((d) =>
    ['BOOKING', 'ASSIGNED', 'PICKED_UP', 'OUT_FOR_DELIVERY'].includes(d.status),
  ).length

  const deliveredCount = deliveries.filter((d) => d.status === 'DELIVERED').length

  const unremittedCod = deliveries
    .filter((d) => d.status === 'DELIVERED' && Number(d.codAmount || 0) > 0 && !d.remittedAt)
    .reduce((sum, d) => sum + Number(d.codAmount || 0), 0)

  const handleNextStatus = async (delivery: Delivery) => {
    let nextStatus: DeliveryStatus | null = null
    if (delivery.status === 'BOOKING' || delivery.status === 'PENDING_ASSIGNMENT') nextStatus = 'ASSIGNED'
    else if (delivery.status === 'ASSIGNED') nextStatus = 'PICKED_UP'
    else if (delivery.status === 'PICKED_UP') nextStatus = 'OUT_FOR_DELIVERY'
    else if (delivery.status === 'OUT_FOR_DELIVERY') nextStatus = 'DELIVERED'

    if (!nextStatus) return

    try {
      await updateStatusMutation.mutateAsync({
        id: delivery.id,
        status: nextStatus,
      })
      toast(`Shipment updated to ${nextStatus.replace(/_/g, ' ')}`, 'success')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not update shipment status', 'error')
    }
  }

  const columns = useMemo<DataTableColumn<Delivery>[]>(() => [
    {
      id: 'tracking',
      header: 'Tracking / ID',
      searchable: (d) => `${d.trackingNumber || ''} ${d.id} ${d.orderId}`,
      cell: (d) => (
        <div>
          <strong className="text-vpos-primary">
            {d.trackingNumber || `DELIV-#${d.id}`}
          </strong>
          <div className="text-[11px] text-vpos-muted">Order #{d.orderId}</div>
        </div>
      ),
    },
    {
      id: 'provider',
      header: 'Provider',
      cell: (d) => (
        <span className="font-semibold text-vpos-text">
          {d.providerType === 'GRAB' ? 'Grab Express' : d.providerType === 'VIREAK_BUNTHAM' ? 'Vireak Buntham' : 'In-House Rider'}
        </span>
      ),
    },
    {
      id: 'courier',
      header: 'Rider / Courier',
      hideOnMobile: true,
      cell: (d) => (
        <div>
          <div className="font-medium text-vpos-text">{d.riderName || 'Auto-assigning'}</div>
          {d.riderPhone && <div className="text-[11px] text-vpos-muted">{d.riderPhone}</div>}
        </div>
      ),
    },
    {
      id: 'fee',
      header: 'Fee / COD',
      cell: (d) => (
        <div className="text-[13px]">
          <div>Fee: <strong>{formatCurrency(Number(d.deliveryFee || 0), currency)}</strong></div>
          {Number(d.codAmount || 0) > 0 && (
            <div className="text-[11px] font-semibold text-vpos-primary">
              COD: {formatCurrency(Number(d.codAmount || 0), currency)}
              {d.remittedAt ? ' (Paid)' : ' (Due)'}
            </div>
          )}
        </div>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      cell: (d) => <Status value={d.status} />,
    },
    {
      id: 'actions',
      header: '',
      cell: (d) => (
        <div className="flex items-center justify-end gap-1.5">
          {d.status !== 'DELIVERED' && d.status !== 'CANCELLED' && d.status !== 'RETURNED' && (
            <Button
              variant="secondary"
              onClick={() => void handleNextStatus(d)}
              disabled={updateStatusMutation.isPending}
            >
              {d.status === 'OUT_FOR_DELIVERY' ? 'Mark Delivered' : 'Next Step'}
            </Button>
          )}
          {d.status === 'DELIVERED' && Number(d.codAmount || 0) > 0 && !d.remittedAt && (
            <Button
              variant="primary"
              onClick={() => setSelectedDeliveryForRemittance(d)}
            >
              <Icon name="money-dollar-circle-line" /> Remit COD
            </Button>
          )}
          <Button
            variant="text"
            onClick={() => setViewOrderId(d.orderId)}
          >
            <Icon name="eye-line" /> Order
          </Button>
        </div>
      ),
    },
  ], [currency, updateStatusMutation.isPending])

  return (
    <>
      <Topbar
        title="Shipments & Fulfillment"
        subtitle="Manage dispatch, couriers, Grab/VET deliveries, and COD settlements"
        actions={<StoreSwitcher value={storeId} onChange={setStoreId} />}
      />
      <main className={pageContent}>
        <section className="mb-5 flex min-h-12 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Breadcrumb items={[{ label: 'Sales', to: '/sales' }, { label: 'Shipments & fulfillment' }]} />
          <Button variant="secondary" onClick={() => void deliveriesQuery.refetch()}>
            <Icon name="refresh-line" /> Refresh shipments
          </Button>
        </section>

        <SalesSubnav />

        {deliveriesQuery.isError ? (
          <div className="mb-4 rounded-[4px] border border-vpos-red/25 bg-vpos-red-bg p-4 text-[13px] text-vpos-red">
            {deliveriesQuery.error instanceof Error ? deliveriesQuery.error.message : 'Deliveries could not be loaded.'}
          </div>
        ) : null}

        <section className="mb-[18px] grid grid-cols-1 gap-[18px] sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Total Shipments"
            value={String(deliveriesQuery.data?.totalElements ?? deliveries.length)}
            trend="Selected store"
            trendAs="small"
            icon={<Icon name="truck-line" />}
          />
          <MetricCard
            label="Active In-Transit"
            value={String(activeCount)}
            trend="Dispatched"
            trendAs="small"
            icon={<Icon name="motorbike-line" />}
            iconTone={activeCount > 0 ? 'primary' : undefined}
          />
          <MetricCard
            label="Delivered"
            value={String(deliveredCount)}
            trend="Completed delivery"
            trendAs="small"
            icon={<Icon name="checkbox-circle-line" />}
            iconTone="positive"
          />
          <MetricCard
            label="Unremitted COD"
            value={formatCurrency(unremittedCod, currency)}
            trend="Cash pending drawer"
            trendAs="small"
            icon={<Icon name="funds-line" />}
            iconTone={unremittedCod > 0 ? 'warning' : 'positive'}
          />
        </section>

        <DataTable
          data={deliveries}
          columns={columns}
          rowKey={(d) => d.id}
          title="All shipments"
          searchPlaceholder="Search tracking, rider, or order #…"
          pageSize={10}
          isLoading={deliveriesQuery.isLoading}
          emptyMessage="No shipments found for the current filter."
          toolbar={
            <>
              <Select
                variant="toolbar"
                value={statusFilter === 'All status' ? '' : statusFilter}
                onChange={(value) => setStatusFilter((value || 'All status') as (typeof statusOptions)[number])}
                placeholder="All status"
                options={statusOptions.slice(1).map((value) => ({ value, label: value.replace(/_/g, ' ') }))}
              />
              <Select
                variant="toolbar"
                value={providerFilter === 'All providers' ? '' : providerFilter}
                onChange={(value) => setProviderFilter((value || 'All providers') as (typeof providerOptions)[number])}
                placeholder="All providers"
                options={providerOptions.slice(1).map((value) => ({
                  value,
                  label: value === 'GRAB' ? 'Grab Express' : value === 'VIREAK_BUNTHAM' ? 'Vireak Buntham' : 'In-House Rider',
                }))}
              />
            </>
          }
        />

        {/* Modals */}
        <CodRemittanceModal
          delivery={selectedDeliveryForRemittance}
          isOpen={Boolean(selectedDeliveryForRemittance)}
          onClose={() => setSelectedDeliveryForRemittance(null)}
          onSuccess={() => void deliveriesQuery.refetch()}
        />

        {orderDetailQuery.data && (
          <OrderDetailModal
            order={orderDetailQuery.data}
            store={selectedStore}
            isOpen={Boolean(viewOrderId)}
            onClose={() => setViewOrderId(null)}
          />
        )}
      </main>
    </>
  )
}
