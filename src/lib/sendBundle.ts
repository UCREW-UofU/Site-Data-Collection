import { exportBundle } from './bundle'

export type EmailResult =
  | { ok: true; photoCount: number; observationCount: number }
  | { ok: false; error: string; canFallBack: boolean }

/** Build this device's bundle for a site and email it to the lead via the
 *  /api/send-bundle Pages Function. */
export async function emailBundleToLead(opts: {
  siteId: string
  siteCode: string
  leadEmail: string
  device: { id: string; label: string; person: string }
  replyTo?: string
  message?: string
}): Promise<EmailResult> {
  let bundle: Awaited<ReturnType<typeof exportBundle>>
  try {
    bundle = await exportBundle(opts.siteId, opts.device)
  } catch (e) {
    return { ok: false, error: `Could not build the bundle: ${(e as Error).message}`, canFallBack: false }
  }

  const form = new FormData()
  form.set('file', new File([bundle.blob], bundle.filename, { type: 'application/zip' }))
  form.set('to', opts.leadEmail)
  form.set('fromName', opts.device.person || opts.device.label)
  form.set('siteCode', opts.siteCode)
  if (opts.replyTo) form.set('replyTo', opts.replyTo)
  if (opts.message) form.set('message', opts.message)

  let res: Response
  try {
    res = await fetch('/api/send-bundle', { method: 'POST', body: form })
  } catch {
    return { ok: false, error: 'No connection — try again when you have signal.', canFallBack: true }
  }

  if (res.status === 404) {
    return {
      ok: false,
      error: 'Email only works on the deployed site, not this local build.',
      canFallBack: true,
    }
  }

  let data: { ok?: boolean; error?: string } = {}
  try {
    data = await res.json()
  } catch {
    /* ignore */
  }

  if (res.ok && data.ok) {
    return {
      ok: true,
      photoCount: bundle.photoCount,
      observationCount: bundle.observationCount,
    }
  }
  return {
    ok: false,
    error: data.error || `Send failed (${res.status})`,
    canFallBack: true,
  }
}
