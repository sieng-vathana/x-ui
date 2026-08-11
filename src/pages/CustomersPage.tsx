import { useMemo, useState } from 'react'
import { Button, ConfirmModal, DataTable, Icon, Status, type DataTableColumn } from '../components'
import { CustomerModal } from '../components/customers/CustomerModal'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useStores } from '../features/stores/useStores'
import { useCreateCustomer, useCustomers, useDeactivateCustomer, useUpdateCustomer } from '../features/customers/useCustomers'
import type { Customer, CustomerPayload } from '../features/customers/types'
import { cn } from '../lib/cn'
import { pageContent } from '../lib/ui'

function formatDate(value?: string) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value))
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
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null)

  const storeNames = useMemo(() => new Map(stores.map((store) => [Number(store.id), store.name])), [stores])
  const customers = customerPage?.content ?? []
  const permissions = user?.permissions ?? []
  const canCreate = permissions.includes('x-customer:create')
  const canUpdate = permissions.includes('x-customer:update')
  const canDelete = permissions.includes('x-customer:delete')
  const isSaving = createMutation.isPending || updateMutation.isPending

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
          <span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-lg text-[16px]', row.id === 0 ? 'bg-vpos-primary text-white' : 'bg-vpos-sand text-vpos-primary')}>
            <Icon name={row.id === 0 ? 'walk-line' : 'user-3-line'} />
          </span>
          <span className="min-w-0">
            <span className="flex items-center gap-2 truncate font-bold text-vpos-text">{row.fullName}{row.id === 0 ? <span className="rounded-full bg-vpos-sand px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-vpos-primary">System</span> : null}</span>
            <span className="mt-0.5 block text-[11px] font-semibold tracking-wide text-vpos-muted">{row.customerCode}</span>
          </span>
        </div>
      ),
    },
    {
      id: 'contact',
      header: 'Contact',
      searchable: (row) => `${row.phone ?? ''} ${row.email ?? ''}`,
      cell: (row) => <div className="min-w-[180px]"><div>{row.phone || '—'}</div><div className="mt-0.5 text-[11px] text-vpos-muted">{row.email || 'No email'}</div></div>,
    },
    {
      id: 'store',
      header: 'Default store',
      searchable: (row) => storeNames.get(Number(row.storeId)) ?? '',
      cell: (row) => row.id === 0 ? <span className="text-vpos-muted">All stores</span> : <span>{row.storeId ? storeNames.get(Number(row.storeId)) ?? `Store #${row.storeId}` : 'All stores'}</span>,
    },
    {
      id: 'updated',
      header: 'Updated',
      searchable: false,
      cell: (row) => <span className="text-vpos-muted">{formatDate(row.updatedAt || row.createdAt)}</span>,
    },
    {
      id: 'status',
      header: 'Status',
      searchable: (row) => row.id === 0 ? 'system active' : 'active',
      cell: (row) => <Status value={row.id === 0 ? 'System' : row.status === 1 ? 'Active' : 'Inactive'} />,
    },
    {
      id: 'actions',
      header: '',
      searchable: false,
      className: 'w-32 text-right',
      cell: (row) => row.id === 0 ? <span className="text-[11px] font-semibold text-vpos-muted">Protected</span> : (
        <div className="flex justify-end gap-1">
          {canUpdate ? <button type="button" onClick={() => setModalCustomer(row)} className="grid h-8 w-8 place-items-center rounded-lg text-[17px] text-vpos-muted hover:bg-vpos-subtle hover:text-vpos-primary" aria-label={`Edit ${row.fullName}`}><Icon name="edit-line" /></button> : null}
          {canDelete ? <button type="button" onClick={() => setDeleteTarget(row)} className="grid h-8 w-8 place-items-center rounded-lg text-[17px] text-vpos-muted hover:bg-vpos-red-bg hover:text-vpos-red" aria-label={`Deactivate ${row.fullName}`}><Icon name="delete-bin-line" /></button> : null}
        </div>
      ),
    },
  ]

  return (
    <div className={pageContent}>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[.15em] text-vpos-primary"><Icon name="user-heart-line" /> Customer directory</div>
          <h1 className="text-[25px] font-extrabold tracking-tight text-vpos-dark">Customers</h1>
          <p className="mt-1 max-w-2xl text-[13px] text-vpos-muted">Keep customer profiles ready for sales, receipts, and business follow-up.</p>
        </div>
        {canCreate ? <Button variant="primary" onClick={() => setModalCustomer(null)}><Icon name="add-line" /> Add customer</Button> : null}
      </div>

      <DataTable
        title={<span>All customers <span className="ml-1 text-[12px] font-semibold text-vpos-muted">{customerPage?.totalElements ?? 0}</span></span>}
        data={customers}
        columns={columns}
        rowKey={(row) => String(row.id)}
        searchPlaceholder="Search customers…"
        pageSize={10}
        emptyMessage={isLoading ? 'Loading customers…' : isError ? 'Customer data could not be loaded.' : 'No customers yet.'}
        emptyIcon={isError ? 'error-warning-line' : 'user-add-line'}
      />

      <CustomerModal
        open={modalCustomer !== undefined}
        onClose={() => setModalCustomer(undefined)}
        customer={modalCustomer}
        stores={stores}
        businessId={businessId}
        isLoading={isSaving}
        onSave={saveCustomer}
      />
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
  )
}
