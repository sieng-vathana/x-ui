import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

export type SidebarLayout = 'vertical' | 'horizontal' | 'two-column' | 'semi-box'
export type SidebarSize = 'default' | 'compact' | 'small' | 'hover'
export type SidebarVisibility = 'show' | 'hidden'
export type LayoutWidth = 'fluid' | 'boxed'
export type SidebarView = 'default' | 'detached'
export type SidebarPosition = 'fixed' | 'scrollable'
export type SidebarColor = 'light' | 'dark' | 'gradient' | 'gradient-2' | 'gradient-3' | 'gradient-4'
export type SidebarImage = 'none' | 'img-1' | 'img-2' | 'img-3' | 'img-4'
export type ThemeColorMode =
  | 'light'
  | 'dark'
  | 'warm-paper'
  | 'slate-night'
  | 'forest-ledger'
  | 'midnight-indigo'
  | 'high-contrast'
  | 'system'
export type TopbarColor = 'light' | 'dark'

export const DARK_THEME_MODES: readonly ThemeColorMode[] = [
  'dark',
  'slate-night',
  'forest-ledger',
  'midnight-indigo',
  'high-contrast',
]

export function isDarkThemeMode(mode: ThemeColorMode): boolean {
  if (mode === 'system') {
    return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
  }
  return DARK_THEME_MODES.includes(mode)
}

export interface SidebarConfig {
  layout: SidebarLayout
  visibility: SidebarVisibility
  width: LayoutWidth
  position: SidebarPosition
  size: SidebarSize
  view: SidebarView
  color: SidebarColor
  image: SidebarImage
  colorMode: ThemeColorMode
  topbar: TopbarColor
  preloader: boolean
}

export const THEME_STORAGE_KEY = 'app-theme-customizer'
export const defaultSidebarConfig: SidebarConfig = {
  layout: 'vertical', visibility: 'show', width: 'fluid', position: 'fixed',
  size: 'small', view: 'default', color: 'light', image: 'none',
  colorMode: 'light', topbar: 'light', preloader: true,
}

const allowed = {
  layout: ['vertical', 'horizontal', 'two-column', 'semi-box'],
  visibility: ['show', 'hidden'], width: ['fluid', 'boxed'], position: ['fixed', 'scrollable'],
  size: ['default', 'compact', 'small', 'hover'], view: ['default', 'detached'],
  color: ['light', 'dark', 'gradient', 'gradient-2', 'gradient-3', 'gradient-4'],
  image: ['none', 'img-1', 'img-2', 'img-3', 'img-4'],
  colorMode: ['light', 'dark', 'warm-paper', 'slate-night', 'forest-ledger', 'midnight-indigo', 'high-contrast', 'system'],
  topbar: ['light', 'dark'],
} as const

function valid<T extends readonly string[]>(value: unknown, values: T, fallback: T[number]) {
  return typeof value === 'string' && (values as readonly string[]).includes(value) ? value as T[number] : fallback
}

export function readThemeConfig(): SidebarConfig {
  if (typeof window === 'undefined') return defaultSidebarConfig
  try {
    const value: unknown = JSON.parse(localStorage.getItem(THEME_STORAGE_KEY) ?? '{}')
    const saved = value && typeof value === 'object' ? value as Record<string, unknown> : {}
    return {
      layout: valid(saved.layout, allowed.layout, defaultSidebarConfig.layout),
      visibility: valid(saved.visibility, allowed.visibility, defaultSidebarConfig.visibility),
      // Keep legacy-only presentation fields at their neutral values so a
      // stale preference cannot alter options the customizer no longer owns.
      width: defaultSidebarConfig.width,
      position: valid(saved.position, allowed.position, defaultSidebarConfig.position),
      size: defaultSidebarConfig.size,
      view: defaultSidebarConfig.view,
      color: defaultSidebarConfig.color,
      image: defaultSidebarConfig.image,
      colorMode: valid(saved.colorMode, allowed.colorMode, defaultSidebarConfig.colorMode),
      topbar: defaultSidebarConfig.topbar,
      preloader: defaultSidebarConfig.preloader,
    }
  } catch { return defaultSidebarConfig }
}

let systemThemeMediaQuery: MediaQueryList | null = null
let systemThemeListener: ((event: MediaQueryListEvent) => void) | null = null

function removeSystemThemeListener() {
  if (systemThemeMediaQuery && systemThemeListener) {
    systemThemeMediaQuery.removeEventListener('change', systemThemeListener)
  }
  systemThemeMediaQuery = null
  systemThemeListener = null
}

export function applyThemeConfig(config: SidebarConfig) {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  removeSystemThemeListener()
  root.dataset.layout = config.layout
  const darkTheme = isDarkThemeMode(config.colorMode)
  root.dataset.bsTheme = darkTheme ? 'dark' : 'light'
  root.dataset.themeFamily = darkTheme ? 'dark' : 'light'
  root.dataset.themePreset = config.colorMode
  root.dataset.layoutWidth = config.width
  root.dataset.layoutPosition = config.position
  root.dataset.topbar = config.topbar
  root.dataset.sidebar = config.color
  root.dataset.sidebarSize = config.size
  root.dataset.sidebarImage = config.image
  root.dataset.preloader = config.preloader ? 'enabled' : 'disabled'
  root.style.colorScheme = config.colorMode === 'system'
    ? 'light dark'
    : isDarkThemeMode(config.colorMode) ? 'dark' : 'light'

  if (config.colorMode === 'system') {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const listener = () => {
      const family = mediaQuery.matches ? 'dark' : 'light'
      root.dataset.bsTheme = family
      root.dataset.themeFamily = family
      window.dispatchEvent(new Event('app-theme-config-changed'))
    }
    mediaQuery.addEventListener('change', listener)
    systemThemeMediaQuery = mediaQuery
    systemThemeListener = listener
  }
  window.dispatchEvent(new Event('app-theme-config-changed'))
}

/** Applies persisted variables before React paints to avoid a theme flash. */
export function initializeThemeConfig() { applyThemeConfig(readThemeConfig()) }

export function useSidebarLayout() {
  const [config, setConfig] = useState<SidebarConfig>(readThemeConfig)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [hoveredMenuItem, setHoveredMenuItem] = useState<string | null>(null)
  const [openGroup, setOpenGroup] = useState<string | null>(null)
  const [twoColumnSection, setTwoColumnSection] = useState('overview')
  const [twoColumnOpen, setTwoColumnOpen] = useState(true)
  const skipPersistRef = useRef(false)
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 1024)
  const [isTablet, setIsTablet] = useState(() => typeof window !== 'undefined' && window.innerWidth > 767 && window.innerWidth < 1025)

  useEffect(() => {
    const update = () => { setIsMobile(window.innerWidth <= 1024); setIsTablet(window.innerWidth > 767 && window.innerWidth < 1025); if (window.innerWidth > 1024) setMobileOpen(false) }
    update(); window.addEventListener('resize', update); return () => window.removeEventListener('resize', update)
  }, [])
  useEffect(() => { applyThemeConfig(config); if (skipPersistRef.current) { skipPersistRef.current = false; return }; try { localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(config)) } catch { /* optional persistence */ } }, [config])
  useEffect(() => { if (!isMobile || !mobileOpen) return; const previous = document.body.style.overflow; const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setMobileOpen(false) }; document.body.style.overflow = 'hidden'; document.addEventListener('keydown', onKey); return () => { document.body.style.overflow = previous; document.removeEventListener('keydown', onKey) } }, [isMobile, mobileOpen])

  const effectiveSize = useMemo<SidebarSize>(() => isTablet && !isMobile && config.layout !== 'horizontal' && config.size === 'default' ? 'small' : config.size, [config.layout, config.size, isMobile, isTablet])
  const sidebarWidth = useMemo(() => { if (isMobile || config.visibility === 'hidden' || config.layout === 'horizontal') return 0; if (config.layout === 'two-column') return twoColumnOpen ? 290 : 70; if (effectiveSize === 'small' || effectiveSize === 'hover') return 70; return effectiveSize === 'compact' ? 180 : 250 }, [config.layout, config.visibility, effectiveSize, isMobile, twoColumnOpen])
  const updateConfig = useCallback((update: Partial<SidebarConfig>) => setConfig(current => ({ ...current, ...update })), [])
  const resetConfig = useCallback(() => { try { localStorage.removeItem(THEME_STORAGE_KEY) } catch { /* optional persistence */ }; skipPersistRef.current = true; setConfig(defaultSidebarConfig) }, [])
  const toggleNavigation = useCallback(() => { if (isMobile) return setMobileOpen(open => !open); if (config.visibility === 'hidden') return updateConfig({ visibility: 'show' }); if (config.layout === 'two-column') return setTwoColumnOpen(open => !open); updateConfig({ size: config.size === 'small' ? 'default' : 'small' }) }, [config.layout, config.size, config.visibility, isMobile, updateConfig])
  const toggleGroup = useCallback((group: string) => setOpenGroup(current => current === group ? null : group), [])
  const showGroup = useCallback((group: string) => setOpenGroup(group), [])
  const hideGroup = useCallback(() => setOpenGroup(null), [])
  return { config, effectiveSize, updateConfig, resetConfig, isMobile, isTablet, mobileOpen, setMobileOpen, settingsOpen, setSettingsOpen, hovered, setHovered, hoveredMenuItem, setHoveredMenuItem, openGroup, toggleGroup, showGroup, hideGroup, twoColumnSection, setTwoColumnSection, twoColumnOpen, setTwoColumnOpen, sidebarWidth, toggleNavigation }
}
export type SidebarLayoutState = ReturnType<typeof useSidebarLayout>
