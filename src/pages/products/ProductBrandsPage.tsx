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
import {
  useProductBrands,
  useCreateBrand,
  useUpdateBrand,
  useDeleteBrand,
} from '../../features/products/useProducts'
import { useStoresRaw } from '../../features/stores/useStores'
import { fileApi } from '../../features/files/fileApi'
import type { ProductBrand } from '../../features/products/types'

interface BrandFormData {
  code: string
  name: string
  description: string
  logo: string
  isGlobal: boolean
  storeIds: number[]
  isFeatured: boolean
  status: string
}

interface FormErrors {
  code?: string
  name?: string
  storeIds?: string
}

function validateForm(data: BrandFormData): FormErrors {
  const errors: FormErrors = {}
  if (!data.code.trim()) {
    errors.code = 'Code is required.'
  } else if (data.code.trim().length > 50) {
    errors.code = 'Code must be 50 characters or fewer.'
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

function toFormDefaults(brand: ProductBrand | null): BrandFormData {
  return {
    code: brand?.brandCode ?? '',
    name: brand?.brandName ?? '',
    description: brand?.description ?? '',
    logo: brand?.logo ?? '',
    isGlobal: brand?.isGlobal ?? true,
    storeIds: brand?.storeIds ? Array.from(brand.storeIds) : [],
    isFeatured: brand?.isFeatured ?? false,
    status: brand?.status ?? 'ACTIVE',
  }
}

interface BrandFormModalProps {
  open: boolean
  brand: ProductBrand | null
  onClose: () => void
  onSave: (data: {
    payload: {
      brandCode: string
      brandName: string
      description?: string
      logo?: string
      isGlobal: boolean
      isFeatured: boolean
      status: string
      storeIds?: number[]
    }
    isEdit: boolean
    id?: number
  }) => Promise<void>
  isSaving: boolean
}

function BrandFormModal({ open, brand, onClose, onSave, isSaving }: BrandFormModalProps) {
  const { data: stores = [] } = useStoresRaw()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const defaults = toFormDefaults(brand)
  const isEditing = Boolean(brand)
  const [code, setCode] = useState(defaults.code)
  const [name, setName] = useState(defaults.name)
  const [description, setDescription] = useState(defaults.description)
  const [logo, setLogo] = useState(defaults.logo)
  const [isGlobal, setIsGlobal] = useState(defaults.isGlobal)
  const [storeIds, setStoreIds] = useState<number[]>(defaults.storeIds)
  const [isFeatured, setIsFeatured] = useState(defaults.isFeatured)
  const [status, setStatus] = useState(defaults.status)
  const [isUploadingLogo, setIsUploadingLogo] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})

  const resetForm = () => {
    const d = toFormDefaults(brand)
    setCode(d.code)
    setName(d.name)
    setDescription(d.description)
    setLogo(d.logo)
    setIsGlobal(d.isGlobal)
    setStoreIds(d.storeIds)
    setIsFeatured(d.isFeatured)
    setStatus(d.status)
    setErrors({})
    setIsUploadingLogo(false)
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    const file = files[0]
    setIsUploadingLogo(true)
    try {
      const response = await fileApi.upload(file)
      const uploadedUrl = response.url?.trim() || ''
      if (uploadedUrl) {
        setLogo(uploadedUrl)
      }
    } catch (err: any) {
      console.error('Logo upload failed', err)
    } finally {
      setIsUploadingLogo(false)
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
    const trimmedLogo = logo.trim()

    const validation = validateForm({
      code: trimmedCode,
      name: trimmedName,
      description: trimmedDesc,
      logo: trimmedLogo,
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
      brandCode: trimmedCode,
      brandName: trimmedName,
      description: trimmedDesc || undefined,
      logo: trimmedLogo || undefined,
      isGlobal,
      isFeatured,
      status,
      storeIds: isGlobal ? [] : storeIds,
    }

    await onSave({
      payload,
      isEdit: isEditing,
      id: brand?.id,
    })

    handleClose()
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={isEditing ? 'Edit brand' : 'Add brand'}
      description={isEditing ? 'Update product brand details and store coverage.' : 'Create a new brand for your catalog.'}
      size="md"
      footer={
        <>
          <Button variant="secondary" type="button" onClick={handleClose} disabled={isSaving || isUploadingLogo}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" onClick={handleSubmit} disabled={isSaving || isUploadingLogo}>
            {isSaving ? 'Saving…' : isEditing ? 'Save changes' : 'Create brand'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Brand Logo Upload / Preview */}
        <div>
          <label className="mb-1.5 block text-[13px] font-extrabold uppercase tracking-[.12em] text-vpos-primary">
            Brand Logo
          </label>
          <div className="flex items-start gap-4">
            {logo ? (
              <div className="relative group h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-vpos-line bg-vpos-subtle shadow-xs">
                <img
                  src={logo}
                  alt="Brand logo preview"
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24"><text y="20" font-size="20">🏷️</text></svg>'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setLogo('')}
                  className="absolute inset-0 grid place-items-center bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100"
                  title="Remove logo"
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
                {isUploadingLogo ? (
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
                  disabled={isUploadingLogo}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Icon name="upload-2-line" /> {isUploadingLogo ? 'Uploading…' : logo ? 'Replace logo' : 'Upload logo'}
                </Button>
                {logo && (
                  <Button
                    type="button"
                    variant="text"
                    className="px-2 py-1.5 text-[12px] text-vpos-red hover:text-vpos-red"
                    onClick={() => setLogo('')}
                  >
                    Remove
                  </Button>
                )}
              </div>
              <input
                type="text"
                placeholder="Or paste logo URL (https://...)"
                value={logo}
                onChange={(e) => setLogo(e.target.value)}
                className="w-full rounded-[4px] border border-vpos-line bg-white px-3 py-1.5 text-[12px] text-vpos-text placeholder:text-vpos-muted focus:border-vpos-primary focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <FormField
              label="Brand Code"
              required
              name="code"
              placeholder="e.g. NIKE, NESPRESSO"
              maxLength={50}
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
              label="Brand Name"
              required
              name="name"
              placeholder="e.g. Nike, Nespresso"
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

        <FormField
          label="Description"
          name="description"
          placeholder="e.g. High performance athletic products"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
                  Select stores assigned to this brand <span className="text-vpos-red">*</span>
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
      </form>
    </Modal>
  )
}

export function ProductBrandsPage() {
  const { storeId, setStoreId } = useAdminStore()
  const { toast } = useToast()
  const { data: brands = [], isLoading } = useProductBrands(storeId)
  const { data: stores = [] } = useStoresRaw()
  const createBrandMutation = useCreateBrand()
  const updateBrandMutation = useUpdateBrand()
  const deleteBrandMutation = useDeleteBrand()

  const [formOpen, setFormOpen] = useState(false)
  const [editingBrand, setEditingBrand] = useState<ProductBrand | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ProductBrand | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const storeMap = useMemo(() => {
    const map = new Map<number, string>()
    stores.forEach((s) => map.set(Number(s.id), s.name))
    return map
  }, [stores])

  const activeBrands = brands.filter((b) => b.status === 'ACTIVE').length
  const featuredCount = brands.filter((b) => b.isFeatured).length
  const globalCount = brands.filter((b) => b.isGlobal).length

  const openCreate = () => {
    setEditingBrand(null)
    setFormOpen(true)
  }

  const openEdit = (brand: ProductBrand) => {
    setEditingBrand(brand)
    setFormOpen(true)
  }

  const handleSave = async (data: {
    payload: {
      brandCode: string
      brandName: string
      description?: string
      logo?: string
      isGlobal: boolean
      isFeatured: boolean
      status: string
      storeIds?: number[]
    }
    isEdit: boolean
    id?: number
  }) => {
    setIsSaving(true)
    try {
      if (data.isEdit && data.id !== undefined) {
        await updateBrandMutation.mutateAsync({ id: data.id, payload: data.payload })
        toast(`${data.payload.brandName} was updated.`, 'success')
      } else {
        await createBrandMutation.mutateAsync(data.payload)
        toast(`${data.payload.brandName} was created.`, 'success')
      }
    } catch (err: any) {
      toast(err?.message || 'Failed to save brand.', 'error')
      throw err
    } finally {
      setIsSaving(false)
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteBrandMutation.mutateAsync(deleteTarget.id)
      toast(`${deleteTarget.brandName} was deleted.`, 'success')
      setDeleteTarget(null)
    } catch (err: any) {
      toast(err?.message || 'Failed to delete brand.', 'error')
    }
  }

  const columns: DataTableColumn<ProductBrand>[] = [
    {
      id: 'brand',
      header: 'Brand',
      searchable: (brand) => `${brand.brandName} ${brand.brandCode}`,
      cell: (brand) => {
        const hasLogo = Boolean(brand.logo?.trim())

        return (
          <div className="flex items-center gap-3">
            {hasLogo ? (
              <img
                src={brand.logo}
                alt={brand.brandName}
                className="h-10 w-10 shrink-0 rounded-lg object-cover border border-vpos-line/60 bg-vpos-subtle shadow-xs"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                  const fallback = e.currentTarget.nextElementSibling as HTMLElement | null;
                  if (fallback) fallback.style.removeProperty('display');
                }}
              />
            ) : null}
            <span
              style={hasLogo ? { display: 'none' } : undefined}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-vpos-sand text-[19px] text-vpos-primary"
            >
              <Icon name="award-line" />
            </span>
            <div className="min-w-0">
              <strong className="block truncate text-[14px] text-vpos-text">{brand.brandName}</strong>
              <small className="mt-0.5 block font-mono text-[11px] font-bold tracking-[0.06em] text-vpos-muted">
                {brand.brandCode}
              </small>
            </div>
          </div>
        )
      },
    },
    {
      id: 'description',
      header: 'Description',
      hideOnMobile: true,
      cell: (brand) => (
        <span className="max-w-[200px] truncate block text-[13px] text-vpos-muted">
          {brand.description || '—'}
        </span>
      ),
    },
    {
      id: 'featured',
      header: 'Featured',
      hideOnMobile: true,
      cell: (brand) =>
        brand.isFeatured ? (
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
      cell: (brand) => {
        if (brand.isGlobal) {
          return (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-vpos-sand px-2.5 py-0.5 text-[12px] font-bold text-vpos-primary">
              <Icon name="global-line" />
              All stores
            </span>
          )
        }

        const storeIdList = brand.storeIds ? Array.from(brand.storeIds) : []
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
      searchable: (brand) => brand.status ?? '',
      cell: (brand) => <Status value={brand.status ?? 'ACTIVE'} />,
    },
    {
      id: 'actions',
      header: '',
      cell: (brand) => (
        <div className="flex items-center gap-1">
          <Button
            variant="text"
            onClick={() => openEdit(brand)}
            aria-label={`Edit ${brand.brandName}`}
          >
            Edit
          </Button>
          {brand.status !== 'DELETED' && (
            <Button
              variant="text"
              className="text-vpos-red hover:text-vpos-red"
              onClick={() => setDeleteTarget(brand)}
              aria-label={`Delete ${brand.brandName}`}
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
          <ReferenceStat label="Featured brands" value={featuredCount} detail={`${globalCount} global`} />
          <div className="flex items-center gap-3 border-t border-vpos-line bg-vpos-subtle/55 px-5 py-4 sm:border-t-0 sm:border-l">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[4px] bg-white text-vpos-primary shadow-sm">
              <Icon name="information-line" />
            </span>
            <p className="m-0 text-[12px] leading-relaxed text-vpos-muted">
              <strong className="text-vpos-text">Active management.</strong> Create, edit, and delete product brands for your catalog.
            </p>
          </div>
        </section>

        {isLoading ? (
          <div className="flex items-center justify-center py-20 text-vpos-muted">
            <Icon name="loader-line" className="animate-spin text-[20px]" /> <span className="ml-2 text-[14px]">Loading brands…</span>
          </div>
        ) : (
          <DataTable
            data={brands}
            columns={columns}
            rowKey={(brand) => String(brand.id)}
            title="Product brands"
            searchPlaceholder="Search brand name or code…"
            pageSize={10}
            emptyMessage="No product brands are configured."
            emptyIcon="folder-open-line"
          />
        )}

        <BrandFormModal
          open={formOpen}
          brand={editingBrand}
          onClose={() => {
            setFormOpen(false)
            setEditingBrand(null)
          }}
          onSave={handleSave}
          isSaving={isSaving}
        />

        <Modal
          open={Boolean(deleteTarget)}
          onClose={() => !deleteBrandMutation.isPending && setDeleteTarget(null)}
          title="Delete brand?"
          description="This brand will be deactivated from the catalog."
          size="sm"
          footer={
            <>
              <Button variant="secondary" disabled={deleteBrandMutation.isPending} onClick={() => setDeleteTarget(null)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                className="bg-vpos-red hover:bg-vpos-red"
                disabled={deleteBrandMutation.isPending}
                onClick={confirmDelete}
              >
                {deleteBrandMutation.isPending ? 'Deleting…' : 'Delete brand'}
              </Button>
            </>
          }
        >
          <p className="m-0 text-[14px] text-vpos-muted">
            {deleteTarget ? (
              <>
                You are deleting{' '}
                <strong className="text-vpos-text">{deleteTarget.brandName}</strong>.
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
