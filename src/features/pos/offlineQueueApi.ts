import { API_BASE_URL, ApiClient } from '../../lib/api'

/**
 * Tells the server what this POS is holding offline, so the owner and TinhLuk staff can see it. Only counts and
 * totals are sent; the sales themselves stay on the device until they are sent.
 */
const api = new ApiClient({ baseUrl: API_BASE_URL })
const DEVICE_KEY = 'vpos.device-id'

let fallbackDeviceId: string | null = null

/** A stable id for this browser on this computer, so each POS reports as its own row. */
export function posDeviceId(): string {
  try {
    const saved = localStorage.getItem(DEVICE_KEY)
    if (saved) return saved
    const id = `pos-${crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)}`
    localStorage.setItem(DEVICE_KEY, id)
    return id
  } catch {
    fallbackDeviceId ??= `pos-${Math.random().toString(36).slice(2)}`
    return fallbackDeviceId
  }
}

export interface OfflineQueueSummary {
  waitingCount: number
  waitingTotal: number
  attentionCount: number
}

export interface OfflineQueueContext {
  businessId: number
  storeId: number
  cashierId: number
  currencyCode: string
}

export async function reportOfflineQueue(context: OfflineQueueContext, summary: OfflineQueueSummary): Promise<void> {
  await api.request(`/businesses/${context.businessId}/offline-queue/${encodeURIComponent(posDeviceId())}`, {
    method: 'PUT',
    body: JSON.stringify({ ...context, ...summary }),
  })
}

/** One POS device's latest report, as the owner or staff see it. */
export interface DeviceOfflineQueue {
  deviceId: string
  businessId: number
  storeId: number
  cashierId: number | null
  currencyCode: string
  waitingCount: number
  waitingTotal: number
  attentionCount: number
  reportedAt: string
}

export async function fetchOfflineQueue(businessId: number): Promise<DeviceOfflineQueue[]> {
  const response = await api.request<{ data?: DeviceOfflineQueue[] }>(`/businesses/${businessId}/offline-queue`)
  return response.data ?? []
}

export async function fetchAllOfflineQueues(): Promise<DeviceOfflineQueue[]> {
  const response = await api.request<{ data?: DeviceOfflineQueue[] }>('/businesses/offline-queue/all')
  return response.data ?? []
}
