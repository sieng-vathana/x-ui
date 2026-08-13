import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
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
import { useStoresRaw } from '../../features/stores/useStores'
import type { ProductUnit } from '../../features/products/types'

interface UnitFormData {
  code: string
  name: string
  description: string
  isGlobal: boolean
  storeIds: number[]
  status: string
}

interface FormErrors {
  code?: string
  name?: string
  storeIds?: string
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
  if (!data.isGlobal && data.storeIds.length === 0) {
    errors.storeIds = 'Please select at least one store for store-specific coverage.'
  }
  return errors
}

function toFormDefaults(unit: ProductUnit | null): UnitFormData {
  return {
    code: unit?.unitCode ?? '',
    name: unit?.unitName ?? '',
    description: unit?.description ?? '',
    isGlobal: unit?.isGlobal ?? true,
    storeIds: unit?.storeIds
      ? Array.from(unit.storeIds).map((id) => Number(id)).filter((id) => !isNaN(id) && id > 0)
      : [],
    status: unit?.status ?? 'ACTIVE',
  }
}

function UnitActionsMenu({
  unit,
  onEdit,
  onView,
  onDelete,
}: {
  unit: ProductUnit
  onEdit: () => void
  onView: () => void
  onDelete: () => void
}) {
  const [open, setOpen] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null)

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setCoords({
        top: rect.bottom + 6,
        left: Math.max(16, rect.right - 176),
      })
      setOpen(true)
    } else {
      setOpen(false)
    }
  }

  useEffect(() => {
    if (!open) return
    const handleClickOutside = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    const handleScrollOrResize = () => setOpen(false)

    document.addEventListener('mousedown', handleClickOutside)
    window.addEventListener('scroll', handleScrollOrResize, true)
    window.addEventListener('resize', handleScrollOrResize)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('scroll', handleScrollOrResize, true)
      window.removeEventListener('resize', handleScrollOrResize)
    }
  }, [open])

  return (
    <div className="relative inline-block text-left">
      <button
        ref={buttonRef}
        type="button"
        className="flex h-8 w-8 items-center justify-center rounded-lg border-0 bg-transparent text-[19px] text-vpos-muted transition-all duration-150 hover:bg-vpos-subtle hover:text-vpos-text active:scale-95 cursor-pointer"
        onClick={handleToggle}
        aria-label={`Actions for ${unit.unitName}`}
      >
        <Icon name="more-2-fill" />
      </button>

      {open && coords && createPortal(
        <div
          ref={menuRef}
          style={{ top: `${coords.top}px`, left: `${coords.left}px` }}
          className="fixed z-[99999] w-44 rounded-xl border border-vpos-line/80 bg-white/95 backdrop-blur-md p-1.5 shadow-[0_12px_32px_rgba(0,0,0,0.12)] transition-all duration-150 ease-out animate-in fade-in zoom-in-95"
        >
          <button
            type="button"
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium text-vpos-text transition-all duration-150 hover:bg-vpos-subtle active:scale-[0.98] cursor-pointer border-0 bg-transparent"
            onClick={() => {
              setOpen(false)
              onEdit()
            }}
          >
            <Icon name="edit-line" className="text-[16px] text-vpos-muted" />
            Edit unit
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium text-vpos-text transition-all duration-150 hover:bg-vpos-subtle active:scale-[0.98] cursor-pointer border-0 bg-transparent"
            onClick={() => {
              setOpen(false)
              onView()
            }}
          >
            <Icon name="eye-line" className="text-[16px] text-vpos-muted" />
            View details
          </button>
          {unit.status !== 'DELETED' && (
            <>
              <div className="my-1 h-px bg-vpos-line/60" />
              <button
                type="button"
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium text-vpos-red transition-all duration-150 hover:bg-vpos-red-bg active:scale-[0.98] cursor-pointer border-0 bg-transparent"
                onClick={() => {
                  setOpen(false)
                  onDelete()
                }}
              >
                <Icon name="delete-bin-line" className="text-[16px] text-vpos-red" />
                Delete unit
              </button>
            </>
          )}
        </div>,
        document.body,
      )}
    </div>
  )
}

function UnitDetailsModal({
  unit,
  open,
  onClose,
  onEdit,
  stores,
}: {
  unit: ProductUnit | null
  open: boolean
  onClose: () => void
  onEdit: (unit: ProductUnit) => void
  stores: any[]
}) {
  if (!unit) return null

  const storeMap = new Map<number, string>()
  stores.forEach((s) => storeMap.set(Number(s.id), s.name))

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Unit details"
      description="View full measurement unit information."
      size="2xl"
      panelClassName="max-w-xl sm:max-w-xl w-full"
      footer={
        <>
          <Button variant="secondary" type="button" onClick={onClose}>
            Close
          </Button>
          <Button
            variant="primary"
            type="button"
            onClick={() => {
              onClose()
              onEdit(unit)
            }}
          >
            <Icon name="edit-line" /> Edit unit
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {/* Header preview banner */}
        <div className="flex items-center gap-4 rounded-xl border border-vpos-line bg-[#fbfcfd] p-4">
          <span className="grid h-16 w-16 shrink-0 place-items-center rounded-xl border border-vpos-primary/15 bg-vpos-sand font-mono text-[18px] font-extrabold text-vpos-primary">
            {unit.unitCode}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="m-0 truncate text-[17px] font-bold text-vpos-text">{unit.unitName}</h3>
              <Status value={unit.status ?? 'ACTIVE'} />
            </div>
            <span className="mt-1 block font-mono text-[12px] font-bold tracking-[0.06em] text-vpos-muted">
              Code: {unit.unitCode}
            </span>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-3 text-[13px]">
          <div className="rounded-lg border border-vpos-line/70 bg-white p-3">
            <span className="block text-[11px] font-bold uppercase tracking-[0.08em] text-vpos-muted">Coverage</span>
            <div className="mt-1 font-semibold text-vpos-text">
              {unit.isGlobal ? (
                <span className="inline-flex items-center gap-1 text-vpos-primary">
                  <Icon name="global-line" /> All stores (Global)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-vpos-text">
                  <Icon name="store-2-line" /> Store-specific ({unit.storeIds?.length ?? 0} assigned)
                </span>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-vpos-line/70 bg-white p-3">
            <span className="block text-[11px] font-bold uppercase tracking-[0.08em] text-vpos-muted">Type</span>
            <div className="mt-1 font-semibold text-vpos-text">
              {unit.isGlobal ? 'Standard Unit' : 'Custom Store Unit'}
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="rounded-xl border border-vpos-line bg-white p-4">
          <span className="mb-1 block text-[12px] font-bold uppercase tracking-[0.08em] text-vpos-muted">Description</span>
          <p className="m-0 text-[13px] leading-relaxed text-vpos-text">
            {unit.description?.trim() || <span className="text-vpos-muted italic">No description provided.</span>}
          </p>
        </div>
      </div>
    </Modal>
  )
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
  const defaults = toFormDefaults(unit)
  const isEditing = Boolean(unit)
  const [code, setCode] = useState(defaults.code)
  const [name, setName] = useState(defaults.name)
  const [description, setDescription] = useState(defaults.description)
  const [isGlobal, setIsGlobal] = useState(defaults.isGlobal)
  const [status, setStatus] = useState(defaults.status)
  const [errors, setErrors] = useState<FormErrors>({})

  useEffect(() => {
    if (open) {
      const d = toFormDefaults(unit)
      setCode(d.code)
      setName(d.name)
      setDescription(d.description)
      setIsGlobal(d.isGlobal)
      setStatus(d.status)
      setErrors({})
    }
  }, [open, unit])

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

    const validation = validateForm({ code: trimmedCode, name: trimmedName, description: trimmedDesc, isGlobal, storeIds: [], status })
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
      size="lg"
      panelClassName="max-w-xl sm:max-w-xl w-full"
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
          placeholder="e.g. PCS, KG, BOX"
          maxLength={50}
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
          placeholder="e.g. Pieces"
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
          placeholder="e.g. Standard piece count measurement"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <SelectField
          label="Coverage"
          name="isGlobal"
          value={isGlobal ? 'true' : 'false'}
          onChange={(e) => setIsGlobal(e.target.value === 'true')}
          options={[
            { value: 'true', label: 'All stores (global)' },
            { value: 'false', label: 'Store-specific' },
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
  const { data: stores = [] } = useStoresRaw()
  const createUnitMutation = useCreateUnit()
  const updateUnitMutation = useUpdateUnit()
  const deleteUnitMutation = useDeleteUnit()

  const [formOpen, setFormOpen] = useState(false)
  const [editingUnit, setEditingUnit] = useState<ProductUnit | null>(null)
  const [viewingUnit, setViewingUnit] = useState<ProductUnit | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ProductUnit | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const activeUnits = units.filter((u) => u.status === 'ACTIVE').length
  const globalUnits = units.filter((u) => u.isGlobal).length
  const assignedStores = units.reduce((total, u) => total + (u.storeIds?.length ?? 0), 0)

  const openCreate = () => {
    setEditingUnit(null)
    setFormOpen(true)
  }

  const openEdit = (unit: ProductUnit) => {
    setEditingUnit(unit)
    setFormOpen(true)
  }

  const openView = (unit: ProductUnit) => {
    setViewingUnit(unit)
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
        <div
          className="flex items-center gap-3 cursor-pointer group"
          onClick={() => openView(unit)}
        >
          <span className="grid h-10 w-10 place-items-center rounded-lg border border-vpos-primary/15 bg-vpos-sand font-mono text-[12px] font-extrabold tracking-[0.08em] text-vpos-primary">
            {unit.unitCode}
          </span>
          <div className="min-w-0">
            <strong className="block truncate text-[14px] text-vpos-text group-hover:text-vpos-primary transition-colors">
              {unit.unitName}
            </strong>
            <small className="mt-0.5 block text-[11px] text-vpos-muted">
              {unit.isGlobal ? 'Global unit' : 'Store unit'}
            </small>
          </div>
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
      header: 'Actions',
      cell: (unit) => (
        <UnitActionsMenu
          unit={unit}
          onEdit={() => openEdit(unit)}
          onView={() => openView(unit)}
          onDelete={() => setDeleteTarget(unit)}
        />
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
            <Icon name="loader-line" className="animate-spin text-[20px]" /> <span className="ml-2 text-[14px]">Loading units…</span>
          </div>
        ) : (
          <DataTable
            data={units}
            columns={columns}
            rowKey={(unit) => String(unit.id)}
            title="Measurement units"
            searchPlaceholder="Search unit name or code…"
            pageSize={10}
            emptyMessage="No measurement units are configured."
            emptyIcon="folder-open-line"
          />
        )}

        <UnitDetailsModal
          open={Boolean(viewingUnit)}
          unit={viewingUnit}
          onClose={() => setViewingUnit(null)}
          onEdit={openEdit}
          stores={stores}
        />

        <UnitFormModal
          key={editingUnit ? `edit-unit-${editingUnit.id}` : 'create-unit'}
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
          description="This measurement unit will be deactivated."
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
