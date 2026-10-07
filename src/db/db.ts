import Dexie, { type EntityTable } from 'dexie'
import { shortId, uuid } from '@/lib/id'
import {
  DEFAULT_SETTINGS,
  type AppSettings,
  type Observation,
  type Photo,
  type Site,
  type System,
} from './types'

class SiteCollectDB extends Dexie {
  sites!: EntityTable<Site, 'id'>
  systems!: EntityTable<System, 'id'>
  observations!: EntityTable<Observation, 'id'>
  photos!: EntityTable<Photo, 'id'>
  settings!: EntityTable<AppSettings, 'id'>

  constructor() {
    super('site-collect')

    // v1: tag-per-equipment model (Aug 2026). Superseded.
    this.version(1).stores({
      sites: 'id, code, createdAt',
      systems: 'id, siteId, [siteId+normalizedTag], normalizedTag, category',
      photos:
        'id, siteId, [siteId+normalizedTag], normalizedTag, capturedAt, kind, capturedBy',
      settings: 'id',
    })

    // v2: system = high-level category; observation = named multi-photo unit.
    this.version(2)
      .stores({
        sites: 'id, code, createdAt',
        systems: 'id, siteId, [siteId+normalizedName], active, order',
        observations:
          'id, siteId, systemId, [siteId+systemId], capturedBy, createdAt, updatedAt',
        photos: 'id, observationId, siteId, [siteId+observationId], order, capturedAt',
        settings: 'id',
      })
      .upgrade(async (tx) => {
        // The equipment-tag model doesn't map cleanly onto systems/observations.
        // Sites + settings survive; systems + photos are cleared and re-seeded
        // when the site's setup screen next opens.
        await tx.table('systems').clear()
        await tx.table('photos').clear()
      })
  }
}

export const db = new SiteCollectDB()

let settingsPromise: Promise<AppSettings> | null = null

/** Get the singleton settings row, creating it (with a stable deviceId) once.
 *  Backfills any fields added to AppSettings after this device's row was first
 *  created — otherwise an old record returns `undefined` for a new field and
 *  crashes anything that calls a string method on it (e.g. `.trim()`). */
export function getSettings(): Promise<AppSettings> {
  if (!settingsPromise) {
    settingsPromise = db.transaction('rw', db.settings, async () => {
      const existing = await db.settings.get('app')
      if (existing) {
        const isMissingField = (Object.keys(DEFAULT_SETTINGS) as (keyof AppSettings)[]).some(
          (key) => !(key in existing),
        )
        if (!isMissingField) return existing
        const merged: AppSettings = { ...DEFAULT_SETTINGS, ...existing }
        await db.settings.put(merged)
        return merged
      }
      const fresh: AppSettings = {
        ...DEFAULT_SETTINGS,
        deviceId: uuid(),
        deviceLabel: `device-${shortId(4)}`,
      }
      await db.settings.put(fresh)
      return fresh
    })
  }
  return settingsPromise
}

export async function updateSettings(patch: Partial<AppSettings>): Promise<void> {
  await getSettings()
  await db.settings.update('app', patch)
  settingsPromise = null // force a fresh read on next getSettings()
}
