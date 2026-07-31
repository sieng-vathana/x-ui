/** Small, defensive localStorage helpers for client-side demo state. */
export function readStoredValue<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback

  try {
    const value = window.localStorage.getItem(key)
    return value ? (JSON.parse(value) as T) : fallback
  } catch {
    return fallback
  }
}

export function writeStoredValue<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // A full or blocked storage area should never break the POS interface.
  }
}

export function removeStoredValue(key: string): void {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(key)
}
