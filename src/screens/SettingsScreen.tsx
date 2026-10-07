import { useEffect, useState } from 'react'
import { useSettings } from '@/app/settings'
import { formatBytes } from '@/lib/format'
import { getStorageInfo, requestPersistentStorage, type StorageInfo } from '@/lib/storage'
import { Button, Card, TextField } from '@/ui/kit'
import { Page, TopBar } from '@/ui/nav'
import { useToast } from '@/ui/toast'

export function SettingsScreen() {
  const { settings, update } = useSettings()
  const toast = useToast()
  // `?? ''` guards devices whose settings row predates a field — belt and
  // suspenders alongside the backfill in db.ts's getSettings().
  const [name, setName] = useState(settings.personName ?? '')
  const [email, setEmail] = useState(settings.personEmail ?? '')
  const [storage, setStorage] = useState<StorageInfo | null>(null)

  useEffect(() => {
    getStorageInfo().then(setStorage)
  }, [])

  const saveIdentity = async () => {
    await update({ personName: name.trim(), personEmail: email.trim() })
    toast.show('Saved')
  }
  const identityDirty =
    name.trim() !== (settings.personName ?? '') || email.trim() !== (settings.personEmail ?? '')

  return (
    <Page topBar={<TopBar title="Settings" back="/" />}>
      <div className="flex flex-col gap-4">
        <Card className="p-4">
          <h2 className="mb-2 text-sm font-semibold">You</h2>
          <p className="mb-3 text-xs text-[var(--text-3)]">
            Your name is stamped on every observation you record. Your email (optional)
            is set as Reply-To when you email a bundle to the lead.
          </p>
          <div className="flex flex-col gap-2">
            <TextField
              label="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Creed McCord"
            />
            <TextField
              label="Email (optional)"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
            <Button variant="primary" onClick={saveIdentity} disabled={!identityDirty}>
              Save
            </Button>
          </div>
          <p className="mt-2 text-xs text-[var(--text-3)]">
            Device label: <span className="font-mono">{settings.deviceLabel}</span>
          </p>
        </Card>

        <Card className="p-4">
          <h2 className="mb-3 text-sm font-semibold">Photo storage</h2>
          <label className="flex items-center justify-between gap-3 py-1.5 text-sm">
            <span>
              Keep full-resolution originals
              <span className="block text-xs text-[var(--text-3)]">
                Off saves space. On uses much more — risky on iPhones.
              </span>
            </span>
            <input
              type="checkbox"
              checked={settings.keepOriginals}
              onChange={(e) => update({ keepOriginals: e.target.checked })}
              className="h-5 w-5 shrink-0 accent-brand-500"
            />
          </label>

          <div className="mt-3">
            <label className="text-sm">
              Working-copy size
              <select
                value={settings.imageMaxEdge}
                onChange={(e) => update({ imageMaxEdge: Number(e.target.value) })}
                className="ml-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-sm"
              >
                <option value={1800}>1800 px (smaller)</option>
                <option value={2400}>2400 px (recommended)</option>
                <option value={3200}>3200 px (sharper, bigger)</option>
              </select>
            </label>
          </div>
        </Card>

        <Card className="p-4">
          <h2 className="mb-2 text-sm font-semibold">Device storage</h2>
          {storage?.supported ? (
            <>
              <div className="mb-1 flex justify-between text-sm">
                <span className="text-[var(--text-2)]">
                  {formatBytes(storage.usage)} used
                </span>
                <span className="text-[var(--text-3)]">
                  of ~{formatBytes(storage.quota)}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[var(--surface-3)]">
                <div
                  className="h-full bg-brand-500"
                  style={{ width: `${Math.min(100, (storage.ratio ?? 0) * 100)}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-[var(--text-3)]">
                Storage persistence:{' '}
                {storage.persisted ? (
                  <span className="text-green-600">granted</span>
                ) : (
                  <span className="text-amber-600">not granted</span>
                )}
                . Export your bundle at the end of each room or day so nothing is
                lost if the browser reclaims space.
              </p>
              {!storage.persisted && (
                <Button
                  variant="secondary"
                  className="mt-2"
                  onClick={async () => {
                    const ok = await requestPersistentStorage()
                    setStorage(await getStorageInfo())
                    toast.show(ok ? 'Persistence granted' : 'Browser declined — export often')
                  }}
                >
                  Request persistent storage
                </Button>
              )}
            </>
          ) : (
            <p className="text-xs text-[var(--text-3)]">
              This browser doesn't report storage usage.
            </p>
          )}
        </Card>

        <p className="px-1 text-center text-xs text-[var(--text-3)]">
          Site Collect · all data stays on this device until you export.
        </p>
      </div>
    </Page>
  )
}
