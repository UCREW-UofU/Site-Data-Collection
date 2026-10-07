import { useNavigate, useParams } from 'react-router-dom'
import { useObservationPhotosMap } from '@/app/observationThumbs'
import { useSystem, useSystemObservations } from '@/app/queries'
import { formatDateTime, plural } from '@/lib/format'
import { Button, Card, EmptyState } from '@/ui/kit'
import { Page, TopBar } from '@/ui/nav'
import { Thumb } from '@/ui/Thumb'
import { CameraIcon, GridIcon } from '@/ui/icons'

export function SystemScreen() {
  const { siteId = '', systemId = '' } = useParams()
  const system = useSystem(systemId)
  const observations = useSystemObservations(siteId, systemId)
  const thumbs = useObservationPhotosMap(observations)
  const navigate = useNavigate()

  return (
    <Page
      siteId={siteId}
      topBar={
        <TopBar
          title={system?.name || 'System'}
          subtitle={
            observations ? plural(observations.length, 'observation') : undefined
          }
          back={`/sites/${siteId}/board`}
        />
      }
    >
      <Button
        variant="primary"
        size="lg"
        className="mb-4 w-full"
        onClick={() => navigate(`/sites/${siteId}/systems/${systemId}/new`)}
      >
        <CameraIcon width={20} height={20} /> Add observation
      </Button>

      {observations === undefined ? null : observations.length === 0 ? (
        <EmptyState icon={<GridIcon width={40} height={40} />} title="No observations yet">
          Tap “Add observation” to photograph a piece of equipment in this system
          and describe what it does.
        </EmptyState>
      ) : (
        <ul className="flex flex-col gap-2">
          {observations.map((o) => {
            const ps = thumbs.get(o.id) ?? []
            return (
              <li key={o.id}>
                <button
                  type="button"
                  onClick={() => navigate(`/sites/${siteId}/observations/${o.id}`)}
                  className="w-full text-left"
                >
                  <Card className="flex gap-3 p-2.5 transition hover:border-brand-400">
                    <Thumb
                      blob={ps[0]?.thumb ?? ps[0]?.image}
                      className="h-16 w-16 shrink-0"
                      alt=""
                    />
                    <div className="min-w-0 flex-1 py-0.5">
                      <div className="truncate text-sm font-semibold text-[var(--text)]">
                        {o.name}
                      </div>
                      {o.note && (
                        <div className="line-clamp-2 text-xs text-[var(--text-3)]">
                          {o.note}
                        </div>
                      )}
                      <div className="mt-0.5 text-[11px] text-[var(--text-3)]">
                        {plural(ps.length, 'photo')} · {o.capturedBy} ·{' '}
                        {formatDateTime(o.updatedAt)}
                      </div>
                    </div>
                  </Card>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </Page>
  )
}
