import { useEffect, useRef, useState } from 'react'
import { Button } from './kit'

/** Native modal supplies Escape handling, focus trapping and focus restoration. */
export function PhotoViewer({ blob, title, onClose }: { blob: Blob; title: string; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [url, setUrl] = useState('')
  const [zoomed, setZoomed] = useState(false)
  useEffect(() => {
    const objectUrl = URL.createObjectURL(blob)
    setUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [blob])
  useEffect(() => {
    const element = dialog.current
    element?.showModal()
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      element?.close()
      document.body.style.overflow = overflow
    }
  }, [])
  return (
    <dialog ref={dialog} aria-label={title} onCancel={onClose} className="m-auto h-[95dvh] max-h-none w-[96vw] max-w-none rounded-xl border border-[var(--border)] bg-[var(--surface)] p-0 text-[var(--text)] backdrop:bg-black/80">
      <div className="flex h-full flex-col">
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[var(--border)] p-3">
          <h2 className="min-w-0 truncate font-semibold">{title}</h2>
          <div className="flex shrink-0 gap-2">
            <Button variant="secondary" onClick={() => setZoomed(!zoomed)}>{zoomed ? 'Fit photo' : 'Zoom in'}</Button>
            <Button variant="ghost" onClick={onClose}>Close photo</Button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-auto p-2">
          {url && <img src={url} alt={title} className={zoomed ? 'h-auto w-[200%] max-w-none' : 'h-full w-full object-contain'} />}
        </div>
      </div>
    </dialog>
  )
}
