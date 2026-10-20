import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import { dismissOfflineSale, listOfflineSales, subscribeOfflineSales, syncOfflineSales, type OfflineSale } from './offlineSales'

const RETRY_EVERY_MS = 15_000

function subscribeToNetwork(listener: () => void) {
  window.addEventListener('online', listener)
  window.addEventListener('offline', listener)
  return () => {
    window.removeEventListener('online', listener)
    window.removeEventListener('offline', listener)
  }
}

/** Whether the browser currently reports a connection. */
export function useIsOnline(): boolean {
  return useSyncExternalStore(subscribeToNetwork, () => navigator.onLine, () => true)
}

/**
 * The POS's offline sales: what is waiting, what needs a person, and sending them when the connection is back.
 * Sending happens when the browser comes back online, on a timer while sales are waiting, and on demand.
 */
export function useOfflineSales() {
  const online = useIsOnline()
  const [sales, setSales] = useState<OfflineSale[]>([])
  const [sending, setSending] = useState(false)

  const refresh = useCallback(async () => {
    setSales(await listOfflineSales())
  }, [])

  const syncNow = useCallback(async () => {
    if (!navigator.onLine) return
    setSending(true)
    try {
      await syncOfflineSales()
    } finally {
      setSending(false)
      await refresh()
    }
  }, [refresh])

  useEffect(() => {
    void refresh()
    return subscribeOfflineSales(() => void refresh())
  }, [refresh])

  useEffect(() => {
    if (online) void syncNow()
  }, [online, syncNow])

  const waiting = sales.filter((sale) => !sale.attention).length
  useEffect(() => {
    if (!online || waiting === 0) return
    const timer = window.setInterval(() => void syncNow(), RETRY_EVERY_MS)
    return () => window.clearInterval(timer)
  }, [online, waiting, syncNow])

  const dismiss = useCallback(async (id: string) => {
    await dismissOfflineSale(id)
  }, [])

  return { online, sales, waiting, attention: sales.filter((sale) => sale.attention), sending, syncNow, dismiss }
}
