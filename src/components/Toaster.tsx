import { Icon } from './ui/Icon'
import { useToast, type ToastType } from '../context/ToastContext'
import { cn } from '../lib/cn'

const iconMap: Record<ToastType, string> = {
  success: 'checkbox-circle-line',
  error: 'error-warning-line',
  warning: 'error-warning-line',
  info: 'information-line',
}

const toneMap: Record<ToastType, string> = {
  success:
    'border-vpos-green/30 bg-white text-vpos-green shadow-vpos',
  error:
    'border-vpos-red/30 bg-white text-vpos-red shadow-vpos',
  warning:
    'border-vpos-orange/30 bg-white text-vpos-orange shadow-vpos',
  info:
    'border-vpos-primary/30 bg-white text-vpos-primary shadow-vpos',
}

export function Toaster() {
  const { toasts, removeToast } = useToast()

  if (toasts.length === 0) return null

  return (
    <div
      aria-label="Notifications"
      className="pointer-events-none fixed right-4 bottom-4 z-[600] flex flex-col-reverse gap-2.5"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          role="alert"
          className={cn(
            'pointer-events-auto flex w-[340px] max-w-[calc(100vw-2rem)] items-start gap-3 rounded-[4px] border px-4 py-3 text-[14px] font-medium',
            'animate-[vpos-slide-up_300ms_ease-out_both]',
            toneMap[t.type],
          )}
        >
          <Icon name={iconMap[t.type]} className="mt-0.5 shrink-0 text-[18px]" />
          <span className="min-w-0 flex-1">{t.message}</span>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => removeToast(t.id)}
            className="-m-1 ml-auto grid h-7 w-7 shrink-0 place-items-center rounded-[4px] border-0 bg-transparent opacity-50 hover:bg-vpos-subtle hover:opacity-100"
          >
            <Icon name="close-line" className="text-[16px]" />
          </button>
        </div>
      ))}
    </div>
  )
}
