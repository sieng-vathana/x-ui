import { useCallback, useEffect, useRef, useState } from 'react'

export interface SessionTimeoutOptions {
  /** Idle timeout duration in milliseconds. Defaults to 30 minutes (30 * 60 * 1000 ms). */
  idleTimeoutMs?: number
  /** Warning window before idle timeout in milliseconds. Defaults to 2 minutes (2 * 60 * 1000 ms). */
  warningWindowMs?: number
  /** Callback triggered when the session times out due to inactivity. */
  onTimeout: () => void
  /** Whether the timeout monitor is enabled. */
  enabled?: boolean
}

export function useSessionTimeout({
  idleTimeoutMs = 30 * 60 * 1000,
  warningWindowMs = 2 * 60 * 1000,
  onTimeout,
  enabled = true,
}: SessionTimeoutOptions) {
  const [showWarning, setShowWarning] = useState(false)
  const [secondsRemaining, setSecondsRemaining] = useState(120)
  const lastActivityRef = useRef<number>(Date.now())

  const resetTimer = useCallback(() => {
    lastActivityRef.current = Date.now()
    setShowWarning(false)
  }, [])

  useEffect(() => {
    if (!enabled) return

    const userActivityEvents = ['mousemove', 'keydown', 'click', 'touchstart', 'scroll']
    const handleActivity = () => {
      lastActivityRef.current = Date.now()
      if (showWarning) {
        setShowWarning(false)
      }
    }

    userActivityEvents.forEach((evt) =>
      window.addEventListener(evt, handleActivity, { passive: true }),
    )

    const intervalId = setInterval(() => {
      const elapsed = Date.now() - lastActivityRef.current
      const timeRemaining = idleTimeoutMs - elapsed

      if (timeRemaining <= 0) {
        setShowWarning(false)
        onTimeout()
      } else if (timeRemaining <= warningWindowMs) {
        setShowWarning(true)
        setSecondsRemaining(Math.max(1, Math.ceil(timeRemaining / 1000)))
      } else {
        setShowWarning(false)
      }
    }, 1000)

    return () => {
      userActivityEvents.forEach((evt) =>
        window.removeEventListener(evt, handleActivity),
      )
      clearInterval(intervalId)
    }
  }, [enabled, idleTimeoutMs, warningWindowMs, onTimeout, showWarning])

  return {
    showWarning,
    secondsRemaining,
    resetTimer,
  }
}
