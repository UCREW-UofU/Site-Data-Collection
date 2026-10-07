import { useLiveQuery } from 'dexie-react-hooks'
import {
  countBySystem,
  getObservation,
  getSite,
  getSystem,
  listObservationPhotos,
  listObservations,
  listObservationsBySystem,
  listSitePhotos,
  listSites,
  listSystems,
} from '@/db/repo'

export const useSites = () => useLiveQuery(() => listSites(), [], undefined)

export const useSite = (id: string | undefined) =>
  useLiveQuery(() => (id ? getSite(id) : undefined), [id], undefined)

export const useSystems = (siteId: string | undefined) =>
  useLiveQuery(() => (siteId ? listSystems(siteId) : []), [siteId], undefined)

export const useSystem = (id: string | undefined) =>
  useLiveQuery(() => (id ? getSystem(id) : undefined), [id], undefined)

export const useObservations = (siteId: string | undefined) =>
  useLiveQuery(() => (siteId ? listObservations(siteId) : []), [siteId], undefined)

export const useSystemObservations = (
  siteId: string | undefined,
  systemId: string | undefined,
) =>
  useLiveQuery(
    () => (siteId && systemId ? listObservationsBySystem(siteId, systemId) : []),
    [siteId, systemId],
    undefined,
  )

export const useObservation = (id: string | undefined) =>
  useLiveQuery(() => (id ? getObservation(id) : undefined), [id], undefined)

export const useObservationPhotos = (observationId: string | undefined) =>
  useLiveQuery(
    () => (observationId ? listObservationPhotos(observationId) : []),
    [observationId],
    undefined,
  )

export const useSitePhotos = (siteId: string | undefined) =>
  useLiveQuery(() => (siteId ? listSitePhotos(siteId) : []), [siteId], undefined)

export const useCountsBySystem = (siteId: string | undefined) =>
  useLiveQuery(
    () => (siteId ? countBySystem(siteId) : new Map()),
    [siteId],
    new Map<string, { observations: number; photos: number }>(),
  )
