import { useEffect, useState } from 'react'
import loaderMark from '../assets/icons8-kali-linux-480.png'

const EXIT_DURATION_MS = 220

export interface AppLoaderProps {
  isLoading: boolean
  isStarting: boolean
}

export function AppLoader({ isLoading, isStarting }: AppLoaderProps) {
  const [isMounted, setIsMounted] = useState(isLoading)
  const [isExiting, setIsExiting] = useState(false)

  useEffect(() => {
    if (isLoading) {
      setIsMounted(true)
      setIsExiting(false)
      return
    }

    if (!isMounted) return

    setIsExiting(true)
    const exitTimer = window.setTimeout(() => setIsMounted(false), EXIT_DURATION_MS)
    return () => window.clearTimeout(exitTimer)
  }, [isLoading, isMounted])

  useEffect(() => {
    if (!isMounted) return

    const previousOverflow = document.documentElement.style.overflow
    const previousBusy = document.documentElement.getAttribute('aria-busy')

    document.documentElement.style.overflow = 'hidden'
    document.documentElement.setAttribute('aria-busy', 'true')

    return () => {
      document.documentElement.style.overflow = previousOverflow

      if (previousBusy === null) {
        document.documentElement.removeAttribute('aria-busy')
      } else {
        document.documentElement.setAttribute('aria-busy', previousBusy)
      }
    }
  }, [isMounted])

  if (!isMounted) return null

  return (
    <div
      className={`app-loader-overlay fixed inset-0 z-[9999] flex items-center justify-center ${isExiting ? 'app-loader-overlay-exit' : ''}`}
      role="status"
      aria-live="polite"
      aria-label="Loading data"
    >
      <div className="app-loader-ambient" aria-hidden="true" />
      <div className="app-loader-content">
        <div className="app-loader-mark" aria-hidden="true"><img src={loaderMark} alt="" /></div>
        <p className="app-loader-eyebrow">
          {isStarting ? 'Starting workspace' : 'Data in progress'}
        </p>
        <p className="app-loader-title">
          {isStarting ? 'Getting everything ready' : 'Syncing your latest data'}
        </p>
        <div className="app-loader-progress" aria-hidden="true">
          <span />
        </div>
      </div>
    </div>
  )
}
