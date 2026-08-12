import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
import { useToast } from '../context/ToastContext'
import {
  useCreateProduct,
  useProduct,
  useProductAttributes,
  useProductBrands,
  useProductCategories,
  useProductSuppliers,
  useProductTaxes,
  useProductUnits,
  useUpdateProduct,
} from '../features/products/useProducts'
import { productApi } from '../features/products/productApi'
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
  file?: File
  previewUrl: string
  isPrimary: boolean
}


interface VariantInput {
  key: string
  image?: string
  imageFile?: File
  imagePreviewUrl?: string
  sku: string
  barcode: string
  variantName: string
  costPrice: string
  posPrice: string
  compareAtPrice: string
  onlinePrice: string
  stockQuantity: string
  stockAlertQty: string
  supplierId: string
}

function emptyVariant(id: number): VariantInput {
  return {
    key: String(Date.now() + id),
    image: undefined,
    sku: '',
    barcode: '',
    variantName: '',
    costPrice: '',
    posPrice: '',
    compareAtPrice: '',
    onlinePrice: '',
    stockQuantity: '',
    stockAlertQty: '5',
    supplierId: '',
  }
}

export function ProductFormPage() {
  const navigate = useNavigate()
  const { sku } = useParams()
  const isEdit = Boolean(sku)
  const { data: existingProduct } = useProduct(sku)
  const createProductMutation = useCreateProduct()
  const updateProductMutation = useUpdateProduct()
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

  useEffect(() => {
    if (!existingProduct) return
    setProductName(existingProduct.productName || '')
    setProductCode(existingProduct.productCode || '')
    setShortName(existingProduct.shortName || '')
    setCurrencyCode(existingProduct.currencyCode || 'USD')
    if (existingProduct.salesChannel === 1 || existingProduct.salesChannel === '1' || existingProduct.salesChannel === 'POS') {
      setSalesChannel('POS')
    } else if (existingProduct.salesChannel === 2 || existingProduct.salesChannel === '2' || existingProduct.salesChannel === 'ONLINE') {
      setSalesChannel('ONLINE')
    } else {
      setSalesChannel('BOTH')
    }
    setDescription(existingProduct.description || '')
    if (existingProduct.category?.id) setCategoryId(String(existingProduct.category.id))
    if (existingProduct.brand?.id) setBrandId(String(existingProduct.brand.id))
    if (existingProduct.unit?.id) setUnitId(String(existingProduct.unit.id))
    if (existingProduct.tax?.id) setTaxId(String(existingProduct.tax.id))
    if (existingProduct.isFeatured != null) setIsFeatured(existingProduct.isFeatured)
    if (existingProduct.isSellable != null) setIsSellable(existingProduct.isSellable)
    if (existingProduct.isStockable != null) setIsStockable(existingProduct.isStockable)

    const loadedImages: ProductImage[] = []
    if (existingProduct.images && existingProduct.images.length > 0) {
      existingProduct.images.forEach((img: any, idx: number) => {
        const url = typeof img === 'string' ? img : (img.imageUrl || img.url)
        if (url && typeof url === 'string') {
          loadedImages.push({
            id: String(img.id || `img-${idx}`),
            previewUrl: url,
            isPrimary: idx === 0 || url === existingProduct.thumbnail,
          })
        }
      })
    } else if (existingProduct.thumbnail) {
      loadedImages.push({
        id: 'thumb-0',
        previewUrl: existingProduct.thumbnail,
        isPrimary: true,
      })
    }
    if (loadedImages.length > 0) {
      setImages(loadedImages)
    }

    if (existingProduct.variants && existingProduct.variants.length > 0) {
      setVariants(
        existingProduct.variants.map((v, idx) => ({
          key: String(v.id || idx),
          image: v.image || undefined,
          imagePreviewUrl: v.image || undefined,
          sku: v.sku || '',
          barcode: v.barcode || '',
          variantName: v.variantName || '',
          costPrice: v.costPrice != null ? String(v.costPrice) : '',
          posPrice: v.posPrice != null ? String(v.posPrice) : '',
          compareAtPrice: v.compareAtPrice != null ? String(v.compareAtPrice) : '',
          onlinePrice: v.onlinePrice != null ? String(v.onlinePrice) : '',
          stockQuantity: (v as any).quantity != null ? String((v as any).quantity) : ((v as any).stockQuantity != null ? String((v as any).stockQuantity) : ''),
          stockAlertQty: v.stockAlertQty != null ? String(v.stockAlertQty) : '5',
          supplierId: v.supplier?.id ? String(v.supplier.id) : '1',
        })),
      )
    }
  }, [existingProduct])

  const { data: apiCategories = [], isLoading: loadingCategories } = useProductCategories(storeId)
  const { data: apiBrands = [], isLoading: loadingBrands } = useProductBrands(storeId)
  const { data: apiUnits = [], isLoading: loadingUnits } = useProductUnits(storeId)
  const { data: apiTaxes = [], isLoading: loadingTaxes } = useProductTaxes(storeId)
  const { data: apiSuppliers = [] } = useProductSuppliers(storeId)
  const { data: apiAttributes = [] } = useProductAttributes()

  const attributeSelectOptions = useMemo(() => {
    const defaultAttrs = [
      { value: 'Size', label: 'Size' },
      { value: 'Temperature', label: 'Temperature' },
      { value: 'Milk Type', label: 'Milk Type' },
      { value: 'Color', label: 'Color' },
      { value: 'Flavor', label: 'Flavor' },
    ]
    if (apiAttributes.length > 0) {
      const liveOpts = apiAttributes.map((a) => ({ value: a.attributeName, label: a.attributeName }))
      const names = new Set(liveOpts.map((o) => o.value))
      const merged = [...liveOpts]
      for (const def of defaultAttrs) {
        if (!names.has(def.value)) merged.push(def)
      }
      return merged
    }
    return defaultAttrs
  }, [apiAttributes])

  const DEFAULT_OPTION_VALUES: Record<string, string[]> = {
    Size: ['Small (12oz)', 'Medium (16oz)', 'Large (20oz)'],
    Temperature: ['Hot', 'Iced', 'Extra Ice'],
    'Milk Type': ['Whole Milk', 'Oat Milk', 'Almond Milk'],
    Color: ['Black', 'White', 'Red', 'Blue'],
    Flavor: ['Vanilla', 'Caramel', 'Hazelnut'],
  }

  const supplierOptions = useMemo(() => {
    if (apiSuppliers.length > 0) {
      return apiSuppliers.map((s) => ({
        value: String(s.id),
        label: s.supplierName,
      }))
    }
    return [{ value: '1', label: 'General' }]
  }, [apiSuppliers])

  const { toast } = useToast()

  const handlePublish = async () => {
    if (step < 3) {
      setStep((s) => s + 1)
      return
    }

    try {
      const numStoreId = Number(storeId)
      if (!Number.isInteger(numStoreId) || numStoreId <= 0) {
        toast('Select a store before publishing the product.', 'warning')
        return
      }
      const numSalesChannel = salesChannel === 'POS' ? 1 : salesChannel === 'ONLINE' ? 2 : 3
      
      let uploadedThumbnail: string | undefined = undefined
      let uploadedImages: { imageUrl: string }[] | undefined = undefined

      if (images.length > 0) {
        toast('Processing product images...', 'info')
        const finalImageUrls: string[] = []
        for (const img of images) {
          if (img.file) {
            const res = await productApi.uploadFile(img.file)
            finalImageUrls.push(res.url)
          } else if (img.previewUrl) {
            finalImageUrls.push(img.previewUrl)
          }
        }
        if (finalImageUrls.length > 0) {
          const primaryImg = images.find((i) => i.isPrimary)
          uploadedThumbnail = primaryImg?.previewUrl || finalImageUrls[0]
          uploadedImages = finalImageUrls.map((url) => ({ imageUrl: url }))
        }
      }

      const variantImageUrls = new Map<string, string | undefined>()
      for (const variant of variants) {
        if (variant.imageFile) {
          const res = await productApi.uploadFile(variant.imageFile)
          variantImageUrls.set(variant.key, res.url)
        } else {
          variantImageUrls.set(variant.key, variant.image)
        }
      }

      const payload = {
        storeId: numStoreId,
        productCode: productCode || `PRD-${Date.now()}`,
        productName: productName || 'Untitled Product',
        shortName: shortName || productName,
        currencyCode: currencyCode || 'USD',
        salesChannel: numSalesChannel,
        thumbnail: uploadedThumbnail || existingProduct?.thumbnail,
        images: uploadedImages || (existingProduct?.images as any),
        description,
        category: categoryId ? { id: Number(categoryId) } : undefined,
        brand: brandId ? { id: Number(brandId) } : undefined,
        unit: unitId ? { id: Number(unitId) } : undefined,
        tax: taxId ? { id: Number(taxId) } : undefined,
        isFeatured,
        isSellable,
        isStockable,
        variants: variants.length > 0 ? variants.map((v, index) => ({
          id: existingProduct?.variants?.[index]?.id,
          sku: v.sku || `SKU-${Date.now()}-${index}`,
          barcode: v.barcode || `BAR-${Date.now()}-${index}`,
          variantName: v.variantName || 'Default',
          image: variantImageUrls.get(v.key),
          costPrice: v.costPrice ? Number(v.costPrice) : 0,
          posPrice: v.posPrice ? Number(v.posPrice) : 0,
          compareAtPrice: v.compareAtPrice ? Number(v.compareAtPrice) : 0,
          onlinePrice: v.onlinePrice ? Number(v.onlinePrice) : 0,
          stockQuantity: v.stockQuantity !== '' ? Number(v.stockQuantity) : 0,
          quantity: v.stockQuantity !== '' ? Number(v.stockQuantity) : 0,
          stockAlertQty: v.stockAlertQty !== '' ? Number(v.stockAlertQty) : 5,
          supplier: v.supplierId ? { id: Number(v.supplierId) } : undefined,
          isDefault: index === 0,
        })) : [{
          sku: `SKU-${Date.now()}`,
          barcode: `BAR-${Date.now()}`,
          variantName: 'Default',
          image: undefined,
          posPrice: 0,
          isDefault: true,
        }],
      }

      if (isEdit && existingProduct) {
        await updateProductMutation.mutateAsync({
          id: existingProduct.id,
          payload,
        })
        toast('Product updated successfully!', 'success')
      } else {
        await createProductMutation.mutateAsync(payload)
        toast('Product created successfully!', 'success')
      }
      navigate(paths.products)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to publish product.'
      toast(msg, 'error')
    }
  }

  const categoryOptions = useMemo(() => {
    return apiCategories.map((c) => ({
      value: String(c.id),
      label: c.categoryName,
      image: c.image || undefined,
    }))
  }, [apiCategories])

  const brandOptions = useMemo(() => {
    return apiBrands.map((b) => ({
      value: String(b.id),
      label: b.brandName,
      image: b.logo || undefined,
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
  const [hasOptions, setHasOptions] = useState(false)
  const [optionGroups, setOptionGroups] = useState<
    { id: string; name: string; values: string[]; inputValue: string }[]
  >([
    { id: 'opt-1', name: 'Size', values: ['Small', 'Medium', 'Large'], inputValue: '' },
  ])

  const addOptionGroup = () => {
    setOptionGroups((prev) => [
      ...prev,
      { id: `opt-${Date.now()}`, name: '', values: [], inputValue: '' },
    ])
  }

  const removeOptionGroup = (id: string) => {
    setOptionGroups((prev) => prev.filter((g) => g.id !== id))
  }

  const addOptionValue = (groupId: string) => {
    setOptionGroups((prev) =>
      prev.map((g) => {
        if (g.id !== groupId) return g
        const val = g.inputValue.trim()
        if (!val || g.values.includes(val)) return g
        return { ...g, values: [...g.values, val], inputValue: '' }
      }),
    )
  }

  const removeOptionValue = (groupId: string, valToRemove: string) => {
    setOptionGroups((prev) =>
      prev.map((g) => {
        if (g.id !== groupId) return g
        return { ...g, values: g.values.filter((v) => v !== valToRemove) }
      }),
    )
  }

  const generateCombinations = () => {
    const validGroups = optionGroups.filter((g) => g.name.trim() && g.values.length > 0)
    if (validGroups.length === 0) return

    const valueArrays = validGroups.map((g) => g.values)
    const cartesian = valueArrays.reduce<string[][]>(
      (acc, curr) => acc.flatMap((d) => curr.map((e) => [...d, e])),
      [[]],
    )

    const prefix = productCode ? productCode.trim().toUpperCase() : 'PRD'
    const newVariants: VariantInput[] = cartesian.map((combo, idx) => {
      const comboName = combo.join(' / ')
      const comboCode = combo.map((c) => c.toUpperCase().replace(/\s+/g, '')).join('-')
      return {
        key: `gen-${Date.now()}-${idx}`,
        sku: `${prefix}-${comboCode}`,
        barcode: `${Math.floor(100000000000 + Math.random() * 900000000000)}`,
        variantName: comboName,
        costPrice: '',
        posPrice: '',
        compareAtPrice: '',
        onlinePrice: '',
        stockQuantity: '',
        stockAlertQty: '5',
        supplierId: '',
        image: undefined,
      }
    })

    setVariants(newVariants)
  }
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

  const handleVariantImage = useCallback((key: string, file?: File) => {
    if (!file) return
    setVariants((prev) => prev.map((variant) => variant.key === key
      ? { ...variant, imageFile: file, imagePreviewUrl: URL.createObjectURL(file) }
      : variant))
  }, [])

  const removeVariantImage = useCallback((key: string) => {
    setVariants((prev) => prev.map((variant) => variant.key === key
      ? { ...variant, image: undefined, imageFile: undefined, imagePreviewUrl: undefined }
      : variant))
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
    const fileName = cropTarget.file?.name || 'cropped-image.jpg'
    const croppedFile = new File([blob], fileName, { type: 'image/jpeg' })
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
            {/* Key-Value Product Options Matrix Builder */}
            <article className={cn(card, 'p-[22px]')}>
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h3 className="m-0 text-[15px] font-bold">Product Options (e.g. Size, Color)</h3>
                  <p className="mt-1 mb-0 text-[12px] text-vpos-muted">
                    Define option names (e.g. Size, Color) and option values to automatically generate variant combinations.
                  </p>
                </div>
                <Toggle
                  checked={hasOptions}
                  onChange={(val) => {
                    setHasOptions(val)
                    if (val && optionGroups.length === 0) {
                      addOptionGroup()
                    }
                  }}
                  label="Has options"
                />
              </div>

              {hasOptions && (
                <div className="space-y-4 pt-3 border-t border-vpos-line">
                  {optionGroups.map((group, idx) => {
                    const suggestedVals = group.name ? DEFAULT_OPTION_VALUES[group.name] || [] : []

                    return (
                      <div key={group.id} className="rounded-xl border border-vpos-line bg-vpos-subtle/30 p-4">
                        <div className="mb-3 flex items-center justify-between gap-2">
                          <strong className="text-[13px] text-vpos-primary">Option {idx + 1}</strong>
                          {optionGroups.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeOptionGroup(group.id)}
                              className="border-0 bg-transparent text-[12px] font-bold text-vpos-red hover:underline"
                            >
                              Remove option
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                          <Select
                            label="Option Name"
                            placeholder="Select or search option (e.g. Size, Color)..."
                            value={group.name}
                            onChange={(val) => {
                              setOptionGroups((prev) =>
                                prev.map((g) => {
                                  if (g.id !== group.id) return g
                                  const autoVals = DEFAULT_OPTION_VALUES[val] || []
                                  return {
                                    ...g,
                                    name: val,
                                    values: autoVals.length > 0 ? autoVals : g.values,
                                  }
                                }),
                              )
                            }}
                            options={attributeSelectOptions}
                            searchable
                          />
                          <div className="md:col-span-2">
                            <label className="mb-2 block text-[12px] font-semibold text-vpos-dark">
                              Option Values
                            </label>
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={group.inputValue}
                                onChange={(e) =>
                                  setOptionGroups((prev) =>
                                    prev.map((g) =>
                                      g.id === group.id ? { ...g, inputValue: e.target.value } : g,
                                    ),
                                  )
                                }
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === ',') {
                                    e.preventDefault()
                                    addOptionValue(group.id)
                                  }
                                }}
                                placeholder="Type custom value and press Enter"
                                className="h-[39px] flex-1 rounded-[4px] border border-vpos-line bg-white px-3 text-[13px] text-vpos-text outline-none focus:border-vpos-primary"
                              />
                              <Button type="button" variant="secondary" onClick={() => addOptionValue(group.id)}>
                                Add
                              </Button>
                            </div>

                            {/* Suggested Values for Selected Option Key Only */}
                            {suggestedVals.length > 0 && (
                              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                <span className="text-[11px] font-bold text-vpos-muted">Suggestions for {group.name}:</span>
                                {suggestedVals.map((sug) => {
                                  const isSelected = group.values.includes(sug)
                                  return (
                                    <button
                                      key={sug}
                                      type="button"
                                      onClick={() => {
                                        if (isSelected) {
                                          removeOptionValue(group.id, sug)
                                        } else {
                                          setOptionGroups((prev) =>
                                            prev.map((g) =>
                                              g.id === group.id
                                                ? { ...g, values: [...g.values, sug] }
                                                : g,
                                            ),
                                          )
                                        }
                                      }}
                                      className={cn(
                                        'rounded-full px-2.5 py-0.5 text-[11px] font-bold transition-colors',
                                        isSelected
                                          ? 'bg-vpos-primary text-white'
                                          : 'border border-vpos-line bg-white text-vpos-muted hover:border-vpos-primary hover:text-vpos-primary',
                                      )}
                                    >
                                      {isSelected ? `✓ ${sug}` : `+ ${sug}`}
                                    </button>
                                  )
                                })}
                              </div>
                            )}

                            {/* Active Selected Values Tags */}
                            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                              {group.values.map((val) => (
                                <span
                                  key={val}
                                  className="inline-flex items-center gap-1.5 rounded-full bg-vpos-sand px-3 py-1 text-[12px] font-bold text-vpos-primary shadow-xs"
                                >
                                  {val}
                                  <button
                                    type="button"
                                    onClick={() => removeOptionValue(group.id, val)}
                                    className="border-0 bg-transparent text-vpos-primary hover:text-vpos-red"
                                  >
                                    ×
                                  </button>
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}

                  <div className="flex items-center justify-between pt-2">
                    <Button type="button" variant="secondary" onClick={addOptionGroup}>
                      <Icon name="add-line" /> Add another option
                    </Button>
                    <Button type="button" variant="primary" onClick={generateCombinations}>
                      <Icon name="refresh-line" /> Generate {optionGroups.reduce((acc, g) => acc * (g.values.length || 1), 1)} Variants
                    </Button>
                  </div>
                </div>
              )}
            </article>

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
                      <div className="flex items-center gap-2">
                        <strong className="text-[13px] font-bold text-vpos-primary-2">Variant {idx + 1}</strong>
                        {v.variantName ? (
                          <span className="rounded-full bg-vpos-sand px-2.5 py-0.5 text-[11px] font-extrabold text-vpos-primary shadow-xs">
                            {v.variantName}
                          </span>
                        ) : null}
                      </div>
                      {variants.length > 1 ? (
                        <button type="button" onClick={() => removeVariant(v.key)} className="border-0 bg-transparent text-[13px] font-bold text-vpos-red hover:underline">
                          Remove
                        </button>
                      ) : null}
                    </div>
                    <div className={formGrid}>
                      <div className="md:col-span-3">
                        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-dashed border-vpos-line bg-white p-3">
                          {v.imagePreviewUrl ? (
                            <div className="relative h-16 w-16 overflow-hidden rounded-lg border border-vpos-line bg-vpos-subtle">
                              <img src={v.imagePreviewUrl} alt={`${v.variantName || `Variant ${idx + 1}`} image`} className="h-full w-full object-cover" />
                              <button
                                type="button"
                                onClick={() => removeVariantImage(v.key)}
                                className="absolute top-1 right-1 grid h-5 w-5 place-items-center rounded-full border-0 bg-black/70 text-[11px] text-white"
                                aria-label="Remove variant image"
                              >
                                ×
                              </button>
                            </div>
                          ) : (
                            <div className="grid h-16 w-16 place-items-center rounded-lg bg-vpos-subtle text-vpos-muted">
                              <Icon name="image-line" className="text-[22px]" />
                            </div>
                          )}
                          <div className="min-w-[190px] flex-1">
                            <strong className="block text-[12px] font-extrabold text-vpos-primary-2">Variant image</strong>
                            <small className="mt-1 block text-[11px] text-vpos-muted">Use a different image for this SKU. It will not replace the parent product images.</small>
                          </div>
                          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-vpos-line bg-white px-3 py-2 text-[12px] font-bold text-vpos-primary hover:border-vpos-primary">
                            <Icon name="upload-2-line" />
                            {v.imagePreviewUrl ? 'Change image' : 'Upload image'}
                            <input
                              type="file"
                              accept="image/png,image/jpeg,image/webp"
                              className="hidden"
                              onChange={(event) => {
                                handleVariantImage(v.key, event.target.files?.[0])
                                event.currentTarget.value = ''
                              }}
                            />
                          </label>
                        </div>
                      </div>
                      <FormField label="SKU" required value={v.sku} onChange={(e) => updateVariant(v.key, 'sku', e.target.value.toUpperCase())} placeholder="e.g. ICE-AMER-M" />
                      <FormField label="Barcode" required value={v.barcode} onChange={(e) => updateVariant(v.key, 'barcode', e.target.value)} placeholder="e.g. 885001020001" />
                      <Select label="Supplier" placeholder="Select a supplier" value={v.supplierId} onChange={(val) => updateVariant(v.key, 'supplierId', val)} options={supplierOptions} searchable />
                    </div>

                    <div className="mt-4">
                      <strong className="mb-2 block text-[12px] font-extrabold tracking-[.02em] text-vpos-primary-2">Pricing</strong>
                      <div className={cn(formGrid)}>
                        <FormField label="Cost price" type="number" step="0.01" value={v.costPrice} onChange={(e) => updateVariant(v.key, 'costPrice', e.target.value)} placeholder="0.00" />
                        <FormField label="POS selling price" required type="number" step="0.01" value={v.posPrice} onChange={(e) => updateVariant(v.key, 'posPrice', e.target.value)} placeholder="0.00" />
                        <FormField label="Compare-at price" type="number" step="0.01" value={v.compareAtPrice} onChange={(e) => updateVariant(v.key, 'compareAtPrice', e.target.value)} placeholder="Original price (shown crossed out)" />
                        <FormField label="Online price" type="number" step="0.01" value={v.onlinePrice} onChange={(e) => updateVariant(v.key, 'onlinePrice', e.target.value)} placeholder="0.00" />
                        <FormField label="Stock quantity" type="number" value={v.stockQuantity} onChange={(e) => updateVariant(v.key, 'stockQuantity', e.target.value)} placeholder="0" />
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
            <Button
              variant="primary"
              disabled={createProductMutation.isPending || updateProductMutation.isPending}
              onClick={handlePublish}
            >
              {createProductMutation.isPending || updateProductMutation.isPending
                ? isEdit
                  ? 'Updating…'
                  : 'Publishing…'
                : step < 3
                  ? 'Continue →'
                  : isEdit
                    ? 'Update product'
                    : 'Publish product'}
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
