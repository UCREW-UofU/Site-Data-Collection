import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useCountsBySystem, useObservations, useSite, useSystems } from '@/app/queries'
import { useSettings } from '@/app/settings'
import { createSystem } from '@/db/repo'
import { plural } from '@/lib/format'
import { Banner, Button, Card, EmptyState, IconButton, TextField } from '@/ui/kit'
import { Page, TopBar } from '@/ui/nav'
import { Sheet } from '@/ui/Sheet'
import { AlertIcon, ChevronRightIcon, PlusIcon, SettingsIcon, TagIcon } from '@/ui/icons'

export function SystemsBoardScreen() {
  const { siteId = '' } = useParams()
  const site = useSite(siteId)
  const systems = useSystems(siteId)
  const counts = useCountsBySystem(siteId)
  const observations = useObservations(siteId)
  const { settings } = useSettings()
  const navigate = useNavigate()
  const [adding, setAdding] = useState(false)

  const active = (systems ?? []).filter((s) => s.active)
  const totalObs = observations?.length ?? 0
  const totalPhotos = [...counts.values()].reduce((n, c) => n + c.photos, 0)

  return (
    <Page
      siteId={siteId}
      topBar={
        <TopBar
          title={site?.name || site?.code || 'Site'}
          subtitle={`${plural(totalObs, 'observation')} · ${plural(totalPhotos, 'photo')}`}
          back="/"
          right={
            <Link to={`/sites/${siteId}/setup`} aria-label="Site setup">
              <IconButton>
                <SettingsIcon />
              </IconButton>
            </Link>
          }
        />
      }
    >
      {!settings.personName && (
        <Banner tone="warn">
          <AlertIcon width={18} height={18} className="mt-0.5 shrink-0" />
          <span>
            Your name isn't set — observations won't be attributed to you at merge.{' '}
            <button className="underline" onClick={() => navigate('/settings')}>
              Fix it
            </button>
          </span>
        </Banner>
      )}

      <div className="mb-2 mt-3 flex items-center justify-between">
        <h1 className="text-lg font-semibold">Systems</h1>
      </div>

      {systems === undefined ? null : active.length === 0 ? (
        <EmptyState icon={<TagIcon width={40} height={40} />} title="No active systems">
          Turn systems on in Setup, or add one below.
        </EmptyState>
      ) : (
        <ul className="flex flex-col gap-2">
          {active.map((s) => {
            const c = counts.get(s.id)
            return (
              <li key={s.id}>
                <Link to={`/sites/${siteId}/systems/${s.id}`}>
                  <Card className="flex items-center gap-3 p-4 transition hover:border-brand-400">
                    <div className="min-w-0 flex-1">
                      <div className="text-base font-semibold text-[var(--text)]">
                        {s.name}
                      </div>
                      <div className="text-xs text-[var(--text-3)]">
                        {c?.observations
                          ? `${plural(c.observations, 'observation')} · ${plural(c.photos, 'photo')}`
                          : 'No observations yet'}
                        {s.origin === 'field' && ' · added on site'}
                      </div>
                    </div>
                    <ChevronRightIcon className="text-[var(--text-3)]" />
                  </Card>
                </Link>
              </li>
            )
          })}
        </ul>
      )}

      <Button
        variant="secondary"
        className="mt-3 w-full"
        onClick={() => setAdding(true)}
      >
        <PlusIcon width={18} height={18} /> Add a new system
      </Button>

      <AddSystemSheet
        open={adding}
        onClose={() => setAdding(false)}
        onAdd={async (name) => {
          const sys = await createSystem({ siteId, name, origin: 'field' })
          setAdding(false)
          navigate(`/sites/${siteId}/systems/${sys.id}`)
        }}
      />
    </Page>
  )
}

function AddSystemSheet({
  open,
  onClose,
  onAdd,
}: {
  open: boolean
  onClose: () => void
  onAdd: (name: string) => void
}) {
  const [name, setName] = useState('')
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Add a system"
      footer={
        <Button
          variant="primary"
          size="lg"
          className="w-full"
          disabled={!name.trim()}
          onClick={() => onAdd(name.trim())}
        >
          Add system
        </Button>
      }
    >
      <TextField
        label="System name"
        hint="A high-level category, e.g. Refrigeration, Smeltery, Wastewater"
        placeholder="Smeltery"
        value={name}
        onChange={(e) => setName(e.target.value)}
        autoFocus
      />
    </Sheet>
  )
}
