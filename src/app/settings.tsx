import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { getSettings, updateSettings } from '@/db/db'
import type { AppSettings } from '@/db/types'
import { requestPersistentStorage } from '@/lib/storage'

type Ctx = {
  settings: AppSettings
  update: (patch: Partial<AppSettings>) => Promise<void>
}

const SettingsContext = createContext<Ctx | null>(null)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings | null>(null)

  useEffect(() => {
    let alive = true
    getSettings().then((s) => {
      if (alive) setSettings(s)
    })
    void requestPersistentStorage()
    return () => {
      alive = false
    }
  }, [])

  const update = useCallback(async (patch: Partial<AppSettings>) => {
    await updateSettings(patch)
    const fresh = await getSettings()
    setSettings(fresh)
  }, [])

  const value = useMemo(() => (settings ? { settings, update } : null), [settings, update])

  if (!value) {
    return (
      <div className="flex h-full items-center justify-center text-[var(--text-3)]">
        Loading…
      </div>
    )
  }
  return <SettingsContext value={value}>{children}</SettingsContext>
}

export function useSettings(): Ctx {
  const ctx = use(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used inside <SettingsProvider>')
  return ctx
}
