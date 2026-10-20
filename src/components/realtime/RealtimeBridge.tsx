import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { REALTIME_RECONNECTED, startRealtime, stopRealtime, useRealtimeEvent } from '../../lib/realtime'

/**
 * Keeps the live connection open while someone is signed in and reloads the data each pushed event changes.
 * Screens with their own reaction (the security page, the POS) listen with useRealtimeEvent as well.
 */
export function RealtimeBridge() {
  const queryClient = useQueryClient()
  const reload = (...keys: unknown[][]) => keys.forEach((queryKey) => void queryClient.invalidateQueries({ queryKey }))

  useEffect(() => {
    startRealtime()
    return () => stopRealtime()
  }, [])

  useRealtimeEvent('payment.updated', ({ data }) => {
    reload(['payment', Number(data.paymentId)], ['payments'], ['orders', 'recent'], ['reports'], ['cash-session'])
  })
  useRealtimeEvent('business.updated', () => reload(['businessReview'], ['plans', 'mine'], ['stores']))
  useRealtimeEvent('telegram.chats.changed', () => reload(['telegram']))
  // Anything may have changed while the connection was down.
  useRealtimeEvent(REALTIME_RECONNECTED, () => reload(['payment'], ['businessReview'], ['plans', 'mine'], ['telegram'], ['reports']))

  return null
}
