import { useCallback, useEffect, useState } from 'react'
import { useConnection } from '../../lib/connection'
import { reportOfflineQueue, type OfflineQueueContext } from './offlineQueueApi'
import { dismissOfflineSale, listOfflineSales, subscribeOfflineSales, syncOfflineSales, type OfflineSale } from './offlineSales'

const RETRY_EVERY_MS = 15_000
const REPORT_EVERY_MS = 60_000
const REPORT_SOON_MS = 1_500

export function useIsOnline(): boolean {
  return useConnection().online
}

/**
 * The POS's offline sales: what is waiting, what needs a person, and sending them when the connection is back.
 * Sending happens when the browser comes back online, on a timer while sales are waiting, and on demand.
 */
export function useOfflineSales(context?: OfflineQueueContext) {
  const online = useIsOnline()
  const [sales, setSales] = useState<OfflineSale[]>([])
  const [sending, setSending] = useState(false)

  const refresh = useCallback(async () => {
    setSales(await listOfflineSales())
  }, [])

  const syncNow = useCallback(async () => {
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

  // Tell the server what is waiting here, when it changes and once a minute, so it shows on the owner's and staff screens.
  const contextKey = context ? JSON.stringify(context) : ''
  const salesKey = sales.map((sale) => sale.id + (sale.attention ? ':x' : ':w')).join('|')
  useEffect(() => {
    if (!context || !online) return
    const send = () => {
      const waitingSales = sales.filter((sale) => !sale.attention && sale.currencyCode === context.currencyCode)
      void reportOfflineQueue(context, {
        waitingCount: waitingSales.length,
        waitingTotal: waitingSales.reduce((total, sale) => total + sale.shownTotal, 0),
        attentionCount: sales.filter((sale) => sale.attention).length,
      }).catch(() => undefined)
    }
    const soon = window.setTimeout(send, REPORT_SOON_MS)
    const timer = window.setInterval(send, REPORT_EVERY_MS)
    return () => {
      window.clearTimeout(soon)
      window.clearInterval(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contextKey, online, salesKey])

  const dismiss = useCallback(async (id: string) => {
    await dismissOfflineSale(id)
  }, [])

  return { online, sales, waiting, attention: sales.filter((sale) => sale.attention), sending, syncNow, dismiss }
}
