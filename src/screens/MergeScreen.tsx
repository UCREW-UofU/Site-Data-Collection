import { useEffect, useMemo, useRef, useState } from 'react'
import type { Site } from '@/db/types'
import { SCHEMA_VERSION } from '@/db/types'
import { saveOrShare } from '@/lib/download'
import { formatBytes, plural } from '@/lib/format'
import { buildOutputZip, loadBundles, mergeBundles, type MergeResult } from '@/lib/merge'
import type { ParsedBundle } from '@/lib/bundle'
import { normalizeSystemName, type RenameRule } from '@/lib/systems'
import { Banner, Button, Card, EmptyState, TextField } from '@/ui/kit'
import { Page, TopBar } from '@/ui/nav'
import { AlertIcon, MergeIcon, PlusIcon, TrashIcon } from '@/ui/icons'
import { useToast } from '@/ui/toast'

function blankSite(): Site {
  return {
    id: crypto.randomUUID(),
    code: '',
    name: '',
    address: '',
    notes: '',
    assessmentDate: null,
    leadEmail: '',
    createdBy: '',
    createdAt: new Date().toISOString(),
    schemaVersion: SCHEMA_VERSION,
  }
}

export function MergeScreen() {
  const toast = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const [bundles, setBundles] = useState<ParsedBundle[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const [rules, setRules] = useState<RenameRule[]>([])
  const [loading, setLoading] = useState(false)
  const [building, setBuilding] = useState(false)
  const [siteName, setSiteName] = useState('')
  const [siteCode, setSiteCode] = useState('')
  const [nameTouched, setNameTouched] = useState(false)

  const result: MergeResult | null = useMemo(
    () => (bundles.length ? mergeBundles(bundles, cleanRules(rules)) : null),
    [bundles, rules],
  )

  // Prefill the assessment name/code from whatever the bundles came in with,
  // but stop as soon as the lead types something — their word is final.
  useEffect(() => {
    if (result && !nameTouched) {
      setSiteName(result.site?.name ?? '')
      setSiteCode(result.site?.code ?? '')
    }
  }, [result, nameTouched])

  const addFiles = async (files: File[]) => {
    const zips = files.filter((f) => /\.zip$/i.test(f.name))
    if (!zips.length) return
    setLoading(true)
    setErrors([])
    const loaded: ParsedBundle[] = []
    const errs: string[] = []
    for (const f of zips) {
      try {
        const [b] = await loadBundles([f])
        const key = (x: ParsedBundle) => x.manifest.device.id + x.manifest.exportedAt
        if ([...bundles, ...loaded].some((x) => key(x) === key(b))) {
          errs.push(`${f.name}: already loaded (same device + export time)`)
        } else {
          loaded.push(b)
        }
      } catch (e) {
        errs.push((e as Error).message)
      }
    }
    setBundles((prev) => [...prev, ...loaded])
    setErrors(errs)
    setLoading(false)
    if (loaded.length) toast.show(`Loaded ${plural(loaded.length, 'bundle')}`)
  }

  const generate = async () => {
    if (!result) return
    const name = siteName.trim()
    const code = siteCode.trim()
    const finalResult: MergeResult = {
      ...result,
      site: { ...(result.site ?? blankSite()), name: name || result.site?.name || code, code: code || name },
    }
    setBuilding(true)
    try {
      const { blob, filename } = await buildOutputZip(finalResult)
      await saveOrShare(blob, filename, 'Merged assessment photos')
      toast.show(`Built ${filename} (${formatBytes(blob.size)})`)
    } catch (e) {
      console.error(e)
      toast.show('Merge build failed', 'error')
    } finally {
      setBuilding(false)
    }
  }

  const reset = () => {
    setBundles([])
    setRules([])
    setErrors([])
    setSiteName('')
    setSiteCode('')
    setNameTouched(false)
  }

  const canGenerate = Boolean(siteName.trim() || siteCode.trim())

  return (
    <Page topBar={<TopBar title="Merge team bundles" back="/" />}>
      <div className="mx-auto flex max-w-2xl flex-col gap-4">
        <input
          ref={fileRef}
          type="file"
          accept=".zip"
          multiple
          className="hidden"
          onChange={(e) => {
            const fs = Array.from(e.target.files ?? [])
            if (fs.length) void addFiles(fs)
            e.target.value = ''
          }}
        />

        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault()
            void addFiles(Array.from(e.dataTransfer.files))
          }}
          className="rounded-2xl border-2 border-dashed border-[var(--border)] bg-[var(--surface)] p-6 text-center"
        >
          <MergeIcon width={36} height={36} className="mx-auto text-[var(--text-3)]" />
          <p className="mt-2 text-sm text-[var(--text-2)]">
            Drop every teammate's <span className="font-mono">.sitecollect.zip</span> here
          </p>
          <Button variant="secondary" className="mt-3" onClick={() => fileRef.current?.click()}>
            Choose bundle files
          </Button>
        </div>

        {loading && <p className="text-center text-sm text-[var(--text-3)]">Reading bundles…</p>}

        {errors.length > 0 && (
          <Banner tone="error">
            <div className="flex flex-col gap-1">
              {errors.map((e, i) => (
                <span key={i}>{e}</span>
              ))}
            </div>
          </Banner>
        )}

        {!result ? (
          bundles.length === 0 &&
          !loading && (
            <EmptyState title="No bundles loaded">
              This runs entirely in your browser — bundles are never uploaded anywhere.
            </EmptyState>
          )
        ) : (
          <>
            <BundleList result={result} onReset={reset} />
            {result.siteConflicts.length > 0 && (
              <Banner tone="warn">
                <AlertIcon width={18} height={18} className="mt-0.5 shrink-0" />
                <span>
                  Bundles reference different site codes: {result.site?.code},{' '}
                  {result.siteConflicts.join(', ')}. All of it merges together
                  regardless — set the real name below.
                </span>
              </Banner>
            )}

            <Card className="p-4">
              <h2 className="text-sm font-semibold">Name this assessment</h2>
              <p className="mt-1 text-xs text-[var(--text-3)]">
                Sets the folder and file names for the merged output — your call,
                regardless of what individual phones had it named.
              </p>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <TextField
                  label="Name"
                  placeholder="Chemistry Building"
                  value={siteName}
                  onChange={(e) => {
                    setSiteName(e.target.value)
                    setNameTouched(true)
                  }}
                />
                <TextField
                  label="Site code"
                  placeholder="UU-2026-ChemBldg"
                  value={siteCode}
                  onChange={(e) => {
                    setSiteCode(e.target.value)
                    setNameTouched(true)
                  }}
                />
              </div>
            </Card>

            <SystemUsageTable
              result={result}
              rules={rules}
              onAddRule={(from, to) => setRules((r) => [...r, { from, to }])}
            />

            <RuleEditor
              rules={rules}
              systems={result.systemUsage.map((u) => u.system)}
              onChange={setRules}
            />

            <div className="sticky bottom-3">
              <Button
                variant="primary"
                size="lg"
                className="w-full shadow-lg"
                onClick={generate}
                disabled={building || result.totals.photos === 0 || !canGenerate}
              >
                {building
                  ? 'Building…'
                  : `Generate merged ZIP · ${plural(result.totals.observations, 'observation')}`}
              </Button>
            </div>
          </>
        )}
      </div>
    </Page>
  )
}

function cleanRules(rules: RenameRule[]): RenameRule[] {
  return rules.filter((r) => normalizeSystemName(r.from) && r.to.trim())
}

function BundleList({ result, onReset }: { result: MergeResult; onReset: () => void }) {
  return (
    <Card className="p-3">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold">
          {plural(result.bundles.length, 'bundle')} · {result.totals.observations} observations ·{' '}
          {result.totals.photos} photos · {result.totals.systems} systems
        </h2>
        <button className="text-xs text-[var(--text-3)] underline" onClick={onReset}>
          Clear
        </button>
      </div>
      <ul className="flex flex-col gap-1 text-sm">
        {result.bundles.map((b, i) => (
          <li key={i} className="flex justify-between">
            <span className="truncate text-[var(--text-2)]">
              {b.person}
              <span className="text-[var(--text-3)]"> · {b.name}</span>
            </span>
            <span className="shrink-0 text-[var(--text-3)]">
              {plural(b.observationCount, 'obs')}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  )
}

function SystemUsageTable({
  result,
  rules,
  onAddRule,
}: {
  result: MergeResult
  rules: RenameRule[]
  onAddRule: (from: string, to: string) => void
}) {
  const targets = [...new Set(result.systemUsage.map((u) => u.system))]
  return (
    <Card className="overflow-hidden">
      <div className="border-b border-[var(--border)] px-3 py-2">
        <h2 className="text-sm font-semibold">System usage</h2>
        <p className="text-xs text-[var(--text-3)]">
          Check for the same system typed two ways (e.g. “Compressed Air” vs “Air
          Compressor”). Use the dropdown to fold one into another.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-[var(--text-3)]">
            <tr>
              <th className="px-3 py-1.5 font-medium">System</th>
              <th className="px-2 py-1.5 font-medium">Obs</th>
              <th className="px-2 py-1.5 font-medium">Photos</th>
              <th className="px-2 py-1.5 font-medium">Fold into</th>
            </tr>
          </thead>
          <tbody>
            {result.systemUsage.map((u) => {
              const active = rules.find(
                (r) => normalizeSystemName(r.from) === normalizeSystemName(u.system),
              )
              return (
                <tr key={u.system} className="border-t border-[var(--border)]">
                  <td className="px-3 py-1.5">
                    {u.system}
                    {u.renamedTo && (
                      <span className="text-[var(--text-3)]"> → {u.renamedTo}</span>
                    )}
                  </td>
                  <td className="px-2 py-1.5">{u.observations}</td>
                  <td className="px-2 py-1.5">{u.photos}</td>
                  <td className="px-2 py-1.5">
                    <select
                      value={active?.to ?? ''}
                      onChange={(e) => e.target.value && onAddRule(u.system, e.target.value)}
                      className="rounded border border-[var(--border)] bg-[var(--surface)] px-1 py-0.5 text-xs"
                    >
                      <option value="">—</option>
                      {targets
                        .filter(
                          (t) => normalizeSystemName(t) !== normalizeSystemName(u.system),
                        )
                        .map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                    </select>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

function RuleEditor({
  rules,
  systems,
  onChange,
}: {
  rules: RenameRule[]
  systems: string[]
  onChange: (rules: RenameRule[]) => void
}) {
  if (rules.length === 0) return null
  return (
    <Card className="p-3">
      <h2 className="mb-2 text-sm font-semibold">Fold rules</h2>
      <ul className="flex flex-col gap-2">
        {rules.map((r, i) => (
          <li key={i} className="flex items-center gap-2 text-sm">
            <input
              value={r.from}
              onChange={(e) => {
                const next = [...rules]
                next[i] = { ...r, from: e.target.value }
                onChange(next)
              }}
              list="merge-systems"
              className="w-32 rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-xs"
            />
            <span className="text-[var(--text-3)]">→</span>
            <input
              value={r.to}
              onChange={(e) => {
                const next = [...rules]
                next[i] = { ...r, to: e.target.value }
                onChange(next)
              }}
              list="merge-systems"
              className="w-32 rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-xs"
            />
            <button
              onClick={() => onChange(rules.filter((_, j) => j !== i))}
              className="text-[var(--text-3)]"
              aria-label="Remove rule"
            >
              <TrashIcon width={16} height={16} />
            </button>
          </li>
        ))}
      </ul>
      <datalist id="merge-systems">
        {systems.map((t) => (
          <option key={t} value={t} />
        ))}
      </datalist>
      <Button
        variant="ghost"
        className="mt-2 h-9"
        onClick={() => onChange([...rules, { from: '', to: '' }])}
      >
        <PlusIcon width={16} height={16} /> Add rule
      </Button>
    </Card>
  )
}
