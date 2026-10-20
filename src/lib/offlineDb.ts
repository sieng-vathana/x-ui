/**
 * A small IndexedDB wrapper for the POS offline cache. Two object stores:
 * - cache: last good server data (products, store, cash session, plan), keyed by query key.
 * - outbox: cash sales taken while the connection was down, waiting to be sent.
 */
const DB_NAME = 'tinhluk-offline'
const DB_VERSION = 2
const STORES = ['cache', 'outbox', 'session'] as const
export type OfflineStore = (typeof STORES)[number]

let dbPromise: Promise<IDBDatabase> | null = null

function openDb(): Promise<IDBDatabase> {
  dbPromise ??= new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      for (const name of STORES) {
        if (!request.result.objectStoreNames.contains(name)) request.result.createObjectStore(name)
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => {
      dbPromise = null
      reject(request.error)
    }
  })
  return dbPromise
}

async function request<T>(store: OfflineStore, mode: IDBTransactionMode, action: (objectStore: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb()
  return new Promise<T>((resolve, reject) => {
    const transaction = db.transaction(store, mode)
    const result = action(transaction.objectStore(store))
    transaction.oncomplete = () => resolve(result.result)
    transaction.onerror = () => reject(transaction.error)
    transaction.onabort = () => reject(transaction.error ?? new Error('The offline store was interrupted.'))
  })
}

export const offlineDb = {
  get<T>(store: OfflineStore, key: IDBValidKey): Promise<T | undefined> {
    return request<T | undefined>(store, 'readonly', (objectStore) => objectStore.get(key))
  },
  async all<T>(store: OfflineStore): Promise<T[]> {
    return request<T[]>(store, 'readonly', (objectStore) => objectStore.getAll())
  },
  async entries<T>(store: OfflineStore): Promise<Array<{ key: IDBValidKey; value: T }>> {
    const db = await openDb()
    return new Promise((resolve, reject) => {
      const rows: Array<{ key: IDBValidKey; value: T }> = []
      const transaction = db.transaction(store, 'readonly')
      const cursorRequest = transaction.objectStore(store).openCursor()
      cursorRequest.onsuccess = () => {
        const cursor = cursorRequest.result
        if (!cursor) return
        rows.push({ key: cursor.key, value: cursor.value as T })
        cursor.continue()
      }
      transaction.oncomplete = () => resolve(rows)
      transaction.onerror = () => reject(transaction.error)
    })
  },
  async put(store: OfflineStore, key: IDBValidKey, value: unknown): Promise<void> {
    await request(store, 'readwrite', (objectStore) => objectStore.put(value, key))
  },
  async remove(store: OfflineStore, key: IDBValidKey): Promise<void> {
    await request(store, 'readwrite', (objectStore) => objectStore.delete(key))
  },
}
