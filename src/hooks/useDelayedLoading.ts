import { useEffect, useState } from 'react'

/** Avoids replacing already-fast content with a distracting loading state. */
export function useDelayedLoading(isLoading: boolean, delayMs = 350) {
  const [isDelayedLoading, setIsDelayedLoading] = useState(false)

  useEffect(() => {
    if (!isLoading) {
      setIsDelayedLoading(false)
      return
    }

    const timer = window.setTimeout(() => setIsDelayedLoading(true), delayMs)
    return () => window.clearTimeout(timer)
  }, [delayMs, isLoading])

  return isDelayedLoading
}
