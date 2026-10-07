import { describe, expect, it } from 'vitest'
import {
  applyRenameRules,
  groupBySystem,
  normalizeSystemName,
  safeFolderName,
  SYSTEM_UNASSIGNED,
} from './systems'

describe('normalizeSystemName', () => {
  it('folds case, whitespace and separators', () => {
    expect(normalizeSystemName('  cooling ')).toBe('COOLING')
    expect(normalizeSystemName('Compressed Air')).toBe('COMPRESSED-AIR')
    expect(normalizeSystemName('compressed_air')).toBe('COMPRESSED-AIR')
    expect(normalizeSystemName('Compressed - Air')).toBe('COMPRESSED-AIR')
  })
  it('does not fuzzy match', () => {
    expect(normalizeSystemName('Air Compressor')).not.toBe(
      normalizeSystemName('Compressed Air'),
    )
  })
})

describe('safeFolderName', () => {
  it('strips path-hostile characters, keeps spaces', () => {
    expect(safeFolderName('CHW Pump 2')).toBe('CHW Pump 2')
    expect(safeFolderName('A/B:C?')).toBe('ABC')
  })
  it('falls back', () => {
    expect(safeFolderName('', 'Misc')).toBe('Misc')
  })
})

describe('applyRenameRules', () => {
  const rules = [{ from: 'Air Compressor', to: 'Compressed Air' }]
  it('folds a matching system, preserving the target casing', () => {
    expect(applyRenameRules('air compressor', rules)).toBe('Compressed Air')
    expect(applyRenameRules('AIR COMPRESSOR', rules)).toBe('Compressed Air')
  })
  it('leaves others untouched', () => {
    expect(applyRenameRules('Cooling', rules)).toBe('Cooling')
  })
})

describe('groupBySystem', () => {
  type O = { id: string; system: string | null }
  const obs: O[] = [
    { id: '1', system: 'Cooling' },
    { id: '2', system: 'cooling' },
    { id: '3', system: 'Heating' },
    { id: '4', system: null },
  ]

  it('keeps everything and folds trivial variants', () => {
    const g = groupBySystem(obs, (o) => o.system)
    expect(g.reduce((n, x) => n + x.items.length, 0)).toBe(4)
    expect(g.find((x) => x.norm === 'COOLING')?.items.map((o) => o.id)).toEqual(['1', '2'])
  })
  it('sends nullish systems to Misc', () => {
    const g = groupBySystem(obs, (o) => o.system)
    expect(g.find((x) => x.system === SYSTEM_UNASSIGNED)?.items.map((o) => o.id)).toContain('4')
  })
  it('applies fold rules while grouping', () => {
    const g = groupBySystem(obs, (o) => o.system, [{ from: 'Heating', to: 'Cooling' }])
    expect(g.find((x) => x.norm === 'COOLING')?.items.map((o) => o.id).sort()).toEqual([
      '1',
      '2',
      '3',
    ])
  })
})
