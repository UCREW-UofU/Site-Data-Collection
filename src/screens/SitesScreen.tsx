import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useSites } from '@/app/queries'
import { useSettings } from '@/app/settings'
import { createSite } from '@/db/repo'
import { formatDate } from '@/lib/format'
import { Button, Card, EmptyState, IconButton, TextField } from '@/ui/kit'
import { Page, TopBar } from '@/ui/nav'
import { Sheet } from '@/ui/Sheet'
import { MergeIcon, PlusIcon, SettingsIcon, TagIcon } from '@/ui/icons'

export function SitesScreen() {
  const sites = useSites()
  const navigate = useNavigate()
  const { settings } = useSettings()
  const [creating, setCreating] = useState(false)

  return (
    <Page
      topBar={
        <TopBar
          title="Site Collect"
          subtitle={settings.personName ? `You: ${settings.personName}` : 'Set your name in Settings'}
          right={
            <Link to="/settings" aria-label="Settings">
              <IconButton>
                <SettingsIcon />
              </IconButton>
            </Link>
          }
        />
      }
    >
      {!settings.personName && (
        <Card className="mb-3 p-3 text-sm">
          <p className="text-[var(--text-2)]">
            Add your name so your photos are attributed to you when the team merges.
          </p>
          <Button
            variant="primary"
            className="mt-2"
            onClick={() => navigate('/settings')}
          >
            Set my name
          </Button>
        </Card>
      )}

      <div className="mb-3 flex items-center justify-between">
        <h1 className="text-lg font-semibold">Sites</h1>
        <Button variant="primary" onClick={() => setCreating(true)}>
          <PlusIcon width={18} height={18} /> New site
        </Button>
      </div>

      {sites === undefined ? null : sites.length === 0 ? (
        <EmptyState icon={<TagIcon width={40} height={40} />} title="No sites yet">
          Create a site for the building you're assessing.
        </EmptyState>
      ) : (
        <ul className="flex flex-col gap-2">
          {sites.map((s) => (
            <li key={s.id}>
              <Link to={`/sites/${s.id}/board`}>
                <Card className="p-3.5 transition hover:border-brand-400">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate font-semibold text-[var(--text)]">
                      {s.name || s.code || 'Untitled site'}
                    </span>
                    <span className="shrink-0 text-xs text-[var(--text-3)]">
                      {formatDate(s.assessmentDate ?? s.createdAt)}
                    </span>
                  </div>
                  <div className="mt-0.5 truncate text-sm text-[var(--text-3)]">
                    {s.code}
                    {s.address ? ` · ${s.address}` : ''}
                  </div>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Card className="mt-6 p-4">
        <h2 className="text-sm font-semibold">Running the merge?</h2>
        <p className="mt-1 text-xs text-[var(--text-3)]">
          On a desktop, combine everyone's exported bundles into one organized
          folder + spreadsheet, and give the assessment its final name.
        </p>
        <Button
          variant="secondary"
          className="mt-3 w-full"
          onClick={() => navigate('/merge')}
        >
          <MergeIcon width={18} height={18} /> Merge team bundles
        </Button>
      </Card>

      <CreateSiteSheet
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={(id) => navigate(`/sites/${id}/setup`)}
      />
    </Page>
  )
}

function CreateSiteSheet({
  open,
  onClose,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  onCreated: (siteId: string) => void
}) {
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [address, setAddress] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [busy, setBusy] = useState(false)

  const reset = () => {
    setName('')
    setCode('')
    setAddress('')
    setDate(new Date().toISOString().slice(0, 10))
  }

  const submit = async () => {
    if (!name.trim() && !code.trim()) return
    setBusy(true)
    try {
      const site = await createSite({
        name,
        code: code.trim() || name.trim(),
        address,
        assessmentDate: date || null,
      })
      reset()
      onClose()
      onCreated(site.id)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="New site"
      footer={
        <Button
          variant="primary"
          size="lg"
          className="w-full"
          disabled={busy || (!name.trim() && !code.trim())}
          onClick={submit}
        >
          Create site
        </Button>
      }
    >
      <div className="flex flex-col gap-3">
        <TextField
          label="Building / site name"
          placeholder="Chemistry Building"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />
        <TextField
          label="Site code"
          hint="Used for the export folder. Grant prefix + year + short name."
          placeholder="UU-2026-ChemBldg"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
        <TextField
          label="Address (optional)"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />
        <TextField
          label="Assessment date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>
    </Sheet>
  )
}
