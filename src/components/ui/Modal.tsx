import {
  useEffect,
  useId,
  useRef,
  type AnimationEvent,
  type ReactNode,
} from 'react'
import { cn } from '../../lib/cn'
import { usePresence } from '../../hooks/usePresence'
import { Icon } from './Icon'

export type ModalTone = 'light' | 'dark'
export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'shortcut'

export interface ModalProps {
  open: boolean
  onClose: () => void
  title?: ReactNode
  description?: ReactNode
  children: ReactNode
  footer?: ReactNode
  size?: ModalSize
  className?: string
  panelClassName?: string
  hideClose?: boolean
  /** light = white app modal; dark = FinPOS-style panel */
  tone?: ModalTone
  /**
   * absolute inset-0 inside a relative parent (e.g. POS content),
   * so the left nav is not covered.
   */
  contained?: boolean
  /** @deprecated kept for API compat — exit uses animationend */
  animationMs?: number
}

const sizeClass: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-5xl',
  shortcut: 'max-w-[452px]',
}

/**
 * Centered modal with clear open/close keyframe animations.
 * Open: backdrop fade + panel pop (scale + slide).
 * Close: reverse keyframes, then unmount on animationend.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  className,
  panelClassName,
  hideClose = false,
  tone = 'light',
  contained = false,
}: ModalProps) {
  const { mounted, phase, generation, onExitComplete } = usePresence(open)
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  // Preserve the tone API for callers while keeping every dialog on the
  // shared Velzon light surface.
  const isDark = false

  useEffect(() => {
    if (!open || !mounted) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        onCloseRef.current()
      }
    }
    document.addEventListener('keydown', onKey, true)
    const prev = document.body.style.overflow
    if (!contained) document.body.style.overflow = 'hidden'
    const t = window.setTimeout(() => panelRef.current?.focus(), 50)
    return () => {
      document.removeEventListener('keydown', onKey, true)
      if (!contained) document.body.style.overflow = prev
      window.clearTimeout(t)
    }
  }, [open, mounted, contained])

  // Fallback unmount if animationend never fires
  useEffect(() => {
    if (phase !== 'exit' || open) return
    const t = window.setTimeout(onExitComplete, 320)
    return () => window.clearTimeout(t)
  }, [phase, open, onExitComplete])

  if (!mounted) return null

  const handlePanelAnimEnd = (e: AnimationEvent<HTMLDivElement>) => {
    // Only the panel's own animation (not children)
    if (e.target !== e.currentTarget) return
    if (phase === 'exit') onExitComplete()
  }

  return (
    <div
      key={`modal-backdrop-${generation}`}
      data-modal-tone={tone}
      data-phase={phase}
      className={cn(
        'vpos-modal-backdrop z-[500] flex items-center justify-center p-4',
        phase === 'enter' && 'vpos-modal-backdrop-enter',
        phase === 'exit' && 'vpos-modal-backdrop-exit',
        contained ? 'absolute inset-0' : 'fixed inset-0',
        className,
      )}
      role="presentation"
      onClick={phase === 'exit' ? undefined : onClose}
    >
      <div
        key={`modal-panel-${generation}`}
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        data-phase={phase}
        tabIndex={-1}
        className={cn(
          'vpos-modal-panel flex w-full flex-col overflow-hidden outline-none',
          phase === 'enter' && 'vpos-modal-panel-enter',
          phase === 'exit' && 'vpos-modal-panel-exit',
          sizeClass[size],
          isDark
            ? 'rounded-[6px] border border-vpos-line bg-white shadow-vpos'
            : 'rounded-[6px] border border-vpos-line bg-white shadow-vpos',
          size === 'shortcut' &&
            'h-[min(662px,calc(100vh-2rem))] max-h-[min(662px,calc(100vh-2rem))]',
          size === 'xl' && 'h-[min(88vh,900px)]',
          panelClassName,
        )}
        onClick={(e) => e.stopPropagation()}
        onAnimationEnd={handlePanelAnimEnd}
      >
        {(title || !hideClose) && (
          <div
            className={cn(
              'flex shrink-0 items-start justify-between gap-3 px-5',
              isDark ? 'pt-5 pb-1' : 'border-b border-vpos-line py-4',
            )}
          >
            <div className="min-w-0">
              {title ? (
                <h2
                  id={titleId}
                  className={cn(
                    'm-0',
                    isDark
                      ? 'text-[15px] font-semibold text-[#F4F6FA]'
                    : 'text-[16px] font-semibold text-vpos-dark',
                  )}
                >
                  {title}
                </h2>
              ) : null}
              {description ? (
                <p
                  className={cn(
                    'mt-1 mb-0 text-[13px]',
                    isDark ? 'text-[#91A0B8]' : 'text-vpos-muted',
                  )}
                >
                  {description}
                </p>
              ) : null}
            </div>
            {!hideClose ? (
              <button
                type="button"
                aria-label="Close"
                onClick={onClose}
                className={cn(
                  'grid h-9 w-9 shrink-0 place-items-center rounded-xl border-0 transition-all duration-150',
                  isDark
                    ? 'bg-transparent text-[#F4F6FA] hover:bg-white/10 active:scale-95'
                    : 'bg-vpos-subtle text-vpos-muted hover:bg-vpos-sand hover:text-vpos-text active:scale-95',
                )}
              >
                <Icon name="close-line" />
              </button>
            ) : null}
          </div>
        )}

        <div
          className={cn(
            'min-h-0 flex-1 overflow-y-auto px-5',
            isDark
              ? 'pt-[30px] pb-4'
              : size === 'xl'
                ? 'max-h-none py-5 sm:px-6'
                : 'max-h-[min(70vh,520px)] py-4',
          )}
        >
          {children}
        </div>

        {footer ? (
          <div
            className={cn(
              'flex shrink-0 flex-wrap items-center justify-end gap-2 px-5 py-3.5',
              isDark ? 'border-t border-[#2D394E]' : 'border-t border-vpos-line',
            )}
          >
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  )
}
