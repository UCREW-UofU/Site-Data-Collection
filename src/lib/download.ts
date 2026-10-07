/** Hand a generated file to the user. Prefers the native share sheet on mobile
 *  (AirDrop / Files / email), falls back to a download link. */
export async function saveOrShare(
  blob: Blob,
  filename: string,
  shareTitle = 'Site Collect bundle',
): Promise<'shared' | 'downloaded'> {
  const file = new File([blob], filename, { type: blob.type || 'application/zip' })

  if (
    typeof navigator.canShare === 'function' &&
    navigator.canShare({ files: [file] }) &&
    typeof navigator.share === 'function'
  ) {
    try {
      await navigator.share({ files: [file], title: shareTitle })
      return 'shared'
    } catch (err) {
      // User cancelled the share sheet — fall through to download.
      if ((err as Error).name === 'AbortError') return 'shared'
    }
  }

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
  return 'downloaded'
}
