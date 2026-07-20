import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Breadcrumb,
  Button,
  FormField,
  Icon,
  ProductMode,
  StoreSwitcher,
  TextAreaField,
  Toggle,
  Topbar,
  UploadZone,
} from '../components'
import { productOptionTypes, products as catalog } from '../data/mockup'
import { useAdminStore } from '../hooks/useAdminStore'
import { cn } from '../lib/cn'
import { paths } from '../lib/paths'
import {
  card,
  formGrid,
  formSectionTitle,
  pageContent,
} from '../lib/ui'

type OptionDef = { id: string; name: string; values: string }

function cartesianVariants(options: OptionDef[]): string[] {
  const cleaned = options
    .map((o) => ({
      name: o.name.trim() || 'Option',
      values: o.values
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean),
    }))
    .filter((o) => o.values.length > 0)
  if (cleaned.length === 0) return []
  return cleaned.reduce<string[]>(
    (acc, opt) => {
      if (acc.length === 0) return opt.values.map((v) => `${opt.name}: ${v}`)
      const next: string[] = []
      for (const prev of acc) {
        for (const v of opt.values) {
          next.push(`${prev} · ${opt.name}: ${v}`)
        }
      }
      return next
    },
    [],
  )
}

export function ProductFormPage() {
  const navigate = useNavigate()
  const { sku } = useParams()
  const isEdit = Boolean(sku)
  const product = catalog.find((p) => p.sku === sku)
  const { storeId, setStoreId, sidebarWidth } = useAdminStore()

  const [step, setStep] = useState(1)
  const [productMode, setProductMode] = useState('simple')
  const [trackStock, setTrackStock] = useState(true)
  const [continueSelling, setContinueSelling] = useState(false)
  const [optionDefs, setOptionDefs] = useState<OptionDef[]>(() => {
    const size = productOptionTypes.find((o) => o.name === 'Size')
    const color = productOptionTypes.find((o) => o.name === 'Color')
    return [
      {
        id: size?.id ?? 'opt-1',
        name: size?.name ?? 'Size',
        values: (size?.values ?? ['S', 'M', 'L']).join(', '),
      },
      {
        id: color?.id ?? 'opt-2',
        name: color?.name ?? 'Color',
        values: (color?.values ?? ['Black', 'White']).join(', '),
      },
    ]
  })

  const applyPreset = (optionId: string) => {
    const preset = productOptionTypes.find((o) => o.id === optionId)
    if (!preset) return
    setOptionDefs((prev) => {
      if (prev.some((p) => p.name.toLowerCase() === preset.name.toLowerCase()))
        return prev
      return [
        ...prev,
        {
          id: preset.id,
          name: preset.name,
          values: preset.values.join(', '),
        },
      ]
    })
  }

  const generated = useMemo(
    () => cartesianVariants(optionDefs),
    [optionDefs],
  )

  const titleName = product?.name ?? 'Iced Americano'

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
          <span className="inline-flex shrink-0 items-center gap-1.5 text-[12px] font-bold text-vpos-green">
            <Icon name="checkbox-circle-line" />
            {isEdit ? 'Last updated 1:34 PM' : 'Draft saved'}
          </span>
        </section>

        <div className="relative mx-auto mb-[26px] grid max-w-[850px] grid-cols-3">
          <div className="absolute top-[18px] right-[15%] left-[15%] z-0 h-0.5 bg-[#c8d3dd]" />
          {['Product details', 'Pricing & stock', 'Review'].map((label, i) => {
            const n = i + 1
            const active = step === n
            const done = step > n
            return (
              <button
                key={label}
                type="button"
                className={cn(
                  'relative z-[1] flex items-center justify-center gap-2 border-0 bg-transparent text-[12px] font-bold',
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
                  <h3 className="m-0 text-[14px]">Basic information</h3>
                  <p className="mt-1.5 mb-0 text-[11px] text-vpos-muted">
                    Use a clear product name and organize it for reporting.
                  </p>
                </div>
                <div className={formGrid}>
                  <div className="md:col-span-2">
                    <FormField
                      label="Product name"
                      required
                      placeholder={isEdit ? titleName : 'e.g. Iced Americano'}
                      defaultValue={isEdit ? titleName : undefined}
                    />
                  </div>
                  <FormField
                    label="Category"
                    required
                    placeholder={isEdit ? product?.category ?? 'Coffee' : 'Select category'}
                    defaultValue={isEdit ? product?.category : undefined}
                  />
                  <FormField
                    label="Brand"
                    placeholder={isEdit ? 'V-POS House Brand' : 'Select brand'}
                    defaultValue={isEdit ? 'V-POS House Brand' : undefined}
                  />
                  <FormField
                    label="SKU / Barcode"
                    placeholder="Auto-generated if empty"
                    defaultValue={isEdit ? sku : undefined}
                  />
                  <FormField label="Supplier" placeholder="Select supplier" />
                  <div className="md:col-span-2">
                    <TextAreaField
                      label="Description"
                      placeholder="Write a short product description…"
                      defaultValue={
                        isEdit
                          ? 'Explain what makes this product useful or unique.'
                          : undefined
                      }
                    />
                  </div>
                </div>
              </article>

              <article className={cn(card, 'p-[22px]')}>
                <div className={formSectionTitle}>
                  <h3 className="m-0 text-[14px]">Product images</h3>
                  <p className="mt-1.5 mb-0 text-[11px] text-vpos-muted">
                    Tip: Use a square image for best results.
                  </p>
                </div>
                <UploadZone />
              </article>
            </section>

            <aside className="grid content-start gap-[18px]">
              <article className={cn(card, 'p-[22px]')}>
                <div className={formSectionTitle}>
                  <h3 className="m-0 text-[14px]">Product type</h3>
                  <p className="mt-1.5 mb-0 text-[11px] text-vpos-muted">
                    Choose how inventory is controlled.
                  </p>
                </div>
                <ProductMode
                  value={productMode}
                  onChange={setProductMode}
                  options={[
                    {
                      id: 'simple',
                      title: 'Single product',
                      description: 'One SKU, price, and stock quantity',
                      badge: 'Simple',
                    },
                    {
                      id: 'variant',
                      title: 'With variants',
                      description: 'Options like size & color, each with own stock',
                      badge: 'Options',
                    },
                  ]}
                />
                <Button
                  variant="text"
                  className="mt-3"
                  onClick={() => navigate(paths.productVariants)}
                >
                  View all variants →
                </Button>
              </article>
            </aside>

            {productMode === 'variant' ? (
              <article className={cn(card, 'p-[22px] xl:col-span-2')}>
                <div className={formSectionTitle}>
                  <h3 className="m-0 text-[14px]">Options (variants)</h3>
                  <p className="mt-1.5 mb-0 text-[11px] text-vpos-muted">
                    Pick or edit option types from your Variants library (Size,
                    Color…). Combinations are generated for this product only —
                    stock is set later per combination, not on the option itself.
                  </p>
                </div>
                <div className="mb-3 flex flex-wrap gap-2">
                  <span className="self-center text-[11px] font-bold text-vpos-muted">
                    Add from library:
                  </span>
                  {productOptionTypes
                    .filter((o) => o.status === 'Active')
                    .map((o) => (
                      <button
                        key={o.id}
                        type="button"
                        onClick={() => applyPreset(o.id)}
                        className="rounded-full border border-vpos-line bg-white px-3 py-1 text-[11px] font-bold text-vpos-text hover:border-vpos-primary hover:text-vpos-primary"
                      >
                        + {o.name}
                      </button>
                    ))}
                </div>
                <div className="space-y-3">
                  {optionDefs.map((opt, idx) => (
                    <div
                      key={opt.id}
                      className="grid grid-cols-1 gap-3 rounded-[12px] border border-vpos-line bg-vpos-subtle/40 p-3 sm:grid-cols-[1fr_2fr_auto]"
                    >
                      <FormField
                        label="Option name"
                        value={opt.name}
                        onChange={(e) => {
                          const name = e.target.value
                          setOptionDefs((prev) =>
                            prev.map((o, i) =>
                              i === idx ? { ...o, name } : o,
                            ),
                          )
                        }}
                        placeholder="e.g. Size, Color"
                      />
                      <FormField
                        label="Values (comma-separated)"
                        value={opt.values}
                        onChange={(e) => {
                          const values = e.target.value
                          setOptionDefs((prev) =>
                            prev.map((o, i) =>
                              i === idx ? { ...o, values } : o,
                            ),
                          )
                        }}
                        placeholder="e.g. S, M, L"
                      />
                      <div className="flex items-end">
                        <button
                          type="button"
                          aria-label="Remove option"
                          disabled={optionDefs.length <= 1}
                          onClick={() =>
                            setOptionDefs((prev) =>
                              prev.filter((_, i) => i !== idx),
                            )
                          }
                          className="grid h-[42px] w-[42px] place-items-center rounded-[9px] border-0 bg-white text-vpos-red disabled:opacity-40"
                        >
                          <Icon name="delete-bin-line" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <Button
                  variant="secondary"
                  className="mt-3"
                  onClick={() =>
                    setOptionDefs((prev) => [
                      ...prev,
                      {
                        id: `opt-${Date.now()}`,
                        name: '',
                        values: '',
                      },
                    ])
                  }
                >
                  <Icon name="add-line" /> Add option
                </Button>

                <div className="mt-5">
                  <h4 className="m-0 mb-2 text-[12px] font-extrabold text-vpos-text">
                    Generated variants ({generated.length})
                  </h4>
                  {generated.length === 0 ? (
                    <p className="m-0 text-[12px] text-vpos-muted">
                      Enter option names and values to generate variants.
                    </p>
                  ) : (
                    <ul className="m-0 grid list-none grid-cols-1 gap-2 p-0 sm:grid-cols-2 lg:grid-cols-3">
                      {generated.map((label) => (
                        <li
                          key={label}
                          className="rounded-lg border border-vpos-line bg-white px-3 py-2 text-[12px] font-semibold text-vpos-text"
                        >
                          {label}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </article>
            ) : null}
          </div>
        )}

        {step === 2 && (
          <div className="grid grid-cols-1 gap-[18px] xl:grid-cols-[minmax(0,1.8fr)_minmax(330px,0.9fr)]">
            <section className="grid content-start gap-[18px]">
              <article className={cn(card, 'p-[22px]')}>
                <div className={formSectionTitle}>
                  <h3 className="m-0 text-[14px]">Pricing</h3>
                  <p className="mt-1.5 mb-0 text-[11px] text-vpos-muted">
                    Set the selling price and understand your margin.
                  </p>
                </div>
                <div className={formGrid}>
                  <FormField
                    label="Selling price"
                    required
                    placeholder="0.00"
                    defaultValue={isEdit ? String(product?.price ?? '3.50') : undefined}
                  />
                  <FormField label="Compare-at price" placeholder="0.00" />
                  <FormField
                    label="Cost per item"
                    placeholder="0.00"
                    defaultValue={isEdit ? '1.20' : undefined}
                  />
                  <FormField label="Tax" defaultValue="VAT 10%" />
                </div>
              </article>

              <article className={cn(card, 'p-[22px]')}>
                <div className={formSectionTitle}>
                  <h3 className="m-0 text-[14px]">Stock behavior</h3>
                  <p className="mt-1.5 mb-0 text-[11px] text-vpos-muted">
                    Configure stock controls for this product.
                  </p>
                </div>
                <Toggle
                  checked={trackStock}
                  onChange={setTrackStock}
                  label="Track inventory"
                  description="Update stock after every sale"
                />
                <Toggle
                  checked={continueSelling}
                  onChange={setContinueSelling}
                  label="Continue selling"
                  description="Allow orders when stock reaches zero"
                />
                <div className={cn(formGrid, 'mt-[18px]')}>
                  <FormField
                    label="Opening stock"
                    defaultValue={isEdit ? String(product?.stock ?? 24) : '0'}
                  />
                  <FormField label="Reorder point" defaultValue="8" />
                </div>
              </article>
            </section>

            <aside className="grid content-start gap-[18px]">
              <article className={cn(card, 'p-[22px]')}>
                <small className="text-[11px] font-bold tracking-wide text-vpos-muted">
                  EXPECTED MARGIN
                </small>
                <strong className="mt-2 block text-[28px]">65.7%</strong>
                <p className="mt-2 mb-0 text-[11px] text-vpos-muted">
                  Based on selling price and cost per item.
                </p>
              </article>
              <article className={cn(card, 'p-[22px]')}>
                <div className={formSectionTitle}>
                  <h3 className="m-0 text-[14px]">Sales settings</h3>
                  <p className="mt-1.5 mb-0 text-[11px] text-vpos-muted">
                    Control how this product can be sold.
                  </p>
                </div>
                <Toggle
                  defaultChecked
                  label="Available for sale"
                  description="Show this item in POS and orders"
                />
                <Toggle
                  defaultChecked
                  label="Online store"
                  description="Publish to your online catalog"
                />
              </article>
            </aside>
          </div>
        )}

        {step === 3 && (
          <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {[
              ['Product details', 'Name, category, images, and type are ready.'],
              ['Pricing & stock', 'Selling price, tax, and stock rules configured.'],
              [
                'Ready to publish',
                'Review once more, then save or publish the product.',
              ],
            ].map(([title, desc]) => (
              <article
                key={title}
                className={cn(card, 'flex items-start gap-3 p-[22px]')}
              >
                <span className="grid h-8 w-8 place-items-center rounded-full bg-vpos-green-bg text-[16px] text-vpos-green">
                  <Icon name="check-line" />
                </span>
                <div>
                  <strong className="block text-[13px]">{title}</strong>
                  <small className="mt-1 block text-[11px] text-vpos-muted">
                    {desc}
                  </small>
                </div>
              </article>
            ))}
          </section>
        )}

        <footer
          className="fixed right-0 bottom-0 z-[9] flex h-[76px] items-center justify-between border-t border-vpos-line bg-white px-[clamp(24px,2.5vw,48px)] shadow-[0_-8px_25px_#0c2b4e12] transition-[left] duration-200 ease-out"
          style={{ left: sidebarWidth }}
        >
          <Button
            variant="secondary"
            onClick={() =>
              step === 1 ? navigate(paths.products) : setStep((s) => s - 1)
            }
          >
            Cancel
          </Button>
          <div className="flex gap-2.5">
            <Button variant="soft">Save draft</Button>
            <Button
              variant="primary"
              onClick={() => {
                if (step < 3) setStep((s) => s + 1)
                else navigate(paths.products)
              }}
            >
              {step < 3
                ? 'Continue →'
                : isEdit
                  ? 'Update product'
                  : 'Publish product'}
            </Button>
          </div>
        </footer>
      </main>
    </>
  )
}
