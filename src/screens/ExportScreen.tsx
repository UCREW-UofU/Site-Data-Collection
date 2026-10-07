import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useObservations, useSite, useSitePhotos, useSystems } from '@/app/queries'
import { useSettings } from '@/app/settings'
import { exportBundle } from '@/lib/bundle'
import { saveOrShare } from '@/lib/download'
import { emailBundleToLead } from '@/lib/sendBundle'
import { formatBytes, plural } from '@/lib/format'
import { getStorageInfo } from '@/lib/storage'
import { Banner, Button, Card, TextArea } from '@/ui/kit'
import { Page, TopBar } from '@/ui/nav'
import { AlertIcon, ExportIcon, ShareIcon } from '@/ui/icons'
import { useToast } from '@/ui/toast'

export function ExportScreen() {
  const { siteId = '' } = useParams()
  const site = useSite(siteId)
  const photos = useSitePhotos(siteId) ?? []
  const observations = useObservations(siteId) ?? []
  const systems = useSystems(siteId) ?? []
  const { settings } = useSettings()
  const toast = useToast()

  const [busy, setBusy] = useState<null | 'export' | 'email'>(null)
  const [lastExport, setLastExport] = useState<string | null>(null)
  const [message, setMessage] = useState('')

  const mineObs = observations.filter((o) => o.deviceId === settings.deviceId)
  const otherObs = observations.length - mineObs.length
  const approxBytes = photos.reduce(
    (n, p) => n + p.image.size + (p.thumb?.size ?? 0) + (p.original?.size ?? 0),
    0,
  )
  const activeSystems = systems.filter((s) => s.active).length
  const leadEmail = site?.leadEmail?.trim() ?? ''
  const looksBig = approxBytes > 20 * 1024 * 1024

  const device = {
    id: settings.deviceId,
    label: settings.deviceLabel,
    person: settings.personName,
  }

  const runExport = async () => {
    setBusy('export')
    try {
      const { blob, filename, photoCount, observationCount } = await exportBundle(siteId, device)
      const how = await saveOrShare(blob, filename, `${site?.code ?? 'Site'} — bundle`)
      setLastExport(filename)
      toast.show(
        how === 'shared'
          ? `Shared ${plural(observationCount, 'observation')}, ${plural(photoCount, 'photo')}`
          : `Downloaded ${filename}`,
      )
      const info = await getStorageInfo()
      if (info.ratio && info.ratio > 0.8) {
        toast.show('Storage is getting full — safe to delete this site after merge', 'error')
      }
    } catch (err) {
      console.error(err)
      toast.show('Export failed', 'error')
    } finally {
      setBusy(null)
    }
  }

  const runEmail = async () => {
    if (!leadEmail) return
    setBusy('email')
    try {
      const res = await emailBundleToLead({
        siteId,
        siteCode: site?.code || site?.name || 'assessment',
        leadEmail,
        device,
        replyTo: settings.personEmail || undefined,
        message: message.trim() || undefined,
      })
      if (res.ok) {
        toast.show(`Emailed to ${leadEmail}`)
        setMessage('')
      } else {
        toast.show(res.error, 'error')
        if (res.canFallBack) toast.show('Falling back — use "Export my bundle"', 'error')
      }
    } finally {
      setBusy(null)
    }
  }

  return (
    <Page
      siteId={siteId}
      topBar={<TopBar title="Export bundle" back={`/sites/${siteId}/board`} />}
    >
      <div className="flex flex-col gap-4">
        <Card className="p-4">
          <h2 className="text-sm font-semibold">{site?.name || site?.code}</h2>
          <dl className="mt-3 grid grid-cols-2 gap-y-2 text-sm">
            <dt className="text-[var(--text-3)]">Observations</dt>
            <dd className="text-right font-medium">{observations.length}</dd>
            <dt className="text-[var(--text-3)]">— recorded by you</dt>
            <dd className="text-right">{mineObs.length}</dd>
            {otherObs > 0 && (
              <>
                <dt className="text-[var(--text-3)]">— from imported bundles</dt>
                <dd className="text-right">{otherObs}</dd>
              </>
            )}
            <dt className="text-[var(--text-3)]">Photos</dt>
            <dd className="text-right">{photos.length}</dd>
            <dt className="text-[var(--text-3)]">Active systems</dt>
            <dd className="text-right">{activeSystems}</dd>
            <dt className="text-[var(--text-3)]">Approx. size</dt>
            <dd className="text-right">{formatBytes(approxBytes)}</dd>
          </dl>
        </Card>

        {!settings.personName && (
          <Banner tone="warn">
            <AlertIcon width={18} height={18} className="mt-0.5 shrink-0" />
            <span>
              Set your name in Settings first — otherwise your observations merge
              as “{settings.deviceLabel}”.
            </span>
          </Banner>
        )}

        {/* Email to lead */}
        <Card className="p-4">
          <h2 className="text-sm font-semibold">Email to the lead</h2>
          {leadEmail ? (
            <>
              <p className="mt-1 text-xs text-[var(--text-3)]">
                Sends your bundle to <span className="font-medium">{leadEmail}</span>{' '}
                as an attachment — no download needed.
              </p>
              {looksBig && (
                <Banner tone="warn">
                  <AlertIcon width={16} height={16} className="mt-0.5 shrink-0" />
                  <span>
                    This bundle is ~{formatBytes(approxBytes)} and may be too big to
                    email. If it fails, use “Export my bundle” below.
                  </span>
                </Banner>
              )}
              <TextArea
                className="mt-2"
                rows={2}
                placeholder="Optional note to the lead…"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
              <Button
                variant="primary"
                size="lg"
                className="mt-2 w-full"
                onClick={runEmail}
                disabled={busy !== null || photos.length === 0}
              >
                <ShareIcon width={18} height={18} />
                {busy === 'email' ? 'Sending…' : `Email to ${leadEmail}`}
              </Button>
            </>
          ) : (
            <p className="mt-1 text-xs text-[var(--text-3)]">
              No lead email set for this site. The lead can add one in{' '}
              <strong>Setup → Site info</strong> and re-share the setup.
            </p>
          )}
        </Card>

        {/* Manual export */}
        <div>
          <Button
            variant={leadEmail ? 'secondary' : 'primary'}
            size="lg"
            className="w-full"
            onClick={runExport}
            disabled={busy !== null || photos.length === 0}
          >
            <ExportIcon width={20} height={20} />
            {busy === 'export' ? 'Packaging…' : 'Export my bundle'}
          </Button>
          {lastExport && (
            <p className="mt-2 text-center text-xs text-[var(--text-3)]">
              Last export: <span className="font-mono">{lastExport}</span>
            </p>
          )}
        </div>

        <p className="px-2 text-center text-xs text-[var(--text-3)]">
          The bundle is a single ZIP of your observations, notes and photos.
          Emailing routes it through the site's server to the lead's inbox; it
          isn't stored anywhere in between.
        </p>
      </div>
    </Page>
  )
}
