import { useSyncExternalStore } from 'react'

/**
 * Whether the portal can reach its server. The browser's own "online" flag stays true when the computer is still
 * on a network without internet, so a failed request also counts as "unreachable", and a small probe checks again.
 */
let browserOnline = typeof navigator === 'undefined' ? true : navigator.onLine
let reachable = true
let probeTimer: number | undefined
const listeners = new Set<() => void>()

function emit() {
  listeners.forEach((listener) => listener())
}

function startProbing() {
  if (probeTimer !== undefined) return
  probeTimer = window.setInterval(() => {
    void probe()
  }, 8_000)
}

function stopProbing() {
  if (probeTimer === undefined) return
  window.clearInterval(probeTimer)
  probeTimer = undefined
}

async function probe() {
  try {
    // The service worker never caches this file, so the answer comes from the server.
    await fetch('/sw.js', { method: 'HEAD', cache: 'no-store' })
    markReachable()
  } catch {
    // Still unreachable; the next probe tries again.
  }
}

/** Called by the API client after a request got an answer from the server. */
export function markReachable() {
  if (reachable) return
  reachable = true
  stopProbing()
  emit()
}

/** Called by the API client when a request could not reach the server. */
export function markUnreachable() {
  if (!reachable) return
  reachable = false
  startProbing()
  emit()
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    browserOnline = true
    emit()
  })
  window.addEventListener('offline', () => {
    browserOnline = false
    emit()
  })
}

export function useConnection(): { online: boolean } {
  const online = useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    () => browserOnline && reachable,
    () => true,
  )
  return { online }
}
