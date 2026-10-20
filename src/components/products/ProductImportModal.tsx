import { useMemo, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../context/AuthContext'
import { productApi } from '../../features/products/productApi'
import { MAX_IMPORT_ROWS, readSpreadsheet, templateCsv, toImportRows, type ImportRow } from '../../features/products/productImport'
import type { ProductItem } from '../../features/products/types'
import { useProductBrands, useProductCategories, useProductUnits } from '../../features/products/useProducts'
import { useStoresRaw } from '../../features/stores/useStores'
import { normalizeStoreSalesChannel } from '../../features/stores/salesChannel'
import { money } from '../../data/mockup'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'
import { Modal } from '../ui/Modal'

type Step = 'choose' | 'review' | 'importing' | 'done'
type Outcome = { line: number; name: string; ok: boolean; message?: string }

/** Imports products from an Excel or CSV file into one store, checking every row first. */
export function ProductImportModal({ open, onClose, storeId, products }: {
  open: boolean
  onClose: () => void
  storeId: string
  products: ProductItem[]
}) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const businessId = Number(user?.business?.id)
  const storesQuery = useStoresRaw()
  const storeChannel = normalizeStoreSalesChannel(storesQuery.data?.find((store) => String(store.id) === String(storeId))?.salesChannel)
  const productChannel = storeChannel === 'POS' ? 1 : storeChannel === 'ONLINE' ? 2 : 3
  const supportsPos = storeChannel !== 'ONLINE'
  const supportsOnline = storeChannel !== 'POS'
  const categoriesQuery = useProductCategories(storeId)
  const brandsQuery = useProductBrands(storeId)
  const unitsQuery = useProductUnits(storeId)
  const fileInput = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState<Step>('choose')
  const [fileName, setFileName] = useState('')
  const [rows, setRows] = useState<ImportRow[]>([])
  const [readError, setReadError] = useState<string | null>(null)
  const [createMissing, setCreateMissing] = useState(true)
  const [outcomes, setOutcomes] = useState<Outcome[]>([])

  const existing = useMemo(() => ({
    codes: new Set(products.map((product) => product.productCode?.toLowerCase()).filter(Boolean) as string[]),
    skus: new Set(products.flatMap((product) => product.variants ?? []).map((variant) => variant.sku?.toLowerCase()).filter(Boolean) as string[]),
    barcodes: new Set(products.flatMap((product) => product.variants ?? []).map((variant) => variant.barcode?.toLowerCase()).filter(Boolean) as string[]),
  }), [products])

  const valid = rows.filter((row) => row.errors.length === 0)
  const invalid = rows.length - valid.length
  const missingNames = useMemo(() => {
    const known = (items: { name: string }[]) => new Set(items.map((item) => item.name.trim().toLowerCase()))
    const categories = known((categoriesQuery.data ?? []).map((item) => ({ name: item.categoryName })))
    const brands = known((brandsQuery.data ?? []).map((item) => ({ name: item.brandName })))
    const units = known((unitsQuery.data ?? []).map((item) => ({ name: item.unitName })))
    const collect = (pick: (row: ImportRow) => string | undefined, have: Set<string>) =>
      Array.from(new Set(valid.map(pick).filter((name): name is string => Boolean(name) && !have.has(name!.toLowerCase()))))
    return { categories: collect((row) => row.category, categories), brands: collect((row) => row.brand, brands), units: collect((row) => row.unit, units) }
  }, [valid, categoriesQuery.data, brandsQuery.data, unitsQuery.data])
  const missingCount = missingNames.categories.length + missingNames.brands.length + missingNames.units.length

  const reset = () => {
    setStep('choose')
    setFileName('')
    setRows([])
    setReadError(null)
    setOutcomes([])
    if (fileInput.current) fileInput.current.value = ''
  }

  const close = () => {
    if (step === 'importing') return
    reset()
    onClose()
  }

  const downloadTemplate = () => {
    const url = URL.createObjectURL(new Blob([templateCsv()], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'tinhluk-products-template.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  const chooseFile = async (file: File | undefined) => {
    if (!file) return
    setReadError(null)
    setFileName(file.name)
    try {
      const parsed = toImportRows(await readSpreadsheet(file), existing)
      setRows(parsed.rows)
      setStep('review')
    } catch (error) {
      setReadError(error instanceof Error ? error.message : 'The file could not be read.')
    }
  }

  const runImport = async () => {
    setStep('importing')
    setOutcomes([])
    const storeIds = [Number(storeId)]
    const codeFor = (name: string) => `${name.toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30) || 'ITEM'}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`
    const ids = {
      category: new Map((categoriesQuery.data ?? []).map((item) => [item.categoryName.trim().toLowerCase(), item.id])),
      brand: new Map((brandsQuery.data ?? []).map((item) => [item.brandName.trim().toLowerCase(), item.id])),
      unit: new Map((unitsQuery.data ?? []).map((item) => [item.unitName.trim().toLowerCase(), item.id])),
    }
    // Missing categories, brands and units are made once, before the products that use them.
    const ensure = async (kind: 'category' | 'brand' | 'unit', name: string | undefined) => {
      if (!name) return undefined
      const key = name.trim().toLowerCase()
      const known = ids[kind].get(key)
      if (known !== undefined || !createMissing) return known
      const common = { businessId, storeIds, isGlobal: false, status: 'ACTIVE' }
      const created = kind === 'category'
        ? await productApi.createCategory({ ...common, categoryCode: codeFor(name), categoryName: name.trim(), sortOrder: 0, isFeatured: false })
        : kind === 'brand'
          ? await productApi.createBrand({ ...common, brandCode: codeFor(name), brandName: name.trim(), isFeatured: false })
          : await productApi.createUnit({ ...common, unitCode: codeFor(name), unitName: name.trim() })
      ids[kind].set(key, created.id)
      return created.id
    }

    const results: Outcome[] = []
    for (const row of valid) {
      try {
        const [categoryId, brandId, unitId] = [await ensure('category', row.category), await ensure('brand', row.brand), await ensure('unit', row.unit)]
        const stamp = `${Date.now()}-${row.line}`
        // Same fields the product form sends; stock fields are not in the variant type.
        const variant = {
          sku: row.sku || `SKU-${stamp}`,
          barcode: row.barcode || `BAR-${stamp}`,
          variantName: 'Default',
          posPrice: supportsPos ? row.price : 0,
          onlinePrice: supportsOnline ? (row.onlinePrice ?? row.price) : 0,
          costPrice: row.cost ?? 0,
          compareAtPrice: 0,
          stockQuantity: row.stock ?? 0,
          quantity: row.stock ?? 0,
          stockAlertQty: row.lowStock ?? 5,
          isDefault: true,
        }
        await productApi.createProduct({
          storeId: Number(storeId),
          isGlobal: false,
          storeIds,
          productCode: row.code || `PRD-${stamp}`,
          productName: row.name,
          shortName: row.name,
          currencyCode: 'USD',
          salesChannel: productChannel,
          description: supportsOnline ? row.description : '',
          category: categoryId ? { id: categoryId } : undefined,
          brand: brandId ? { id: brandId } : undefined,
          unit: unitId ? { id: unitId } : undefined,
          isFeatured: false,
          isSellable: true,
          isStockable: true,
          variants: [variant],
        })
        results.push({ line: row.line, name: row.name, ok: true })
      } catch (error) {
        results.push({ line: row.line, name: row.name, ok: false, message: error instanceof Error ? error.message : 'Could not be created' })
      }
      setOutcomes([...results])
    }
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['products-list'] }),
      queryClient.invalidateQueries({ queryKey: ['product-categories'] }),
      queryClient.invalidateQueries({ queryKey: ['product-brands'] }),
      queryClient.invalidateQueries({ queryKey: ['product-units'] }),
    ])
    setStep('done')
  }

  const created = outcomes.filter((outcome) => outcome.ok).length
  const failed = outcomes.filter((outcome) => !outcome.ok)

  const footer = step === 'review' ? (
    <>
      <Button variant="secondary" onClick={reset}>Choose another file</Button>
      <Button variant="primary" onClick={() => void runImport()} disabled={valid.length === 0}>
        <Icon name="upload-2-line" /> {`Import ${valid.length} products`}
      </Button>
    </>
  ) : step === 'done' ? (
    <Button variant="primary" onClick={close}>Done</Button>
  ) : step === 'choose' ? (
    <Button variant="secondary" onClick={close}>Cancel</Button>
  ) : null

  return (
    <Modal
      open={open}
      onClose={close}
      size="4xl"
      closeOnBackdrop={false}
      hideClose={step === 'importing'}
      title="Import products"
      description="Add many products at once from an Excel or CSV file. They are added to the store selected at the top of the page."
      footer={footer}
    >
      {step === 'choose' ? (
        <div className="space-y-4">
          <ol className="m-0 list-decimal space-y-1.5 pl-5 text-[13px] leading-5 text-vpos-text">
            <li>Download the template and fill one product per row. Name and Price are required.</li>
            <li>{storeChannel === 'POS' ? 'This POS-only store imports the required Price as its POS selling price.' : storeChannel === 'ONLINE' ? 'This online-only store imports the required Price as its online selling price; Online price can override it.' : 'Price is used for POS; Online price can override it for online orders.'}</li>
            <li>Save it as Excel (.xlsx) or CSV, then choose the file below.</li>
            <li>Check the rows, then import. Nothing is added until you press Import.</li>
          </ol>
          <Button variant="secondary" onClick={downloadTemplate}><Icon name="download-2-line" /> Download template</Button>
          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-vpos-line bg-vpos-subtle px-4 py-10 text-center hover:border-vpos-primary/50">
            <Icon name="file-excel-2-line" className="text-[32px] text-vpos-green" />
            <span className="text-[14px] font-bold text-vpos-text">Choose an Excel or CSV file</span>
            <span className="text-[12px] text-vpos-muted">{`.xlsx or .csv · up to ${MAX_IMPORT_ROWS} products`}</span>
            <input ref={fileInput} type="file" accept=".xlsx,.csv,text/csv" className="sr-only" onChange={(event) => void chooseFile(event.target.files?.[0])} />
          </label>
          {readError ? (
            <p className="m-0 rounded-lg border border-vpos-red/25 bg-vpos-red-bg px-3 py-2.5 text-[13px] text-vpos-red">{readError}</p>
          ) : null}
        </div>
      ) : null}

      {step === 'review' ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-[13px]">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-vpos-subtle px-3 py-1 font-semibold text-vpos-text"><Icon name="file-excel-2-line" /> {fileName}</span>
            <span className="rounded-full bg-vpos-green-bg px-3 py-1 font-bold text-vpos-green">{`${valid.length} ready`}</span>
            {invalid ? <span className="rounded-full bg-vpos-red-bg px-3 py-1 font-bold text-vpos-red">{`${invalid} with problems`}</span> : null}
          </div>
          {invalid ? <p className="m-0 text-[12px] text-vpos-muted">Rows with problems are skipped. Fix them in the file and import it again later.</p> : null}
          {missingCount ? (
            <label className="flex items-start gap-2.5 rounded-lg border border-vpos-line bg-vpos-subtle px-3 py-2.5 text-[13px] text-vpos-text">
              <input type="checkbox" checked={createMissing} onChange={(event) => setCreateMissing(event.target.checked)} className="mt-0.5 h-4 w-4 accent-vpos-primary" />
              <span>
                <strong className="block">Create the missing categories, brands and units</strong>
                <span data-locale-ignore className="text-[12px] text-vpos-muted">
                  {[...missingNames.categories, ...missingNames.brands, ...missingNames.units].slice(0, 8).join(', ')}
                  {missingCount > 8 ? ' …' : ''}
                </span>
              </span>
            </label>
          ) : null}
          <div className="max-h-[46vh] overflow-auto rounded-lg border border-vpos-line">
            <table className="w-full min-w-[720px] border-collapse text-left text-[12px]">
              <thead className="sticky top-0 bg-vpos-subtle text-[11px] font-bold tracking-wide text-vpos-muted uppercase">
                <tr>
                  <th className="px-3 py-2">Row</th><th className="px-3 py-2">Name</th><th className="px-3 py-2">SKU</th><th className="px-3 py-2">Category</th>
                  <th className="px-3 py-2 text-right">Price</th><th className="px-3 py-2 text-right">Cost</th><th className="px-3 py-2 text-right">Stock</th><th className="px-3 py-2">Check</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.line} className={row.errors.length ? 'bg-vpos-red-bg/40' : ''}>
                    <td className="border-t border-vpos-line px-3 py-2 text-vpos-muted">{row.line}</td>
                    <td data-locale-ignore className="border-t border-vpos-line px-3 py-2 font-semibold text-vpos-text">{row.name || '—'}</td>
                    <td className="border-t border-vpos-line px-3 py-2">{row.sku || <span className="text-vpos-muted">Auto</span>}</td>
                    <td data-locale-ignore className="border-t border-vpos-line px-3 py-2">{row.category || '—'}</td>
                    <td className="border-t border-vpos-line px-3 py-2 text-right">{money(row.price)}</td>
                    <td className="border-t border-vpos-line px-3 py-2 text-right">{row.cost === undefined ? '—' : money(row.cost)}</td>
                    <td className="border-t border-vpos-line px-3 py-2 text-right">{row.stock ?? 0}</td>
                    <td className="border-t border-vpos-line px-3 py-2">
                      {row.errors.length
                        ? row.errors.map((error) => <span key={error} className="block text-vpos-red">{error}</span>)
                        : <span className="inline-flex items-center gap-1 font-semibold text-vpos-green"><Icon name="check-line" /> Ready</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {step === 'importing' || step === 'done' ? (
        <div className="space-y-4">
          <div>
            <div className="mb-1.5 flex justify-between text-[13px] font-semibold text-vpos-text">
              <span>{step === 'importing' ? 'Importing products…' : 'Import finished'}</span>
              <span>{`${outcomes.length} / ${valid.length}`}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-vpos-subtle">
              <div className="h-full rounded-full bg-vpos-primary transition-all" style={{ width: `${valid.length ? (outcomes.length / valid.length) * 100 : 100}%` }} />
            </div>
          </div>
          {step === 'importing' ? <p className="m-0 text-[12px] text-vpos-muted">Keep this window open until the import finishes.</p> : null}
          {step === 'done' ? (
            <div className="flex flex-wrap gap-2 text-[13px]">
              <span className="rounded-full bg-vpos-green-bg px-3 py-1 font-bold text-vpos-green">{`${created} products added`}</span>
              {failed.length ? <span className="rounded-full bg-vpos-red-bg px-3 py-1 font-bold text-vpos-red">{`${failed.length} not added`}</span> : null}
              {invalid ? <span className="rounded-full bg-vpos-subtle px-3 py-1 font-bold text-vpos-muted">{`${invalid} skipped`}</span> : null}
            </div>
          ) : null}
          {failed.length ? (
            <ul className="m-0 max-h-[30vh] list-none space-y-1.5 overflow-auto p-0 text-[12px]">
              {failed.map((outcome) => (
                <li key={outcome.line} className="rounded-lg border border-vpos-red/20 bg-vpos-red-bg px-3 py-2 text-vpos-red">
                  <strong>{`Row ${outcome.line} · ${outcome.name}`}</strong> — {outcome.message}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </Modal>
  )
}
