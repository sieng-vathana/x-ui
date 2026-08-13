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
import { useStoresRaw } from '../features/stores/useStores'
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

function inferOptionName(values: string[], apiAttributes: { attributeName?: string }[] = [], groupIndex = 0): string {
  const colorKeywords = [
    'black', 'white', 'red', 'blue', 'green', 'yellow', 'purple', 'pink',
    'orange', 'grey', 'gray', 'brown', 'gold', 'silver', 'navy', 'beige',
    'cyan', 'magenta', 'charcoal', 'olive', 'maroon', 'teal', 'violet',
  ]
  const sizeKeywords = [
    'small', 'medium', 'large', 'xs', 's', 'm', 'l', 'xl', 'xxl', '2xl',
    '3xl', '4xl', '12oz', '16oz', '20oz', '24oz', 'oz', 'ml', 'liter', 'kg', 'g', 'lb',
  ]
  const tempKeywords = [
    'hot', 'iced', 'ice', 'extra ice', 'warm', 'cold', 'room temperature', 'frozen', 'less ice', 'no ice',
  ]
  const flavorKeywords = [
    'vanilla', 'caramel', 'hazelnut', 'chocolate', 'strawberry', 'mocha', 'matcha', 'taro', 'mango', 'coconut', 'mint', 'cinnamon',
  ]
  const milkKeywords = [
    'whole milk', 'oat milk', 'almond milk', 'soy milk', 'skim milk', 'coconut milk', 'condensed milk', 'fresh milk', 'lactose free',
  ]

  const lowerVals = values.map((v) => v.toLowerCase().trim())
  if (lowerVals.some((v) => colorKeywords.some((c) => v.includes(c)))) return 'Color'
  if (lowerVals.some((v) => sizeKeywords.some((s) => v === s || v.startsWith(s)))) return 'Size'
  if (lowerVals.some((v) => tempKeywords.some((t) => v.includes(t)))) return 'Temperature'
  if (lowerVals.some((v) => flavorKeywords.some((f) => v.includes(f)))) return 'Flavor'
  if (lowerVals.some((v) => milkKeywords.some((m) => v.includes(m)))) return 'Milk Type'

  for (const attr of apiAttributes) {
    if (attr.attributeName && lowerVals.includes(attr.attributeName.toLowerCase().trim())) {
      return attr.attributeName
    }
  }

  const defaultFallbackOrder = ['Size', 'Color', 'Flavor', 'Temperature', 'Milk Type']
  return defaultFallbackOrder[groupIndex] || `Option ${groupIndex + 1}`
}

export function ProductFormPage() {
  const navigate = useNavigate()
  const { sku } = useParams()
  const isEdit = Boolean(sku)
  const { data: existingProduct } = useProduct(sku)
  const createProductMutation = useCreateProduct()
  const updateProductMutation = useUpdateProduct()
  const { storeId, setStoreId, sidebarWidth } = useAdminStore()
  const { data: rawStores = [] } = useStoresRaw()

  const [step, setStep] = useState(1)
  const [formStoreId, setFormStoreId] = useState<string>(() => (storeId ? String(storeId) : ''))
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
  const [isGlobal, setIsGlobal] = useState(false)
  const [storeIds, setStoreIds] = useState<number[]>(() => (storeId ? [Number(storeId)] : []))

  const [variants, setVariants] = useState<VariantInput[]>([emptyVariant(0)])
  const [hasOptions, setHasOptions] = useState(false)
  const [optionGroups, setOptionGroups] = useState<
    { id: string; name: string; values: string[]; inputValue: string }[]
  >([
    { id: 'opt-1', name: '', values: [], inputValue: '' },
  ])
  const [images, setImages] = useState<ProductImage[]>([])
  const [cropTarget, setCropTarget] = useState<ProductImage | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const effectiveStoreId = formStoreId || storeId

  const { data: apiCategories = [], isLoading: loadingCategories } = useProductCategories(effectiveStoreId)
  const { data: apiBrands = [], isLoading: loadingBrands } = useProductBrands(effectiveStoreId)
  const { data: apiUnits = [], isLoading: loadingUnits } = useProductUnits(effectiveStoreId)
  const { data: apiTaxes = [], isLoading: loadingTaxes } = useProductTaxes(effectiveStoreId)
  const { data: apiSuppliers = [] } = useProductSuppliers(effectiveStoreId)
  const { data: apiAttributes = [] } = useProductAttributes()

  useEffect(() => {
    if (!existingProduct) return
    if (existingProduct.storeId) {
      setFormStoreId(String(existingProduct.storeId))
    }
    if (existingProduct.isGlobal != null) setIsGlobal(existingProduct.isGlobal)
    if (existingProduct.storeIds && existingProduct.storeIds.length > 0) {
      setStoreIds(existingProduct.storeIds.map(Number))
    } else if (existingProduct.storeId) {
      setStoreIds([Number(existingProduct.storeId)])
    }
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
      const loadedVariants = existingProduct.variants.map((v, idx) => ({
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
      }))
      setVariants(loadedVariants)

      if (loadedVariants.length > 1 || (loadedVariants.length === 1 && loadedVariants[0].variantName && loadedVariants[0].variantName !== 'Default' && loadedVariants[0].variantName !== 'Standard')) {
        setHasOptions(true)
        const hasSlash = loadedVariants.some((v) => v.variantName.includes(' / '))
        if (hasSlash) {
          const partsByGroup: string[][] = []
          loadedVariants.forEach((v) => {
            const parts = v.variantName.split(' / ')
            parts.forEach((part, gIdx) => {
              if (!partsByGroup[gIdx]) partsByGroup[gIdx] = []
              const trimmed = part.trim()
              if (trimmed && !partsByGroup[gIdx].includes(trimmed)) {
                partsByGroup[gIdx].push(trimmed)
              }
            })
          })
          const parsedGroups = partsByGroup.map((vals, gIdx) => ({
            id: `opt-${Date.now()}-${gIdx}`,
            name: inferOptionName(vals, apiAttributes, gIdx),
            values: vals,
            inputValue: '',
          }))
          if (parsedGroups.length > 0) {
            setOptionGroups(parsedGroups)
          }
        } else {
          const distinctNames = Array.from(new Set(loadedVariants.map((v) => v.variantName.trim()).filter(Boolean)))
          if (distinctNames.length > 0) {
            setOptionGroups([
              {
                id: `opt-${Date.now()}`,
                name: inferOptionName(distinctNames, apiAttributes, 0),
                values: distinctNames,
                inputValue: '',
              },
            ])
          }
        }
      }
    }
  }, [existingProduct, apiAttributes])

  useEffect(() => {
    if (!formStoreId && storeId) {
      setFormStoreId(String(storeId))
    }
  }, [storeId, formStoreId])

  const attributeSelectOptions = useMemo(() => {
    const defaultAttrs = [
      { value: 'Size', label: 'Size' },
      { value: 'Color', label: 'Color' },
      { value: 'Flavor', label: 'Flavor' },
      { value: 'Temperature', label: 'Temperature' },
      { value: 'Milk Type', label: 'Milk Type' },
      { value: 'Material', label: 'Material' },
      { value: 'Style', label: 'Style' },
    ]
    const liveOpts = apiAttributes.map((a) => ({ value: a.attributeName, label: a.attributeName }))
    const names = new Set(liveOpts.map((o) => o.value))
    const merged = [...liveOpts]
    for (const def of defaultAttrs) {
      if (!names.has(def.value)) {
        merged.push(def)
        names.add(def.value)
      }
    }
    optionGroups.forEach((g) => {
      if (g.name && !names.has(g.name)) {
        merged.push({ value: g.name, label: g.name })
        names.add(g.name)
      }
    })
    return merged
  }, [apiAttributes, optionGroups])

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
      const numStoreId = Number(formStoreId || (storeIds.length > 0 ? storeIds[0] : storeId))
      if (!isGlobal && storeIds.length === 0) {
        toast('Please select at least one store location for this product.', 'warning')
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
        storeId: numStoreId > 0 ? numStoreId : (Number(storeId) || 1),
        isGlobal,
        storeIds: isGlobal ? [] : storeIds.map(Number),
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
    const currentNumStoreId = Number(effectiveStoreId)
    return apiCategories
      .filter((c) => !c.status || String(c.status) === '1' || c.status === 'ACTIVE' || String(c.id) === categoryId)
      .filter((c) => c.isGlobal !== false || !c.storeIds?.length || (currentNumStoreId && c.storeIds.map(Number).includes(currentNumStoreId)))
      .map((c) => ({
        value: String(c.id),
        label: c.categoryName,
        image: c.image || undefined,
      }))
  }, [apiCategories, effectiveStoreId, categoryId])

  const brandOptions = useMemo(() => {
    const currentNumStoreId = Number(effectiveStoreId)
    return apiBrands
      .filter((b) => !b.status || String(b.status) === '1' || b.status === 'ACTIVE' || String(b.id) === brandId)
      .filter((b) => b.isGlobal !== false || !b.storeIds?.length || (currentNumStoreId && b.storeIds.map(Number).includes(currentNumStoreId)) || String(b.id) === brandId)
      .map((b) => ({
        value: String(b.id),
        label: b.brandName,
        image: b.logo || undefined,
      }))
  }, [apiBrands, effectiveStoreId, brandId])

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

    // Look up existing variants by name or sku
    const existingByName = new Map<string, VariantInput>()
    const existingBySku = new Map<string, VariantInput>()
    variants.forEach((v) => {
      if (v.variantName) existingByName.set(v.variantName.toLowerCase().trim(), v)
      if (v.sku) existingBySku.set(v.sku.toUpperCase().trim(), v)
    })

    const templateVariant = variants.find((v) => v.posPrice || v.image || v.imagePreviewUrl) || variants[0]

    const newVariants: VariantInput[] = cartesian.map((combo, idx) => {
      const comboName = combo.join(' / ')
      const comboCode = combo.map((c) => c.toUpperCase().replace(/\s+/g, '')).join('-')
      const targetSku = `${prefix}-${comboCode}`

      // Match existing variant by combination name or SKU
      const matched = existingByName.get(comboName.toLowerCase().trim()) || existingBySku.get(targetSku)

      if (matched) {
        return {
          ...matched,
          key: matched.key || `gen-${Date.now()}-${idx}`,
          variantName: comboName,
          sku: matched.sku || targetSku,
        }
      }

      // New variant — inherit baseline defaults without wiping out images
      return {
        key: `gen-${Date.now()}-${idx}`,
        sku: targetSku,
        barcode: `${Math.floor(100000000000 + Math.random() * 900000000000)}`,
        variantName: comboName,
        costPrice: templateVariant?.costPrice || '',
        posPrice: templateVariant?.posPrice || '',
        compareAtPrice: templateVariant?.compareAtPrice || '',
        onlinePrice: templateVariant?.onlinePrice || '',
        stockQuantity: templateVariant?.stockQuantity || '',
        stockAlertQty: templateVariant?.stockAlertQty || '5',
        supplierId: templateVariant?.supplierId || '',
        image: templateVariant?.image,
        imageFile: templateVariant?.imageFile,
        imagePreviewUrl: templateVariant?.imagePreviewUrl,
      }
    })

    setVariants(newVariants)
    toast(`Generated ${newVariants.length} variants, preserving existing images and pricing.`, 'info')
  }

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
              {/* Store Coverage & Availability */}
              <article className={cn(card, 'p-[22px]')}>
                <div className={formSectionTitle}>
                  <h3 className="m-0 text-[15px]">Store Coverage & Availability</h3>
                  <p className="mt-1.5 mb-0 text-[12px] text-vpos-muted">
                    Specify whether this product is global (available across all stores) or restricted to specific stores.
                  </p>
                </div>

                <div className="flex items-center gap-3 mb-4">
                  <button
                    type="button"
                    onClick={() => {
                      setIsGlobal(true)
                    }}
                    className={cn(
                      'flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border text-[13px] font-bold transition cursor-pointer',
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
                      'flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border text-[13px] font-bold transition cursor-pointer',
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
                  <div className="space-y-2 border-t border-vpos-line/80 pt-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] font-bold text-vpos-text">
                        Select assigned stores <span className="text-vpos-red">*</span>
                      </span>
                      <div className="flex items-center gap-2 text-[11px]">
                        <button
                          type="button"
                          onClick={() => {
                            const allIds = rawStores.map((s) => Number(s.id))
                            setStoreIds(allIds)
                            if (allIds.length > 0) {
                              setFormStoreId(String(allIds[0]))
                              setStoreId(String(allIds[0]))
                            }
                          }}
                          className="font-bold text-vpos-primary hover:underline cursor-pointer"
                        >
                          Select all
                        </button>
                        <span className="text-vpos-muted">•</span>
                        <button
                          type="button"
                          onClick={() => setStoreIds([])}
                          className="font-bold text-vpos-muted hover:text-vpos-text cursor-pointer"
                        >
                          Clear
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 pt-1">
                      {rawStores.map((st) => {
                        const sid = Number(st.id)
                        const checked = storeIds.map(Number).includes(sid)
                        return (
                          <label
                            key={st.id}
                            className={cn(
                              'flex cursor-pointer items-center gap-2.5 rounded-xl border p-3 text-[13px] font-semibold transition-all',
                              checked
                                ? 'border-vpos-primary bg-vpos-sand/30 text-vpos-primary shadow-2xs'
                                : 'border-vpos-line bg-white text-vpos-text hover:border-vpos-line/80 hover:bg-vpos-subtle/50',
                            )}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => {
                                setStoreIds((prev) => {
                                  const numericPrev = prev.map(Number)
                                  const exists = numericPrev.includes(sid)
                                  const updated = exists ? numericPrev.filter((id) => id !== sid) : [...numericPrev, sid]
                                  if (updated.length > 0) {
                                    setFormStoreId(String(updated[0]))
                                    setStoreId(String(updated[0]))
                                  }
                                  return updated
                                })
                              }}
                              className="h-4 w-4 rounded border-vpos-line text-vpos-primary focus:ring-vpos-primary/30"
                            />
                            <div className="min-w-0 flex-1 truncate">
                              <span className="block truncate font-bold">{st.name}</span>
                              {st.city ? <span className="block text-[11px] font-normal text-vpos-muted truncate">{st.city}</span> : null}
                            </div>
                          </label>
                        )
                      })}
                    </div>
                  </div>
                )}
              </article>

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
                  {optionGroups.map((group, idx) => (
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
                                  return {
                                    ...g,
                                    name: val,
                                  }
                                }),
                              )
                            }}
                            options={attributeSelectOptions}
                            searchable
                            allowCustom
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
                                placeholder="Type value and press Enter (e.g. Small, Red)"
                                className="h-[39px] flex-1 rounded-[4px] border border-vpos-line bg-white px-3 text-[13px] text-vpos-text outline-none focus:border-vpos-primary"
                              />
                              <Button type="button" variant="secondary" onClick={() => addOptionValue(group.id)}>
                                Add
                              </Button>
                            </div>

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
                                    className="border-0 bg-transparent text-vpos-primary hover:text-vpos-red cursor-pointer"
                                  >
                                    ×
                                  </button>
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}

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
          <div className="space-y-6">
            {/* Overview Summary Banner */}
            <article className={cn(card, 'p-6')}>
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  {images.find((i) => i.isPrimary)?.previewUrl || images[0]?.previewUrl ? (
                    <img
                      src={images.find((i) => i.isPrimary)?.previewUrl || images[0]?.previewUrl}
                      alt=""
                      className="h-16 w-16 rounded-xl border border-vpos-line object-cover shadow-2xs"
                    />
                  ) : (
                    <div className="grid h-16 w-16 place-items-center rounded-xl bg-vpos-sand text-vpos-primary">
                      <Icon name="shopping-bag-3-fill" className="text-[28px]" />
                    </div>
                  )}
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="m-0 text-[18px] font-extrabold text-vpos-dark">
                        {productName || 'Untitled Product'}
                      </h2>
                      {isFeatured ? (
                        <span className="rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-extrabold text-amber-700">
                          ★ FEATURED
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-[12px] text-vpos-muted font-medium">
                      <span>Code: <strong className="text-vpos-dark">{productCode || 'Auto-generated'}</strong></span>
                      <span>•</span>
                      <span>Channel: <strong className="text-vpos-dark">{salesChannel === 'POS' ? 'POS only' : salesChannel === 'ONLINE' ? 'Online only' : 'POS + Online'}</strong></span>
                      <span>•</span>
                      <span>Currency: <strong className="text-vpos-dark">{currencyCode}</strong></span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {isGlobal ? (
                    <span className="inline-flex items-center gap-1.5 rounded-lg border border-vpos-primary/20 bg-vpos-sand px-3 py-1.5 text-[12px] font-bold text-vpos-primary">
                      <Icon name="global-line" />
                      Global (All Stores)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-lg border border-vpos-primary/20 bg-vpos-sand px-3 py-1.5 text-[12px] font-bold text-vpos-primary">
                      <Icon name="store-2-line" />
                      {storeIds.length} Assigned Store{storeIds.length !== 1 ? 's' : ''}
                    </span>
                  )}
                  <span className={cn(
                    'inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-[12px] font-bold',
                    isSellable ? 'bg-vpos-green-bg text-vpos-green' : 'bg-slate-100 text-slate-600',
                  )}>
                    ● {isSellable ? 'Active for Sale' : 'Draft / Hidden'}
                  </span>
                </div>
              </div>
            </article>

            {/* Specifications & Categorization */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <article className={cn(card, 'p-6')}>
                <h3 className="m-0 text-[14px] font-extrabold text-vpos-dark mb-4">
                  Categorization & Attributes
                </h3>
                <dl className="grid grid-cols-2 gap-3 text-[13px]">
                  <div className="rounded-lg bg-vpos-subtle/50 p-3">
                    <dt className="text-[11px] font-extrabold uppercase tracking-wider text-vpos-muted">Store Coverage</dt>
                    <dd className="mt-1 font-bold text-vpos-dark m-0">
                      {isGlobal ? 'All Stores (Global)' : storeIds.length > 0 ? `${storeIds.length} Store${storeIds.length !== 1 ? 's' : ''}` : 'None'}
                    </dd>
                  </div>
                  <div className="rounded-lg bg-vpos-subtle/50 p-3">
                    <dt className="text-[11px] font-extrabold uppercase tracking-wider text-vpos-muted">Category</dt>
                    <dd className="mt-1 font-bold text-vpos-dark m-0">
                      {apiCategories.find((c) => String(c.id) === categoryId)?.categoryName || 'None'}
                    </dd>
                  </div>
                  <div className="rounded-lg bg-vpos-subtle/50 p-3">
                    <dt className="text-[11px] font-extrabold uppercase tracking-wider text-vpos-muted">Brand</dt>
                    <dd className="mt-1 font-bold text-vpos-dark m-0">
                      {apiBrands.find((b) => String(b.id) === brandId)?.brandName || 'None'}
                    </dd>
                  </div>
                  <div className="rounded-lg bg-vpos-subtle/50 p-3">
                    <dt className="text-[11px] font-extrabold uppercase tracking-wider text-vpos-muted">Unit of Measurement</dt>
                    <dd className="mt-1 font-bold text-vpos-dark m-0">
                      {apiUnits.find((u) => String(u.id) === unitId)?.unitName || 'None'}
                    </dd>
                  </div>
                  <div className="rounded-lg bg-vpos-subtle/50 p-3">
                    <dt className="text-[11px] font-extrabold uppercase tracking-wider text-vpos-muted">Tax Rate</dt>
                    <dd className="mt-1 font-bold text-vpos-dark m-0">
                      {apiTaxes.find((t) => String(t.id) === taxId)?.taxName || 'None'}
                    </dd>
                  </div>
                  <div className="rounded-lg bg-vpos-subtle/50 p-3">
                    <dt className="text-[11px] font-extrabold uppercase tracking-wider text-vpos-muted">Inventory Tracking</dt>
                    <dd className="mt-1 font-bold text-vpos-dark m-0">
                      {isStockable ? 'Stock tracked' : 'No tracking'}
                    </dd>
                  </div>
                </dl>
                {description ? (
                  <div className="mt-4 rounded-lg border border-vpos-line p-3 text-[12px] text-vpos-muted">
                    <strong className="block font-bold text-vpos-dark mb-1">Description:</strong>
                    {description}
                  </div>
                ) : null}
              </article>

              {/* Image Previews */}
              <article className={cn(card, 'p-6')}>
                <h3 className="m-0 text-[14px] font-extrabold text-vpos-dark mb-4">
                  Product Gallery ({images.length} image{images.length !== 1 ? 's' : ''})
                </h3>
                {images.length > 0 ? (
                  <div className="grid grid-cols-3 gap-3">
                    {images.map((img, idx) => (
                      <div key={img.id} className="relative overflow-hidden rounded-xl border border-vpos-line bg-vpos-subtle aspect-square">
                        <img src={img.previewUrl} alt="" className="h-full w-full object-cover" />
                        {img.isPrimary ? (
                          <span className="absolute top-2 left-2 rounded-md bg-vpos-primary px-1.5 py-0.5 text-[9px] font-extrabold text-white shadow">
                            PRIMARY
                          </span>
                        ) : (
                          <span className="absolute top-2 left-2 rounded-md bg-black/60 px-1.5 py-0.5 text-[9px] font-bold text-white">
                            #{idx + 1}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid h-32 place-items-center rounded-xl border border-dashed border-vpos-line bg-vpos-subtle/40 text-center text-[12px] text-vpos-muted">
                    No images uploaded. A default placeholder will be used.
                  </div>
                )}
              </article>
            </div>

            {/* Variants Matrix Table */}
            <article className={cn(card, 'p-6')}>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="m-0 text-[14px] font-extrabold text-vpos-dark">
                    Variants & Pricing Matrix ({variants.length})
                  </h3>
                  <p className="mt-1 m-0 text-[12px] text-vpos-muted">
                    Every SKU will be synchronized to {rawStores.find((s) => String(s.id) === effectiveStoreId)?.name || 'the selected store'}.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-vpos-line">
                <table className="w-full text-left text-[13px]">
                  <thead className="border-b border-vpos-line bg-[#f8f9fc] text-[11px] font-extrabold uppercase tracking-wider text-vpos-muted">
                    <tr>
                      <th className="py-3 px-4">Variant</th>
                      <th className="py-3 px-4">SKU</th>
                      <th className="py-3 px-4">Barcode</th>
                      <th className="py-3 px-4 text-right">POS Price</th>
                      <th className="py-3 px-4 text-right">Online Price</th>
                      <th className="py-3 px-4 text-right">Cost Price</th>
                      <th className="py-3 px-4 text-right">Initial Stock</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-vpos-line bg-white font-medium text-vpos-dark">
                    {variants.map((v, idx) => (
                      <tr key={v.key} className="hover:bg-vpos-subtle/30">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            {v.imagePreviewUrl ? (
                              <img src={v.imagePreviewUrl} alt="" className="h-7 w-7 rounded-md object-cover border border-vpos-line" />
                            ) : (
                              <span className="grid h-7 w-7 place-items-center rounded-md bg-vpos-sand text-vpos-primary text-[11px] font-bold">
                                {idx + 1}
                              </span>
                            )}
                            <span className="font-bold">{v.variantName || `Default`}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono text-[12px] text-vpos-muted">{v.sku || '—'}</td>
                        <td className="py-3 px-4 font-mono text-[12px] text-vpos-muted">{v.barcode || '—'}</td>
                        <td className="py-3 px-4 text-right font-bold text-vpos-primary">
                          ${Number(v.posPrice || 0).toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-right text-vpos-muted">
                          {v.onlinePrice ? `$${Number(v.onlinePrice).toFixed(2)}` : '—'}
                        </td>
                        <td className="py-3 px-4 text-right text-vpos-muted">
                          {v.costPrice ? `$${Number(v.costPrice).toFixed(2)}` : '—'}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-vpos-dark">
                          {v.stockQuantity !== '' ? v.stockQuantity : '0'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>
          </div>
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
