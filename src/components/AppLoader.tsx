import { useEffect, useState } from 'react'
import { Icon } from './ui/Icon'

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
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white/85 dark:bg-[#15181e]/90 backdrop-blur-md transition-all duration-200 ${
        isExiting ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
      }`}
      role="status"
      aria-live="polite"
      aria-label="Loading data"
    >
      <div className="relative flex flex-col items-center justify-center p-8 text-center">
        {/* Animated Gradient Spinner Ring */}
        <div className="relative mb-5 grid h-16 w-16 place-items-center">
          <div className="absolute inset-0 rounded-full border-3 border-vpos-primary/20 border-t-vpos-primary animate-spin" />
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-vpos-primary text-white shadow-md shadow-vpos-primary/30">
            <Icon name="store-3-fill" className="text-[20px]" />
          </div>
        </div>

        {/* Text Details */}
        <h3 className="m-0 text-[16px] font-extrabold tracking-tight text-vpos-dark dark:text-white">
          {isStarting ? 'Setting up workspace…' : 'Syncing data…'}
        </h3>
        <p className="mt-1 mb-4 text-[12px] font-medium text-vpos-muted dark:text-gray-400">
          {isStarting ? 'Preparing stores, catalog & user session' : 'Fetching the latest updates'}
        </p>

        {/* Subtle Animated Shimmer Bar */}
        <div className="h-1 w-36 overflow-hidden rounded-full bg-vpos-subtle dark:bg-gray-800">
          <div className="h-full w-full bg-gradient-to-r from-vpos-primary via-indigo-500 to-emerald-500 animate-pulse" />
        </div>
      </div>
    </div>
  )
}
