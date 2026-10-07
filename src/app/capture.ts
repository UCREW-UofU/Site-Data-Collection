import { readExif } from '@/lib/exif'
import { processImage } from '@/lib/image'
import type { AppSettings } from '@/db/types'

export type CapturedPhoto = {
  image: Blob
  thumb: Blob | null
  original: Blob | null
  width: number
  height: number
  decoded: boolean
  capturedAt: string | null
  gps: { lat: number; lng: number } | null
}

/** File from the camera → the blobs + metadata we store. */
export async function capturePhoto(
  file: File,
  settings: AppSettings,
): Promise<CapturedPhoto> {
  const [exif, processed] = await Promise.all([
    readExif(file),
    processImage(file, {
      maxEdge: settings.imageMaxEdge,
      quality: settings.jpegQuality,
    }),
  ])
  return {
    image: processed.image,
    thumb: processed.thumb,
    original: settings.keepOriginals && processed.decoded ? file : null,
    width: processed.width,
    height: processed.height,
    decoded: processed.decoded,
    capturedAt: exif.capturedAt,
    gps: exif.gps,
  }
}
