import type { StoreSalesChannel } from './types'

export function normalizeStoreSalesChannel(value?: string | null): StoreSalesChannel {
  const normalized = value?.trim().toUpperCase()
  return normalized === 'POS' || normalized === 'ONLINE' ? normalized : 'BOTH'
}

export function storeSupportsPos(value?: string | null): boolean {
  return normalizeStoreSalesChannel(value) !== 'ONLINE'
}

export function storeSupportsOnline(value?: string | null): boolean {
  return normalizeStoreSalesChannel(value) !== 'POS'
}

export function storeSalesChannelLabel(value?: string | null): string {
  const channel = normalizeStoreSalesChannel(value)
  return channel === 'POS' ? 'POS only' : channel === 'ONLINE' ? 'Online store only' : 'POS + Online'
}

export function productSupportsStoreChannel(productChannel: unknown, storeChannel?: string | null): boolean {
  const channel = typeof productChannel === 'string' ? productChannel.trim().toUpperCase() : productChannel
  const productSupportsPos = channel === 1 || channel === '1' || channel === 'POS' || channel === 3 || channel === '3' || channel === 'BOTH' || channel == null
  const productSupportsOnline = channel === 2 || channel === '2' || channel === 'ONLINE' || channel === 3 || channel === '3' || channel === 'BOTH' || channel == null
  return (productSupportsPos && storeSupportsPos(storeChannel))
    || (productSupportsOnline && storeSupportsOnline(storeChannel))
}
