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
  productBrands as initialBrands,
  type ProductBrandReference,
} from '../../data/product-reference-mockup'
import { useAdminStore } from '../../hooks/useAdminStore'
import { cn } from '../../lib/cn'
import { paths } from '../../lib/paths'
import { pageContent } from '../../lib/ui'
import { useToast } from '../../context/ToastContext'
import { readStoredValue, writeStoredValue } from '../../lib/storage'

const STORAGE_KEY = 'x-ui:product-brands'
const ID_COUNTER_KEY = 'x-ui:product-brands-id-counter'

function nextId(): string {
  const counter = readStoredValue<number>(ID_COUNTER_KEY, 0) + 1
  writeStoredValue(ID_COUNTER_KEY, counter)
  return `brand-${Date.now()}-${counter}`
}

interface BrandFormData {
  code: string
  name: string
  icon: string
  productCount: number
  storeCount: number
  sortOrder: number
  status: 'Active' | 'Inactive'
}

interface FormErrors {
  code?: string
  name?: string
  icon?: string
  productCount?: string
  storeCount?: string
  sortOrder?: string
}

function validateForm(data: BrandFormData): FormErrors {
  const errors: FormErrors = {}
  if (!data.code.trim()) {
    errors.code = 'Code is required.'
  } else if (data.code.trim().length > 5) {
    errors.code = 'Code must be 5 characters or fewer.'
  }
  if (!data.name.trim()) {
    errors.name = 'Name is required.'
  } else if (data.name.trim().length < 2) {
    errors.name = 'Name must be at least 2 characters.'
  }
  if (!data.icon.trim()) {
    errors.icon = 'Icon is required.'
  }
  if (data.productCount < 0 || !Number.isInteger(data.productCount)) {
    errors.productCount = 'Must be a whole number (0 or more).'
  }
  if (data.storeCount < 0 || !Number.isInteger(data.storeCount)) {
    errors.storeCount = 'Must be a whole number (0 or more).'
  }
  if (data.sortOrder < 0 || !Number.isInteger(data.sortOrder)) {
    errors.sortOrder = 'Must be a whole number (0 or more).'
  }
  return errors
}

const brandColumns: DataTableColumn<ProductBrandReference>[] = [
  {
    id: 'brand',
    header: 'Brand',
    searchable: (brand) => `${brand.name} ${brand.code}`,
    cell: (brand) => (
      <div className="flex items-center gap-3">
        <span className={cn('grid h-10 w-10 place-items-center rounded-[4px] text-[19px] bg-vpos-subtle text-vpos-primary')}>
          <Icon name={brand.icon as any} />
        </span>
        <span>
          <strong className="block text-[14px]">{brand.name}</strong>
          <small className="mt-0.5 block font-mono text-[11px] font-bold tracking-[0.06em] text-vpos-muted">
            {brand.code}
          </small>
        </span>
      </div>
    ),
  },
  {
    id: 'products',
    header: 'Products',
    cell: (brand) => <strong>{brand.productCount}</strong>,
  },
  {
    id: 'stores',
    header: 'Stores',
    hideOnMobile: true,
    cell: (brand) => brand.storeCount,
  },
  {
    id: 'sort',
    header: 'Sort order',
    hideOnMobile: true,
    cell: (brand) => (
      <span className="inline-flex min-w-8 justify-center rounded-[4px] border border-vpos-line bg-white px-2 py-1 font-mono text-[12px] font-bold">
        {brand.sortOrder}
      </span>
    ),
  },
  {
    id: 'status',
    header: 'Status',
    searchable: (brand) => brand.status,
    cell: (brand) => <Status value={brand.status} />,
  },
  {
    id: 'actions',
    header: '',
    cell: () => null,
  },
]

interface BrandFormModalProps {
  open: boolean
  brand: ProductBrandReference | null
  onClose: () => void
  onSave: (brand: ProductBrandReference, isEdit: boolean) => void
}

function BrandFormModal({ open, brand, onClose, onSave }: BrandFormModalProps) {
  const isEditing = Boolean(brand)
  const [code, setCode] = useState(brand?.code ?? '')
  const [name, setName] = useState(brand?.name ?? '')
  const [icon, setIcon] = useState(brand?.icon ?? '')
  const [productCount, setProductCount] = useState(brand?.productCount ?? 0)
  const [storeCount, setStoreCount] = useState(brand?.storeCount ?? 0)
  const [sortOrder, setSortOrder] = useState(brand?.sortOrder ?? 10)
  const [status, setStatus] = useState<'Active' | 'Inactive'>(brand?.status ?? 'Active')
  const [errors, setErrors] = useState<FormErrors>({})
  const { toast } = useToast()

  const resetForm = () => {
    setCode(brand?.code ?? '')
    setName(brand?.name ?? '')
    setIcon(brand?.icon ?? '')
    setProductCount(brand?.productCount ?? 0)
    setStoreCount(brand?.storeCount ?? 0)
    setSortOrder(brand?.sortOrder ?? 10)
    setStatus(brand?.status ?? 'Active')
    setErrors({})
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const trimmedCode = code.trim().toUpperCase()
    const trimmedName = name.trim()
    const trimmedIcon = icon.trim()

    const validation = validateForm({
      code: trimmedCode,
      name: trimmedName,
      icon: trimmedIcon,
      productCount,
      storeCount,
      sortOrder,
      status,
    })
    if (Object.keys(validation).length > 0) {
      setErrors(validation)
      return
    }

    if (isEditing && brand) {
      const updated: ProductBrandReference = {
        ...brand,
        code: trimmedCode,
        name: trimmedName,
        icon: trimmedIcon,
        productCount,
        storeCount,
        sortOrder,
        status,
      }
      onSave(updated, true)
      toast(`${trimmedName} was updated.`, 'success')
    } else {
      const created: ProductBrandReference = {
        id: nextId(),
        code: trimmedCode,
        name: trimmedName,
        icon: trimmedIcon,
        productCount,
        storeCount,
        sortOrder,
        status,
      }
      onSave(created, false)
      toast(`${trimmedName} was created.`, 'success')
    }

    handleClose()
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={isEditing ? 'Edit brand' : 'Add brand'}
      description={isEditing ? 'Update product brand details.' : 'Create a new product brand.'}
      size="sm"
      footer={
        <>
          <Button variant="secondary" type="button" onClick={handleClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" onClick={handleSubmit}>
            {isEditing ? 'Save changes' : 'Create brand'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <FormField
          label="Code"
          required
          name="code"
          placeholder="e.g. PRM"
          maxLength={5}
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
          placeholder="e.g. Premium Blend"
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
          label="Icon"
          required
          name="icon"
          placeholder="e.g. star-line"
          value={icon}
          onChange={(e) => {
            setIcon(e.target.value)
            if (errors.icon) setErrors((prev) => ({ ...prev, icon: undefined }))
          }}
        />
        {errors.icon ? (
          <p className="-mt-3 mb-0 text-[12px] font-semibold text-vpos-red">{errors.icon}</p>
        ) : null}

        <FormField
          label="Products"
          name="productCount"
          type="number"
          min={0}
          step={1}
          value={productCount}
          onChange={(e) => {
            const v = parseInt(e.target.value, 10)
            setProductCount(Number.isNaN(v) ? 0 : v)
            if (errors.productCount) setErrors((prev) => ({ ...prev, productCount: undefined }))
          }}
        />
        {errors.productCount ? (
          <p className="-mt-3 mb-0 text-[12px] font-semibold text-vpos-red">{errors.productCount}</p>
        ) : null}

        <FormField
          label="Stores"
          name="storeCount"
          type="number"
          min={0}
          step={1}
          value={storeCount}
          onChange={(e) => {
            const v = parseInt(e.target.value, 10)
            setStoreCount(Number.isNaN(v) ? 0 : v)
            if (errors.storeCount) setErrors((prev) => ({ ...prev, storeCount: undefined }))
          }}
        />
        {errors.storeCount ? (
          <p className="-mt-3 mb-0 text-[12px] font-semibold text-vpos-red">{errors.storeCount}</p>
        ) : null}

        <FormField
          label="Sort order"
          name="sortOrder"
          type="number"
          min={0}
          step={10}
          value={sortOrder}
          onChange={(e) => {
            const v = parseInt(e.target.value, 10)
            setSortOrder(Number.isNaN(v) ? 0 : v)
            if (errors.sortOrder) setErrors((prev) => ({ ...prev, sortOrder: undefined }))
          }}
        />
        {errors.sortOrder ? (
          <p className="-mt-3 mb-0 text-[12px] font-semibold text-vpos-red">{errors.sortOrder}</p>
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

export function ProductBrandsPage() {
  const { storeId, setStoreId } = useAdminStore()
  const { toast } = useToast()
  const [brands, setBrands] = useState<ProductBrandReference[]>(
    () => readStoredValue<ProductBrandReference[]>(STORAGE_KEY, initialBrands)
  )
  const [formOpen, setFormOpen] = useState(false)
  const [editingBrand, setEditingBrand] = useState<ProductBrandReference | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ProductBrandReference | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const activeBrands = brands.filter((b) => b.status === 'Active').length
  const assignedProducts = brands.reduce((total, b) => total + b.productCount, 0)

  const openCreate = () => {
    setEditingBrand(null)
    setFormOpen(true)
  }

  const openEdit = (brand: ProductBrandReference) => {
    setEditingBrand(brand)
    setFormOpen(true)
  }

  const handleSave = (saved: ProductBrandReference, isEdit: boolean) => {
    setBrands((prev) => {
      const next = isEdit
        ? prev.map((b) => (b.id === saved.id ? saved : b))
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
      setBrands((prev) => {
        const next = prev.filter((b) => b.id !== deleteTarget.id)
        writeStoredValue(STORAGE_KEY, next)
        return next
      })
      toast(`${deleteTarget.name} was deleted.`, 'success')
      setDeleteTarget(null)
    } catch {
      toast('Failed to delete brand.', 'error')
    } finally {
      setIsDeleting(false)
    }
  }

  const columns: DataTableColumn<ProductBrandReference>[] = brandColumns.map((col) => {
    if (col.id === 'actions') {
      return {
        ...col,
        cell: (brand: ProductBrandReference) => (
          <div className="flex items-center gap-1">
            <Button
              variant="text"
              onClick={() => openEdit(brand)}
              aria-label={`Edit ${brand.name}`}
            >
              Edit
            </Button>
            <Button
              variant="text"
              className="text-vpos-red hover:text-vpos-red"
              onClick={() => setDeleteTarget(brand)}
              aria-label={`Delete ${brand.name}`}
            >
              Delete
            </Button>
          </div>
        ),
      }
    }
    return col
  })

  return (
    <>
      <Topbar
        title="Products"
        subtitle="Brands that organize products and supply-chain visibility"
        actions={<StoreSwitcher value={storeId} onChange={setStoreId} />}
      />
      <main className={pageContent}>
        <section className="mb-5 flex min-h-12 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Breadcrumb
            items={[
              { label: 'Products', to: paths.products },
              { label: 'Brands' },
            ]}
          />
          <Button variant="primary" onClick={openCreate}>
            <Icon name="add-line" /> Add brand
          </Button>
        </section>

        <ProductsSubnav />

        <section className="mb-[18px] grid overflow-hidden rounded-[4px] border border-vpos-line bg-white shadow-vpos sm:grid-cols-[1fr_1fr_1.4fr]">
          <ReferenceStat label="Brands" value={brands.length} detail={`${activeBrands} active`} />
          <ReferenceStat label="Product placements" value={assignedProducts} detail="Across this catalog" />
          <div className="flex items-center gap-3 border-t border-vpos-line bg-vpos-subtle/55 px-5 py-4 sm:border-t-0 sm:border-l">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[4px] bg-white text-vpos-primary shadow-sm">
              <Icon name="information-line" />
            </span>
            <p className="m-0 text-[12px] leading-relaxed text-vpos-muted">
              <strong className="text-vpos-text">Active management.</strong> Create, edit, and delete product brands for your catalog.
            </p>
          </div>
        </section>

        <DataTable
          data={brands}
          columns={columns}
          rowKey={(brand) => brand.id}
          title="Product brands"
          searchPlaceholder="Search brand name or code…"
          pageSize={10}
          emptyMessage="No product brands are configured."
          emptyIcon="folder-open-line"
        />

        <BrandFormModal
          open={formOpen}
          brand={editingBrand}
          onClose={() => {
            setFormOpen(false)
            setEditingBrand(null)
          }}
          onSave={handleSave}
        />

        <Modal
          open={Boolean(deleteTarget)}
          onClose={() => !isDeleting && setDeleteTarget(null)}
          title="Delete brand?"
          description="This brand will be permanently removed from the catalog."
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
                {isDeleting ? 'Deleting…' : 'Delete brand'}
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
