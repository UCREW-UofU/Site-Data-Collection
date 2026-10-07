export const SCHEMA_VERSION = 2

/** A site visit / assessment. */
export interface Site {
  id: string
  /** Human short code, e.g. "UU-2026-ChemBldg" (grant prefix + year + name). */
  code: string
  name: string
  address: string
  notes: string
  assessmentDate: string | null // ISO date (yyyy-mm-dd)
  /** Where "Email to lead" sends bundles. Travels in the shared setup. */
  leadEmail: string
  createdBy: string
  createdAt: string
  schemaVersion: number
}

/** A high-level equipment category — Cooling, Heating, Airside, … or a custom
 *  one a lead adds ("Smeltery"). Equipment is not modelled; it lives in the
 *  Observation name. */
export interface System {
  id: string
  siteId: string
  name: string
  /** normalizeSystemName(name) — indexed for lookup + uniqueness. */
  normalizedName: string
  /** Stable key for the built-in defaults ("cooling"); '' for custom systems. */
  defaultKey: string
  /** Whether the lead has this system switched on for the visit. */
  active: boolean
  origin: 'default' | 'lead' | 'field'
  /** Display order on the board. */
  order: number
  createdBy: string
  createdAt: string
}

/** One thing a field user documented: a name, a note, and one or more photos,
 *  all under a single system. This is the unit that gets grouped at export. */
export interface Observation {
  id: string
  siteId: string
  systemId: string
  /** Denormalised so exports/merge don't need the systems table. */
  systemName: string
  /** Required — e.g. "Chiller 1", "CHW Pump 2". */
  name: string
  note: string
  capturedBy: string
  deviceId: string
  createdAt: string
  updatedAt: string
}

export interface Photo {
  id: string
  observationId: string
  /** Denormalised for site-wide queries. */
  siteId: string
  systemId: string
  /** Working-copy JPEG (downscaled). */
  image: Blob
  /** Full-res original, only when the user opts to keep it. */
  original: Blob | null
  /** Small JPEG, or null if the source could not be decoded. */
  thumb: Blob | null
  width: number
  height: number
  /** false when the browser could not decode the capture (HEIC edge cases). */
  decoded: boolean
  capturedAt: string // ISO; from EXIF when available, else save time
  gps: { lat: number; lng: number } | null
  /** Order within the observation; 0 = cover. */
  order: number
  createdAt: string
}

export interface AppSettings {
  id: 'app'
  personName: string
  /** Optional — used as Reply-To when emailing a bundle to the lead. */
  personEmail: string
  deviceId: string
  deviceLabel: string
  activeSiteId: string | null
  keepOriginals: boolean
  imageMaxEdge: number
  jpegQuality: number
}

export const DEFAULT_SETTINGS: Omit<AppSettings, 'deviceId'> = {
  id: 'app',
  personName: '',
  personEmail: '',
  deviceLabel: '',
  activeSiteId: null,
  keepOriginals: false,
  imageMaxEdge: 2400,
  jpegQuality: 0.8,
}
