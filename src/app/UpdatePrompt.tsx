import { useRegisterSW } from 'virtual:pwa-register/react'
import { Button } from '@/ui/kit'

/** Small toast when a new version of the app has been cached and is ready. */
export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  if (!needRefresh) return null

  return (
    <div className="fixed inset-x-0 bottom-0 z-[70] flex justify-center p-3 pb-safe">
      <div className="flex items-center gap-3 rounded-xl bg-slate-900 px-4 py-3 text-sm text-white shadow-xl dark:bg-slate-700">
        <span>A new version is ready.</span>
        <Button
          variant="primary"
          onClick={() => updateServiceWorker(true)}
          className="h-9"
        >
          Reload
        </Button>
        <button
          onClick={() => setNeedRefresh(false)}
          className="text-slate-300 underline"
        >
          Later
        </button>
      </div>
    </div>
  )
}
