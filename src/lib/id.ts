/** Client-side unique ids. `crypto.randomUUID` is available in all our targets
 *  (secure contexts: https / localhost). Bundles from different devices never
 *  collide on these. */
export function uuid(): string {
  return crypto.randomUUID()
}

/** A short, human-ish id for device identification in exports. */
export function shortId(len = 6): string {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
  let out = ''
  const bytes = crypto.getRandomValues(new Uint8Array(len))
  for (const b of bytes) out += alphabet[b % alphabet.length]
  return out
}
