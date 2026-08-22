import { Icon } from './ui/Icon'
import { useToast, type ToastType, type ToastItem } from '../context/ToastContext'
import { cn } from '../lib/cn'

const defaultTitles: Record<ToastType, string> = {
  success: 'Success',
  error: 'Action failed',
  warning: 'Warning',
  info: 'Notice',
}

const typeStyles: Record<
  ToastType,
  {
    icon: string
    badgeBg: string
    progressBg: string
    borderHighlight: string
  }
> = {
  success: {
    icon: 'checkbox-circle-fill',
    badgeBg: 'bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-[0_4px_14px_rgba(16,185,129,0.38)]',
    progressBg: 'bg-gradient-to-r from-emerald-400 to-emerald-600',
    borderHighlight: 'border-l-4 border-l-emerald-500',
  },
  error: {
    icon: 'error-warning-fill',
    badgeBg: 'bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-[0_4px_14px_rgba(239,68,68,0.38)]',
    progressBg: 'bg-gradient-to-r from-rose-500 to-red-600',
    borderHighlight: 'border-l-4 border-l-rose-500',
  },
  warning: {
    icon: 'alert-fill',
    badgeBg: 'bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-[0_4px_14px_rgba(245,158,11,0.38)]',
    progressBg: 'bg-gradient-to-r from-amber-400 to-amber-600',
    borderHighlight: 'border-l-4 border-l-amber-500',
  },
  info: {
    icon: 'information-fill',
    badgeBg: 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-[0_4px_14px_rgba(79,70,229,0.38)]',
    progressBg: 'bg-gradient-to-r from-blue-500 to-indigo-600',
    borderHighlight: 'border-l-4 border-l-indigo-500',
  },
}

function ToastCard({ toast, onDismiss }: { toast: ToastItem; onDismiss: () => void }) {
  const styles = typeStyles[toast.type]
  const title = toast.title || defaultTitles[toast.type]

  return (
    <div
      role="alert"
      className={cn(
        'pointer-events-auto relative flex w-full flex-col overflow-hidden rounded-2xl border border-vpos-line bg-vpos-surface p-4 shadow-[0_20px_48px_-10px_rgba(15,23,42,0.18),0_4px_16px_rgba(15,23,42,0.06)] ring-1 ring-black/5 backdrop-blur-xl transition-all duration-200 hover:shadow-[0_24px_56px_-10px_rgba(15,23,42,0.22)]',
        styles.borderHighlight,
        toast.isClosing ? 'animate-toast-exit' : 'animate-toast-enter',
      )}
    >
      <div className="flex items-start gap-3.5">
        {/* Glowing variant badge */}
        <span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-xl text-[19px]', styles.badgeBg)}>
          <Icon name={styles.icon as any} />
        </span>

        {/* Text content */}
        <div className="min-w-0 flex-1 pt-0.5">
          <h4 className="m-0 text-[14px] font-extrabold tracking-tight text-vpos-text">{title}</h4>
          <p className="mt-1 m-0 text-[13px] font-medium leading-relaxed text-vpos-text">{toast.message}</p>
          {toast.description ? (
            <p className="mt-1.5 m-0 text-[12px] text-vpos-muted leading-normal">{toast.description}</p>
          ) : null}
        </div>

        {/* Close action */}
        <button
          type="button"
          aria-label="Dismiss notification"
          onClick={onDismiss}
          className="-mr-1 -mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-full text-vpos-muted transition hover:bg-vpos-subtle hover:text-vpos-text active:scale-95 border-0 bg-transparent"
        >
          <Icon name="close-line" className="text-[16px]" />
        </button>
      </div>

      {/* Progress countdown bar */}
      <div className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-vpos-subtle">
        <div
          className={cn('h-full', styles.progressBg)}
          style={{
            animation: `toast-progress ${toast.duration}ms linear forwards`,
          }}
        />
      </div>
    </div>
  )
}

export function Toaster() {
  const { toasts, dismissToast } = useToast()

  if (toasts.length === 0) return null

  return (
    <div
      aria-label="Notifications"
      className="pointer-events-none fixed top-5 right-5 z-[999999] flex w-[calc(100vw-2.5rem)] max-w-[420px] flex-col gap-3"
    >
      {toasts.map((t) => (
        <ToastCard key={t.id} toast={t} onDismiss={() => dismissToast(t.id)} />
      ))}
    </div>
  )
}
