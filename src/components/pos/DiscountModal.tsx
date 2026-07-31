import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '../ui/Button'
import { Chip } from '../ui/Chip'
import { Icon } from '../ui/Icon'
import { Modal } from '../ui/Modal'
import { SegmentedControl } from '../ui/SegmentedControl'
import { formatUsd } from '../../data/pos-mockup'
import { cn } from '../../lib/cn'

export type DiscountType = 'percent' | 'fixed'

export interface LineDiscount {
  type: DiscountType
  value: number
}

export interface DiscountModalProps {
  open: boolean
  onClose: () => void
  productName: string
  variant?: string
  unitPrice: number
  quantity: number
  initial?: LineDiscount | null
  onApply: (discount: LineDiscount | null) => void
}

const PRESETS_PERCENT = [5, 10, 15, 20, 50]
const PRESETS_FIXED = [0.5, 1, 2, 5]

/**
 * Discount popup for order-line % action — animated modal + clear selection UI.
 */
export function DiscountModal({
  open,
  onClose,
  productName,
  variant,
  unitPrice,
  quantity,
  initial,
  onApply,
}: DiscountModalProps) {
  const [type, setType] = useState<DiscountType>('percent')
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    if (initial && initial.value > 0) {
      setType(initial.type)
      setValue(String(initial.value))
    } else {
      setType('percent')
      setValue('')
    }
    setError(null)
    // Focus + select after enter animation (~240ms)
    const t = window.setTimeout(() => {
      inputRef.current?.focus()
      inputRef.current?.select()
    }, 260)
    return () => window.clearTimeout(t)
  }, [open, initial])

  const lineTotal = unitPrice * quantity
  const num = Number(value)

  const discountAmount = useMemo(() => {
    if (!Number.isFinite(num) || num <= 0) return 0
    if (type === 'percent') {
      return Math.min(lineTotal, (lineTotal * Math.min(num, 100)) / 100)
    }
    return Math.min(lineTotal, num)
  }, [num, type, lineTotal])

  const finalTotal = Math.max(0, lineTotal - discountAmount)
  const presets = type === 'percent' ? PRESETS_PERCENT : PRESETS_FIXED

  const apply = () => {
    if (!value.trim() || !Number.isFinite(num) || num <= 0) {
      setError('Enter a valid discount amount')
      inputRef.current?.focus()
      inputRef.current?.select()
      return
    }
    if (type === 'percent' && num > 100) {
      setError('Percent cannot exceed 100%')
      return
    }
    if (type === 'fixed' && num > lineTotal) {
      setError('Fixed discount cannot exceed line total')
      return
    }
    onApply({ type, value: num })
    onClose()
  }

  const clear = () => {
    onApply(null)
    onClose()
  }

  const onTypeChange = (next: DiscountType) => {
    setType(next)
    setValue('')
    setError(null)
    window.setTimeout(() => {
      inputRef.current?.focus()
      inputRef.current?.select()
    }, 0)
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title={
        <span className="inline-flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-vpos-sand text-vpos-primary">
            <Icon name="percent-line" />
          </span>
          Apply discount
        </span>
      }
      description={
        <span>
          {productName}
          {variant ? (
            <span className="text-vpos-muted"> · {variant}</span>
          ) : null}
        </span>
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          {(initial?.value ?? 0) > 0 ? (
            <Button variant="soft" onClick={clear}>
              Remove discount
            </Button>
          ) : null}
          <Button variant="primary" onClick={apply}>
            Apply
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <SegmentedControl
          aria-label="Discount type"
          value={type}
          onChange={onTypeChange}
          options={[
            { id: 'percent', label: 'Percent %', icon: 'percent-line' },
            {
              id: 'fixed',
              label: 'Fixed $',
              icon: 'money-dollar-circle-line',
            },
          ]}
        />

        <label className="block">
          <span className="mb-1.5 block text-[12px] font-extrabold tracking-wide text-vpos-muted uppercase">
            {type === 'percent' ? 'Discount percent' : 'Discount amount'}
          </span>
          <div
            className={cn(
              'flex h-12 items-center gap-2 rounded-[10px] border bg-white px-3 transition-all duration-200',
              error
                ? 'border-vpos-red shadow-[0_0_0_3px_#d92d2020]'
                : 'border-vpos-line focus-within:border-vpos-primary focus-within:shadow-[0_0_0_3px_#1d546c24]',
            )}
          >
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-vpos-subtle text-[14px] font-extrabold text-vpos-muted">
              {type === 'percent' ? '%' : '$'}
            </span>
            <input
              ref={inputRef}
              type="text"
              inputMode="decimal"
              autoComplete="off"
              spellCheck={false}
              value={value}
              onChange={(e) => {
                const next = e.target.value.replace(/[^\d.]/g, '')
                // Allow one decimal point
                const parts = next.split('.')
                const cleaned =
                  parts.length > 2
                    ? `${parts[0]}.${parts.slice(1).join('')}`
                    : next
                setValue(cleaned)
                setError(null)
              }}
              onFocus={(e) => e.currentTarget.select()}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  apply()
                }
              }}
              placeholder={type === 'percent' ? 'e.g. 10' : 'e.g. 2.00'}
              className="w-full border-0 bg-transparent text-[17px] font-semibold text-vpos-text outline-none selection:bg-vpos-sand selection:text-vpos-primary"
              aria-invalid={Boolean(error)}
            />
            {value ? (
              <button
                type="button"
                aria-label="Clear value"
                onClick={() => {
                  setValue('')
                  setError(null)
                  inputRef.current?.focus()
                }}
                className="grid h-7 w-7 place-items-center rounded-md border-0 bg-transparent text-vpos-muted transition hover:bg-vpos-subtle hover:text-vpos-text"
              >
                <Icon name="close-line" className="text-[15px]" />
              </button>
            ) : null}
          </div>
          {error ? (
            <small className="mt-1.5 block text-[12px] font-semibold text-vpos-red">
              {error}
            </small>
          ) : (
            <small className="mt-1.5 block text-[12px] text-vpos-muted">
              Line: {quantity} × {formatUsd(unitPrice)} = {formatUsd(lineTotal)}
            </small>
          )}
        </label>

        <div>
          <span className="mb-1.5 block text-[12px] font-extrabold tracking-wide text-vpos-muted uppercase">
            Quick select
          </span>
          <div className="flex flex-wrap gap-2">
            {presets.map((p) => (
              <Chip
                key={p}
                selected={value === String(p)}
                onClick={() => {
                  setValue(String(p))
                  setError(null)
                  window.setTimeout(() => {
                    inputRef.current?.focus()
                    inputRef.current?.select()
                  }, 0)
                }}
              >
                {type === 'percent' ? `${p}%` : formatUsd(p)}
              </Chip>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-vpos-line bg-vpos-subtle px-4 py-3 text-[13px] transition-colors">
          <div className="flex justify-between text-vpos-muted">
            <span>Line total</span>
            <span className="font-semibold text-vpos-text">
              {formatUsd(lineTotal)}
            </span>
          </div>
          <div className="mt-1.5 flex justify-between text-vpos-muted">
            <span>Discount</span>
            <span
              className={cn(
                'font-semibold transition-colors',
                discountAmount > 0 ? 'text-vpos-red' : 'text-vpos-muted',
              )}
            >
              −{formatUsd(discountAmount)}
            </span>
          </div>
          <div className="mt-2 flex justify-between border-t border-vpos-line pt-2">
            <span className="font-bold text-vpos-text">After discount</span>
            <span className="text-[16px] font-extrabold text-vpos-primary tabular-nums transition-all">
              {formatUsd(finalTotal)}
            </span>
          </div>
        </div>
      </div>
    </Modal>
  )
}

/** Compute discount amount for a line */
export function calcLineDiscount(
  unitPrice: number,
  qty: number,
  discount: LineDiscount | null | undefined,
): number {
  if (!discount || discount.value <= 0) return 0
  const line = unitPrice * qty
  if (discount.type === 'percent') {
    return Math.min(line, (line * Math.min(discount.value, 100)) / 100)
  }
  return Math.min(line, discount.value)
}
