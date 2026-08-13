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
      className={`app-loader-wrapper fixed inset-0 z-[9999] flex flex-col items-center justify-center backdrop-blur-xl transition-all duration-200 ${
        isExiting ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
      }`}
      role="status"
      aria-live="polite"
      aria-label="Loading data"
    >
      {/* Background Ambient Glow */}
      <div className="absolute h-72 w-72 rounded-full bg-vpos-primary/15 blur-3xl animate-pulse" />

      <div className="relative flex flex-col items-center justify-center p-8 text-center z-10">
        {/* Pop-in Icon (Pure icon without any background container) */}
        <div className="relative mb-5 flex items-center justify-center animate-pop-in-zoom">
          <img
            src={loaderMark}
            alt="Logo"
            className="app-loader-icon h-20 w-20 object-contain"
          />
        </div>

        {/* Text Details */}
        <h3 className="m-0 text-[17px] font-extrabold tracking-tight text-vpos-dark">
          {isStarting ? 'Setting up workspace…' : 'Syncing data…'}
        </h3>
        <p className="mt-1 mb-5 text-[12px] font-semibold text-vpos-muted">
          {isStarting ? 'Preparing stores, catalog & user session' : 'Fetching your latest business data'}
        </p>

        {/* Bottom Loading Progress Line */}
        <div className="h-1.5 w-44 overflow-hidden rounded-full bg-vpos-subtle">
          <div className="h-full w-full bg-gradient-to-r from-vpos-primary via-indigo-500 to-emerald-500 animate-pulse" />
        </div>
      </div>
    </div>
  )
}
