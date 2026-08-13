import { useMemo, useRef, useState } from 'react'
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
import { useStoresRaw } from '../../features/stores/useStores'
import { fileApi } from '../../features/files/fileApi'
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
  image: string
  icon: string
  tone: CategoryTone
  sortOrder: number
  isGlobal: boolean
  storeIds: number[]
  isFeatured: boolean
  status: string
}

interface FormErrors {
  code?: string
  name?: string
  icon?: string
  sortOrder?: string
  storeIds?: string
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
  if (!data.isGlobal && data.storeIds.length === 0) {
    errors.storeIds = 'Please select at least one store for store-specific coverage.'
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
    image: category?.image ?? '',
    icon: style?.icon ?? (category ? getCategoryIcon(inferToneFromName(category.categoryName)) : ''),
    tone: style?.tone ?? (category ? inferToneFromName(category.categoryName) : 'coffee'),
    sortOrder: category?.sortOrder ?? 10,
    isGlobal: category?.isGlobal ?? true,
    storeIds: category?.storeIds ? Array.from(category.storeIds) : [],
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
      image?: string
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
  const { data: stores = [] } = useStoresRaw()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const defaults = toFormDefaults(category)
  const isEditing = Boolean(category)
  const [code, setCode] = useState(defaults.code)
  const [name, setName] = useState(defaults.name)
  const [description, setDescription] = useState(defaults.description)
  const [image, setImage] = useState(defaults.image)
  const [icon, setIcon] = useState(defaults.icon)
  const [tone, setTone] = useState<CategoryTone>(defaults.tone)
  const [sortOrder, setSortOrder] = useState(defaults.sortOrder)
  const [isGlobal, setIsGlobal] = useState(defaults.isGlobal)
  const [storeIds, setStoreIds] = useState<number[]>(defaults.storeIds)
  const [isFeatured, setIsFeatured] = useState(defaults.isFeatured)
  const [status, setStatus] = useState(defaults.status)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})

  const resetForm = () => {
    const d = toFormDefaults(category)
    setCode(d.code)
    setName(d.name)
    setDescription(d.description)
    setImage(d.image)
    setIcon(d.icon)
    setTone(d.tone)
    setSortOrder(d.sortOrder)
    setIsGlobal(d.isGlobal)
    setStoreIds(d.storeIds)
    setIsFeatured(d.isFeatured)
    setStatus(d.status)
    setErrors({})
    setIsUploadingImage(false)
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    const file = files[0]
    setIsUploadingImage(true)
    try {
      const response = await fileApi.upload(file)
      const uploadedUrl = response.url?.trim() || ''
      if (uploadedUrl) {
        setImage(uploadedUrl)
      }
    } catch (err: any) {
      console.error('Image upload failed', err)
    } finally {
      setIsUploadingImage(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleToggleStore = (storeId: number) => {
    setStoreIds((prev) => {
      const exists = prev.includes(storeId)
      const updated = exists ? prev.filter((id) => id !== storeId) : [...prev, storeId]
      if (updated.length > 0 && errors.storeIds) {
        setErrors((e) => ({ ...e, storeIds: undefined }))
      }
      return updated
    })
  }

  const handleSelectAllStores = () => {
    const allIds = stores.map((s) => Number(s.id))
    setStoreIds(allIds)
    if (errors.storeIds) setErrors((e) => ({ ...e, storeIds: undefined }))
  }

  const handleClearStores = () => {
    setStoreIds([])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const trimmedCode = code.trim().toUpperCase()
    const trimmedName = name.trim()
    const trimmedDesc = description.trim()
    const trimmedImage = image.trim()
    const trimmedIcon = icon.trim()

    const validation = validateForm({
      code: trimmedCode,
      name: trimmedName,
      description: trimmedDesc,
      image: trimmedImage,
      icon: trimmedIcon,
      tone,
      sortOrder,
      isGlobal,
      storeIds,
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
      image: trimmedImage || undefined,
      sortOrder,
      isGlobal,
      isFeatured,
      status,
      storeIds: isGlobal ? [] : storeIds,
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
      description={isEditing ? 'Update product category details and store coverage.' : 'Create a new product category for your catalog.'}
      size="2xl"
      panelClassName="max-w-2xl sm:max-w-2xl w-full"
      footer={
        <>
          <Button variant="secondary" type="button" onClick={handleClose} disabled={isSaving || isUploadingImage}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" onClick={handleSubmit} disabled={isSaving || isUploadingImage}>
            {isSaving ? 'Saving…' : isEditing ? 'Save changes' : 'Create category'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Category Image Upload / Preview */}
        <div>
          <label className="mb-1.5 block text-[13px] font-extrabold uppercase tracking-[.12em] text-vpos-primary">
            Category Image
          </label>
          <div className="flex items-start gap-4">
            {image ? (
              <div className="relative group h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-vpos-line bg-vpos-subtle shadow-xs">
                <img
                  src={image}
                  alt="Category preview"
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24"><text y="20" font-size="20">🖼️</text></svg>'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setImage('')}
                  className="absolute inset-0 grid place-items-center bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100"
                  title="Remove image"
                >
                  <Icon name="delete-bin-line" className="text-[18px]" />
                </button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  'flex h-20 w-20 shrink-0 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-vpos-line bg-vpos-subtle transition',
                  'hover:border-vpos-primary hover:bg-vpos-sand/30',
                )}
                role="button"
                tabIndex={0}
              >
                {isUploadingImage ? (
                  <Icon name="loader-line" className="animate-spin text-[20px] text-vpos-primary" />
                ) : (
                  <>
                    <Icon name="image-add-line" className="text-[20px] text-vpos-muted" />
                    <span className="mt-1 text-[10px] font-bold text-vpos-muted">Upload</span>
                  </>
                )}
              </div>
            )}

            <div className="flex-1 flex flex-col justify-center gap-2">
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => handleFileUpload(e.target.files)}
                />
                <Button
                  type="button"
                  variant="secondary"
                  className="px-3 py-1.5 text-[12px]"
                  disabled={isUploadingImage}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Icon name="upload-2-line" /> {isUploadingImage ? 'Uploading…' : image ? 'Replace image' : 'Upload image'}
                </Button>
                {image && (
                  <Button
                    type="button"
                    variant="text"
                    className="px-2 py-1.5 text-[12px] text-vpos-red hover:text-vpos-red"
                    onClick={() => setImage('')}
                  >
                    Remove
                  </Button>
                )}
              </div>
              <input
                type="text"
                placeholder="Or paste image URL (https://...)"
                value={image}
                onChange={(e) => setImage(e.target.value)}
                className="w-full rounded-[4px] border border-vpos-line bg-white px-3 py-1.5 text-[12px] text-vpos-text placeholder:text-vpos-muted focus:border-vpos-primary focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
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
              <p className="mt-1 text-[12px] font-semibold text-vpos-red">{errors.code}</p>
            ) : null}
          </div>

          <div>
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
              <p className="mt-1 text-[12px] font-semibold text-vpos-red">{errors.name}</p>
            ) : null}
          </div>
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <FormField
              label="Icon (Fallback)"
              required
              name="icon"
              placeholder="e.g. cup-line"
              value={icon}
              onChange={(e) => {
                setIcon(e.target.value)
                if (errors.icon) setErrors((prev) => ({ ...prev, icon: undefined }))
              }}
            />
            {errors.icon ? (
              <p className="mt-1 text-[12px] font-semibold text-vpos-red">{errors.icon}</p>
            ) : null}
          </div>
          <div className="flex-1">
            <SelectField
              label="Color Tone"
              name="tone"
              value={tone}
              onChange={(e) => setTone(e.target.value as CategoryTone)}
              options={toneOptions}
            />
          </div>
        </div>

        <FormField
          label="Description"
          name="description"
          placeholder="e.g. Hot and cold coffee beverages"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
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
              <p className="mt-1 text-[12px] font-semibold text-vpos-red">{errors.sortOrder}</p>
            ) : null}
          </div>

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
        </div>

        {/* Coverage & Store Selection */}
        <div className="rounded-xl border border-vpos-line bg-[#fbfcfd] p-4">
          <label className="mb-2 block text-[13px] font-extrabold uppercase tracking-[.12em] text-vpos-primary">
            Store Coverage
          </label>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setIsGlobal(true)
                if (errors.storeIds) setErrors((e) => ({ ...e, storeIds: undefined }))
              }}
              className={cn(
                'flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border text-[13px] font-bold transition',
                isGlobal
                  ? 'border-vpos-primary bg-vpos-sand/50 text-vpos-primary shadow-xs'
                  : 'border-vpos-line bg-white text-vpos-muted hover:bg-vpos-subtle',
              )}
            >
              <Icon name="global-line" />
              <span>All stores (Global)</span>
            </button>
            <button
              type="button"
              onClick={() => setIsGlobal(false)}
              className={cn(
                'flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border text-[13px] font-bold transition',
                !isGlobal
                  ? 'border-vpos-primary bg-vpos-sand/50 text-vpos-primary shadow-xs'
                  : 'border-vpos-line bg-white text-vpos-muted hover:bg-vpos-subtle',
              )}
            >
              <Icon name="store-2-line" />
              <span>Specific stores</span>
            </button>
          </div>

          {!isGlobal && (
            <div className="mt-3.5 space-y-2 border-t border-vpos-line/80 pt-3">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-bold text-vpos-text">
                  Select stores assigned to this category <span className="text-vpos-red">*</span>
                </span>
                <div className="flex items-center gap-2 text-[11px]">
                  <button
                    type="button"
                    onClick={handleSelectAllStores}
                    className="font-bold text-vpos-primary hover:underline"
                  >
                    Select all
                  </button>
                  <span className="text-vpos-muted">•</span>
                  <button
                    type="button"
                    onClick={handleClearStores}
                    className="font-bold text-vpos-muted hover:text-vpos-text"
                  >
                    Clear
                  </button>
                </div>
              </div>

              {errors.storeIds ? (
                <p className="text-[12px] font-semibold text-vpos-red">{errors.storeIds}</p>
              ) : null}

              <div className="grid max-h-48 grid-cols-1 gap-2 overflow-y-auto rounded-lg border border-vpos-line bg-white p-2 sm:grid-cols-2">
                {stores.length > 0 ? (
                  stores.map((store) => {
                    const sid = Number(store.id)
                    const isChecked = storeIds.includes(sid)
                    return (
                      <label
                        key={store.id}
                        className={cn(
                          'flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2.5 text-[13px] font-medium transition',
                          isChecked
                            ? 'border-vpos-primary bg-vpos-sand/30 font-semibold text-vpos-primary'
                            : 'border-vpos-line bg-white text-vpos-text hover:bg-vpos-subtle',
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleStore(sid)}
                          className="h-4 w-4 rounded accent-vpos-primary"
                        />
                        <div className="min-w-0 flex-1">
                          <span className="block truncate text-[13px]">{store.name}</span>
                          {store.city || store.addressLine1 ? (
                            <small className="block truncate text-[10px] text-vpos-muted">
                              {[store.addressLine1, store.city].filter(Boolean).join(', ')}
                            </small>
                          ) : null}
                        </div>
                      </label>
                    )
                  })
                ) : (
                  <p className="col-span-full py-4 text-center text-[12px] text-vpos-muted">
                    No stores available. Please create a store first.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

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
  const { data: stores = [] } = useStoresRaw()
  const createCategoryMutation = useCreateCategory()
  const updateCategoryMutation = useUpdateCategory()
  const deleteCategoryMutation = useDeleteCategory()

  const [formOpen, setFormOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<ProductCategory | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ProductCategory | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const storeMap = useMemo(() => {
    const map = new Map<number, string>()
    stores.forEach((s) => map.set(Number(s.id), s.name))
    return map
  }, [stores])

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
      image?: string
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
        const hasImage = Boolean(category.image?.trim())

        return (
          <div className="flex items-center gap-3">
            {hasImage ? (
              <img
                src={category.image}
                alt={category.categoryName}
                className="h-10 w-10 shrink-0 rounded-lg object-cover border border-vpos-line/60 bg-vpos-subtle shadow-xs"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                  const fallback = e.currentTarget.nextElementSibling as HTMLElement | null;
                  if (fallback) fallback.style.removeProperty('display');
                }}
              />
            ) : null}
            <span
              style={hasImage ? { display: 'none' } : undefined}
              className={cn(
                'grid h-10 w-10 shrink-0 place-items-center rounded-lg text-[19px]',
                categoryToneClasses[tone] ?? categoryToneClasses.extra,
              )}
            >
              <Icon name={icon as any} />
            </span>
            <div className="min-w-0">
              <strong className="block truncate text-[14px] text-vpos-text">{category.categoryName}</strong>
              <small className="mt-0.5 block font-mono text-[11px] font-bold tracking-[0.06em] text-vpos-muted">
                {category.categoryCode}
              </small>
            </div>
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
      header: 'Stores / Coverage',
      hideOnMobile: true,
      cell: (category) => {
        if (category.isGlobal) {
          return (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-vpos-sand px-2.5 py-0.5 text-[12px] font-bold text-vpos-primary">
              <Icon name="global-line" />
              All stores
            </span>
          )
        }

        const storeIdList = category.storeIds ? Array.from(category.storeIds) : []
        if (storeIdList.length === 0) {
          return <span className="text-[12px] text-vpos-muted">No stores</span>
        }

        if (storeIdList.length === 1) {
          const sName = storeMap.get(Number(storeIdList[0])) || `Store #${storeIdList[0]}`
          return (
            <span className="inline-flex items-center gap-1 rounded-full bg-vpos-subtle px-2.5 py-0.5 text-[12px] font-semibold text-vpos-text" title={sName}>
              <Icon name="store-2-line" className="text-vpos-muted text-[13px]" />
              <span className="max-w-[140px] truncate">{sName}</span>
            </span>
          )
        }

        const names = storeIdList.map((id) => storeMap.get(Number(id)) || `#${id}`).join(', ')
        return (
          <div className="flex flex-col gap-0.5" title={names}>
            <span className="inline-flex items-center gap-1 rounded-full bg-vpos-subtle px-2.5 py-0.5 text-[12px] font-semibold text-vpos-text">
              <Icon name="store-2-line" className="text-vpos-muted text-[13px]" />
              {storeIdList.length} stores
            </span>
            <span className="max-w-[160px] truncate text-[10px] text-vpos-muted font-medium">
              {names}
            </span>
          </div>
        )
      },
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
            <Icon name="loader-line" className="animate-spin text-[20px]" /> <span className="ml-2 text-[14px]">Loading categories…</span>
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

