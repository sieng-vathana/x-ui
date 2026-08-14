import { useMemo, useState } from 'react'
import {
  Breadcrumb,
  Button,
  ConfirmModal,
  DataTable,
  Icon,
  Modal,
  Status,
  StoreSwitcher,
  Topbar,
  type DataTableColumn,
} from '../components'
import { CustomerModal } from '../components/customers/CustomerModal'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useStores } from '../features/stores/useStores'
import {
  useCreateCustomer,
  useCustomers,
  useDeactivateCustomer,
  useUpdateCustomer,
} from '../features/customers/useCustomers'
import type { Customer, CustomerAddress, CustomerPayload } from '../features/customers/types'
import { cn } from '../lib/cn'
import { paths } from '../lib/paths'
import { pageContent } from '../lib/ui'

const EMPTY_CUSTOMERS: Customer[] = []

function formatDate(value?: string) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}

function formatCustomerAddress(address: CustomerAddress) {
  return [
    address.streetAddress,
    address.village,
    address.commune,
    address.district,
    address.provinceCity,
  ]
    .filter(Boolean)
    .join(', ')
}

function CustomerDetailsModal({
  customer,
  open,
  onClose,
  storeName,
}: {
  customer: Customer | null
  open: boolean
  onClose: () => void
  storeName?: string
}) {
  if (!customer) return null

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={customer.fullName}
      description={`Customer profile code: ${customer.customerCode}`}
      size="lg"
    >
      <div className="space-y-6">
        {/* Header Profile Badge */}
        <div className="flex items-center gap-4 rounded-xl border border-vpos-line bg-vpos-subtle/50 p-4">
          <div className={cn(
            'grid h-12 w-12 shrink-0 place-items-center rounded-xl text-[22px]',
            customer.id === 0 ? 'bg-vpos-primary text-white' : 'bg-vpos-sand text-vpos-primary'
          )}>
            <Icon name={customer.id === 0 ? 'walk-line' : 'user-3-line'} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="flex items-center gap-2 text-[17px] font-extrabold text-vpos-dark">
              {customer.fullName}
              {customer.id === 0 ? (
                <span className="rounded-full bg-vpos-sand px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-vpos-primary">
                  System Walk-in
                </span>
              ) : null}
            </h3>
            <p className="mt-0.5 text-[12px] font-semibold text-vpos-muted">
              Code: <span className="font-mono text-vpos-dark">{customer.customerCode}</span>
            </p>
          </div>
          <Status value={customer.id === 0 ? 'System' : customer.status === 1 ? 'Active' : 'Inactive'} />
        </div>

        {/* Detailed Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-vpos-line p-3.5">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-vpos-muted">Phone Number</span>
            <div className="mt-1 flex items-center gap-2 text-[14px] font-bold text-vpos-dark">
              <Icon name="phone-line" className="text-vpos-primary" />
              {customer.phone || '—'}
            </div>
          </div>

          <div className="rounded-xl border border-vpos-line p-3.5">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-vpos-muted">Email Address</span>
            <div className="mt-1 flex items-center gap-2 text-[14px] font-bold text-vpos-dark">
              <Icon name="mail-line" className="text-vpos-primary" />
              {customer.email || 'No email provided'}
            </div>
          </div>

          <div className="rounded-xl border border-vpos-line p-3.5">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-vpos-muted">Default Store</span>
            <div className="mt-1 flex items-center gap-2 text-[14px] font-bold text-vpos-dark">
              <Icon name="store-2-line" className="text-vpos-primary" />
              {customer.id === 0 ? 'All Stores (Global Walk-in)' : storeName || 'All Stores'}
            </div>
          </div>

          <div className="rounded-xl border border-vpos-line p-3.5">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-vpos-muted">Gender & DoB</span>
            <div className="mt-1 flex items-center gap-2 text-[14px] font-bold text-vpos-dark">
              <Icon name="user-line" className="text-vpos-primary" />
              {customer.gender || 'Not specified'} {customer.dateOfBirth ? `(${customer.dateOfBirth})` : ''}
            </div>
          </div>
        </div>

        {customer.addresses?.length ? (
          <section>
            <div className="flex items-center justify-between gap-3">
              <div>
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-vpos-muted">Delivery</span>
                <h3 className="mt-1 text-[15px] font-bold text-vpos-dark">Shipping addresses</h3>
              </div>
              <span className="rounded-full bg-vpos-sand px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-vpos-primary">
                {customer.addresses.length} saved
              </span>
            </div>
            <div className="mt-3 space-y-2">
              {customer.addresses.map((address, index) => (
                <div key={address.id ?? `customer-address-${index}`} className="flex items-start gap-3 rounded-xl border border-vpos-line bg-vpos-subtle/35 p-3.5">
                  <Icon name="map-pin-2-line" className="mt-0.5 text-vpos-primary" />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[13px] font-bold text-vpos-dark">{address.addressName || `Address ${index + 1}`}</p>
                      {address.isDefault ? <span className="rounded-full bg-vpos-sand px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-vpos-primary">Default shipping</span> : null}
                    </div>
                    <p className="mt-1 text-[12px] font-semibold text-vpos-text">{address.receiverName} · {address.phone}</p>
                    <p className="mt-0.5 text-[12px] leading-relaxed text-vpos-muted">{formatCustomerAddress(address)}</p>
                    {address.deliveryInstructions ? <p className="mt-1 text-[12px] italic text-vpos-muted">Note: {address.deliveryInstructions}</p> : null}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {/* Note */}
        {customer.note ? (
          <div className="rounded-xl border border-vpos-line bg-amber-50/50 p-4">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-700">Internal Note</span>
            <p className="mt-1 text-[13px] leading-relaxed text-amber-900">{customer.note}</p>
          </div>
        ) : null}

        {/* Action Footer */}
        <div className="flex justify-end pt-2">
          <Button variant="secondary" onClick={onClose}>Close</Button>
        </div>
      </div>
    </Modal>
  )
}

export function CustomersPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const businessId = Number(user?.business.id)
  const { data: customerPage, isLoading, isError } = useCustomers()
  const { data: stores = [] } = useStores()
  const createMutation = useCreateCustomer()
  const updateMutation = useUpdateCustomer()
  const deactivateMutation = useDeactivateCustomer()

  const [modalCustomer, setModalCustomer] = useState<Customer | null | undefined>(undefined)
  const [viewingCustomer, setViewingCustomer] = useState<Customer | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null)

  const storeNames = useMemo(() => new Map(stores.map((store) => [Number(store.id), store.name])), [stores])
  const customers = customerPage?.content ?? EMPTY_CUSTOMERS
  const permissions = user?.permissions ?? []
  const canCreate = permissions.includes('x-customer:create')
  const canUpdate = permissions.includes('x-customer:update')
  const canDelete = permissions.includes('x-customer:delete')
  const isSaving = createMutation.isPending || updateMutation.isPending

  const activeCount = useMemo(() => customers.filter((c) => c.status === 1 || c.id === 0).length, [customers])
  const inactiveCount = useMemo(() => customers.filter((c) => c.status !== 1 && c.id !== 0).length, [customers])

  const saveCustomer = async (payload: CustomerPayload) => {
    try {
      if (modalCustomer) await updateMutation.mutateAsync({ id: modalCustomer.id, payload })
      else await createMutation.mutateAsync(payload)
      setModalCustomer(undefined)
      toast(modalCustomer ? 'Customer updated.' : 'Customer created.', 'success')
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Customer could not be saved.', 'error')
    }
  }

  const deactivateCustomer = async () => {
    if (!deleteTarget) return
    try {
      await deactivateMutation.mutateAsync({ id: deleteTarget.id, businessId })
      setDeleteTarget(null)
      toast('Customer deactivated.', 'success')
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Customer could not be deactivated.', 'error')
    }
  }

  const columns: DataTableColumn<Customer>[] = [
    {
      id: 'customer',
      header: 'Customer',
      searchable: (row) => `${row.fullName} ${row.customerCode}`,
      cell: (row) => (
        <div className="flex min-w-[210px] items-center gap-3">
          <span
            className={cn(
              'grid h-9 w-9 shrink-0 place-items-center rounded-lg text-[16px]',
              row.id === 0 ? 'bg-vpos-primary text-white' : 'bg-vpos-sand text-vpos-primary'
            )}
          >
            <Icon name={row.id === 0 ? 'walk-line' : 'user-3-line'} />
          </span>
          <span className="min-w-0">
            <button
              type="button"
              onClick={() => setViewingCustomer(row)}
              className="flex items-center gap-2 truncate font-bold text-vpos-text hover:text-vpos-primary text-left"
            >
              {row.fullName}
              {row.id === 0 ? (
                <span className="rounded-full bg-vpos-sand px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-vpos-primary">
                  System
                </span>
              ) : null}
            </button>
            <span className="mt-0.5 block text-[11px] font-semibold tracking-wide text-vpos-muted">
              {row.customerCode}
            </span>
          </span>
        </div>
      ),
    },
    {
      id: 'contact',
      header: 'Contact',
      searchable: (row) => `${row.phone ?? ''} ${row.email ?? ''}`,
      cell: (row) => (
        <div className="min-w-[180px]">
          <div className="font-semibold text-vpos-dark">{row.phone || '—'}</div>
          <div className="mt-0.5 text-[11px] text-vpos-muted">{row.email || 'No email'}</div>
        </div>
      ),
    },
    {
      id: 'store',
      header: 'Default store',
      searchable: (row) => storeNames.get(Number(row.storeId)) ?? '',
      cell: (row) =>
        row.id === 0 ? (
          <span className="text-vpos-muted font-medium">All stores</span>
        ) : (
          <span className="font-medium text-vpos-dark">
            {row.storeId ? storeNames.get(Number(row.storeId)) ?? `Store #${row.storeId}` : 'All stores'}
          </span>
        ),
    },
    {
      id: 'updated',
      header: 'Updated',
      searchable: false,
      cell: (row) => <span className="text-vpos-muted text-[12px]">{formatDate(row.updatedAt || row.createdAt)}</span>,
    },
    {
      id: 'status',
      header: 'Status',
      searchable: (row) => (row.id === 0 ? 'system active' : row.status === 1 ? 'active' : 'inactive'),
      cell: (row) => <Status value={row.id === 0 ? 'System' : row.status === 1 ? 'Active' : 'Inactive'} />,
    },
    {
      id: 'actions',
      header: '',
      searchable: false,
      className: 'w-32 text-right',
      cell: (row) =>
        row.id === 0 ? (
          <span className="text-[11px] font-semibold text-vpos-muted">Protected</span>
        ) : (
          <div className="flex justify-end gap-1">
            <button
              type="button"
              onClick={() => setViewingCustomer(row)}
              className="grid h-8 w-8 place-items-center rounded-lg text-[17px] text-vpos-muted hover:bg-vpos-subtle hover:text-vpos-primary"
              title="View customer details"
            >
              <Icon name="eye-line" />
            </button>
            {canUpdate ? (
              <button
                type="button"
                onClick={() => setModalCustomer(row)}
                className="grid h-8 w-8 place-items-center rounded-lg text-[17px] text-vpos-muted hover:bg-vpos-subtle hover:text-vpos-primary"
                title={`Edit ${row.fullName}`}
              >
                <Icon name="edit-line" />
              </button>
            ) : null}
            {canDelete ? (
              <button
                type="button"
                onClick={() => setDeleteTarget(row)}
                className="grid h-8 w-8 place-items-center rounded-lg text-[17px] text-vpos-muted hover:bg-vpos-red-bg hover:text-vpos-red"
                title={`Deactivate ${row.fullName}`}
              >
                <Icon name="delete-bin-line" />
              </button>
            ) : null}
          </div>
        ),
    },
  ]

  return (
    <div>
      <Topbar
        title="Customer Directory"
        subtitle="Manage profiles, contacts, and store assignments"
        actions={<StoreSwitcher />}
      />

      <div className={pageContent}>
        <Breadcrumb
          items={[
            { label: 'Dashboard', to: paths.dashboard },
            { label: 'Customers', to: paths.customers },
          ]}
          className="mb-4"
        />
        {/* KPI Banner Header */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-vpos-line bg-white p-4 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-extrabold tracking-wider text-vpos-muted uppercase">Total Profiles</span>
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-vpos-sand text-vpos-primary">
                <Icon name="user-heart-line" />
              </div>
            </div>
            <div className="mt-3 text-[24px] font-extrabold text-vpos-dark">
              {customerPage?.totalElements ?? customers.length}
            </div>
          </div>

          <div className="rounded-xl border border-vpos-line bg-white p-4 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-extrabold tracking-wider text-vpos-muted uppercase">Active Customers</span>
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-vpos-green-bg text-vpos-green">
                <Icon name="user-check-line" />
              </div>
            </div>
            <div className="mt-3 text-[24px] font-extrabold text-vpos-dark">{activeCount}</div>
          </div>

          <div className="rounded-xl border border-vpos-line bg-white p-4 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-extrabold tracking-wider text-vpos-muted uppercase">Inactive / Inactive</span>
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-vpos-red-bg text-vpos-red">
                <Icon name="user-unfollow-line" />
              </div>
            </div>
            <div className="mt-3 text-[24px] font-extrabold text-vpos-dark">{inactiveCount}</div>
          </div>
        </div>

        {/* Section Header */}
        <section className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-[18px] font-extrabold tracking-tight text-vpos-dark">Customer Directory</h2>
            <p className="mt-0.5 text-[13px] text-vpos-muted">
              Keep customer profiles ready for sales, receipts, and business follow-up.
            </p>
          </div>
          {canCreate ? (
            <Button variant="primary" onClick={() => setModalCustomer(null)}>
              <Icon name="add-line" /> Add customer
            </Button>
          ) : null}
        </section>

        {/* Data Table with Skeleton Support */}
        <DataTable
          title={
            <span>
              All customers{' '}
              <span className="ml-1 text-[12px] font-semibold text-vpos-muted">
                {customerPage?.totalElements ?? customers.length}
              </span>
            </span>
          }
          data={customers}
          columns={columns}
          rowKey={(row) => String(row.id)}
          searchPlaceholder="Search customers by name, code, phone, email..."
          pageSize={10}
          isLoading={isLoading}
          emptyMessage={isError ? 'Customer data could not be loaded.' : 'No customers found.'}
          emptyIcon={isError ? 'error-warning-line' : 'user-add-line'}
        />

        {/* Customer Modal (Create & Edit) */}
        <CustomerModal
          open={modalCustomer !== undefined}
          onClose={() => setModalCustomer(undefined)}
          customer={modalCustomer}
          stores={stores}
          businessId={businessId}
          isLoading={isSaving}
          onSave={saveCustomer}
        />

        {/* Customer Details Modal (View) */}
        <CustomerDetailsModal
          customer={viewingCustomer}
          open={Boolean(viewingCustomer)}
          onClose={() => setViewingCustomer(null)}
          storeName={viewingCustomer?.storeId ? storeNames.get(Number(viewingCustomer.storeId)) : undefined}
        />

        {/* Deactivate Confirmation Modal */}
        <ConfirmModal
          open={Boolean(deleteTarget)}
          onClose={() => setDeleteTarget(null)}
          onConfirm={deactivateCustomer}
          title="Deactivate customer"
          description={`Deactivate ${deleteTarget?.fullName ?? 'this customer'}? Existing sales history will remain unchanged.`}
          confirmText="Deactivate"
          variant="danger"
          isLoading={deactivateMutation.isPending}
        />
      </div>
    </div>
  )
}
