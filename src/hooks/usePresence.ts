import { useCallback, useEffect, useRef, useState } from 'react'

export type PresencePhase = 'enter' | 'exit'

/**
 * Keep modal mounted during open + exit animation.
 * `phase` drives CSS keyframe classes (enter on popup, exit on close).
 * `generation` remounts DOM so enter keyframes always restart.
 */
export function usePresence(open: boolean) {
  const [mounted, setMounted] = useState(false)
  const [phase, setPhase] = useState<PresencePhase>('enter')
  const [generation, setGeneration] = useState(0)
  const wasOpen = useRef(false)

  useEffect(() => {
    if (open) {
      wasOpen.current = true
      setMounted(true)
      setPhase('enter')
      setGeneration((g) => g + 1)
      return
    }
    if (wasOpen.current) {
      setPhase('exit')
    }
  }, [open])

  const onExitComplete = useCallback(() => {
    if (!open) {
      wasOpen.current = false
      setMounted(false)
    }
  }, [open])

  return { mounted, phase, generation, onExitComplete }
}
