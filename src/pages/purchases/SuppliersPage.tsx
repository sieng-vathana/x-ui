import { useEffect, useMemo, useState } from 'react'
import {
  Breadcrumb,
  Button,
  DataTable,
  FormField,
  Icon,
  MetricCard,
  Select,
  Status,
  StoreSwitcher,
  Topbar,
  type DataTableColumn,
} from '../../components'
import { PurchasesSubnav } from '../../components/purchases/PurchasesSubnav'
import { Modal } from '../../components/ui/Modal'
import { useToast } from '../../context/ToastContext'
import { usePurchaseOrders, useSaveSupplier, useSuppliers } from '../../features/purchases/usePurchases'
import { isReceivable, supplierIsActive, type Supplier } from '../../features/purchases/types'
import { useAdminStore } from '../../hooks/useAdminStore'
import { paths } from '../../lib/paths'
import { pageContent } from '../../lib/ui'

/** The suppliers a business buys from, with their open purchase orders. */
export function SuppliersPage() {
  const { storeId, setStoreId } = useAdminStore()
  const [status, setStatus] = useState<'' | 'ACTIVE' | 'INACTIVE'>('')
  const [editing, setEditing] = useState<Supplier | 'new' | null>(null)
  const suppliersQuery = useSuppliers()
  const ordersQuery = usePurchaseOrders()
  const suppliers = useMemo(() => suppliersQuery.data ?? [], [suppliersQuery.data])
  const openBySupplier = useMemo(() => {
    const counts = new Map<number, number>()
    ;(ordersQuery.data ?? []).filter(isReceivable).forEach((order) => counts.set(order.supplierId, (counts.get(order.supplierId) ?? 0) + 1))
    return counts
  }, [ordersQuery.data])
  const rows = useMemo(() => (status
    ? suppliers.filter((supplier) => (supplierIsActive(supplier) ? 'ACTIVE' : 'INACTIVE') === status)
    : suppliers), [status, suppliers])
  const active = suppliers.filter(supplierIsActive).length
  const openOrders = Array.from(openBySupplier.values()).reduce((sum, count) => sum + count, 0)

  const columns: DataTableColumn<Supplier>[] = useMemo(
    () => [
      {
        id: 'name',
        header: 'Supplier',
        searchable: (s) => `${s.supplierName} ${s.supplierCode} ${s.email ?? ''}`,
        cell: (s) => (<><strong className="block">{s.supplierName}</strong><small className="text-[11px] text-vpos-muted">{s.supplierCode}</small></>),
      },
      { id: 'contact', header: 'Contact', searchable: (s) => s.contactName ?? '', cell: (s) => s.contactName || '—' },
      { id: 'phone', header: 'Phone', searchable: (s) => s.phone ?? '', hideOnMobile: true, cell: (s) => s.phone || '—' },
      { id: 'email', header: 'Email', searchable: (s) => s.email ?? '', hideOnMobile: true, cell: (s) => s.email || '—' },
      { id: 'terms', header: 'Terms', hideOnMobile: true, cell: (s) => s.paymentTerms || '—' },
      { id: 'open', header: 'Open POs', cell: (s) => openBySupplier.get(s.id) ?? 0 },
      { id: 'status', header: 'Status', searchable: (s) => (supplierIsActive(s) ? 'Active' : 'Inactive'), cell: (s) => <Status value={supplierIsActive(s) ? 'Active' : 'Inactive'} /> },
      { id: 'actions', header: '', cell: (s) => <Button variant="text" onClick={() => setEditing(s)}>Edit</Button> },
    ],
    [openBySupplier],
  )

  return (
    <>
      <Topbar title="Purchases" subtitle="Supplier directory and purchase history" actions={<StoreSwitcher value={storeId} onChange={setStoreId} />} />
      <main className={pageContent}>
        <section className="mb-5 flex min-h-12 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1">
            <Breadcrumb items={[{ label: 'Purchases', to: paths.purchases }, { label: 'Suppliers' }]} />
          </div>
          <div className="flex shrink-0 flex-wrap gap-2.5">
            <Button variant="primary" onClick={() => setEditing('new')}>
              <Icon name="add-line" /> Add supplier
            </Button>
          </div>
        </section>

        <PurchasesSubnav />

        <section className="mb-[18px] grid grid-cols-1 gap-[18px] sm:grid-cols-2 xl:grid-cols-3">
          <MetricCard label="Suppliers" value={String(suppliers.length)} trend={`${active} active`} trendAs="small" icon={<Icon name="truck-line" />} iconTone="primary" />
          <MetricCard label="Open POs" value={String(openOrders)} trend="Waiting for goods" trendAs="small" icon={<Icon name="file-list-3-line" />} iconTone="primary" />
          <MetricCard label="Inactive" value={String(suppliers.length - active)} trend="Not ordering" trendAs="small" icon={<Icon name="user-unfollow-line" />} iconTone="warning" />
        </section>

        <DataTable
          data={rows}
          columns={columns}
          rowKey={(s) => String(s.id)}
          title="Suppliers"
          searchPlaceholder="Search supplier, code, contact…"
          pageSize={10}
          emptyMessage={suppliersQuery.isLoading ? 'Loading suppliers…' : 'No suppliers yet. Add the companies you buy stock from.'}
          toolbar={
            <Select
              variant="toolbar"
              placeholder="All status"
              value={status}
              onChange={(value) => setStatus(value as '' | 'ACTIVE' | 'INACTIVE')}
              options={[{ value: 'ACTIVE', label: 'Active' }, { value: 'INACTIVE', label: 'Inactive' }]}
            />
          }
        />
      </main>

      <SupplierModal supplier={editing} onClose={() => setEditing(null)} />
    </>
  )
}

function SupplierModal({ supplier, onClose }: { supplier: Supplier | 'new' | null; onClose: () => void }) {
  const { toast } = useToast()
  const saveMutation = useSaveSupplier()
  const existing = supplier && supplier !== 'new' ? supplier : null
  const [form, setForm] = useState({ supplierName: '', supplierCode: '', contactName: '', phone: '', email: '', address: '', paymentTerms: '', active: true })

  useEffect(() => {
    if (!supplier) return
    setForm({
      supplierName: existing?.supplierName ?? '',
      supplierCode: existing?.supplierCode ?? '',
      contactName: existing?.contactName ?? '',
      phone: existing?.phone ?? '',
      email: existing?.email ?? '',
      address: existing?.address ?? '',
      paymentTerms: existing?.paymentTerms ?? '',
      active: existing ? supplierIsActive(existing) : true,
    })
  }, [existing, supplier])

  const field = (name: keyof typeof form) => ({
    value: String(form[name]),
    onChange: (event: { target: { value: string } }) => setForm((current) => ({ ...current, [name]: event.target.value })),
  })

  const save = async () => {
    if (!form.supplierName.trim()) {
      toast('Enter the supplier name.', 'warning')
      return
    }
    try {
      const saved = await saveMutation.mutateAsync({
        id: existing?.id,
        input: {
          supplierName: form.supplierName.trim(),
          supplierCode: form.supplierCode.trim() || undefined,
          contactName: form.contactName.trim() || undefined,
          phone: form.phone.trim() || undefined,
          email: form.email.trim() || undefined,
          address: form.address.trim() || undefined,
          paymentTerms: form.paymentTerms.trim() || undefined,
          status: form.active ? 'ACTIVE' : 'INACTIVE',
        },
      })
      toast(`${saved.supplierName} saved.`, 'success')
      onClose()
    } catch (error) {
      toast(error instanceof Error ? error.message : 'The supplier could not be saved.', 'error')
    }
  }

  return (
    <Modal
      open={Boolean(supplier)}
      onClose={onClose}
      size="lg"
      closeOnBackdrop={false}
      title={existing ? `Edit ${existing.supplierName}` : 'Add supplier'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={() => void save()} disabled={saveMutation.isPending}><Icon name="save-line" /> Save supplier</Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Supplier name" requiredMark maxLength={160} {...field('supplierName')} />
        <FormField label="Code" maxLength={64} placeholder="Made for you if empty" {...field('supplierCode')} />
        <FormField label="Contact person" maxLength={160} {...field('contactName')} />
        <FormField label="Phone" maxLength={32} inputMode="tel" {...field('phone')} />
        <FormField label="Email" type="email" maxLength={254} {...field('email')} />
        <FormField label="Payment terms" maxLength={64} placeholder="For example: Net 30, cash on delivery" {...field('paymentTerms')} />
        <FormField label="Address" maxLength={1000} className="sm:col-span-2" {...field('address')} />
        <label className="flex items-center gap-2 text-[13px] text-vpos-text sm:col-span-2">
          <input type="checkbox" checked={form.active} onChange={(event) => setForm((current) => ({ ...current, active: event.target.checked }))} className="h-4 w-4 accent-vpos-primary" />
          Active (can be used on new purchase orders)
        </label>
      </div>
    </Modal>
  )
}
