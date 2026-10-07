import JSZip from 'jszip'
import { db } from '@/db/db'
import type { Observation, Photo, Site, System } from '@/db/types'
import { extForBlob } from './filenames'

export const BUNDLE_FORMAT = 'site-collect-bundle'
export const BUNDLE_VERSION = 2

export interface BundlePhoto {
  id: string
  observationId: string
  siteId: string
  systemId: string
  width: number
  height: number
  decoded: boolean
  capturedAt: string
  gps: { lat: number; lng: number } | null
  order: number
  createdAt: string
  files: { image: string; thumb: string | null; original: string | null }
}

export interface BundleManifest {
  format: typeof BUNDLE_FORMAT
  formatVersion: number
  exportedAt: string
  device: { id: string; label: string; person: string }
  site: Site
  systems: System[]
  observations: Observation[]
  photos: BundlePhoto[]
}

export interface ParsedBundle {
  manifest: BundleManifest
  /** photoId -> blobs pulled out of the zip */
  blobs: Map<string, { image: Blob; thumb: Blob | null; original: Blob | null }>
  sourceName: string
}

function toBundlePhoto(p: Photo): BundlePhoto {
  const imageExt = extForBlob(p.image)
  return {
    id: p.id,
    observationId: p.observationId,
    siteId: p.siteId,
    systemId: p.systemId,
    width: p.width,
    height: p.height,
    decoded: p.decoded,
    capturedAt: p.capturedAt,
    gps: p.gps,
    order: p.order,
    createdAt: p.createdAt,
    files: {
      image: `photos/${p.id}.${imageExt}`,
      thumb: p.thumb ? `thumbs/${p.id}.jpg` : null,
      original: p.original ? `originals/${p.id}.${extForBlob(p.original)}` : null,
    },
  }
}

/** Build a one-person export bundle for a site. Returns a ZIP blob. */
export async function exportBundle(
  siteId: string,
  device: { id: string; label: string; person: string },
): Promise<{ blob: Blob; filename: string; photoCount: number; observationCount: number }> {
  const site = await db.sites.get(siteId)
  if (!site) throw new Error('Site not found')
  const systems = await db.systems.where('siteId').equals(siteId).toArray()
  const observations = await db.observations.where('siteId').equals(siteId).toArray()
  const photos = await db.photos.where('siteId').equals(siteId).toArray()

  const zip = new JSZip()
  const manifest: BundleManifest = {
    format: BUNDLE_FORMAT,
    formatVersion: BUNDLE_VERSION,
    exportedAt: new Date().toISOString(),
    device,
    site,
    systems,
    observations,
    photos: photos.map(toBundlePhoto),
  }

  for (const p of photos) {
    const bp = manifest.photos.find((x) => x.id === p.id)!
    zip.file(bp.files.image, p.image)
    if (p.thumb && bp.files.thumb) zip.file(bp.files.thumb, p.thumb)
    if (p.original && bp.files.original) zip.file(bp.files.original, p.original)
  }
  zip.file('manifest.json', JSON.stringify(manifest, null, 2))

  const blob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 3 },
  })

  const stamp = new Date().toISOString().slice(0, 10)
  const person = (device.person || device.label).replace(/[^\w]+/g, '-').toLowerCase()
  const code = (site.code || site.name || 'site').replace(/[^\w-]+/g, '-')
  return {
    blob,
    filename: `${code}__${person}__${stamp}.sitecollect.zip`,
    photoCount: photos.length,
    observationCount: observations.length,
  }
}

/** Parse a bundle zip back into a manifest + extracted blobs. */
export async function parseBundle(file: File | Blob, sourceName = 'bundle'): Promise<ParsedBundle> {
  const zip = await JSZip.loadAsync(file)
  const manifestFile = zip.file('manifest.json')
  if (!manifestFile) throw new Error(`${sourceName}: no manifest.json — not a Site Collect bundle`)
  const manifest = JSON.parse(await manifestFile.async('string')) as BundleManifest
  if (manifest.format !== BUNDLE_FORMAT) {
    throw new Error(`${sourceName}: unrecognised bundle format`)
  }
  if (!Array.isArray(manifest.observations)) {
    throw new Error(`${sourceName}: this bundle is from an older version and can't be merged`)
  }

  const blobs = new Map<string, { image: Blob; thumb: Blob | null; original: Blob | null }>()
  for (const p of manifest.photos) {
    const imageEntry = zip.file(p.files.image)
    if (!imageEntry) continue
    const image = await imageEntry.async('blob')
    const thumb = p.files.thumb ? ((await zip.file(p.files.thumb)?.async('blob')) ?? null) : null
    const original = p.files.original
      ? ((await zip.file(p.files.original)?.async('blob')) ?? null)
      : null
    blobs.set(p.id, { image, thumb, original })
  }

  return { manifest, blobs, sourceName }
}
