import { ApiError } from '../../lib/api'
import { offlineDb } from '../../lib/offlineDb'
import { orderApi } from '../orders/orderApi'
import type { CreatePosOrderInput, PosOrder } from '../orders/types'
import { paymentApi } from '../payments/paymentApi'
import type { CreateCashPaymentInput } from '../payments/types'

/**
 * Cash sales taken while the POS had no connection. They wait here, on this device, until they can be sent.
 * Sending repeats the original three calls with the same keys (order, cash payment, completion), and the server
 * returns the existing record for each one, so a sale is never recorded twice even if a send was cut halfway.
 */
export interface OfflineSale {
  id: string
  createdAt: number
  currencyCode: string
  /** What the cashier saw on screen when the sale was taken; the server total is checked against it at sync. */
  shownTotal: number
  /** Cash in hand in the sale's currency, as counted at the till. */
  tenderedAmount: number
  orderInput: CreatePosOrderInput
  payment: Omit<CreateCashPaymentInput, 'orderId' | 'amount' | 'tenderedAmount' | 'idempotencyKey'>
  /** Set when the sale needs a person: the server refused it or the amounts no longer match. */
  attention?: string
}

type Listener = () => void
const listeners = new Set<Listener>()
let syncing = false

function notify() {
  listeners.forEach((listener) => listener())
}

export function subscribeOfflineSales(listener: Listener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export async function listOfflineSales(): Promise<OfflineSale[]> {
  const sales = await offlineDb.all<OfflineSale>('outbox')
  return sales.sort((a, b) => a.createdAt - b.createdAt)
}

export async function saveOfflineSale(sale: OfflineSale): Promise<void> {
  await offlineDb.put('outbox', sale.id, sale)
  notify()
}

export async function dismissOfflineSale(id: string): Promise<void> {
  await offlineDb.remove('outbox', id)
  notify()
}

/** A send that failed because the server or the connection is not reachable; the sale stays queued. */
export function isRetryable(error: unknown): boolean {
  if (error instanceof TypeError) return true
  if (error instanceof ApiError) return error.status === 401 || error.status === undefined || error.status >= 500
  return false
}

/** Sends every queued sale in the order it was taken. Stops at the first connection problem; refused sales are flagged. */
export async function syncOfflineSales(): Promise<{ sent: number; waiting: number }> {
  if (syncing) return { sent: 0, waiting: 0 }
  syncing = true
  let sent = 0
  try {
    for (const sale of await listOfflineSales()) {
      if (sale.attention) continue
      try {
        await sendSale(sale)
        await offlineDb.remove('outbox', sale.id)
        sent += 1
        notify()
      } catch (error) {
        if (isRetryable(error)) break
        const message = error instanceof Error ? error.message : 'The sale could not be sent.'
        await saveOfflineSale({ ...sale, attention: message })
      }
    }
  } finally {
    syncing = false
  }
  const waiting = (await listOfflineSales()).filter((sale) => !sale.attention).length
  return { sent, waiting }
}

async function sendSale(sale: OfflineSale): Promise<void> {
  const order: PosOrder = await orderApi.createPos(sale.orderInput)
  if (order.currencyCode !== sale.currencyCode) {
    throw new Error(`Order ${order.orderNo} is in ${order.currencyCode}, but the cash was counted in ${sale.currencyCode}.`)
  }
  if (sale.tenderedAmount + 0.0001 < order.grandTotal) {
    throw new Error(`Order ${order.orderNo} now totals ${order.grandTotal} ${order.currencyCode}, more than the cash received (${sale.tenderedAmount}). Check it in Recent orders.`)
  }
  await paymentApi.createCash({
    ...sale.payment,
    orderId: order.id,
    amount: order.grandTotal,
    tenderedAmount: sale.tenderedAmount,
    idempotencyKey: `PAY-${sale.id}`,
  })
  await orderApi.complete(order.id)
}

export function newOfflineSaleId(): string {
  return `OFF-${Date.now()}-${crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)}`
}
