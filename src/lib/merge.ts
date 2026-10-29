import JSZip from 'jszip'
import type { Observation, Site, System } from '@/db/types'
import { buildPhotoFilename, extForBlob } from './filenames'
import {
  applyRenameRules,
  normalizeSystemName,
  safeFolderName,
  SYSTEM_UNASSIGNED,
  type RenameRule,
} from './systems'
import { parseBundle, type BundlePhoto, type ParsedBundle } from './bundle'
import { buildIndexWorkbook } from './xlsx'
import { observationText } from './equipment'

export interface MergedPhoto {
  photo: BundlePhoto
  image: Blob
  thumb: Blob | null
  original: Blob | null
  sourceBundle: string
  capturedBy: string
  system: string // final display name (after rename rules)
  observation: string // display name
  location: string // equipment location; blank for older records
  folder: string // "<System>/<Observation — Location>"; location omitted when blank
  filename: string
}

export interface MergedObservation {
  system: string
  name: string
  location: string
  note: string
  contributors: string[]
  photoCount: number
  folder: string
}

export interface SystemUsageRow {
  system: string // display (pre-rename)
  observations: number
  photos: number
  contributors: string[]
  bundles: string[]
  renamedTo: string | null
}

export interface BundleSummary {
  name: string
  person: string
  device: string
  photoCount: number
  observationCount: number
  siteCode: string
}

export interface MergeResult {
  site: Site | null
  siteConflicts: string[]
  bundles: BundleSummary[]
  systems: System[]
  observations: MergedObservation[]
  photos: MergedPhoto[]
  systemUsage: SystemUsageRow[]
  totals: { photos: number; observations: number; systems: number; bundles: number }
}

export async function loadBundles(files: File[]): Promise<ParsedBundle[]> {
  const out: ParsedBundle[] = []
  for (const f of files) out.push(await parseBundle(f, f.name))
  return out
}

function unionSystems(bundles: ParsedBundle[]): Map<string, System> {
  const byName = new Map<string, System>()
  for (const b of bundles) {
    for (const s of b.manifest.systems) {
      const key = s.normalizedName || normalizeSystemName(s.name)
      if (!key) continue
      const existing = byName.get(key)
      if (!existing) {
        byName.set(key, s)
      } else if (existing.origin === 'field' && s.origin !== 'field') {
        byName.set(key, s)
      } else if (s.active && !existing.active) {
        byName.set(key, { ...existing, active: true })
      }
    }
  }
  return byName
}

export function mergeBundles(bundles: ParsedBundle[], rules: RenameRule[] = []): MergeResult {
  const systemsByName = unionSystems(bundles)

  const site = bundles[0]?.manifest.site ?? null
  const siteConflicts = [
    ...new Set(
      bundles
        .map((b) => b.manifest.site?.code)
        .filter((c): c is string => Boolean(c) && c !== site?.code),
    ),
  ]

  const bundleSummaries: BundleSummary[] = bundles.map((b) => ({
    name: b.sourceName,
    person: b.manifest.device.person || b.manifest.device.label,
    device: b.manifest.device.label,
    photoCount: b.manifest.photos.length,
    observationCount: b.manifest.observations.length,
    siteCode: b.manifest.site?.code ?? '',
  }))

  // Flatten photos, resolving each to its observation + raw system name.
  type Row = {
    photo: BundlePhoto
    parsed: ParsedBundle
    obs: Observation | undefined
    rawSystem: string
    capturedBy: string
  }
  const rows: Row[] = []
  for (const b of bundles) {
    const obsById = new Map(b.manifest.observations.map((o) => [o.id, o]))
    const sysById = new Map(b.manifest.systems.map((s) => [s.id, s]))
    for (const photo of b.manifest.photos) {
      if (!b.blobs.has(photo.id)) continue
      const obs = obsById.get(photo.observationId)
      const rawSystem =
        obs?.systemName || sysById.get(photo.systemId)?.name || SYSTEM_UNASSIGNED
      rows.push({
        photo,
        parsed: b,
        obs,
        rawSystem,
        capturedBy: obs?.capturedBy || b.manifest.device.person || b.manifest.device.label,
      })
    }
  }

  // System usage (pre-rename), for the report.
  const usage = new Map<string, SystemUsageRow>()
  for (const b of bundles) {
    const sysById = new Map(b.manifest.systems.map((s) => [s.id, s]))
    const obsPhotoCount = new Map<string, number>()
    for (const p of b.manifest.photos) {
      obsPhotoCount.set(p.observationId, (obsPhotoCount.get(p.observationId) ?? 0) + 1)
    }
    for (const o of b.manifest.observations) {
      const rawSystem = o.systemName || sysById.get(o.systemId)?.name || SYSTEM_UNASSIGNED
      const key = normalizeSystemName(rawSystem)
      let row = usage.get(key)
      if (!row) {
        const renamed = applyRenameRules(rawSystem, rules)
        row = {
          system: rawSystem,
          observations: 0,
          photos: 0,
          contributors: [],
          bundles: [],
          renamedTo:
            normalizeSystemName(renamed) !== key ? renamed : null,
        }
        usage.set(key, row)
      }
      row.observations++
      row.photos += obsPhotoCount.get(o.id) ?? 0
      const person = o.capturedBy || b.manifest.device.person || b.manifest.device.label
      if (!row.contributors.includes(person)) row.contributors.push(person)
      if (!row.bundles.includes(b.sourceName)) row.bundles.push(b.sourceName)
    }
  }
  const systemUsage = [...usage.values()].sort((a, b) =>
    a.system.localeCompare(b.system, undefined, { numeric: true }),
  )

  // Group by system, equipment name AND location. A blank location never
  // guesses a match with equipment at a known location.
  type ObsKey = string
  const obsGroups = new Map<
    ObsKey,
    { system: string; observation: string; location: string; rows: Row[]; notes: Map<string, string> }
  >()
  for (const r of rows) {
    const system = applyRenameRules(r.rawSystem, rules) || SYSTEM_UNASSIGNED
    const observation = (r.obs?.name || 'Observation').trim()
    const location = (r.obs?.location ?? '').trim()
    const locationKey = location.toLowerCase().replace(/\s+/g, ' ')
    const key = JSON.stringify([normalizeSystemName(system), normalizeSystemName(observation), locationKey])
    let g = obsGroups.get(key)
    if (!g) {
      g = { system, observation, location, rows: [], notes: new Map() }
      obsGroups.set(key, g)
    }
    g.rows.push(r)
  }

  // Include every observation, even without photos. Structured fields travel
  // in bundles and are rendered as labeled text in the merged workbook.
  for (const bundle of bundles) {
    for (const observation of bundle.manifest.observations) {
      const rawSystem = observation.systemName || bundle.manifest.systems.find((s) => s.id === observation.systemId)?.name || SYSTEM_UNASSIGNED
      const system = applyRenameRules(rawSystem, rules) || SYSTEM_UNASSIGNED
      const name = observation.name.trim() || 'Observation'
      const location = (observation.location ?? '').trim()
      const key = JSON.stringify([normalizeSystemName(system), normalizeSystemName(name), location.toLowerCase().replace(/\s+/g, ' ')])
      let group = obsGroups.get(key)
      if (!group) {
        group = { system, observation: name, location, rows: [], notes: new Map() }
        obsGroups.set(key, group)
      }
      const person = observation.capturedBy || bundle.manifest.device.person || bundle.manifest.device.label
      const text = observationText(observation)
      const previous = group.notes.get(person)
      group.notes.set(person, previous && text && previous !== text ? `${previous}\n\n${text}` : previous || text)
    }
  }

  const photos: MergedPhoto[] = []
  const observations: MergedObservation[] = []
  const orderedKeys = [...obsGroups.keys()].sort((a, b) => {
    const ga = obsGroups.get(a)!
    const gb = obsGroups.get(b)!
    return (
      ga.system.localeCompare(gb.system, undefined, { numeric: true }) ||
      ga.observation.localeCompare(gb.observation, undefined, { numeric: true }) ||
      ga.location.localeCompare(gb.location, undefined, { numeric: true })
    )
  })

  const usedFolders = new Set<string>()
  for (const key of orderedKeys) {
    const g = obsGroups.get(key)!
    const label = g.location ? `${g.observation} — ${g.location}` : g.observation
    const baseFolder = `${safeFolderName(g.system, 'Misc')}/${safeFolderName(label, 'observation')}`
    let folder = baseFolder
    let suffix = 2
    // Sanitization can make distinct locations produce identical folder names.
    // Keep every group's images, including on case-insensitive filesystems.
    while (usedFolders.has(folder.toLowerCase())) folder = `${baseFolder} (${suffix++})`
    usedFolders.add(folder.toLowerCase())
    const sorted = [...g.rows].sort(
      (a, b) =>
        a.photo.order - b.photo.order ||
        (a.photo.capturedAt || '').localeCompare(b.photo.capturedAt || ''),
    )
    let seq = 0
    const contributors: string[] = [...g.notes.keys()]
    for (const r of sorted) {
      seq++
      const ext = extForBlob(r.parsed.blobs.get(r.photo.id)!.image)
      if (!contributors.includes(r.capturedBy)) contributors.push(r.capturedBy)
      photos.push({
        photo: r.photo,
        image: r.parsed.blobs.get(r.photo.id)!.image,
        thumb: r.parsed.blobs.get(r.photo.id)!.thumb,
        original: r.parsed.blobs.get(r.photo.id)!.original,
        sourceBundle: r.parsed.sourceName,
        capturedBy: r.capturedBy,
        system: g.system,
        observation: g.observation,
        location: g.location,
        folder,
        filename: buildPhotoFilename({
          system: g.system,
          observation: g.observation,
          location: g.location,
          seq,
          person: r.capturedBy,
          capturedAt: r.photo.capturedAt,
          ext,
        }),
      })
    }
    const note =
      g.notes.size <= 1
        ? [...g.notes.values()][0] ?? ''
        : [...g.notes.entries()].map(([who, n]) => `— ${who}: ${n}`).join('\n')
    observations.push({
      system: g.system,
      name: g.observation,
      location: g.location,
      note,
      contributors,
      photoCount: sorted.length,
      folder,
    })
  }

  return {
    site,
    siteConflicts,
    bundles: bundleSummaries,
    systems: [...systemsByName.values()].sort((a, b) => a.order - b.order),
    observations,
    photos,
    systemUsage,
    totals: {
      photos: photos.length,
      observations: observations.length,
      systems: new Set(observations.map((o) => normalizeSystemName(o.system))).size,
      bundles: bundles.length,
    },
  }
}

const README = `Site Collect — merged assessment photos
=======================================

Folders are <System>/<Observation — Location>/ when location is provided,
or <System>/<Observation>/ when blank. Matching system, equipment name and
location combine photos from teammates; different locations stay separate.
Files are named:

  <System>__<Observation>__[<Location>__]<seq>__<person>__<yyyymmdd>.jpg
  (The location segment is omitted when blank.)

index.xlsx
  - Summary : site info, totals, and every system name used (check the
              "Folded into" column for near-duplicate systems)
  - Equipment : filterable equipment name, Location, notes, and photo folders
  - one tab per system : each observation's name, location, notes, and its photos
                         embedded so you can see them without opening the folder

Drop this whole folder into the Box assessment folder.
`

export async function buildOutputZip(
  result: MergeResult,
): Promise<{ blob: Blob; filename: string }> {
  const zip = new JSZip()
  const code = (result.site?.code || result.site?.name || 'assessment').replace(
    /[^\w-]+/g,
    '-',
  )
  const root = zip.folder(code)!

  for (const mp of result.photos) {
    root.file(`${mp.folder}/${mp.filename}`, mp.image)
  }

  const wb = await buildIndexWorkbook(result)
  root.file('index.xlsx', wb)
  root.file('README.txt', README)
  root.file(
    'merge-report.json',
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        site: result.site,
        totals: result.totals,
        bundles: result.bundles,
        systemUsage: result.systemUsage,
        observations: result.observations,
      },
      null,
      2,
    ),
  )

  const blob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 3 },
  })
  return { blob, filename: `${code}__merged__${new Date().toISOString().slice(0, 10)}.zip` }
}
