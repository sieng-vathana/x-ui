import { useMemo } from 'react'
import { useProductsList } from '../../features/products/useProducts'
import { formatCurrency } from '../../lib/currency'
import { tdClass, thClass } from '../../lib/ui'
import { Icon } from '../ui/Icon'
import { Select } from '../ui/Select'

export interface EditableLine {
  variantId: number
  productName: string
  variantName?: string | null
  sku?: string | null
  quantity: number
  unitCost: number
}

const inputClass = 'h-9 rounded-lg border border-vpos-line px-2 text-[13px] outline-none focus:border-vpos-primary disabled:bg-vpos-subtle'

/** Lines of a purchase order or supplier return: products of the store with quantity and unit cost. */
export function PurchaseLineEditor({
  storeId,
  currencyCode,
  lines,
  onChange,
}: {
  storeId: number
  currencyCode: string
  lines: EditableLine[]
  onChange: (lines: EditableLine[]) => void
}) {
  const productsQuery = useProductsList(storeId)
  const variants = useMemo(() => (productsQuery.data ?? []).flatMap((product) => (product.variants ?? [])
    .filter((variant) => variant.id)
    .map((variant) => ({
      variantId: variant.id!,
      productName: product.productName,
      variantName: variant.variantName && variant.variantName !== product.productName ? variant.variantName : null,
      sku: variant.sku,
      costPrice: Number(variant.costPrice ?? 0),
    }))), [productsQuery.data])

  const addVariant = (value: string) => {
    const variant = variants.find((option) => String(option.variantId) === value)
    if (!variant) return
    const existing = lines.find((line) => line.variantId === variant.variantId)
    onChange(existing
      ? lines.map((line) => (line === existing ? { ...line, quantity: line.quantity + 1 } : line))
      : [...lines, { variantId: variant.variantId, productName: variant.productName, variantName: variant.variantName, sku: variant.sku, quantity: 1, unitCost: variant.costPrice }])
  }
  const update = (index: number, change: Partial<EditableLine>) =>
    onChange(lines.map((line, i) => (i === index ? { ...line, ...change } : line)))

  return (
    <div>
      <div className="mb-3 max-w-md">
        <Select
          value=""
          onChange={addVariant}
          searchable
          placeholder={productsQuery.isLoading ? 'Loading products…' : 'Add a product…'}
          options={variants.map((variant) => ({
            value: String(variant.variantId),
            label: [variant.productName, variant.variantName, variant.sku].filter(Boolean).join(' · '),
          }))}
        />
      </div>
      {lines.length === 0 ? (
        <p className="m-0 rounded-lg border border-dashed border-vpos-line px-4 py-6 text-center text-[13px] text-vpos-muted">Add the products to order.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                {['Product', 'SKU', 'Quantity', 'Unit cost', 'Line total', ''].map((heading, index) => <th key={index} className={thClass}>{heading}</th>)}
              </tr>
            </thead>
            <tbody>
              {lines.map((line, index) => (
                <tr key={line.variantId}>
                  <td className={tdClass}>
                    <strong>{line.productName}</strong>
                    {line.variantName ? <small className="block text-[11px] text-vpos-muted">{line.variantName}</small> : null}
                  </td>
                  <td className={tdClass}>{line.sku || '—'}</td>
                  <td className={tdClass}>
                    <input
                      type="number"
                      min={1}
                      step={1}
                      aria-label={`Quantity of ${line.productName}`}
                      value={line.quantity}
                      onChange={(event) => update(index, { quantity: Math.max(1, Math.floor(Number(event.target.value) || 1)) })}
                      className={`${inputClass} w-20`}
                    />
                  </td>
                  <td className={tdClass}>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      aria-label={`Unit cost of ${line.productName}`}
                      value={line.unitCost}
                      onChange={(event) => update(index, { unitCost: Math.max(0, Number(event.target.value) || 0) })}
                      className={`${inputClass} w-24`}
                    />
                  </td>
                  <td className={tdClass}><strong>{formatCurrency(line.quantity * line.unitCost, currencyCode)}</strong></td>
                  <td className={tdClass}>
                    <button
                      type="button"
                      aria-label={`Remove ${line.productName}`}
                      onClick={() => onChange(lines.filter((_, i) => i !== index))}
                      className="grid h-8 w-8 place-items-center rounded-lg border-0 bg-vpos-subtle text-vpos-red"
                    >
                      <Icon name="delete-bin-line" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
