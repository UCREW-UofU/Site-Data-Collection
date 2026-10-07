/**
 * Turn a captured File into what we store:
 *   - `image`: a downscaled JPEG "working copy" (nameplate text stays legible)
 *   - `thumb`: a small JPEG for grids
 *   - `width`/`height`: of the working copy
 *   - `decoded`: false if the browser could not decode the source (e.g. some
 *     iOS HEIC cases) — we then keep the original bytes untouched and skip the
 *     thumbnail.
 */

export type ProcessOptions = {
  maxEdge: number // longest edge of the working copy, px
  quality: number // JPEG quality 0..1
  thumbEdge?: number // longest edge of the thumbnail, px
}

export type ProcessedImage = {
  image: Blob
  thumb: Blob | null
  width: number
  height: number
  decoded: boolean
  sourceType: string
}

const DEFAULTS = { thumbEdge: 360 }

async function toBitmap(file: Blob): Promise<ImageBitmap | null> {
  try {
    return await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    try {
      // Fallback without the orientation option (older engines).
      return await createImageBitmap(file)
    } catch {
      return null
    }
  }
}

function fit(w: number, h: number, maxEdge: number): { w: number; h: number } {
  const longest = Math.max(w, h)
  if (longest <= maxEdge) return { w, h }
  const scale = maxEdge / longest
  return { w: Math.round(w * scale), h: Math.round(h * scale) }
}

async function encode(
  bitmap: ImageBitmap,
  target: { w: number; h: number },
  quality: number,
): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = target.w
  canvas.height = target.h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('2D canvas unavailable')
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(bitmap, 0, 0, target.w, target.h)
  const blob: Blob | null = await new Promise((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', quality),
  )
  if (!blob) throw new Error('JPEG encode failed')
  return blob
}

export async function processImage(
  file: File | Blob,
  opts: ProcessOptions,
): Promise<ProcessedImage> {
  const thumbEdge = opts.thumbEdge ?? DEFAULTS.thumbEdge
  const bitmap = await toBitmap(file)

  if (!bitmap) {
    // Could not decode — store original bytes as-is, no thumbnail.
    return {
      image: file instanceof Blob ? file : new Blob([file]),
      thumb: null,
      width: 0,
      height: 0,
      decoded: false,
      sourceType: file.type || 'application/octet-stream',
    }
  }

  try {
    const work = fit(bitmap.width, bitmap.height, opts.maxEdge)
    const image = await encode(bitmap, work, opts.quality)
    const thumbTarget = fit(bitmap.width, bitmap.height, thumbEdge)
    const thumb = await encode(bitmap, thumbTarget, 0.7)
    return {
      image,
      thumb,
      width: work.w,
      height: work.h,
      decoded: true,
      sourceType: file.type || 'image/jpeg',
    }
  } finally {
    bitmap.close()
  }
}

/** Downscale a JPEG/PNG blob to a max edge (for embedding in the merge workbook).
 *  Returns the original untouched if it can't be decoded. */
export async function downscaleBlob(
  blob: Blob,
  maxEdge: number,
  quality = 0.78,
): Promise<{ blob: Blob; width: number; height: number }> {
  const bitmap = await toBitmap(blob)
  if (!bitmap) return { blob, width: 0, height: 0 }
  try {
    const target = fit(bitmap.width, bitmap.height, maxEdge)
    const out = await encode(bitmap, target, quality)
    return { blob: out, width: target.w, height: target.h }
  } finally {
    bitmap.close()
  }
}
