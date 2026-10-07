import { describe, expect, it } from 'vitest'
import { buildPhotoFilename, dateStamp, safeToken } from './filenames'

describe('safeToken', () => {
  it('slugifies names', () => {
    expect(safeToken('Creed McCord')).toBe('creed-mccord')
  })
  it('falls back when empty', () => {
    expect(safeToken('   ', 'nobody')).toBe('nobody')
  })
})

describe('dateStamp', () => {
  it('formats yyyymmdd', () => {
    expect(dateStamp('2026-09-09T14:03:00')).toBe('20260909')
  })
})

describe('buildPhotoFilename', () => {
  it('builds <System>__<Observation>__<seq>__<person>__<date>', () => {
    expect(
      buildPhotoFilename({
        system: 'Cooling',
        observation: 'CHW Pump 2',
        seq: 3,
        person: 'Creed McCord',
        capturedAt: '2026-09-09T09:00:00',
      }),
    ).toBe('Cooling__CHW-Pump-2__03__creed-mccord__20260909.jpg')
  })

  it('handles missing pieces and a custom extension', () => {
    expect(
      buildPhotoFilename({
        system: null,
        observation: null,
        seq: 1,
        person: null,
        capturedAt: null,
        ext: '.png',
      }),
    ).toMatch(/^Misc__observation__01__unknown__\d{8}\.png$/)
  })
})
