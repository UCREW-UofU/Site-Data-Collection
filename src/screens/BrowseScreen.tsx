import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useObservations } from '@/app/queries'
import { useObservationPhotosMap } from '@/app/observationThumbs'
import { useSettings } from '@/app/settings'
import { plural } from '@/lib/format'
import { groupBySystem } from '@/lib/systems'
import { Chip, EmptyState } from '@/ui/kit'
import { Page, TopBar } from '@/ui/nav'
import { Thumb } from '@/ui/Thumb'
import { GridIcon } from '@/ui/icons'

export function BrowseScreen() {
  const { siteId = '' } = useParams()
  const observations = useObservations(siteId)
  const photoMap = useObservationPhotosMap(observations)
  const { settings } = useSettings()
  const navigate = useNavigate()
  const [scope, setScope] = useState<'all' | 'mine'>('all')

  const visible = useMemo(
    () =>
      (observations ?? []).filter(
        (o) => scope === 'all' || o.deviceId === settings.deviceId,
      ),
    [observations, scope, settings.deviceId],
  )

  const groups = useMemo(
    () => groupBySystem(visible, (o) => o.systemName),
    [visible],
  )

  const photoTotal = visible.reduce((n, o) => n + (photoMap.get(o.id)?.length ?? 0), 0)

  return (
    <Page
      siteId={siteId}
      topBar={
        <TopBar
          title="Photos"
          subtitle={`${plural(visible.length, 'observation')} · ${plural(photoTotal, 'photo')}`}
          back={`/sites/${siteId}/board`}
        />
      }
    >
      <div className="mb-3 flex gap-1.5">
        <Chip active={scope === 'all'} onClick={() => setScope('all')}>
          Everyone
        </Chip>
        <Chip active={scope === 'mine'} onClick={() => setScope('mine')}>
          Just mine
        </Chip>
      </div>

      {observations === undefined ? null : visible.length === 0 ? (
        <EmptyState icon={<GridIcon width={40} height={40} />} title="Nothing here yet">
          {scope === 'mine'
            ? "You haven't recorded any observations on this site."
            : 'No observations recorded yet.'}
        </EmptyState>
      ) : (
        <div className="flex flex-col gap-5">
          {groups.map((g) => (
            <section key={g.norm}>
              <h2 className="mb-1.5 text-sm font-semibold">
                {g.system}{' '}
                <span className="font-normal text-[var(--text-3)]">
                  · {plural(g.items.length, 'observation')}
                </span>
              </h2>
              <div className="flex flex-col gap-2">
                {g.items.map((o) => {
                  const ps = photoMap.get(o.id) ?? []
                  return (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => navigate(`/sites/${siteId}/observations/${o.id}`)}
                      className="flex gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2 text-left transition hover:border-brand-400"
                    >
                      <div className="flex shrink-0 gap-1">
                        {ps.slice(0, 3).map((p) => (
                          <Thumb key={p.id} blob={p.thumb ?? p.image} className="h-14 w-14" alt="" />
                        ))}
                        {ps.length === 0 && (
                          <Thumb blob={null} className="h-14 w-14" alt="" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1 py-0.5">
                        <div className="truncate text-sm font-medium">{o.name}</div>
                        {o.note && (
                          <div className="line-clamp-1 text-xs text-[var(--text-3)]">
                            {o.note}
                          </div>
                        )}
                        <div className="mt-0.5 text-[11px] text-[var(--text-3)]">
                          {plural(ps.length, 'photo')} · {o.capturedBy}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </Page>
  )
}
