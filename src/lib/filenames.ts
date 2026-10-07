import { safeFolderName } from './systems'

/** Filesystem-safe token from an arbitrary label (person name, etc.). */
export function safeToken(input: string | null | undefined, fallback = 'unknown'): string {
  const t = (input ?? '')
    .normalize('NFKD')
    .replace(/[^\w]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
  return t || fallback
}

/** yyyymmdd from an ISO timestamp (or now). Uses local date. */
export function dateStamp(iso?: string | null): string {
  const d = iso ? new Date(iso) : new Date()
  if (Number.isNaN(d.getTime())) return dateStamp()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}${m}${day}`
}

export type PhotoNameParts = {
  system: string | null | undefined
  observation: string | null | undefined
  seq: number
  person: string | null | undefined
  capturedAt: string | null | undefined
  ext?: string
}

/** `<System>__<Observation>__<01>__<person>__<yyyymmdd>.<ext>` */
export function buildPhotoFilename(p: PhotoNameParts): string {
  const system = safeFolderName(p.system, 'Misc').replace(/\s+/g, '-')
  const obs = safeFolderName(p.observation, 'observation').replace(/\s+/g, '-')
  const seq = String(Math.max(1, Math.floor(p.seq))).padStart(2, '0')
  const person = safeToken(p.person, 'unknown')
  const date = dateStamp(p.capturedAt)
  const ext = (p.ext || 'jpg').replace(/^\./, '').toLowerCase()
  return `${system}__${obs}__${seq}__${person}__${date}.${ext}`
}

/** Guess a file extension from a blob's MIME type. */
export function extForBlob(blob: Blob): string {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/heic': 'heic',
    'image/heif': 'heif',
  }
  return map[blob.type] || 'jpg'
}
