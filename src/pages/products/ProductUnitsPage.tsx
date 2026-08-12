import { useState } from 'react'
import {
  Breadcrumb,
  Button,
  DataTable,
  Icon,
  Modal,
  Status,
  StoreSwitcher,
  Topbar,
  FormField,
  SelectField,
  type DataTableColumn,
} from '../../components'
import { ProductsSubnav } from '../../components/products/ProductsSubnav'
import { useAdminStore } from '../../hooks/useAdminStore'
import { paths } from '../../lib/paths'
import { pageContent } from '../../lib/ui'
import { useToast } from '../../context/ToastContext'
import {
  useProductUnits,
  useCreateUnit,
  useUpdateUnit,
  useDeleteUnit,
} from '../../features/products/useProducts'
import type { ProductUnit } from '../../features/products/types'

interface UnitFormData {
  code: string
  name: string
  description: string
  isGlobal: boolean
  status: string
}

interface FormErrors {
  code?: string
  name?: string
}

function validateForm(data: UnitFormData): FormErrors {
  const errors: FormErrors = {}
  if (!data.code.trim()) {
    errors.code = 'Code is required.'
  } else if (!/^[A-Za-z0-9_-]+$/.test(data.code.trim())) {
    errors.code = 'Code can only contain letters, numbers, hyphens, and underscores.'
  }
  if (!data.name.trim()) {
    errors.name = 'Name is required.'
  } else if (data.name.trim().length < 2) {
    errors.name = 'Name must be at least 2 characters.'
  }
  return errors
}

function toFormDefaults(unit: ProductUnit | null): UnitFormData {
  return {
    code: unit?.unitCode ?? '',
    name: unit?.unitName ?? '',
    description: unit?.description ?? '',
    isGlobal: unit?.isGlobal ?? false,
    status: unit?.status ?? 'ACTIVE',
  }
}

interface UnitFormModalProps {
  open: boolean
  unit: ProductUnit | null
  onClose: () => void
  onSave: (data: {
    payload: {
      unitCode: string
      unitName: string
      description?: string
      isGlobal: boolean
      status: string
      storeIds?: number[]
    }
    isEdit: boolean
    id?: number
  }) => Promise<void>
  isSaving: boolean
}

function UnitFormModal({ open, unit, onClose, onSave, isSaving }: UnitFormModalProps) {
  const isEditing = Boolean(unit)
  const [code, setCode] = useState(unit?.unitCode ?? '')
  const [name, setName] = useState(unit?.unitName ?? '')
  const [description, setDescription] = useState(unit?.description ?? '')
  const [isGlobal, setIsGlobal] = useState(unit?.isGlobal ?? false)
  const [status, setStatus] = useState(unit?.status ?? 'ACTIVE')
  const [errors, setErrors] = useState<FormErrors>({})

  const resetForm = () => {
    const d = toFormDefaults(unit)
    setCode(d.code)
    setName(d.name)
    setDescription(d.description)
    setIsGlobal(d.isGlobal)
    setStatus(d.status)
    setErrors({})
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const trimmedCode = code.trim().toUpperCase()
    const trimmedName = name.trim()
    const trimmedDesc = description.trim()

    const validation = validateForm({ code: trimmedCode, name: trimmedName, description: trimmedDesc, isGlobal, status })
    if (Object.keys(validation).length > 0) {
      setErrors(validation)
      return
    }

    const payload = {
      unitCode: trimmedCode,
      unitName: trimmedName,
      description: trimmedDesc || undefined,
      isGlobal,
      status,
      storeIds: unit?.storeIds,
    }

    await onSave({
      payload,
      isEdit: isEditing,
      id: unit?.id,
    })

    handleClose()
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={isEditing ? 'Edit unit' : 'Add unit'}
      description={isEditing ? 'Update measurement unit details.' : 'Create a new measurement unit.'}
      size="sm"
      footer={
        <>
          <Button variant="secondary" type="button" onClick={handleClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" onClick={handleSubmit} disabled={isSaving}>
            {isSaving ? 'Saving…' : isEditing ? 'Save changes' : 'Create unit'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <FormField
          label="Code"
          required
          name="code"
          placeholder="e.g. BOX"
          value={code}
          onChange={(e) => {
            setCode(e.target.value.toUpperCase())
            if (errors.code) setErrors((prev) => ({ ...prev, code: undefined }))
          }}
        />
        {errors.code ? (
          <p className="-mt-3 mb-0 text-[12px] font-semibold text-vpos-red">{errors.code}</p>
        ) : null}

        <FormField
          label="Name"
          required
          name="name"
          placeholder="e.g. Box"
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }))
          }}
        />
        {errors.name ? (
          <p className="-mt-3 mb-0 text-[12px] font-semibold text-vpos-red">{errors.name}</p>
        ) : null}

        <FormField
          label="Description"
          name="description"
          placeholder="e.g. Standard box"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <SelectField
          label="Global"
          name="isGlobal"
          value={isGlobal ? 'true' : 'false'}
          onChange={(e) => setIsGlobal(e.target.value === 'true')}
          options={[
            { value: 'false', label: 'No — store-specific' },
            { value: 'true', label: 'Yes — all stores' },
          ]}
        />

        <SelectField
          label="Status"
          name="status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          options={[
            { value: 'ACTIVE', label: 'Active' },
            { value: 'INACTIVE', label: 'Inactive' },
          ]}
        />
      </form>
    </Modal>
  )
}

export function ProductUnitsPage() {
  const { storeId, setStoreId } = useAdminStore()
  const { toast } = useToast()
  const { data: units = [], isLoading } = useProductUnits(storeId)
  const createUnitMutation = useCreateUnit()
  const updateUnitMutation = useUpdateUnit()
  const deleteUnitMutation = useDeleteUnit()

  const [formOpen, setFormOpen] = useState(false)
  const [editingUnit, setEditingUnit] = useState<ProductUnit | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ProductUnit | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const activeUnits = units.filter((unit) => unit.status === 'ACTIVE').length
  const globalUnits = units.filter((unit) => unit.isGlobal).length
  const assignedStores = units.reduce((total, unit) => total + (unit.storeIds?.length ?? 0), 0)

  const openCreate = () => {
    setEditingUnit(null)
    setFormOpen(true)
  }

  const openEdit = (unit: ProductUnit) => {
    setEditingUnit(unit)
    setFormOpen(true)
  }

  const handleSave = async (data: {
    payload: {
      unitCode: string
      unitName: string
      description?: string
      isGlobal: boolean
      status: string
      storeIds?: number[]
    }
    isEdit: boolean
    id?: number
  }) => {
    setIsSaving(true)
    try {
      if (data.isEdit && data.id !== undefined) {
        await updateUnitMutation.mutateAsync({ id: data.id, payload: data.payload })
        toast(`${data.payload.unitName} was updated.`, 'success')
      } else {
        await createUnitMutation.mutateAsync(data.payload)
        toast(`${data.payload.unitName} was created.`, 'success')
      }
    } catch (err: any) {
      toast(err?.message || 'Failed to save unit.', 'error')
      throw err
    } finally {
      setIsSaving(false)
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteUnitMutation.mutateAsync(deleteTarget.id)
      toast(`${deleteTarget.unitName} was deleted.`, 'success')
      setDeleteTarget(null)
    } catch (err: any) {
      toast(err?.message || 'Failed to delete unit.', 'error')
    }
  }

  const columns: DataTableColumn<ProductUnit>[] = [
    {
      id: 'unit',
      header: 'Unit',
      searchable: (unit) => `${unit.unitName} ${unit.unitCode}`,
      cell: (unit) => (
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-[4px] border border-vpos-primary/15 bg-vpos-sand font-mono text-[12px] font-extrabold tracking-[0.08em] text-vpos-primary">
            {unit.unitCode}
          </span>
          <span>
            <strong className="block text-[14px]">{unit.unitName}</strong>
            <small className="mt-0.5 block text-[11px] text-vpos-muted">
              {unit.isGlobal ? 'Global unit' : 'Store unit'}
            </small>
          </span>
        </div>
      ),
    },
    {
      id: 'code',
      header: 'Code',
      searchable: (unit) => unit.unitCode,
      cell: (unit) => (
        <code className="rounded-[4px] bg-vpos-subtle px-2 py-1 text-[12px] font-bold text-vpos-text">
          {unit.unitCode}
        </code>
      ),
    },
    {
      id: 'description',
      header: 'Description',
      hideOnMobile: true,
      cell: (unit) => (
        <span className="text-[13px] text-vpos-muted">
          {unit.description || '—'}
        </span>
      ),
    },
    {
      id: 'stores',
      header: 'Stores',
      hideOnMobile: true,
      cell: (unit) =>
        unit.isGlobal ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-vpos-sand px-2.5 py-0.5 text-[12px] font-bold text-vpos-primary">
            <Icon name="global-line" />
            All stores
          </span>
        ) : (
          <strong>{unit.storeIds?.length ?? 0}</strong>
        ),
    },
    {
      id: 'status',
      header: 'Status',
      searchable: (unit) => unit.status ?? '',
      cell: (unit) => <Status value={unit.status ?? 'ACTIVE'} />,
    },
    {
      id: 'actions',
      header: '',
      cell: (unit) => (
        <div className="flex items-center gap-1">
          <Button
            variant="text"
            onClick={() => openEdit(unit)}
            aria-label={`Edit ${unit.unitName}`}
          >
            Edit
          </Button>
          {unit.status !== 'DELETED' && (
            <Button
              variant="text"
              className="text-vpos-red hover:text-vpos-red"
              onClick={() => setDeleteTarget(unit)}
              aria-label={`Delete ${unit.unitName}`}
            >
              Delete
            </Button>
          )}
        </div>
      ),
    },
  ]

  return (
    <>
      <Topbar
        title="Products"
        subtitle="Measurement units used across the product catalog"
        actions={<StoreSwitcher value={storeId} onChange={setStoreId} />}
      />
      <main className={pageContent}>
        <section className="mb-5 flex min-h-12 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Breadcrumb
            items={[
              { label: 'Products', to: paths.products },
              { label: 'Units' },
            ]}
          />
          <Button variant="primary" onClick={openCreate}>
            <Icon name="add-line" /> Add unit
          </Button>
        </section>

        <ProductsSubnav />

        <section className="mb-[18px] grid overflow-hidden rounded-[4px] border border-vpos-line bg-white shadow-vpos sm:grid-cols-[1fr_1fr_1.4fr]">
          <ReferenceStat label="Unit types" value={units.length} detail={`${activeUnits} active`} />
          <ReferenceStat label="Store assignments" value={assignedStores} detail={`${globalUnits} global`} />
          <div className="flex items-center gap-3 border-t border-vpos-line bg-vpos-subtle/55 px-5 py-4 sm:border-t-0 sm:border-l">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[4px] bg-white text-vpos-primary shadow-sm">
              <Icon name="information-line" />
            </span>
            <p className="m-0 text-[12px] leading-relaxed text-vpos-muted">
              <strong className="text-vpos-text">Active management.</strong> Create, edit, and delete measurement units for your catalog.
            </p>
          </div>
        </section>

        {isLoading ? (
          <div className="flex items-center justify-center py-20 text-vpos-muted">
            <Icon name="loader-line" /> <span className="ml-2 text-[14px]">Loading units…</span>
          </div>
        ) : (
          <DataTable
            data={units}
            columns={columns}
            rowKey={(unit) => String(unit.id)}
            title="Product units"
            searchPlaceholder="Search unit name or code…"
            pageSize={10}
            emptyMessage="No product units are configured."
            emptyIcon="ruler-line"
          />
        )}

        <UnitFormModal
          open={formOpen}
          unit={editingUnit}
          onClose={() => {
            setFormOpen(false)
            setEditingUnit(null)
          }}
          onSave={handleSave}
          isSaving={isSaving}
        />

        <Modal
          open={Boolean(deleteTarget)}
          onClose={() => !deleteUnitMutation.isPending && setDeleteTarget(null)}
          title="Delete unit?"
          description="This unit will be deactivated. It can still be recovered if needed."
          size="sm"
          footer={
            <>
              <Button variant="secondary" disabled={deleteUnitMutation.isPending} onClick={() => setDeleteTarget(null)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                className="bg-vpos-red hover:bg-vpos-red"
                disabled={deleteUnitMutation.isPending}
                onClick={confirmDelete}
              >
                {deleteUnitMutation.isPending ? 'Deleting…' : 'Delete unit'}
              </Button>
            </>
          }
        >
          <p className="m-0 text-[14px] text-vpos-muted">
            {deleteTarget ? (
              <>
                You are deleting{' '}
                <strong className="text-vpos-text">{deleteTarget.unitName}</strong>.
                This action changes its status to DELETED.
              </>
            ) : null}
          </p>
        </Modal>
      </main>
    </>
  )
}

function ReferenceStat({ label, value, detail }: { label: string; value: number; detail: string }) {
  return (
    <div className="border-b border-vpos-line px-5 py-4 last:border-b-0 sm:border-r sm:border-b-0">
      <span className="block text-[10px] font-bold uppercase tracking-[0.1em] text-vpos-muted">{label}</span>
      <div className="mt-1.5 flex items-baseline gap-2">
        <strong className="text-[25px] tracking-[-0.04em] text-vpos-text">{value}</strong>
        <small className="text-[12px] font-semibold text-vpos-muted">{detail}</small>
      </div>
    </div>
  )
}
