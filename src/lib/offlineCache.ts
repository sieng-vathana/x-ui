import type { QueryClient, QueryKey } from '@tanstack/react-query'
import { offlineDb } from './offlineDb'

/**
 * Keeps the last good server data the POS needs (products, stores, the open cash session, the plan) on this
 * device, and restores it when the page starts, so the POS still works if the connection is gone. Customer,
 * loyalty and report data are deliberately not kept.
 */
const CACHED_ROOTS = new Set(['products-list', 'stores', 'cash-session', 'plans'])

interface CachedQuery {
  queryKey: QueryKey
  data: unknown
  savedAt: number
}

function cacheable(queryKey: QueryKey): boolean {
  return Array.isArray(queryKey) && typeof queryKey[0] === 'string' && CACHED_ROOTS.has(queryKey[0])
}

export async function startOfflineCache(queryClient: QueryClient): Promise<void> {
  try {
    for (const { value } of await offlineDb.entries<CachedQuery>('cache')) {
      if (queryClient.getQueryState(value.queryKey)?.data !== undefined) continue
      // Saved with its original time, so an old snapshot is refetched as soon as the connection is back.
      queryClient.setQueryData(value.queryKey, value.data, { updatedAt: value.savedAt })
    }
  } catch {
    // IndexedDB can be blocked (private windows); the POS then simply needs the connection.
  }

  queryClient.getQueryCache().subscribe((event) => {
    if (event.type !== 'updated' || event.action.type !== 'success') return
    const { queryKey, state } = event.query
    if (!cacheable(queryKey) || state.data === undefined) return
    const row: CachedQuery = { queryKey, data: state.data, savedAt: Date.now() }
    void offlineDb.put('cache', JSON.stringify(queryKey), row).catch(() => undefined)
  })
}
