import { useCallback, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Breadcrumb,
  Button,
  CropModal,
  FormField,
  Icon,
  Select,
  StoreSwitcher,
  TextAreaField,
  Toggle,
  Topbar,
} from '../components'
import { useAdminStore } from '../hooks/useAdminStore'
import {
  useProductBrands,
  useProductCategories,
  useProductTaxes,
  useProductUnits,
} from '../features/products/useProducts'
import { cn } from '../lib/cn'
import { paths } from '../lib/paths'
import {
  card,
  formGrid,
  formSectionTitle,
  pageContent,
} from '../lib/ui'

interface ProductImage {
  id: string
  file: File
  previewUrl: string
  isPrimary: boolean
}


const mockSuppliers = [
  { id: 1, name: 'Coffee Supply Co.' },
  { id: 2, name: 'Bake House Ltd.' },
]

interface VariantInput {
  key: string
  sku: string
  barcode: string
  variantName: string
  costPrice: string
  posPrice: string
  compareAtPrice: string
  onlinePrice: string
  stockAlertQty: string
  supplierId: string
}

function emptyVariant(id: number): VariantInput {
  return {
    key: String(Date.now() + id),
    sku: '',
    barcode: '',
    variantName: '',
    costPrice: '',
    posPrice: '',
    compareAtPrice: '',
    onlinePrice: '',
    stockAlertQty: '5',
    supplierId: '',
  }
}

export function ProductFormPage() {
  const navigate = useNavigate()
  const { sku } = useParams()
  const isEdit = Boolean(sku)
  const { storeId, setStoreId, sidebarWidth } = useAdminStore()

  const [step, setStep] = useState(1)
  const [productName, setProductName] = useState('')
  const [productCode, setProductCode] = useState('')
  const [shortName, setShortName] = useState('')
  const [currencyCode, setCurrencyCode] = useState('USD')
  const [salesChannel, setSalesChannel] = useState<'POS' | 'ONLINE' | 'BOTH'>('BOTH')
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [brandId, setBrandId] = useState('')
  const [unitId, setUnitId] = useState('')
  const [taxId, setTaxId] = useState('')
  const [isFeatured, setIsFeatured] = useState(false)
  const [isSellable, setIsSellable] = useState(true)
  const [isStockable, setIsStockable] = useState(true)

  const { data: apiCategories = [], isLoading: loadingCategories } = useProductCategories(storeId)
  const { data: apiBrands = [], isLoading: loadingBrands } = useProductBrands(storeId)
  const { data: apiUnits = [], isLoading: loadingUnits } = useProductUnits(storeId)
  const { data: apiTaxes = [], isLoading: loadingTaxes } = useProductTaxes(storeId)

  const categoryOptions = useMemo(() => {
    return apiCategories.map((c) => ({
      value: String(c.id),
      label: c.categoryName,
      image: c.image || 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=80&h=80&fit=crop',
    }))
  }, [apiCategories])

  const brandOptions = useMemo(() => {
    return apiBrands.map((b) => ({
      value: String(b.id),
      label: b.brandName,
      image: b.logo || 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=80&h=80&fit=crop',
    }))
  }, [apiBrands])

  const unitOptions = useMemo(() => {
    return apiUnits.map((u) => ({
      value: String(u.id),
      label: u.unitName,
    }))
  }, [apiUnits])

  const taxOptions = useMemo(() => {
    return apiTaxes.map((t) => ({
      value: String(t.id),
      label: `${t.taxName} (${t.percentage}%)`,
    }))
  }, [apiTaxes])

  const [variants, setVariants] = useState<VariantInput[]>([emptyVariant(0)])
  const [images, setImages] = useState<ProductImage[]>([])
  const [cropTarget, setCropTarget] = useState<ProductImage | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const updateVariant = useCallback(
    (key: string, field: keyof VariantInput, value: string) => {
      setVariants((prev) =>
        prev.map((v) => (v.key === key ? { ...v, [field]: value } : v)),
      )
    },
    [],
  )

  const addVariant = useCallback(() => {
    setVariants((prev) => [...prev, emptyVariant(prev.length)])
  }, [])

  const removeVariant = useCallback((key: string) => {
    setVariants((prev) => prev.filter((v) => v.key !== key))
  }, [])

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files) return
    const newImages: ProductImage[] = Array.from(files).map((file, i) => ({
      id: `${Date.now()}-${i}`,
      file,
      previewUrl: URL.createObjectURL(file),
      isPrimary: images.length === 0 && i === 0,
    }))
    setImages((prev) => {
      const hasPrimary = prev.some((img) => img.isPrimary) || newImages.some((img) => img.isPrimary)
      return [...prev, ...newImages].map((img, idx) => ({
        ...img,
        isPrimary: hasPrimary ? img.isPrimary : idx === 0,
      }))
    })
  }, [images.length])

  const removeImage = useCallback((id: string) => {
    setImages((prev) => {
      const next = prev.filter((img) => img.id !== id)
      if (next.length > 0 && !next.some((img) => img.isPrimary)) {
        next[0] = { ...next[0], isPrimary: true }
      }
      return next
    })
  }, [])

  const setPrimary = useCallback((id: string) => {
    setImages((prev) => prev.map((img) => ({ ...img, isPrimary: img.id === id })))
  }, [])

  const handleCrop = useCallback((blob: Blob) => {
    if (!cropTarget) return
    const croppedUrl = URL.createObjectURL(blob)
    const croppedFile = new File([blob], cropTarget.file.name, { type: 'image/jpeg' })
    setImages((prev) =>
      prev.map((img) =>
        img.id === cropTarget.id
          ? { ...img, previewUrl: croppedUrl, file: croppedFile }
          : img,
      ),
    )
  }, [cropTarget])

  const titleName = isEdit ? productName || 'Iced Americano' : productName || 'New product'

  return (
    <>
      <Topbar
        title="Products"
        subtitle="Manage products, pricing, and stock availability."
        actions={<StoreSwitcher value={storeId} onChange={setStoreId} />}
      />
      <main className={cn(pageContent, 'pb-[120px]')}>
        <section className="mb-6 flex min-h-12 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1">
            <Breadcrumb
              items={[
                { label: 'Products', to: paths.products },
                ...(isEdit
                  ? [{ label: titleName }, { label: 'Edit' }]
                  : [{ label: 'New product' }]),
              ]}
            />
          </div>
        </section>

        <div className="relative mx-auto mb-[26px] grid max-w-[850px] grid-cols-3">
          <div className="absolute top-[18px] right-[15%] left-[15%] z-0 h-0.5 bg-[#c8d3dd]" />
          {['Product details', 'Variants & pricing', 'Review'].map((label, i) => {
            const n = i + 1
            const active = step === n
            const done = step > n
            return (
              <button
                key={label}
                type="button"
                className={cn(
                  'relative z-[1] flex items-center justify-center gap-2 border-0 bg-transparent text-[13px] font-bold',
                  active || done ? 'text-vpos-primary' : 'text-vpos-muted',
                )}
                onClick={() => setStep(n)}
              >
                <i
                  className={cn(
                    'grid h-9 w-9 place-items-center rounded-full not-italic',
                    active || done
                      ? 'bg-vpos-primary text-white'
                      : 'bg-[#d8e1e9] text-vpos-dark',
                  )}
                >
                  {done ? <Icon name="check-line" /> : n}
                </i>
                <span className="hidden sm:inline">{label}</span>
              </button>
            )
          })}
        </div>

        {step === 1 && (
          <div className="grid grid-cols-1 gap-[18px] xl:grid-cols-[minmax(0,1.8fr)_minmax(330px,0.9fr)]">
            <section className="grid content-start gap-[18px]">
              <article className={cn(card, 'p-[22px]')}>
                <div className={formSectionTitle}>
                  <h3 className="m-0 text-[15px]">Basic information</h3>
                  <p className="mt-1.5 mb-0 text-[12px] text-vpos-muted">
                    Product name, identifiers, and categorization.
                  </p>
                </div>
                <div className={formGrid}>
                  <div className="md:col-span-2">
                    <FormField label="Product name" required value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="e.g. Iced Americano" />
                  </div>
                  <FormField label="Product code" value={productCode} onChange={(e) => setProductCode(e.target.value.toUpperCase())} placeholder="e.g. ICE-AMER-001" />
                  <FormField label="Short name" value={shortName} onChange={(e) => setShortName(e.target.value)} placeholder="e.g. Iced Americano" />
                  <FormField label="Currency" required value={currencyCode} onChange={(e) => setCurrencyCode(e.target.value.toUpperCase())} placeholder="USD" maxLength={3} />
                  <Select label="Category" requiredMark placeholder={loadingCategories ? "Loading categories…" : "Select a category"} value={categoryId} onChange={setCategoryId} options={categoryOptions} searchable />
                  <Select label="Brand" placeholder={loadingBrands ? "Loading brands…" : "Select a brand"} value={brandId} onChange={setBrandId} options={brandOptions} searchable />
                  <Select label="Unit" requiredMark placeholder={loadingUnits ? "Loading units…" : "Select a unit"} value={unitId} onChange={setUnitId} options={unitOptions} />
                  <Select label="Tax" placeholder={loadingTaxes ? "Loading taxes…" : "Select a tax rate"} value={taxId} onChange={setTaxId} options={taxOptions} />
                  <div className="md:col-span-2">
                    <TextAreaField label="Description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Write a short product description…" />
                  </div>
                </div>
              </article>

              <article className={cn(card, 'p-[22px]')}>
                <div className={formSectionTitle}>
                  <h3 className="m-0 text-[15px]">Product images</h3>
                  <p className="mt-1.5 mb-0 text-[12px] text-vpos-muted">
                    Upload up to 6 images. Select one as the primary thumbnail.
                  </p>
                </div>

                {images.length > 0 ? (
                  <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {images.map((img) => (
                      <div key={img.id} className="group relative overflow-hidden rounded-xl border border-vpos-line bg-vpos-subtle">
                        <img src={img.previewUrl} alt="" className="aspect-square w-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setCropTarget(img)}
                          className="absolute top-2 right-2 grid h-7 w-7 place-items-center rounded-lg border-0 bg-black/50 text-white opacity-0 transition group-hover:opacity-100 hover:bg-black/70"
                          aria-label="Edit image"
                        >
                          <Icon name="crop-line" className="text-[14px]" />
                        </button>
                        <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-gradient-to-t from-black/60 to-transparent p-2 pt-6">
                          <button
                            type="button"
                            onClick={() => setPrimary(img.id)}
                            className={cn(
                              'rounded-full border-0 px-2.5 py-1 text-[11px] font-extrabold transition',
                              img.isPrimary
                                ? 'bg-vpos-primary text-white'
                                : 'bg-white/80 text-vpos-text hover:bg-white',
                            )}
                          >
                            {img.isPrimary ? '★ Primary' : 'Set primary'}
                          </button>
                          <button
                            type="button"
                            onClick={() => removeImage(img.id)}
                            className="grid h-7 w-7 place-items-center rounded-full border-0 bg-white/80 text-vpos-red hover:bg-white"
                            aria-label="Remove image"
                          >
                            <Icon name="close-line" className="text-[14px]" />
                          </button>
                        </div>
                        {img.isPrimary ? (
                          <span className="absolute top-2 left-2 rounded-full bg-vpos-primary px-2 py-0.5 text-[10px] font-extrabold text-white shadow">
                            PRIMARY
                          </span>
                        ) : null}
                      </div>
                    ))}
                    {images.length < 6 ? (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-xl border-[1.5px] border-dashed border-vpos-primary-2 bg-[#f7f9fb] hover:border-vpos-primary hover:bg-vpos-sand/30"
                      >
                        <Icon name="add-line" className="text-[21px] text-vpos-primary" />
                        <span className="text-[11px] font-bold text-vpos-muted">Add more</span>
                      </button>
                    ) : null}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex min-h-[184px] w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-[1.5px] border-dashed border-vpos-primary-2 bg-[#f7f9fb] px-4 hover:border-vpos-primary hover:bg-vpos-sand/30"
                  >
                    <span className="grid h-11 w-11 place-items-center rounded-full bg-vpos-sand text-[21px] text-vpos-primary">
                      <Icon name="upload-cloud-2-line" />
                    </span>
                    <strong className="text-[13px] text-vpos-text">Click to upload or drag and drop</strong>
                    <small className="text-[11px] text-vpos-muted">PNG, JPG or WEBP • Max 5 MB • Up to 6 images</small>
                    <small className="text-[11px] text-vpos-muted">First image is automatically set as primary</small>
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  hidden
                  onChange={(e) => { handleFiles(e.target.files); e.target.value = '' }}
                />
              </article>
            </section>

            <aside className="grid content-start gap-[18px]">
              <article className={cn(card, 'p-[22px]')}>
                <div className={formSectionTitle}>
                  <h3 className="m-0 text-[15px]">Sales channel</h3>
                  <p className="mt-1.5 mb-0 text-[12px] text-vpos-muted">Where this product is sold.</p>
                </div>
                <Select
                  label="Channel"
                  placeholder="Select channel"
                  value={salesChannel}
                  onChange={(v) => setSalesChannel(v as typeof salesChannel)}
                  options={[
                    { value: 'POS', label: 'POS only' },
                    { value: 'BOTH', label: 'POS + Online' },
                    { value: 'ONLINE', label: 'Online only' },
                  ]}
                />
              </article>

              <article className={cn(card, 'p-[22px]')}>
                <div className={formSectionTitle}>
                  <h3 className="m-0 text-[15px]">Settings</h3>
                  <p className="mt-1.5 mb-0 text-[12px] text-vpos-muted">Product visibility and behavior.</p>
                </div>
                <Toggle checked={isSellable} onChange={setIsSellable} label="Available for sale" description="Show this item in POS and orders" />
                <Toggle checked={isStockable} onChange={setIsStockable} label="Track inventory" description="Update stock after every sale" />
                <Toggle checked={isFeatured} onChange={setIsFeatured} label="Featured product" description="Highlight in catalog and recommendations" />
              </article>
            </aside>
          </div>
        )}

        {step === 2 && (
          <section className="grid content-start gap-[18px]">
            <article className={cn(card, 'p-[22px]')}>
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h3 className="m-0 text-[15px]">Variants</h3>
                  <p className="mt-1 mb-0 text-[12px] text-vpos-muted">
                    Every product needs at least one variant with SKU, barcode, pricing, and supplier.
                  </p>
                </div>
                <Button variant="secondary" onClick={addVariant}>
                  <Icon name="add-line" /> Add variant
                </Button>
              </div>

              <div className="space-y-4">
                {variants.map((v, idx) => (
                  <div key={v.key} className="rounded-xl border border-vpos-line bg-vpos-subtle/30 p-4">
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <strong className="text-[13px] text-vpos-primary-2">Variant {idx + 1}</strong>
                      {variants.length > 1 ? (
                        <button type="button" onClick={() => removeVariant(v.key)} className="border-0 bg-transparent text-[13px] font-bold text-vpos-red hover:underline">
                          Remove
                        </button>
                      ) : null}
                    </div>
                    <div className={formGrid}>
                      <FormField label="SKU" required value={v.sku} onChange={(e) => updateVariant(v.key, 'sku', e.target.value.toUpperCase())} placeholder="e.g. ICE-AMER-M" />
                      <FormField label="Barcode" required value={v.barcode} onChange={(e) => updateVariant(v.key, 'barcode', e.target.value)} placeholder="e.g. 885001020001" />
                      <FormField label="Variant name" value={v.variantName} onChange={(e) => updateVariant(v.key, 'variantName', e.target.value)} placeholder="e.g. Medium" />
                      <Select label="Supplier" placeholder="Select a supplier" value={v.supplierId} onChange={(val) => updateVariant(v.key, 'supplierId', val)} options={mockSuppliers.map((s) => ({ value: String(s.id), label: s.name }))} searchable />
                    </div>

                    <div className="mt-4">
                      <strong className="mb-2 block text-[12px] font-extrabold tracking-[.02em] text-vpos-primary-2">Pricing</strong>
                      <div className={cn(formGrid)}>
                        <FormField label="Cost price" type="number" step="0.01" value={v.costPrice} onChange={(e) => updateVariant(v.key, 'costPrice', e.target.value)} placeholder="0.00" />
                        <FormField label="POS selling price" required type="number" step="0.01" value={v.posPrice} onChange={(e) => updateVariant(v.key, 'posPrice', e.target.value)} placeholder="0.00" />
                        <FormField label="Compare-at price" type="number" step="0.01" value={v.compareAtPrice} onChange={(e) => updateVariant(v.key, 'compareAtPrice', e.target.value)} placeholder="Original price (shown crossed out)" />
                        <FormField label="Online price" type="number" step="0.01" value={v.onlinePrice} onChange={(e) => updateVariant(v.key, 'onlinePrice', e.target.value)} placeholder="0.00" />
                        <FormField label="Stock alert at" type="number" value={v.stockAlertQty} onChange={(e) => updateVariant(v.key, 'stockAlertQty', e.target.value)} placeholder="5" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </article>
          </section>
        )}

        {step === 3 && (
          <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {[
              ['Product details', `Name: ${productName || '(not set)'}. Category, brand, unit, tax assigned.`],
              ['Variants & pricing', `${variants.length} variant${variants.length > 1 ? 's' : ''} with SKU, barcode, pricing, and supplier.`],
              ['Ready to publish', 'Review once more, then save or publish the product.'],
            ].map(([title, desc]) => (
              <article key={title} className={cn(card, 'flex items-start gap-3 p-[22px]')}>
                <span className="grid h-8 w-8 place-items-center rounded-full bg-vpos-green-bg text-[17px] text-vpos-green">
                  <Icon name="check-line" />
                </span>
                <div>
                  <strong className="block text-[14px]">{title}</strong>
                  <small className="mt-1 block text-[12px] text-vpos-muted">{desc}</small>
                </div>
              </article>
            ))}
          </section>
        )}

        <footer
          className="fixed right-0 bottom-0 z-[9] flex h-[76px] items-center justify-between border-t border-vpos-line bg-white px-[clamp(24px,2.5vw,48px)] shadow-[0_-8px_25px_#0c2b4e12] transition-[left] duration-200 ease-out"
          style={{ left: sidebarWidth }}
        >
          <Button variant="secondary" onClick={() => (step === 1 ? navigate(paths.products) : setStep((s) => s - 1))}>
            {step === 1 ? 'Cancel' : 'Back'}
          </Button>
          <div className="flex gap-2.5">
            <Button variant="soft">Save draft</Button>
            <Button variant="primary" onClick={() => { if (step < 3) setStep((s) => s + 1); else navigate(paths.products) }}>
              {step < 3 ? 'Continue →' : isEdit ? 'Update product' : 'Publish product'}
            </Button>
          </div>
        </footer>
      </main>
      {cropTarget ? (
        <CropModal
          open={Boolean(cropTarget)}
          imageUrl={cropTarget.previewUrl}
          onClose={() => setCropTarget(null)}
          onCrop={handleCrop}
        />
      ) : null}
    </>
  )
}
