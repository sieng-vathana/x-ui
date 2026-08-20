import { useCallback, useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from '../components/layout/Sidebar'
import { SidebarSettingsDrawer } from '../components/layout/SidebarSettingsDrawer'
import { useSidebarLayout, type SidebarLayoutState } from '../hooks/useSidebarLayout'
import { useSessionTimeout } from '../hooks/useSessionTimeout'
import { SessionTimeoutModal } from '../components/auth/SessionTimeoutModal'
import { authApi } from '../features/auth/authApi'
import { useStores } from '../features/stores/useStores'
import { cn } from '../lib/cn'
import { Icon } from '../components/ui/Icon'
import { readStoredValue, writeStoredValue } from '../lib/storage'

const ACTIVE_STORE_STORAGE_KEY = 'vpos.active-store-id'

export function AdminLayout() {
  const { data: stores = [] } = useStores()
  const [storeId, setStoreIdState] = useState(() => readStoredValue(ACTIVE_STORE_STORAGE_KEY, ''))
  const sidebar = useSidebarLayout()
  const isHorizontal = !sidebar.isMobile && sidebar.config.layout === 'horizontal'
  const isDetached = !sidebar.isMobile && (sidebar.config.view === 'detached' || sidebar.config.layout === 'semi-box')
  const contentOffset = isHorizontal || sidebar.config.visibility === 'hidden' || sidebar.isMobile
    ? 0
    : sidebar.sidebarWidth + (isDetached ? 32 : 0)

  useEffect(() => {
    if (stores.length === 0) return

    const storedStore = stores.find((store) => store.id === storeId)
    const nextStoreId = storedStore?.id ?? stores[0].id
    if (nextStoreId !== storeId) {
      setStoreIdState(nextStoreId)
    }
    writeStoredValue(ACTIVE_STORE_STORAGE_KEY, nextStoreId)
  }, [stores, storeId])

  const setStoreId = useCallback((id: string) => {
    const numericId = Number(id)
    if (!Number.isInteger(numericId) || numericId <= 0) return

    const nextStoreId = String(numericId)
    setStoreIdState(nextStoreId)
    writeStoredValue(ACTIVE_STORE_STORAGE_KEY, nextStoreId)
  }, [])

  const handleTimeout = useCallback(async () => {
    await authApi.signOut()
    window.location.href = '/signin?reason=session_expired'
  }, [])

  const { showWarning, secondsRemaining, resetTimer } = useSessionTimeout({
    idleTimeoutMs: 30 * 60 * 1000, // 30 minutes idle timeout
    warningWindowMs: 2 * 60 * 1000, // 2 minutes warning
    onTimeout: handleTimeout,
  })

  useEffect(() => {
    const handleExpiredEvent = async () => {
      await authApi.signOut()
      window.location.href = '/signin?reason=session_expired'
    }
    window.addEventListener('vpos:session-expired', handleExpiredEvent)
    return () => window.removeEventListener('vpos:session-expired', handleExpiredEvent)
  }, [])

  return (
    <div
      className="relative min-h-screen bg-vpos-bg"
      data-sidebar-layout={sidebar.config.layout}
      data-sidebar-size={sidebar.effectiveSize}
      data-sidebar-view={sidebar.config.view}
      data-sidebar-color={sidebar.config.color}
      data-topbar-color={sidebar.config.topbar}
    >
      <Sidebar state={sidebar} />
      {sidebar.isMobile && sidebar.mobileOpen ? (
        <button type="button" aria-label="Close navigation" className="fixed inset-0 z-[35] bg-vpos-black/40" onClick={() => sidebar.setMobileOpen(false)} />
      ) : null}
      <div
        className={cn('min-h-screen overflow-x-clip transition-[margin,width,padding] duration-200 ease-out', isHorizontal && 'pt-12', sidebar.config.width === 'boxed' && 'mx-auto max-w-[1300px]')}
        style={{ marginLeft: contentOffset, width: `calc(100% - ${contentOffset}px)` }}
      >
        <Outlet
          context={{
            storeId,
            setStoreId,
            sidebar,
            sidebarCollapsed: sidebar.effectiveSize === 'small' || (sidebar.effectiveSize === 'hover' && !sidebar.hovered),
            toggleSidebar: sidebar.toggleNavigation,
            sidebarWidth: contentOffset,
          } satisfies AdminOutletContext}
        />
      </div>
      <SidebarSettingsDrawer state={sidebar} />
      <SessionTimeoutModal
        open={showWarning}
        secondsRemaining={secondsRemaining}
        onContinue={resetTimer}
        onSignOut={handleTimeout}
      />
      <button
        type="button"
        data-theme-customizer-trigger
        onClick={() => sidebar.setSettingsOpen(true)}
        className="fixed right-5 bottom-5 z-[300] grid h-12 w-12 place-items-center rounded-full bg-vpos-primary text-[22px] text-white shadow-[0_5px_18px_rgba(104,124,254,.34)] transition-transform duration-200 hover:-translate-y-1 hover:rotate-45 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vpos-primary max-sm:right-4 max-sm:bottom-20"
        aria-label="Open Theme Customizer"
        title="Theme Customizer"
      >
        <Icon name="settings-3-line" />
      </button>
    </div>
  )
}

export type AdminOutletContext = {
  storeId: string
  setStoreId: (id: string) => void
  sidebar: SidebarLayoutState
  sidebarCollapsed: boolean
  toggleSidebar: () => void
  sidebarWidth: number
}
