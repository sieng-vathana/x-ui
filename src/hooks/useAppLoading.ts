import { useCallback, useEffect, useState } from 'react'
import { isPlatformApiRequest } from '../lib/api'

type LoadingListener = (pendingRequests: number) => void

declare global {
  interface Window {
    __vposNativeFetch?: typeof window.fetch
  }
}

const STARTUP_DISPLAY_MS = 1200
const listeners = new Set<LoadingListener>()
let pendingRequests = 0

function notifyListeners() {
  listeners.forEach((listener) => listener(pendingRequests))
}

function beginLoading() {
  pendingRequests += 1
  notifyListeners()
}

function finishLoading() {
  pendingRequests = Math.max(0, pendingRequests - 1)
  notifyListeners()
}

if (typeof window !== 'undefined') {
  window.__vposNativeFetch ??= window.fetch.bind(window)
  const nativeFetch = window.__vposNativeFetch

  window.fetch = async (...args) => {
    if (!isPlatformApiRequest(args[0])) return nativeFetch(...args)

    beginLoading()

    try {
      return await nativeFetch(...args)
    } finally {
      finishLoading()
    }
  }
}

/**
 * Tracks all native browser fetches and exposes `track` for other async work.
 * The loader remains visible until every concurrent operation has settled.
 */
export function useAppLoading() {
  const [isStarting, setIsStarting] = useState(true)
  const [activeRequests, setActiveRequests] = useState(pendingRequests)

  useEffect(() => {
    const startupTimer = window.setTimeout(() => setIsStarting(false), STARTUP_DISPLAY_MS)
    return () => window.clearTimeout(startupTimer)
  }, [])

  useEffect(() => {
    listeners.add(setActiveRequests)
    setActiveRequests(pendingRequests)
    return () => {
      listeners.delete(setActiveRequests)
    }
  }, [])

  const track = useCallback(async <T,>(operation: () => Promise<T>) => {
    beginLoading()

    try {
      return await operation()
    } finally {
      finishLoading()
    }
  }, [])

  return { isLoading: isStarting || activeRequests > 0, isStarting, track }
}
