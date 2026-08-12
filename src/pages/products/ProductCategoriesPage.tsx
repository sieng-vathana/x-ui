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
import { cn } from '../../lib/cn'
import { paths } from '../../lib/paths'
import { pageContent } from '../../lib/ui'
import { useToast } from '../../context/ToastContext'
import { readStoredValue, writeStoredValue } from '../../lib/storage'
import {
  useProductCategories,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
} from '../../features/products/useProducts'
import type { ProductCategory } from '../../features/products/types'

type CategoryTone = 'coffee' | 'tea' | 'bakery' | 'meal' | 'cold' | 'extra'

const CATEGORY_STYLE_KEY = 'x-ui:product-categories-style'

interface CategoryStyle {
  icon: string
  tone: CategoryTone
}

function readStyles(): Record<number, CategoryStyle> {
  return readStoredValue<Record<number, CategoryStyle>>(CATEGORY_STYLE_KEY, {})
}

function writeStyles(styles: Record<number, CategoryStyle>) {
  writeStoredValue(CATEGORY_STYLE_KEY, styles)
}

function getCategoryIcon(tone: CategoryTone): string {
  const map: Record<CategoryTone, string> = {
    coffee: 'cup-line',
    tea: 'cup-line',
    bakery: 'cake-line',
    meal: 'restaurant-line',
    cold: 'snowy-line',
    extra: 'add-line',
  }
  return map[tone]
}

const categoryToneClasses: Record<CategoryTone, string> = {
  coffee: 'bg-[#efe4d4] text-[#7a4a21]',
  tea: 'bg-[#e0eee4] text-[#327044]',
  bakery: 'bg-[#f8e8da] text-[#a25727]',
  meal: 'bg-[#f5e4e5] text-[#9a424b]',
  cold: 'bg-[#e0edf5] text-[#336b8c]',
  extra: 'bg-vpos-subtle text-vpos-muted',
}

const toneOptions: { value: CategoryTone; label: string }[] = [
  { value: 'coffee', label: 'Coffee' },
  { value: 'tea', label: 'Tea' },
  { value: 'bakery', label: 'Bakery' },
  { value: 'meal', label: 'Meal' },
  { value: 'cold', label: 'Cold drinks' },
  { value: 'extra', label: 'Add-ons' },
]

function inferToneFromName(name: string): CategoryTone {
  const lower = name.toLowerCase()
  if (lower.includes('coffee')) return 'coffee'
  if (lower.includes('tea')) return 'tea'
  if (lower.includes('bakery') || lower.includes('pastry')) return 'bakery'
  if (lower.includes('meal') || lower.includes('food')) return 'meal'
  if (lower.includes('cold') || lower.includes('drink')) return 'cold'
  return 'extra'
}

interface CategoryFormData {
  code: string
  name: string
  description: string
  icon: string
  tone: CategoryTone
  sortOrder: number
  isGlobal: boolean
  isFeatured: boolean
  status: string
}

interface FormErrors {
  code?: string
  name?: string
  icon?: string
  sortOrder?: string
}

function validateForm(data: CategoryFormData): FormErrors {
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
  if (data.sortOrder < 0 || !Number.isInteger(data.sortOrder)) {
    errors.sortOrder = 'Must be a whole number (0 or more).'
  }
  return errors
}

function toFormDefaults(category: ProductCategory | null): CategoryFormData {
  const styles = readStyles()
  const style = category ? styles[category.id] : undefined
  return {
    code: category?.categoryCode ?? '',
    name: category?.categoryName ?? '',
    description: category?.description ?? '',
    icon: style?.icon ?? (category ? getCategoryIcon(inferToneFromName(category.categoryName)) : ''),
    tone: style?.tone ?? (category ? inferToneFromName(category.categoryName) : 'coffee'),
    sortOrder: category?.sortOrder ?? 10,
    isGlobal: category?.isGlobal ?? false,
    isFeatured: category?.isFeatured ?? false,
    status: category?.status ?? 'ACTIVE',
  }
}

interface CategoryFormModalProps {
  open: boolean
  category: ProductCategory | null
  onClose: () => void
  onSave: (data: {
    payload: {
      categoryCode: string
      categoryName: string
      description?: string
      sortOrder: number
      isGlobal: boolean
      isFeatured: boolean
      status: string
      storeIds?: number[]
    }
    style: CategoryStyle
    isEdit: boolean
    id?: number
  }) => Promise<void>
  isSaving: boolean
}

function CategoryFormModal({ open, category, onClose, onSave, isSaving }: CategoryFormModalProps) {
  const defaults = toFormDefaults(category)
  const isEditing = Boolean(category)
  const [code, setCode] = useState(defaults.code)
  const [name, setName] = useState(defaults.name)
  const [description, setDescription] = useState(defaults.description)
  const [icon, setIcon] = useState(defaults.icon)
  const [tone, setTone] = useState<CategoryTone>(defaults.tone)
  const [sortOrder, setSortOrder] = useState(defaults.sortOrder)
  const [isGlobal, setIsGlobal] = useState(defaults.isGlobal)
  const [isFeatured, setIsFeatured] = useState(defaults.isFeatured)
  const [status, setStatus] = useState(defaults.status)
  const [errors, setErrors] = useState<FormErrors>({})

  const resetForm = () => {
    const d = toFormDefaults(category)
    setCode(d.code)
    setName(d.name)
    setDescription(d.description)
    setIcon(d.icon)
    setTone(d.tone)
    setSortOrder(d.sortOrder)
    setIsGlobal(d.isGlobal)
    setIsFeatured(d.isFeatured)
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
    const trimmedIcon = icon.trim()

    const validation = validateForm({
      code: trimmedCode,
      name: trimmedName,
      description: trimmedDesc,
      icon: trimmedIcon,
      tone,
      sortOrder,
      isGlobal,
      isFeatured,
      status,
    })
    if (Object.keys(validation).length > 0) {
      setErrors(validation)
      return
    }

    const payload = {
      categoryCode: trimmedCode,
      categoryName: trimmedName,
      description: trimmedDesc || undefined,
      sortOrder,
      isGlobal,
      isFeatured,
      status,
      storeIds: category?.storeIds,
    }

    const style: CategoryStyle = { icon: trimmedIcon, tone }

    await onSave({
      payload,
      style,
      isEdit: isEditing,
      id: category?.id,
    })

    handleClose()
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={isEditing ? 'Edit category' : 'Add category'}
      description={isEditing ? 'Update product category details.' : 'Create a new product category.'}
      size="sm"
      footer={
        <>
          <Button variant="secondary" type="button" onClick={handleClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" onClick={handleSubmit} disabled={isSaving}>
            {isSaving ? 'Saving…' : isEditing ? 'Save changes' : 'Create category'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <FormField
          label="Code"
          required
          name="code"
          placeholder="e.g. COF"
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
          placeholder="e.g. Coffee"
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }))
          }}
        />
        {errors.name ? (
          <p className="-mt-3 mb-0 text-[12px] font-semibold text-vpos-red">{errors.name}</p>
        ) : null}

        <div className="flex gap-3">
          <div className="flex-1">
            <FormField
              label="Icon"
              required
              name="icon"
              placeholder="e.g. cup-line"
              value={icon}
              onChange={(e) => {
                setIcon(e.target.value)
                if (errors.icon) setErrors((prev) => ({ ...prev, icon: undefined }))
              }}
            />
          </div>
          <div className="flex-1">
            <SelectField
              label="Tone"
              name="tone"
              value={tone}
              onChange={(e) => setTone(e.target.value as CategoryTone)}
              options={toneOptions}
            />
          </div>
        </div>
        {errors.icon ? (
          <p className="-mt-3 mb-0 text-[12px] font-semibold text-vpos-red">{errors.icon}</p>
        ) : null}

        <FormField
          label="Description"
          name="description"
          placeholder="e.g. Hot and cold coffee beverages"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

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
          label="Coverage"
          name="isGlobal"
          value={isGlobal ? 'true' : 'false'}
          onChange={(e) => setIsGlobal(e.target.value === 'true')}
          options={[
            { value: 'false', label: 'Store-specific' },
            { value: 'true', label: 'All stores (global)' },
          ]}
        />

        <SelectField
          label="Featured"
          name="isFeatured"
          value={isFeatured ? 'true' : 'false'}
          onChange={(e) => setIsFeatured(e.target.value === 'true')}
          options={[
            { value: 'false', label: 'No' },
            { value: 'true', label: 'Yes — show on storefront' },
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

export function ProductCategoriesPage() {
  const { storeId, setStoreId } = useAdminStore()
  const { toast } = useToast()
  const { data: categories = [], isLoading } = useProductCategories(storeId)
  const createCategoryMutation = useCreateCategory()
  const updateCategoryMutation = useUpdateCategory()
  const deleteCategoryMutation = useDeleteCategory()

  const [formOpen, setFormOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<ProductCategory | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ProductCategory | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const activeCategories = categories.filter((c) => c.status === 'ACTIVE').length
  const featuredCount = categories.filter((c) => c.isFeatured).length
  const globalCount = categories.filter((c) => c.isGlobal).length

  const openCreate = () => {
    setEditingCategory(null)
    setFormOpen(true)
  }

  const openEdit = (category: ProductCategory) => {
    setEditingCategory(category)
    setFormOpen(true)
  }

  const handleSave = async (data: {
    payload: {
      categoryCode: string
      categoryName: string
      description?: string
      sortOrder: number
      isGlobal: boolean
      isFeatured: boolean
      status: string
      storeIds?: number[]
    }
    style: CategoryStyle
    isEdit: boolean
    id?: number
  }) => {
    setIsSaving(true)
    try {
      let categoryId: number | undefined = data.id

      if (data.isEdit && categoryId !== undefined) {
        await updateCategoryMutation.mutateAsync({ id: categoryId, payload: data.payload })
        toast(`${data.payload.categoryName} was updated.`, 'success')
      } else {
        const created = await createCategoryMutation.mutateAsync(data.payload)
        categoryId = created.id
        toast(`${data.payload.categoryName} was created.`, 'success')
      }

      if (categoryId !== undefined) {
        const styles = readStyles()
        styles[categoryId] = data.style
        writeStyles(styles)
      }
    } catch (err: any) {
      toast(err?.message || 'Failed to save category.', 'error')
      throw err
    } finally {
      setIsSaving(false)
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteCategoryMutation.mutateAsync(deleteTarget.id)
      const styles = readStyles()
      delete styles[deleteTarget.id]
      writeStyles(styles)
      toast(`${deleteTarget.categoryName} was deleted.`, 'success')
      setDeleteTarget(null)
    } catch (err: any) {
      toast(err?.message || 'Failed to delete category.', 'error')
    }
  }

  const columns: DataTableColumn<ProductCategory>[] = [
    {
      id: 'category',
      header: 'Category',
      searchable: (category) => `${category.categoryName} ${category.categoryCode}`,
      cell: (category) => {
        const styles = readStyles()
        const style = styles[category.id]
        const tone = style?.tone ?? inferToneFromName(category.categoryName)
        const icon = style?.icon ?? getCategoryIcon(tone)
        return (
          <div className="flex items-center gap-3">
            <span
              className={cn(
                'grid h-10 w-10 place-items-center rounded-[4px] text-[19px]',
                categoryToneClasses[tone] ?? categoryToneClasses.extra,
              )}
            >
              <Icon name={icon as any} />
            </span>
            <span>
              <strong className="block text-[14px]">{category.categoryName}</strong>
              <small className="mt-0.5 block font-mono text-[11px] font-bold tracking-[0.06em] text-vpos-muted">
                {category.categoryCode}
              </small>
            </span>
          </div>
        )
      },
    },
    {
      id: 'sort',
      header: 'Sort order',
      hideOnMobile: true,
      cell: (category) => (
        <span className="inline-flex min-w-8 justify-center rounded-[4px] border border-vpos-line bg-white px-2 py-1 font-mono text-[12px] font-bold">
          {category.sortOrder ?? 10}
        </span>
      ),
    },
    {
      id: 'featured',
      header: 'Featured',
      hideOnMobile: true,
      cell: (category) =>
        category.isFeatured ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-vpos-sand px-2.5 py-0.5 text-[12px] font-bold text-vpos-primary">
            <Icon name="star-fill" />
            Featured
          </span>
        ) : (
          <span className="text-[13px] text-vpos-muted">—</span>
        ),
    },
    {
      id: 'stores',
      header: 'Stores',
      hideOnMobile: true,
      cell: (category) =>
        category.isGlobal ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-vpos-sand px-2.5 py-0.5 text-[12px] font-bold text-vpos-primary">
            <Icon name="global-line" />
            All stores
          </span>
        ) : (
          <strong>{category.storeIds?.length ?? 0}</strong>
        ),
    },
    {
      id: 'status',
      header: 'Status',
      searchable: (category) => category.status ?? '',
      cell: (category) => <Status value={category.status ?? 'ACTIVE'} />,
    },
    {
      id: 'actions',
      header: '',
      cell: (category) => (
        <div className="flex items-center gap-1">
          <Button
            variant="text"
            onClick={() => openEdit(category)}
            aria-label={`Edit ${category.categoryName}`}
          >
            Edit
          </Button>
          {category.status !== 'DELETED' && (
            <Button
              variant="text"
              className="text-vpos-red hover:text-vpos-red"
              onClick={() => setDeleteTarget(category)}
              aria-label={`Delete ${category.categoryName}`}
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
        subtitle="Categories that organize products across storefronts and reports"
        actions={<StoreSwitcher value={storeId} onChange={setStoreId} />}
      />
      <main className={pageContent}>
        <section className="mb-5 flex min-h-12 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Breadcrumb
            items={[
              { label: 'Products', to: paths.products },
              { label: 'Categories' },
            ]}
          />
          <Button variant="primary" onClick={openCreate}>
            <Icon name="add-line" /> Add category
          </Button>
        </section>

        <ProductsSubnav />

        <section className="mb-[18px] grid overflow-hidden rounded-[4px] border border-vpos-line bg-white shadow-vpos sm:grid-cols-[1fr_1fr_1.4fr]">
          <ReferenceStat label="Categories" value={categories.length} detail={`${activeCategories} active`} />
          <ReferenceStat label="Categories featured" value={featuredCount} detail={`${globalCount} global`} />
          <div className="flex items-center gap-3 border-t border-vpos-line bg-vpos-subtle/55 px-5 py-4 sm:border-t-0 sm:border-l">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[4px] bg-white text-vpos-primary shadow-sm">
              <Icon name="information-line" />
            </span>
            <p className="m-0 text-[12px] leading-relaxed text-vpos-muted">
              <strong className="text-vpos-text">Active management.</strong> Create, edit, and delete product categories for your catalog.
            </p>
          </div>
        </section>

        {isLoading ? (
          <div className="flex items-center justify-center py-20 text-vpos-muted">
            <Icon name="loader-line" /> <span className="ml-2 text-[14px]">Loading categories…</span>
          </div>
        ) : (
          <DataTable
            data={categories}
            columns={columns}
            rowKey={(category) => String(category.id)}
            title="Product categories"
            searchPlaceholder="Search category name or code…"
            pageSize={10}
            emptyMessage="No product categories are configured."
            emptyIcon="folder-open-line"
          />
        )}

        <CategoryFormModal
          open={formOpen}
          category={editingCategory}
          onClose={() => {
            setFormOpen(false)
            setEditingCategory(null)
          }}
          onSave={handleSave}
          isSaving={isSaving}
        />

        <Modal
          open={Boolean(deleteTarget)}
          onClose={() => !deleteCategoryMutation.isPending && setDeleteTarget(null)}
          title="Delete category?"
          description="This category will be deactivated. It can still be recovered if needed."
          size="sm"
          footer={
            <>
              <Button variant="secondary" disabled={deleteCategoryMutation.isPending} onClick={() => setDeleteTarget(null)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                className="bg-vpos-red hover:bg-vpos-red"
                disabled={deleteCategoryMutation.isPending}
                onClick={confirmDelete}
              >
                {deleteCategoryMutation.isPending ? 'Deleting…' : 'Delete category'}
              </Button>
            </>
          }
        >
          <p className="m-0 text-[14px] text-vpos-muted">
            {deleteTarget ? (
              <>
                You are deleting{' '}
                <strong className="text-vpos-text">{deleteTarget.categoryName}</strong>.
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
