import exifr from 'exifr'

export type ExifBits = {
  capturedAt: string | null
  gps: { lat: number; lng: number } | null
  make: string | null
  model: string | null
}

/** Pull just the bits we store. Never throws. */
export async function readExif(file: Blob): Promise<ExifBits> {
  const empty: ExifBits = { capturedAt: null, gps: null, make: null, model: null }
  try {
    const data = await exifr.parse(file, {
      pick: ['DateTimeOriginal', 'CreateDate', 'GPSLatitude', 'GPSLongitude', 'Make', 'Model'],
      gps: true,
    })
    if (!data) return empty
    const when: Date | undefined = data.DateTimeOriginal ?? data.CreateDate
    let gps: ExifBits['gps'] = null
    if (typeof data.latitude === 'number' && typeof data.longitude === 'number') {
      gps = { lat: data.latitude, lng: data.longitude }
    }
    return {
      capturedAt: when instanceof Date && !Number.isNaN(when.getTime())
        ? when.toISOString()
        : null,
      gps,
      make: data.Make ?? null,
      model: data.Model ?? null,
    }
  } catch {
    return empty
  }
}
