import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/db'
import type { Observation, Photo } from '@/db/types'

/** Load all photos for a set of observations, grouped by observationId and
 *  ordered (cover first). Used by list screens for thumbnails + counts. */
export function useObservationPhotosMap(
  observations: Observation[] | undefined,
): Map<string, Photo[]> {
  const ids = (observations ?? []).map((o) => o.id)
  const key = ids.join(',')
  return (
    useLiveQuery(
      async () => {
        const map = new Map<string, Photo[]>()
        if (ids.length === 0) return map
        const photos = await db.photos.where('observationId').anyOf(ids).toArray()
        for (const p of photos) {
          const arr = map.get(p.observationId) ?? []
          arr.push(p)
          map.set(p.observationId, arr)
        }
        for (const arr of map.values()) arr.sort((a, b) => a.order - b.order)
        return map
      },
      [key],
      new Map<string, Photo[]>(),
    ) ?? new Map<string, Photo[]>()
  )
}
