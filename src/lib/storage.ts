/** Storage persistence + usage. iOS in particular can evict non-persistent
 *  origin storage under disk pressure, so we ask for persistence up front and
 *  surface usage in the UI to nudge people to export. */

export type StorageInfo = {
  persisted: boolean
  usage: number
  quota: number
  /** usage / quota, 0..1, or null if unknown */
  ratio: number | null
  supported: boolean
}

export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (!navigator.storage?.persist) return false
    if (await navigator.storage.persisted()) return true
    return await navigator.storage.persist()
  } catch {
    return false
  }
}

export async function getStorageInfo(): Promise<StorageInfo> {
  const base: StorageInfo = {
    persisted: false,
    usage: 0,
    quota: 0,
    ratio: null,
    supported: false,
  }
  try {
    if (!navigator.storage?.estimate) return base
    const est = await navigator.storage.estimate()
    const usage = est.usage ?? 0
    const quota = est.quota ?? 0
    return {
      supported: true,
      persisted: (await navigator.storage.persisted?.()) ?? false,
      usage,
      quota,
      ratio: quota > 0 ? usage / quota : null,
    }
  } catch {
    return base
  }
}
