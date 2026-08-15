import { readStoredValue, writeStoredValue } from '../../lib/storage'

export type HeldDiscountType = 'percent' | 'fixed'

export interface HeldLineDiscount {
  type: HeldDiscountType
  value: number
}

export interface HeldCartEntry {
  qty: number
  discount?: HeldLineDiscount | null
}

export interface HeldSale {
  id: string
  customerId: string
  cart: Record<string, HeldCartEntry>
  items: string
  itemCount: number
  total: number
  currencyCode: string
  createdAt: string
  note: string
}

const STORAGE_KEY_PREFIX = 'vpos.pos-held-sales.v1'
const MAX_HELD_SALES = 50

function normalizeStoreId(storeId?: string | number): number | undefined {
  const numericId = Number(storeId)
  return Number.isInteger(numericId) && numericId > 0 ? numericId : undefined
}

function storageKey(storeId: string | number): string {
  return `${STORAGE_KEY_PREFIX}.${Number(storeId)}`
}

export function readHeldSales(storeId?: string | number): HeldSale[] {
  const normalizedStoreId = normalizeStoreId(storeId)
  if (normalizedStoreId === undefined) return []

  const stored = readStoredValue<unknown>(storageKey(normalizedStoreId), [])
  if (!Array.isArray(stored)) return []

  return stored
    .map(parseHeldSale)
    .filter((sale): sale is HeldSale => sale !== null)
    .slice(0, MAX_HELD_SALES)
}

export function writeHeldSales(storeId: string | number | undefined, sales: HeldSale[]): void {
  const normalizedStoreId = normalizeStoreId(storeId)
  if (normalizedStoreId === undefined) return
  writeStoredValue(storageKey(normalizedStoreId), sales.slice(0, MAX_HELD_SALES))
}

function parseHeldSale(value: unknown): HeldSale | null {
  if (!isRecord(value)) return null
  if (typeof value.id !== 'string' || typeof value.createdAt !== 'string') return null
  if (!isRecord(value.cart)) return null

  const cart = Object.entries(value.cart).reduce<Record<string, HeldCartEntry>>((result, [id, entry]) => {
    if (!isRecord(entry)) return result
    const qty = Number(entry.qty)
    if (!Number.isFinite(qty) || qty <= 0) return result

    const rawDiscount = entry.discount
    const discount: HeldLineDiscount | null = isRecord(rawDiscount)
      && (rawDiscount.type === 'percent' || rawDiscount.type === 'fixed')
      && Number.isFinite(Number(rawDiscount.value))
      && Number(rawDiscount.value) > 0
      ? { type: rawDiscount.type as HeldDiscountType, value: Number(rawDiscount.value) }
      : null

    result[id] = { qty: Math.floor(qty), discount }
    return result
  }, {})

  if (Object.keys(cart).length === 0) return null

  return {
    id: value.id,
    customerId: typeof value.customerId === 'string' ? value.customerId : '0',
    cart,
    items: typeof value.items === 'string' ? value.items : '',
    itemCount: Math.max(0, Number(value.itemCount) || 0),
    total: Math.max(0, Number(value.total) || 0),
    currencyCode: typeof value.currencyCode === 'string' ? value.currencyCode.toUpperCase() : 'USD',
    createdAt: value.createdAt,
    note: typeof value.note === 'string' ? value.note : 'Paused from this register',
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
