import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useCountsBySystem, useSite, useSystems } from '@/app/queries'
import {
  createSystem,
  deleteSystem,
  ensureDefaultSystems,
  setSystemActive,
  updateSite,
  updateSystem,
} from '@/db/repo'
import type { System } from '@/db/types'
import { plural } from '@/lib/format'
import { Button, Card, TextArea, TextField } from '@/ui/kit'
import { Page, TopBar } from '@/ui/nav'
import { Sheet } from '@/ui/Sheet'
import { PlusIcon, TrashIcon } from '@/ui/icons'

export function SiteSetupScreen() {
  const { siteId = '' } = useParams()
  const site = useSite(siteId)
  const systems = useSystems(siteId)
  const counts = useCountsBySystem(siteId)
  const [adding, setAdding] = useState(false)
  const [renaming, setRenaming] = useState<System | null>(null)
  const [showSiteInfo, setShowSiteInfo] = useState(false)

  // Backfill the built-in systems (also covers the v1→v2 migration).
  useEffect(() => {
    if (siteId) void ensureDefaultSystems(siteId)
  }, [siteId])

  const activeCount = (systems ?? []).filter((s) => s.active).length

  return (
    <Page
      siteId={siteId}
      topBar={<TopBar title="Setup" subtitle={site?.name || site?.code} back={`/sites/${siteId}/board`} />}
    >
      <Card className="mb-3 p-3 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-[var(--text-2)]">
            {plural(activeCount, 'system')} active of {(systems ?? []).length}
          </span>
          <div className="flex gap-3">
            <button className="text-brand-600 underline" onClick={() => setShowSiteInfo(true)}>
              Site info
            </button>
            <Link
              to={`/sites/${siteId}/system-sheet`}
              className="text-brand-600 underline"
            >
              Printable list
            </Link>
          </div>
        </div>
        <p className="mt-1 text-xs text-[var(--text-3)]">
          Switch on the systems this site has, and add any that are missing.
        </p>
      </Card>

      <ul className="flex flex-col gap-2">
        {(systems ?? []).map((s) => {
          const used = counts.get(s.id)?.observations ?? 0
          return (
            <li key={s.id}>
              <Card className="flex items-center gap-3 p-3">
                <button
                  type="button"
                  onClick={() => setRenaming(s)}
                  className="min-w-0 flex-1 text-left"
                >
                  <div className="text-sm font-semibold text-[var(--text)]">{s.name}</div>
                  <div className="text-xs text-[var(--text-3)]">
                    {s.origin === 'default' ? 'Built-in' : s.origin === 'field' ? 'Added on site' : 'Added by lead'}
                    {used > 0 && ` · ${plural(used, 'observation')}`}
                  </div>
                </button>
                <Toggle
                  on={s.active}
                  onChange={(on) => setSystemActive(s.id, on)}
                />
              </Card>
            </li>
          )
        })}
      </ul>

      <Button variant="secondary" className="mt-3 w-full" onClick={() => setAdding(true)}>
        <PlusIcon width={18} height={18} /> Add a system
      </Button>

      {adding && (
        <NameSheet
          title="Add a system"
          hint="A high-level category, e.g. Refrigeration, Smeltery, Wastewater"
          onClose={() => setAdding(false)}
          onSave={async (name) => {
            await createSystem({ siteId, name, origin: 'lead' })
            setAdding(false)
          }}
        />
      )}

      {renaming && (
        <NameSheet
          title="Rename system"
          initial={renaming.name}
          onClose={() => setRenaming(null)}
          onSave={async (name) => {
            await updateSystem(renaming.id, { name })
            setRenaming(null)
          }}
          onDelete={
            renaming.origin === 'default'
              ? undefined
              : async () => {
                  const n = counts.get(renaming.id)?.observations ?? 0
                  if (
                    n > 0 &&
                    !confirm(`Delete "${renaming.name}" and its ${n} observation(s)?`)
                  )
                    return
                  await deleteSystem(renaming.id)
                  setRenaming(null)
                }
          }
        />
      )}

      {showSiteInfo && site && (
        <SiteInfoSheet site={site} onClose={() => setShowSiteInfo(false)} />
      )}
    </Page>
  )
}

function Toggle({ on, onChange }: { on: boolean; onChange: (on: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className={`relative h-7 w-12 shrink-0 rounded-full transition ${
        on ? 'bg-brand-500' : 'bg-[var(--surface-3)]'
      }`}
    >
      <span
        className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition ${
          on ? 'left-[22px]' : 'left-0.5'
        }`}
      />
    </button>
  )
}

function NameSheet({
  title,
  hint,
  initial = '',
  onClose,
  onSave,
  onDelete,
}: {
  title: string
  hint?: string
  initial?: string
  onClose: () => void
  onSave: (name: string) => void
  onDelete?: () => void
}) {
  const [name, setName] = useState(initial)
  return (
    <Sheet
      open
      onClose={onClose}
      title={title}
      footer={
        <div className="flex gap-2">
          {onDelete && (
            <Button variant="danger" onClick={onDelete}>
              <TrashIcon width={18} height={18} />
            </Button>
          )}
          <Button
            variant="primary"
            size="lg"
            className="flex-1"
            disabled={!name.trim()}
            onClick={() => onSave(name.trim())}
          >
            Save
          </Button>
        </div>
      }
    >
      <TextField
        label="System name"
        hint={hint}
        value={name}
        onChange={(e) => setName(e.target.value)}
        autoFocus
      />
    </Sheet>
  )
}

function SiteInfoSheet({
  site,
  onClose,
}: {
  site: {
    id: string
    name: string
    code: string
    address: string
    notes: string
    assessmentDate: string | null
    leadEmail: string
  }
  onClose: () => void
}) {
  const [name, setName] = useState(site.name)
  const [code, setCode] = useState(site.code)
  const [address, setAddress] = useState(site.address)
  const [notes, setNotes] = useState(site.notes)
  const [date, setDate] = useState(site.assessmentDate ?? '')
  const [leadEmail, setLeadEmail] = useState(site.leadEmail ?? '')
  const [busy, setBusy] = useState(false)

  const save = async () => {
    setBusy(true)
    try {
      await updateSite(site.id, {
        name,
        code,
        address,
        notes,
        assessmentDate: date || null,
        leadEmail: leadEmail.trim(),
      })
      onClose()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title="Site info"
      footer={
        <Button variant="primary" size="lg" className="w-full" onClick={save} disabled={busy}>
          Save
        </Button>
      }
    >
      <div className="flex flex-col gap-3">
        <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <TextField label="Site code" value={code} onChange={(e) => setCode(e.target.value)} />
        <TextField label="Address" value={address} onChange={(e) => setAddress(e.target.value)} />
        <TextField
          label="Assessment date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <TextField
          label="Lead email"
          type="email"
          hint="Where “Email to lead” sends bundles from this device."
          placeholder="lead@example.com"
          value={leadEmail}
          onChange={(e) => setLeadEmail(e.target.value)}
        />
        <TextArea label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
    </Sheet>
  )
}
