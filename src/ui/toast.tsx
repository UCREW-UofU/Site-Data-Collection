import {
  createContext,
  use,
  useCallback,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { CheckIcon } from './icons'

type Toast = { id: number; message: string; tone: 'ok' | 'error' }
type Ctx = { show: (message: string, tone?: Toast['tone']) => void }

const ToastContext = createContext<Ctx | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const seq = useRef(0)

  const show = useCallback((message: string, tone: Toast['tone'] = 'ok') => {
    const id = ++seq.current
    setToasts((t) => [...t, { id, message, tone }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2600)
  }, [])

  const value = useMemo(() => ({ show }), [show])

  return (
    <ToastContext value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex flex-col items-center gap-2 px-4">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-white shadow-lg ${
              t.tone === 'error' ? 'bg-red-600' : 'bg-slate-900 dark:bg-slate-700'
            }`}
          >
            {t.tone === 'ok' && <CheckIcon width={16} height={16} />}
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext>
  )
}

export function useToast(): Ctx {
  const ctx = use(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>')
  return ctx
}
