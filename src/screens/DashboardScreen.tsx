import { Link, useNavigate, useParams } from 'react-router-dom'
import { useObservations, useSite, useSystems } from '@/app/queries'
import { useObservationPhotosMap } from '@/app/observationThumbs'
import { formatDateTime, plural } from '@/lib/format'
import { Button, Card, EmptyState, IconButton } from '@/ui/kit'
import { Page, TopBar } from '@/ui/nav'
import { Thumb } from '@/ui/Thumb'
import { ExportIcon, PlusIcon, SettingsIcon } from '@/ui/icons'

export function DashboardScreen() {
  const { siteId = '' } = useParams()
  const site = useSite(siteId)
  const observations = useObservations(siteId)
  const systems = useSystems(siteId)
  const thumbs = useObservationPhotosMap(observations)
  const navigate = useNavigate()
  // Editing notes must not move an older entry above a newly recorded one.
  const newest = [...(observations ?? [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id))

  return (
    <Page topBar={<TopBar title={site?.name || site?.code || 'Site'} subtitle="Dashboard" back="/" right={
      <Link to={`/sites/${siteId}/setup`} aria-label="Site settings"><IconButton><SettingsIcon /></IconButton></Link>
    } />}>
      <div className="mb-6 grid gap-3 sm:grid-cols-2">
        <Button variant="primary" size="lg" onClick={() => navigate(`/sites/${siteId}/observe`)}><PlusIcon width={20} height={20} /> Make observation</Button>
        <Button variant="secondary" size="lg" onClick={() => navigate(`/sites/${siteId}/export`)}><ExportIcon width={20} height={20} /> Export to lead</Button>
      </div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h1 className="text-lg font-semibold">Recorded log</h1>
        {observations && <span className="text-xs text-[var(--text-3)]">{observations.length} {observations.length === 1 ? 'entry' : 'entries'} · newest first</span>}
      </div>
      {observations === undefined ? <p className="text-sm text-[var(--text-3)]">Loading entries…</p> : newest.length === 0 ? (
        <EmptyState title="No entries yet">Choose Make observation to document equipment. Your entries will appear here.</EmptyState>
      ) : <ul className="flex flex-col gap-3">
        {newest.map((observation) => {
          const photos = thumbs.get(observation.id) ?? []
          return <li key={observation.id}>
            <Link to={`/sites/${siteId}/observations/${observation.id}`} className="block rounded-2xl focus-visible:outline-2 focus-visible:outline-brand-500">
              <Card className="flex items-center gap-3 p-3 transition hover:border-brand-400">
                {photos.length > 0 && <Thumb blob={photos[0]?.thumb ?? photos[0]?.image} className="h-16 w-16 shrink-0" alt={`Photo of ${observation.name}`} />}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-brand-600">{systems?.find((system) => system.id === observation.systemId)?.name || observation.systemName}</p>
                  <h2 className="break-words font-semibold">{observation.name}</h2>
                  {observation.location && <p className="break-words text-xs text-[var(--text-2)]">{observation.location}</p>}
                  <p className="mt-1 text-xs text-[var(--text-3)]">{formatDateTime(observation.createdAt)} · {plural(photos.length, 'photo')}</p>
                </div>
              </Card>
            </Link>
          </li>
        })}
      </ul>}
    </Page>
  )
}
