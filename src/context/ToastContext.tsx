import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from 'react'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface ToastOptions {
  title?: string
  description?: string
  duration?: number
}

export interface ToastItem {
  id: number
  message: string
  title?: string
  description?: string
  type: ToastType
  duration: number
  createdAt: number
  isClosing?: boolean
}

export type ToastFunction = {
  (message: string, type?: ToastType, options?: ToastOptions): void
  success: (message: string, options?: ToastOptions) => void
  error: (message: string, options?: ToastOptions) => void
  warning: (message: string, options?: ToastOptions) => void
  info: (message: string, options?: ToastOptions) => void
}

interface ToastContextValue {
  toasts: ToastItem[]
  toast: ToastFunction
  removeToast: (id: number) => void
  dismissToast: (id: number) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

let nextId = 1

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const timersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map())

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
    const timer = timersRef.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timersRef.current.delete(id)
    }
  }, [])

  const dismissToast = useCallback(
    (id: number) => {
      setToasts((prev) =>
        prev.map((t) => (t.id === id ? { ...t, isClosing: true } : t)),
      )
      setTimeout(() => {
        removeToast(id)
      }, 220)
    },
    [removeToast],
  )

  const pushToast = useCallback(
    (message: string, type: ToastType = 'info', options?: ToastOptions) => {
      const id = nextId++
      const duration = options?.duration ?? (type === 'error' ? 5500 : 4000)

      const newItem: ToastItem = {
        id,
        message,
        title: options?.title,
        description: options?.description,
        type,
        duration,
        createdAt: Date.now(),
        isClosing: false,
      }

      setToasts((prev) => {
        // Keep max 5 toasts visible at a time
        const next = [...prev, newItem]
        if (next.length > 5) {
          return next.slice(next.length - 5)
        }
        return next
      })

      const timer = setTimeout(() => {
        dismissToast(id)
      }, duration)

      timersRef.current.set(id, timer)
    },
    [dismissToast],
  )

  const toastCallable = useCallback(
    (message: string, typeOrOptions?: ToastType | ToastOptions, maybeOptions?: ToastOptions) => {
      if (typeof typeOrOptions === 'string') {
        pushToast(message, typeOrOptions, maybeOptions)
      } else {
        pushToast(message, 'info', typeOrOptions)
      }
    },
    [pushToast],
  ) as ToastFunction

  toastCallable.success = useCallback(
    (message: string, options?: ToastOptions) => pushToast(message, 'success', options),
    [pushToast],
  )

  toastCallable.error = useCallback(
    (message: string, options?: ToastOptions) => pushToast(message, 'error', options),
    [pushToast],
  )

  toastCallable.warning = useCallback(
    (message: string, options?: ToastOptions) => pushToast(message, 'warning', options),
    [pushToast],
  )

  toastCallable.info = useCallback(
    (message: string, options?: ToastOptions) => pushToast(message, 'info', options),
    [pushToast],
  )

  return (
    <ToastContext.Provider value={{ toasts, toast: toastCallable, removeToast, dismissToast }}>
      {children}
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used within a ToastProvider.')
  return context
}
