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
import {
  productOptionTypes as initialOptions,
  type ProductOptionType,
} from '../../data/mockup'
import { useAdminStore } from '../../hooks/useAdminStore'
import { paths } from '../../lib/paths'
import { pageContent } from '../../lib/ui'
import { useToast } from '../../context/ToastContext'
import { readStoredValue, writeStoredValue } from '../../lib/storage'

const STORAGE_KEY = 'x-ui:product-options'
const ID_COUNTER_KEY = 'x-ui:product-options-id-counter'

function nextId(): string {
  const counter = readStoredValue<number>(ID_COUNTER_KEY, 0) + 1
  writeStoredValue(ID_COUNTER_KEY, counter)
  return `opt-${Date.now()}-${counter}`
}

interface OptionFormData {
  name: string
  values: string
  usedOnProducts: number
  status: 'Active' | 'Inactive'
}

interface FormErrors {
  name?: string
  values?: string
  usedOnProducts?: string
}

function validateForm(data: OptionFormData): FormErrors {
  const errors: FormErrors = {}
  if (!data.name.trim()) {
    errors.name = 'Name is required.'
  } else if (data.name.trim().length < 2) {
    errors.name = 'Name must be at least 2 characters.'
  }
  if (!data.values.trim()) {
    errors.values = 'At least one value is required.'
  }
  if (data.usedOnProducts < 0 || !Number.isInteger(data.usedOnProducts)) {
    errors.usedOnProducts = 'Must be a whole number (0 or more).'
  }
  return errors
}

interface OptionFormModalProps {
  open: boolean
  option: ProductOptionType | null
  onClose: () => void
  onSave: (option: ProductOptionType, isEdit: boolean) => void
}

function OptionFormModal({ open, option, onClose, onSave }: OptionFormModalProps) {
  const isEditing = Boolean(option)
  const [name, setName] = useState(option?.name ?? '')
  const [values, setValues] = useState(option?.values.join(', ') ?? '')
  const [usedOnProducts, setUsedOnProducts] = useState(option?.usedOnProducts ?? 0)
  const [status, setStatus] = useState<'Active' | 'Inactive'>(option?.status ?? 'Active')
  const [errors, setErrors] = useState<FormErrors>({})

  const resetForm = () => {
    setName(option?.name ?? '')
    setValues(option?.values.join(', ') ?? '')
    setUsedOnProducts(option?.usedOnProducts ?? 0)
    setStatus(option?.status ?? 'Active')
    setErrors({})
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const trimmedName = name.trim()
    const trimmedValues = values.trim()
    const parsedValues = trimmedValues
      .split(',')
      .map((v) => v.trim())
      .filter((v) => v.length > 0)

    const validation = validateForm({
      name: trimmedName,
      values: parsedValues.join(', '),
      usedOnProducts,
      status,
    })
    if (Object.keys(validation).length > 0) {
      setErrors(validation)
      return
    }

    if (isEditing && option) {
      const updated: ProductOptionType = {
        ...option,
        name: trimmedName,
        values: parsedValues,
        usedOnProducts,
        status,
      }
      onSave(updated, true)
    } else {
      const created: ProductOptionType = {
        id: nextId(),
        name: trimmedName,
        values: parsedValues,
        usedOnProducts,
        status,
      }
      onSave(created, false)
    }

    handleClose()
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={isEditing ? 'Edit option type' : 'Add option type'}
      description={isEditing ? 'Update product option details.' : 'Create a new product option type.'}
      size="sm"
      footer={
        <>
          <Button variant="secondary" type="button" onClick={handleClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" onClick={handleSubmit}>
            {isEditing ? 'Save changes' : 'Create option'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <FormField
          label="Name"
          required
          name="name"
          placeholder="e.g. Size"
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
          label="Values"
          required
          name="values"
          placeholder="e.g. S, M, L, XL"
          value={values}
          onChange={(e) => {
            setValues(e.target.value)
            if (errors.values) setErrors((prev) => ({ ...prev, values: undefined }))
          }}
        />
        {errors.values ? (
          <p className="-mt-3 mb-0 text-[12px] font-semibold text-vpos-red">{errors.values}</p>
        ) : null}

        <FormField
          label="Used on products"
          name="usedOnProducts"
          type="number"
          min={0}
          step={1}
          value={usedOnProducts}
          onChange={(e) => {
            const v = parseInt(e.target.value, 10)
            setUsedOnProducts(Number.isNaN(v) ? 0 : v)
            if (errors.usedOnProducts) setErrors((prev) => ({ ...prev, usedOnProducts: undefined }))
          }}
        />
        {errors.usedOnProducts ? (
          <p className="-mt-3 mb-0 text-[12px] font-semibold text-vpos-red">{errors.usedOnProducts}</p>
        ) : null}

        <SelectField
          label="Status"
          name="status"
          value={status}
          onChange={(e) => setStatus(e.target.value as 'Active' | 'Inactive')}
          options={[
            { value: 'Active', label: 'Active' },
            { value: 'Inactive', label: 'Inactive' },
          ]}
        />
      </form>
    </Modal>
  )
}

export function ProductOptionsPage() {
  const { storeId, setStoreId } = useAdminStore()
  const { toast } = useToast()
  const [options, setOptions] = useState<ProductOptionType[]>(
    () => readStoredValue<ProductOptionType[]>(STORAGE_KEY, initialOptions)
  )
  const [formOpen, setFormOpen] = useState(false)
  const [editingOption, setEditingOption] = useState<ProductOptionType | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ProductOptionType | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const activeOptions = options.filter((o) => o.status === 'Active').length
  const totalUsedOnProducts = options.reduce((total, o) => total + o.usedOnProducts, 0)

  const openCreate = () => {
    setEditingOption(null)
    setFormOpen(true)
  }

  const openEdit = (option: ProductOptionType) => {
    setEditingOption(option)
    setFormOpen(true)
  }

  const handleSave = (saved: ProductOptionType, isEdit: boolean) => {
    setOptions((prev) => {
      const next = isEdit
        ? prev.map((o) => (o.id === saved.id ? saved : o))
        : [...prev, saved]
      writeStoredValue(STORAGE_KEY, next)
      return next
    })
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      await new Promise((resolve) => setTimeout(resolve, 300))
      setOptions((prev) => {
        const next = prev.filter((o) => o.id !== deleteTarget.id)
        writeStoredValue(STORAGE_KEY, next)
        return next
      })
      toast(`${deleteTarget.name} was deleted.`, 'success')
      setDeleteTarget(null)
    } catch {
      toast('Failed to delete option.', 'error')
    } finally {
      setIsDeleting(false)
    }
  }

  const columns: DataTableColumn<ProductOptionType>[] = [
    {
      id: 'name',
      header: 'Option name',
      searchable: (o) => o.name,
      cell: (o) => (
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-vpos-sand text-vpos-primary">
            <Icon name="list-settings-line" />
          </span>
          <strong className="text-[14px]">{o.name}</strong>
        </div>
      ),
    },
    {
      id: 'values',
      header: 'Values',
      searchable: (o) => o.values.join(' '),
      cell: (o) => (
        <div className="flex flex-wrap gap-1">
          {o.values.map((v) => (
            <span
              key={v}
              className="inline-flex rounded-full border border-vpos-line bg-vpos-subtle px-2.5 py-0.5 text-[12px] font-bold text-vpos-text"
            >
              {v}
            </span>
          ))}
        </div>
      ),
    },
    {
      id: 'used',
      header: 'Used on products',
      hideOnMobile: true,
      cell: (o) => (
        <span className="inline-flex min-w-8 justify-center rounded-[4px] border border-vpos-line bg-white px-2 py-1 font-mono text-[12px] font-bold">
          {o.usedOnProducts}
        </span>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      searchable: (o) => o.status,
      cell: (o) => <Status value={o.status} />,
    },
    {
      id: 'actions',
      header: '',
      cell: (o) => (
        <div className="flex items-center gap-1">
          <Button
            variant="text"
            onClick={() => openEdit(o)}
            aria-label={`Edit ${o.name}`}
          >
            Edit
          </Button>
          <Button
            variant="text"
            className="text-vpos-red hover:text-vpos-red"
            onClick={() => setDeleteTarget(o)}
            aria-label={`Delete ${o.name}`}
          >
            Delete
          </Button>
        </div>
      ),
    },
  ]

  return (
    <>
      <Topbar
        title="Products"
        subtitle="Option types for products — Size, Color, etc. (not stock items)"
        actions={<StoreSwitcher value={storeId} onChange={setStoreId} />}
      />
      <main className={pageContent}>
        <section className="mb-5 flex min-h-12 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Breadcrumb
            items={[
              { label: 'Products', to: paths.products },
              { label: 'Options' },
            ]}
          />
          <Button variant="primary" onClick={openCreate}>
            <Icon name="add-line" /> Add option type
          </Button>
        </section>

        <ProductsSubnav />

        <section className="mb-[18px] grid overflow-hidden rounded-[4px] border border-vpos-line bg-white shadow-vpos sm:grid-cols-[1fr_1fr_1.4fr]">
          <ReferenceStat label="Option types" value={options.length} detail={`${activeOptions} active`} />
          <ReferenceStat label="Product placements" value={totalUsedOnProducts} detail="Across this catalog" />
          <div className="flex items-center gap-3 border-t border-vpos-line bg-vpos-subtle/55 px-5 py-4 sm:border-t-0 sm:border-l">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[4px] bg-white text-vpos-primary shadow-sm">
              <Icon name="information-line" />
            </span>
            <p className="m-0 text-[12px] leading-relaxed text-vpos-muted">
              <strong className="text-vpos-text">Active management.</strong> Create, edit, and delete option types for your product catalog.
            </p>
          </div>
        </section>

        <DataTable
          data={options}
          columns={columns}
          rowKey={(o) => o.id}
          title="Option types"
          searchPlaceholder="Search option name or value…"
          pageSize={10}
          emptyMessage="No option types are configured."
          emptyIcon="list-settings-line"
        />

        <OptionFormModal
          open={formOpen}
          option={editingOption}
          onClose={() => {
            setFormOpen(false)
            setEditingOption(null)
          }}
          onSave={handleSave}
        />

        <Modal
          open={Boolean(deleteTarget)}
          onClose={() => !isDeleting && setDeleteTarget(null)}
          title="Delete option type?"
          description="This option type will be permanently removed from the catalog."
          size="sm"
          footer={
            <>
              <Button variant="secondary" disabled={isDeleting} onClick={() => setDeleteTarget(null)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                className="bg-vpos-red hover:bg-vpos-red"
                disabled={isDeleting}
                onClick={confirmDelete}
              >
                {isDeleting ? 'Deleting…' : 'Delete option'}
              </Button>
            </>
          }
        >
          <p className="m-0 text-[14px] text-vpos-muted">
            {deleteTarget ? (
              <>
                You are deleting{' '}
                <strong className="text-vpos-text">{deleteTarget.name}</strong>.
                This action cannot be undone.
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
