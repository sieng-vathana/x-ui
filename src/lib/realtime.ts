import { useEffect, useRef, useSyncExternalStore } from 'react'
import { API_BASE_URL } from './api'

/**
 * One WebSocket to x-notification-service per tab. The server pushes what changed (a payment was paid, the
 * merchant was approved, Telegram finished linking) and screens reload just that, instead of asking every few
 * seconds. The connection signs in with the access_token cookie the portal already has.
 */
export interface RealtimeMessage {
  type: string
  data: Record<string, unknown>
}

export type RealtimeStatus = 'connecting' | 'connected' | 'offline'

/** Sent locally after a lost connection is back, so screens can reload what may have changed meanwhile. */
export const REALTIME_RECONNECTED = 'realtime.reconnected'

/** The server closes with this when the access token has run out. */
const SIGN_IN_AGAIN = 4401
const MAX_RETRY_DELAY_MS = 30_000

const listeners = new Set<(message: RealtimeMessage) => void>()
const statusListeners = new Set<() => void>()
let socket: WebSocket | null = null
let wanted = false
let status: RealtimeStatus = 'offline'
let attempts = 0
let connectedBefore = false
let retryTimer: number | undefined

function realtimeUrl(): string {
  const api = new URL(API_BASE_URL, window.location.origin)
  return `${api.protocol === 'https:' ? 'wss:' : 'ws:'}//${api.host}/ws/realtime`
}

function setStatus(next: RealtimeStatus) {
  if (status === next) return
  status = next
  statusListeners.forEach((listener) => listener())
}

function emit(message: RealtimeMessage) {
  listeners.forEach((listener) => {
    try {
      listener(message)
    } catch (error) {
      console.error('Realtime listener failed', error)
    }
  })
}

async function refreshSession(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: { Accept: 'application/json', 'X-Client-Type': 'web' },
    })
    return response.ok
  } catch {
    return false
  }
}

function scheduleReconnect() {
  window.clearTimeout(retryTimer)
  const delay = Math.min(MAX_RETRY_DELAY_MS, 1000 * 2 ** attempts) + Math.random() * 500
  attempts += 1
  retryTimer = window.setTimeout(connect, delay)
}

function connect() {
  if (!wanted || socket) return
  setStatus('connecting')
  const ws = new WebSocket(realtimeUrl())
  socket = ws
  ws.onmessage = (event) => {
    let message: RealtimeMessage
    try {
      message = JSON.parse(String(event.data)) as RealtimeMessage
    } catch {
      return
    }
    if (message.type === 'ping') return
    if (message.type === 'ready') {
      attempts = 0
      setStatus('connected')
      if (connectedBefore) emit({ type: REALTIME_RECONNECTED, data: {} })
      connectedBefore = true
      return
    }
    emit({ type: message.type, data: message.data ?? {} })
  }
  ws.onclose = (event) => {
    if (socket === ws) socket = null
    if (!wanted) {
      setStatus('offline')
      return
    }
    setStatus('connecting')
    if (event.code === SIGN_IN_AGAIN) {
      void refreshSession().then((refreshed) => {
        if (refreshed) scheduleReconnect()
        else setStatus('offline')
      })
      return
    }
    scheduleReconnect()
  }
}

/** Opens the live connection for a signed-in user; safe to call more than once. */
export function startRealtime() {
  wanted = true
  connect()
}

export function stopRealtime() {
  wanted = false
  connectedBefore = false
  attempts = 0
  window.clearTimeout(retryTimer)
  socket?.close(1000)
  socket = null
  setStatus('offline')
}

export function onRealtime(listener: (message: RealtimeMessage) => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** Runs the handler for each pushed event of the given types while the component is mounted. */
export function useRealtimeEvent(types: string | string[], handler: (message: RealtimeMessage) => void) {
  const handlerRef = useRef(handler)
  handlerRef.current = handler
  const key = Array.isArray(types) ? types.join('|') : types
  useEffect(() => {
    const wantedTypes = new Set(key.split('|'))
    return onRealtime((message) => {
      if (wantedTypes.has(message.type)) handlerRef.current(message)
    })
  }, [key])
}

/** Whether pushed updates are arriving right now. */
export function useRealtimeStatus(): RealtimeStatus {
  return useSyncExternalStore(
    (listener) => {
      statusListeners.add(listener)
      return () => {
        statusListeners.delete(listener)
      }
    },
    () => status,
  )
}
