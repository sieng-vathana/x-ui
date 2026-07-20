import { useCallback, useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from '../components'
import { cn } from '../lib/cn'

const SIDEBAR_EXPANDED = 248
const SIDEBAR_COLLAPSED = 72
const STORAGE_KEY = 'vpos-sidebar-collapsed'

export function AdminLayout() {
  const [storeId, setStoreId] = useState('main')
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === '1'
    } catch {
      return false
    }
  })

  const toggleSidebar = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev
      try {
        localStorage.setItem(STORAGE_KEY, next ? '1' : '0')
      } catch {
        /* ignore */
      }
      return next
    })
  }, [])

  useEffect(() => {
    document.documentElement.style.setProperty(
      '--vpos-sidebar-width',
      `${collapsed ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED}px`,
    )
  }, [collapsed])

  const sidebarWidth = collapsed ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED

  return (
    <div className="flex min-h-screen bg-vpos-bg">
      <Sidebar collapsed={collapsed} onToggle={toggleSidebar} />
      <div
        className={cn('min-h-screen transition-[margin,width] duration-200 ease-out')}
        style={{
          marginLeft: sidebarWidth,
          width: `calc(100% - ${sidebarWidth}px)`,
        }}
      >
        <Outlet
          context={{
            storeId,
            setStoreId,
            sidebarCollapsed: collapsed,
            toggleSidebar,
            sidebarWidth,
          }}
        />
      </div>
    </div>
  )
}

export type AdminOutletContext = {
  storeId: string
  setStoreId: (id: string) => void
  sidebarCollapsed: boolean
  toggleSidebar: () => void
  sidebarWidth: number
}
