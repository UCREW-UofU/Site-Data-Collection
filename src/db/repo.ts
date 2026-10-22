import { uuid } from '@/lib/id'
import { DEFAULT_SYSTEMS, normalizeSystemName } from '@/lib/systems'
import { db, getSettings } from './db'
import type { Observation, Photo, Site, System } from './types'
import { SCHEMA_VERSION } from './types'

const now = () => new Date().toISOString()
const who = async () => {
  const s = await getSettings()
  return s.personName || s.deviceLabel
}

/* ------------------------------- sites -------------------------------- */

export async function createSite(input: {
  code: string
  name: string
  address?: string
  notes?: string
  assessmentDate?: string | null
  leadEmail?: string
}): Promise<Site> {
  const site: Site = {
    id: uuid(),
    code: input.code.trim(),
    name: input.name.trim(),
    address: input.address?.trim() ?? '',
    notes: input.notes?.trim() ?? '',
    assessmentDate: input.assessmentDate ?? null,
    leadEmail: input.leadEmail?.trim() ?? '',
    createdBy: await who(),
    createdAt: now(),
    schemaVersion: SCHEMA_VERSION,
  }
  await db.sites.add(site)
  await ensureDefaultSystems(site.id)
  return site
}

export async function updateSite(id: string, patch: Partial<Site>): Promise<void> {
  await db.sites.update(id, patch)
}

export async function deleteSite(id: string): Promise<void> {
  await db.transaction('rw', db.sites, db.systems, db.observations, db.photos, async () => {
    await db.photos.where('siteId').equals(id).delete()
    await db.observations.where('siteId').equals(id).delete()
    await db.systems.where('siteId').equals(id).delete()
    await db.sites.delete(id)
  })
}

export const listSites = () => db.sites.orderBy('createdAt').reverse().toArray()
export const getSite = (id: string) => db.sites.get(id)

/* ------------------------------ systems ------------------------------- */

/** Add any built-in default systems this site is missing. Idempotent — safe to
 *  call on every open of the setup screen and after a v1→v2 migration. */
export async function ensureDefaultSystems(siteId: string): Promise<void> {
  const createdBy = await who()
  await db.transaction('rw', db.systems, async () => {
    const existing = await db.systems.where('siteId').equals(siteId).toArray()
    const haveKeys = new Set(existing.map((s) => s.defaultKey).filter(Boolean))
    let order = existing.length
    for (let i = 0; i < DEFAULT_SYSTEMS.length; i++) {
      const d = DEFAULT_SYSTEMS[i]
      if (haveKeys.has(d.key)) continue
      await db.systems.add({
        id: uuid(),
        siteId,
        name: d.name,
        normalizedName: normalizeSystemName(d.name),
        defaultKey: d.key,
        active: true,
        origin: 'default',
        order: order++,
        createdBy,
        createdAt: now(),
      })
    }
  })
}

export async function createSystem(input: {
  siteId: string
  name: string
  origin?: System['origin']
  active?: boolean
}): Promise<System> {
  const count = await db.systems.where('siteId').equals(input.siteId).count()
  const sys: System = {
    id: uuid(),
    siteId: input.siteId,
    name: input.name.trim(),
    normalizedName: normalizeSystemName(input.name),
    defaultKey: '',
    active: input.active ?? true,
    origin: input.origin ?? 'lead',
    order: count,
    createdBy: await who(),
    createdAt: now(),
  }
  await db.systems.add(sys)
  return sys
}

export async function updateSystem(id: string, patch: Partial<System>): Promise<void> {
  const next = { ...patch }
  if (typeof patch.name === 'string') next.normalizedName = normalizeSystemName(patch.name)
  await db.systems.update(id, next)
}

export const setSystemActive = (id: string, active: boolean) =>
  db.systems.update(id, { active })

/** Delete a system and everything under it. */
export async function deleteSystem(id: string): Promise<void> {
  await db.transaction('rw', db.systems, db.observations, db.photos, async () => {
    const obs = await db.observations.where('systemId').equals(id).toArray()
    for (const o of obs) await db.photos.where('observationId').equals(o.id).delete()
    await db.observations.where('systemId').equals(id).delete()
    await db.systems.delete(id)
  })
}

export const getSystem = (id: string) => db.systems.get(id)

export const listSystems = (siteId: string) =>
  db.systems.where('siteId').equals(siteId).sortBy('order')

export async function listActiveSystems(siteId: string): Promise<System[]> {
  return (await listSystems(siteId)).filter((s) => s.active)
}

export async function findSystemByName(
  siteId: string,
  name: string,
): Promise<System | undefined> {
  return db.systems.get({ siteId, normalizedName: normalizeSystemName(name) })
}

/* ---------------------------- observations ---------------------------- */

export async function createObservation(input: {
  siteId: string
  systemId: string
  name: string
  location?: string
  note?: string
}): Promise<Observation> {
  const s = await getSettings()
  const system = await db.systems.get(input.systemId)
  const obs: Observation = {
    id: uuid(),
    siteId: input.siteId,
    systemId: input.systemId,
    systemName: system?.name ?? '',
    name: input.name.trim(),
    location: input.location?.trim() ?? '',
    note: input.note?.trim() ?? '',
    capturedBy: s.personName || s.deviceLabel,
    deviceId: s.deviceId,
    createdAt: now(),
    updatedAt: now(),
  }
  await db.observations.add(obs)
  return obs
}

export async function updateObservation(
  id: string,
  patch: Partial<Pick<Observation, 'name' | 'location' | 'note' | 'systemId'>>,
): Promise<void> {
  const next: Partial<Observation> = { ...patch, updatedAt: now() }
  if (typeof patch.location === 'string') next.location = patch.location.trim()
  if (patch.systemId) {
    const system = await db.systems.get(patch.systemId)
    next.systemName = system?.name ?? ''
    await db.photos.where('observationId').equals(id).modify({ systemId: patch.systemId })
  }
  await db.observations.update(id, next)
}

export async function deleteObservation(id: string): Promise<void> {
  await db.transaction('rw', db.observations, db.photos, async () => {
    await db.photos.where('observationId').equals(id).delete()
    await db.observations.delete(id)
  })
}

export const getObservation = (id: string) => db.observations.get(id)

export const listObservations = (siteId: string) =>
  db.observations.where('siteId').equals(siteId).reverse().sortBy('updatedAt')

export const listObservationsBySystem = (siteId: string, systemId: string) =>
  db.observations.where({ siteId, systemId }).reverse().sortBy('updatedAt')

export async function countBySystem(
  siteId: string,
): Promise<Map<string, { observations: number; photos: number }>> {
  const map = new Map<string, { observations: number; photos: number }>()
  const bump = (id: string, k: 'observations' | 'photos') => {
    const cur = map.get(id) ?? { observations: 0, photos: 0 }
    cur[k]++
    map.set(id, cur)
  }
  await db.observations.where('siteId').equals(siteId).each((o) => bump(o.systemId, 'observations'))
  await db.photos.where('siteId').equals(siteId).each((p) => bump(p.systemId, 'photos'))
  return map
}

/* ------------------------------- photos ------------------------------- */

export async function addPhoto(input: {
  observationId: string
  siteId: string
  systemId: string
  image: Blob
  thumb?: Blob | null
  original?: Blob | null
  width?: number
  height?: number
  decoded?: boolean
  capturedAt?: string | null
  gps?: { lat: number; lng: number } | null
}): Promise<Photo> {
  const order = await db.photos.where('observationId').equals(input.observationId).count()
  const photo: Photo = {
    id: uuid(),
    observationId: input.observationId,
    siteId: input.siteId,
    systemId: input.systemId,
    image: input.image,
    original: input.original ?? null,
    thumb: input.thumb ?? null,
    width: input.width ?? 0,
    height: input.height ?? 0,
    decoded: input.decoded ?? true,
    capturedAt: input.capturedAt ?? now(),
    gps: input.gps ?? null,
    order,
    createdAt: now(),
  }
  await db.photos.add(photo)
  await db.observations.update(input.observationId, { updatedAt: now() })
  return photo
}

export async function deletePhoto(id: string): Promise<void> {
  await db.photos.delete(id)
}

export const getPhoto = (id: string) => db.photos.get(id)

export const listObservationPhotos = (observationId: string) =>
  db.photos.where('observationId').equals(observationId).sortBy('order')

export const listSitePhotos = (siteId: string) =>
  db.photos.where('siteId').equals(siteId).sortBy('capturedAt')
