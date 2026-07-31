import { useCallback, useEffect, useId, useRef } from 'react'
import type { SidebarLayout, SidebarLayoutState, SidebarVisibility, SidebarPosition, ThemeColorMode } from '../../hooks/useSidebarLayout'
import { usePresence } from '../../hooks/usePresence'
import { cn } from '../../lib/cn'
import { Icon } from '../ui/Icon'

type Option<T extends string> = { value: T; label: string }

const layouts: Option<SidebarLayout>[] = [
  { value: 'vertical', label: 'Vertical' },
  { value: 'horizontal', label: 'Horizontal' },
  { value: 'two-column', label: 'Two Column' },
  { value: 'semi-box', label: 'Semi Box' },
]
const modes: Option<ThemeColorMode>[] = [{ value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }]
const visibility: Option<SidebarVisibility>[] = [{ value: 'show', label: 'Show' }, { value: 'hidden', label: 'Hidden' }]
const positions: Option<SidebarPosition>[] = [{ value: 'fixed', label: 'Fixed' }, { value: 'scrollable', label: 'Scrollable' }]

function Preview({ group, value, selected }: { group: 'layout' | 'scheme' | 'visibility'; value: string; selected: boolean }) {
  const cls = (name: string) => cn(name, 'absolute')
  const check = selected ? <span className="theme-preview-check"><Icon name="check-line" /></span> : null
  if (group === 'layout') return <span className={cn('theme-preview', selected && 'selected')}>
    {value === 'vertical' ? <><i className={cls('inset-y-0 left-0 w-[18px] bg-[#eef0ff]')} /><i className={cls('top-0 right-0 left-[18px] h-[9px] bg-[#f3f6f9]')} /><i className={cls('right-2 bottom-2 left-[25px] h-[18px] bg-[#f3f6f9]')} /></> : null}
    {value === 'horizontal' ? <><i className={cls('inset-x-0 top-0 h-[10px] bg-[#eef0ff]')} /><i className={cls('top-[18px] right-2 left-2 h-[17px] bg-[#f3f6f9]')} /><i className={cls('right-2 bottom-2 left-2 h-[9px] bg-[#f3f6f9]')} /></> : null}
    {value === 'two-column' ? <><i className={cls('inset-y-0 left-0 w-[10px] bg-[#e8ebff]')} /><i className={cls('inset-y-0 left-[10px] w-[12px] bg-[#eef0ff]')} /><i className={cls('top-0 right-0 left-[22px] h-[9px] bg-[#f3f6f9]')} /><i className={cls('right-2 bottom-2 left-[29px] h-[18px] bg-[#f3f6f9]')} /></> : null}
    {value === 'semi-box' ? <><i className={cls('top-[5px] bottom-[5px] left-[5px] w-[14px] rounded-[2px] bg-[#eef0ff]')} /><i className={cls('top-0 right-0 left-[24px] h-[9px] bg-[#f3f6f9]')} /><i className={cls('right-2 bottom-[14px] left-[25px] h-[18px] bg-[#f3f6f9]')} /><i className={cls('right-2 bottom-[5px] left-[25px] h-[5px] bg-[#eef0ff]')} /></> : null}
    {check}
  </span>
  if (group === 'scheme') return <span className={cn('theme-preview', selected && 'selected')}>
    {value === 'light' ? <><i className={cls('inset-y-0 left-0 w-[18px] bg-[#eef0ff]')} /><i className={cls('top-0 right-0 left-[18px] h-[9px] bg-[#f3f6f9]')} /><i className={cls('right-2 bottom-2 left-[25px] h-[20px] bg-[#fff]')} /></> : <><i className={cls('inset-y-0 left-0 w-[18px] bg-[#3d4053]')} /><i className={cls('top-0 right-0 left-[18px] h-[9px] bg-[#292c3e]')} /><i className={cls('right-2 bottom-2 left-[25px] h-[20px] bg-[#292c3e]')} /></>}
    {check}
  </span>
  return <span className={cn('theme-preview', selected && 'selected')}>
    {value === 'show' ? <><i className={cls('inset-y-0 left-0 w-[18px] bg-[#eef0ff]')} /><i className={cls('top-0 right-0 left-[18px] h-[9px] bg-[#f3f6f9]')} /><i className={cls('right-2 bottom-2 left-[25px] h-[20px] bg-[#f3f6f9]')} /></> : <><i className={cls('inset-x-0 top-0 h-[10px] bg-[#eef0ff]')} /><i className={cls('top-[18px] right-2 left-2 h-[17px] bg-[#f3f6f9]')} /><i className={cls('right-2 bottom-2 left-2 h-[8px] bg-[#eef0ff]')} /></>}
    {check}
  </span>
}

function PreviewGroup<T extends string>({ title, description, group, value, options, onChange }: { title: string; description: string; group: 'layout' | 'scheme' | 'visibility'; value: T; options: Option<T>[]; onChange: (value: T) => void }) {
  const id = useId()
  return <section className="theme-customizer-section"><h3>{title}</h3><p>{description}</p><div className={cn('theme-preview-grid', group === 'layout' ? 'layout-grid' : 'two-grid')}>{options.map(option => <label key={option.value} className="theme-preview-option"><input className="sr-only" type="radio" name={id} checked={value === option.value} onChange={() => onChange(option.value)} /><Preview group={group} value={option.value} selected={value === option.value} /><span>{option.label}</span></label>)}</div></section>
}

function PositionControl({ value, onChange }: { value: SidebarPosition; onChange: (value: SidebarPosition) => void }) {
  return <section className="theme-customizer-section position-section"><h3>LAYOUT POSITION</h3><p>Choose Fixed or Scrollable Layout Position.</p><div className="theme-position-control" role="radiogroup" aria-label="Layout Position">{positions.map(option => <label key={option.value} className={cn(value === option.value && 'selected')}><input className="sr-only" type="radio" name="layout-position" checked={value === option.value} onChange={() => onChange(option.value)} />{option.label}</label>)}</div></section>
}

export function SidebarSettingsDrawer({ state }: { state: SidebarLayoutState }) {
  const { settingsOpen, setSettingsOpen, config, updateConfig } = state
  const panelRef = useRef<HTMLElement>(null)
  const { mounted, phase, generation, onExitComplete } = usePresence(settingsOpen)
  const close = useCallback(() => setSettingsOpen(false), [setSettingsOpen])

  useEffect(() => {
    if (!mounted) return
    const previous = document.body.style.overflow
    const onKey = (event: KeyboardEvent) => {
      if (!settingsOpen) return
      if (event.key === 'Escape') { event.preventDefault(); close(); return }
      if (event.key !== 'Tab') return
      const items = panelRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled])')
      if (!items?.length) return
      const first = items[0]; const last = items[items.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKey)
    const focus = settingsOpen ? window.setTimeout(() => panelRef.current?.querySelector<HTMLElement>('button')?.focus(), 0) : undefined
    return () => { document.body.style.overflow = previous; document.removeEventListener('keydown', onKey); window.clearTimeout(focus) }
  }, [mounted, settingsOpen, close])

  const finishExit = () => {
    if (phase !== 'exit') return
    onExitComplete()
    document.querySelector<HTMLElement>('[data-theme-customizer-trigger]')?.focus()
  }

  if (!mounted) return null
  return <div className={cn('theme-customizer-layer', phase === 'exit' && 'is-exiting')} role="presentation"><button type="button" aria-label="Close Theme Customizer" className="theme-customizer-backdrop" onClick={close} /><aside key={generation} ref={panelRef} className={cn('theme-customizer-drawer', phase === 'exit' && 'is-exiting')} role="dialog" aria-modal="true" aria-label="Theme Customizer" onAnimationEnd={finishExit}><header><h2>Theme Customizer</h2><button type="button" onClick={close} aria-label="Close Theme Customizer"><Icon name="close-line" /></button></header><div className="theme-customizer-body"><PreviewGroup title="LAYOUT" description="Choose your layout" group="layout" value={config.layout} options={layouts} onChange={layout => updateConfig({ layout, width: 'fluid', view: 'default', size: 'default' })} /><PreviewGroup title="COLOR SCHEME" description="Choose Light or Dark Scheme." group="scheme" value={config.colorMode} options={modes} onChange={colorMode => updateConfig({ colorMode })} /><PreviewGroup title="SIDEBAR VISIBILITY" description="Choose show or Hidden sidebar." group="visibility" value={config.visibility} options={visibility} onChange={visibility => updateConfig({ visibility })} /><PositionControl value={config.position} onChange={position => updateConfig({ position })} /></div><footer><button type="button" onClick={state.resetConfig}>Reset</button><button type="button" onClick={close}>Buy Now</button></footer></aside></div>
}
