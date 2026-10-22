import { describe, expect, it } from 'vitest'
import type { BundleManifest, BundlePhoto, ParsedBundle } from './bundle'
import type { Observation, Site, System } from '@/db/types'
import { mergeBundles } from './merge'

const site: Site = {
  id: 'site-1',
  code: 'UU-2026-Demo',
  name: 'Demo',
  address: '',
  notes: '',
  assessmentDate: '2026-09-09',
  leadEmail: '',
  createdBy: 'lead',
  createdAt: '2026-09-01T00:00:00Z',
  schemaVersion: 2,
}

const sys = (name: string): System => ({
  id: `sys-${name}`,
  siteId: 'site-1',
  name,
  normalizedName: name.toUpperCase(),
  defaultKey: name.toLowerCase(),
  active: true,
  origin: 'default',
  order: 0,
  createdBy: 'lead',
  createdAt: '2026-09-01T00:00:00Z',
})

const obs = (id: string, systemName: string, name: string, by: string, note = ''): Observation => ({
  id,
  siteId: 'site-1',
  systemId: `sys-${systemName}`,
  systemName,
  name,
  note,
  capturedBy: by,
  deviceId: `dev-${by}`,
  createdAt: '2026-09-09T10:00:00Z',
  updatedAt: '2026-09-09T10:00:00Z',
})

const photo = (id: string, observationId: string, order = 0): BundlePhoto => ({
  id,
  observationId,
  siteId: 'site-1',
  systemId: 'sys-x',
  width: 100,
  height: 100,
  decoded: true,
  capturedAt: '2026-09-09T10:00:00Z',
  gps: null,
  order,
  createdAt: '2026-09-09T10:00:00Z',
  files: { image: `photos/${id}.jpg`, thumb: null, original: null },
})

function bundle(
  person: string,
  systems: System[],
  observations: Observation[],
  photos: BundlePhoto[],
): ParsedBundle {
  const manifest: BundleManifest = {
    format: 'site-collect-bundle',
    formatVersion: 2,
    exportedAt: `2026-09-09T12:00:00.${person}Z`,
    device: { id: `dev-${person}`, label: `device-${person}`, person },
    site,
    systems,
    observations,
    photos,
  }
  const blobs = new Map(
    photos.map((p) => [
      p.id,
      { image: new Blob(['x'], { type: 'image/jpeg' }), thumb: null, original: null },
    ]),
  )
  return { manifest, blobs, sourceName: `${person}.zip` }
}

describe('mergeBundles', () => {
  it('keeps every photo and groups by <System>/<Observation>', () => {
    const b1 = bundle(
      'alex',
      [sys('Cooling')],
      [obs('o1', 'Cooling', 'Chiller 1', 'Alex', 'serves whole building')],
      [photo('p1', 'o1', 0), photo('p2', 'o1', 1)],
    )
    const b2 = bundle(
      'sam',
      [sys('Cooling')],
      [obs('o2', 'Cooling', 'CHW Pump 2', 'Sam')],
      [photo('p3', 'o2', 0)],
    )
    const r = mergeBundles([b1, b2])
    expect(r.totals.photos).toBe(3)
    expect(r.totals.observations).toBe(2)
    expect(new Set(r.photos.map((p) => p.folder))).toEqual(
      new Set(['Cooling/Chiller 1', 'Cooling/CHW Pump 2']),
    )
    expect(r.photos.map((p) => p.filename)).toContain(
      'Cooling__Chiller-1__01__alex__20260909.jpg',
    )
  })

  it('merges same-named observations from different people into one folder', () => {
    const b1 = bundle(
      'alex',
      [sys('Cooling')],
      [obs('o1', 'Cooling', 'Chiller 1', 'Alex', 'no VFD')],
      [photo('p1', 'o1')],
    )
    const b2 = bundle(
      'sam',
      [sys('Cooling')],
      [obs('o2', 'Cooling', 'chiller 1', 'Sam', 'runs 24/7')],
      [photo('p2', 'o2')],
    )
    const r = mergeBundles([b1, b2])
    const merged = r.observations.filter((o) => o.folder === 'Cooling/Chiller 1')
    expect(merged).toHaveLength(1)
    expect(merged[0].photoCount).toBe(2)
    expect(merged[0].contributors.sort()).toEqual(['Alex', 'Sam'])
    expect(merged[0].note).toContain('Alex')
    expect(merged[0].note).toContain('Sam')
  })

  it('surfaces a near-duplicate system and folds it with a rule', () => {
    const b1 = bundle(
      'alex',
      [sys('Compressed Air')],
      [obs('o1', 'Compressed Air', 'Compressor 1', 'Alex')],
      [photo('p1', 'o1')],
    )
    const b2 = bundle(
      'sam',
      [],
      [obs('o2', 'Air Compressor', 'Compressor 2', 'Sam')],
      [photo('p2', 'o2')],
    )
    const plain = mergeBundles([b1, b2])
    expect(plain.systemUsage.map((u) => u.system).sort()).toEqual([
      'Air Compressor',
      'Compressed Air',
    ])

    const folded = mergeBundles([b1, b2], [{ from: 'Air Compressor', to: 'Compressed Air' }])
    expect(new Set(folded.photos.map((p) => p.system))).toEqual(new Set(['Compressed Air']))
  })

  it('flags differing site codes', () => {
    const b1 = bundle('alex', [], [obs('o1', 'Cooling', 'C1', 'Alex')], [photo('p1', 'o1')])
    const b2 = bundle('sam', [], [obs('o2', 'Cooling', 'C2', 'Sam')], [photo('p2', 'o2')])
    b2.manifest = { ...b2.manifest, site: { ...site, code: 'UU-2026-Other' } }
    expect(mergeBundles([b1, b2]).siteConflicts).toEqual(['UU-2026-Other'])
  })
})

describe('optional equipment location', () => {
  function at(id: string, location?: string) {
    return bundle(id, [sys('Cooling')], [
      { ...obs(`o-${id}`, 'Cooling', 'Pump 1', 'Alex'), location },
    ], [photo(`p-${id}`, `o-${id}`)])
  }

  it('keeps identical equipment names at different locations separate', () => {
    const result = mergeBundles([at('a', 'Room 101'), at('b', 'Roof')])
    expect(result.observations).toHaveLength(2)
    expect(result.observations.map((o) => o.location).sort()).toEqual(['Roof', 'Room 101'])
    expect(new Set(result.photos.map((p) => `${p.folder}/${p.filename}`)).size).toBe(2)
    for (const o of result.observations) {
      expect(result.photos.filter((p) => p.folder === o.folder).map((p) => p.location)).toEqual([o.location])
    }
  })

  it('combines matching locations despite case and extra whitespace', () => {
    const result = mergeBundles([at('a', ' Room 101 '), at('b', 'room   101')])
    expect(result.observations).toHaveLength(1)
    expect(result.observations[0].location).toBe('Room 101')
    expect(result.observations[0].photoCount).toBe(2)
  })

  it('supports older bundles and keeps blank locations separate from known ones', () => {
    const result = mergeBundles([at('old'), at('blank', '  '), at('known', 'Roof')])
    expect(result.observations).toHaveLength(2)
    const blank = result.observations.find((o) => o.location === '')!
    expect(blank.photoCount).toBe(2)
    expect(blank.folder).toBe('Cooling/Pump 1')
  })

  it('does not overwrite photos when location folder names sanitize to the same text', () => {
    const result = mergeBundles([at('a', 'Room/1'), at('b', 'Room:1'), at('c', 'Room1')])
    expect(result.observations).toHaveLength(3)
    expect(new Set(result.photos.map((p) => `${p.folder}/${p.filename}`.toLowerCase())).size).toBe(3)
  })

  it('preserves location when system rename rules combine categories', () => {
    const a = at('a', 'Roof')
    const b = at('b', 'Basement')
    b.manifest.observations[0].systemName = 'Chillers'
    const result = mergeBundles([a, b], [{ from: 'Chillers', to: 'Cooling' }])
    expect(result.totals.systems).toBe(1)
    expect(result.observations).toHaveLength(2)
    expect(result.photos.map((p) => p.location).sort()).toEqual(['Basement', 'Roof'])
  })

  it('exports a Location column and separate location rows in Excel', async () => {
    const { buildIndexWorkbook } = await import('./xlsx')
    const { default: ExcelJS } = await import('exceljs')
    const result = mergeBundles([at('a', 'Roof'), at('b', 'Basement'), at('old')])
    const blob = await buildIndexWorkbook(result)
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(await blob.arrayBuffer())
    const equipment = workbook.getWorksheet('Equipment')!
    expect(equipment.getCell('C1').value).toBe('Location')
    expect([2, 3, 4].map((r) => equipment.getCell(r, 3).value || '').sort()).toEqual(['', 'Basement', 'Roof'])
    const locations: string[] = []
    workbook.getWorksheet('Cooling')!.eachRow((r) => {
      if (r.getCell(2).value === 'Location') locations.push(String(r.getCell(3).value || ''))
    })
    expect(locations.sort()).toEqual(['', 'Basement', 'Roof'])
  })
})
