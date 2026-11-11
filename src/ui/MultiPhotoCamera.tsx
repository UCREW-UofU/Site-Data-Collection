import { useEffect, useRef, useState } from 'react'
import { Button } from './kit'

/** Keep the stream open between shots, but stop every track when closed. */
export function MultiPhotoCamera({ onPhoto, onDone, onFallback }: {
  onPhoto: (file: File) => Promise<void>
  onDone: () => void
  onFallback: () => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const video = useRef<HTMLVideoElement>(null)
  const stream = useRef<MediaStream | null>(null)
  const pending = useRef(false)
  const mounted = useRef(false)
  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState(false)
  const [count, setCount] = useState(0)
  const [error, setError] = useState('')

  useEffect(() => {
    mounted.current = true
    let cancelled = false
    dialog.current?.showModal()
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const start = async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('unsupported')
        const camera = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 3840 }, height: { ideal: 2160 } },
        })
        if (cancelled) {
          camera.getTracks().forEach((track) => track.stop())
          return
        }
        stream.current = camera
        camera.getVideoTracks().forEach((track) => {
          track.onended = () => {
            if (!cancelled) { setReady(false); setError('Camera stopped. Use your phone camera or choose photos instead.') }
          }
        })
        if (video.current) {
          video.current.srcObject = camera
          await video.current.play()
        }
      } catch {
        if (!cancelled) {
          stream.current?.getTracks().forEach((track) => track.stop())
          setError('Camera unavailable or permission denied. Use your phone camera or choose photos instead.')
        }
      }
    }
    void start()
    return () => {
      cancelled = true
      mounted.current = false
      stream.current?.getTracks().forEach((track) => { track.onended = null; track.stop() })
      stream.current = null
      document.body.style.overflow = previous
    }
  }, [])

  const takePhoto = async () => {
    const element = video.current
    if (pending.current || !ready || !element?.videoWidth || !element.videoHeight) return
    pending.current = true
    setBusy(true)
    setError('')
    try {
      const canvas = document.createElement('canvas')
      canvas.width = element.videoWidth
      canvas.height = element.videoHeight
      const context = canvas.getContext('2d')
      if (!context) throw new Error('Cannot capture')
      context.drawImage(element, 0, 0)
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((value) => value ? resolve(value) : reject(new Error('Cannot encode photo')), 'image/jpeg', 0.95)
      })
      await onPhoto(new File([blob], `camera-${Date.now()}.jpg`, { type: 'image/jpeg', lastModified: Date.now() }))
      if (mounted.current) setCount((n) => n + 1)
    } catch {
      if (mounted.current) setError('That photo was not added. Try again or use the phone camera / photo picker.')
    } finally {
      pending.current = false
      if (mounted.current) setBusy(false)
    }
  }

  return (
    <dialog ref={dialog} aria-label="Take multiple photos" onCancel={(event) => {
      event.preventDefault()
      if (!pending.current) onDone()
    }} className="m-auto h-[96dvh] max-h-none w-[96vw] max-w-3xl rounded-2xl bg-[var(--surface)] p-0 text-[var(--text)] backdrop:bg-black/80">
      <div className="flex h-full flex-col gap-3 p-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-semibold">Take photos</h2>
          <Button onClick={onDone} disabled={busy}>Done</Button>
        </div>
        <video ref={video} autoPlay muted playsInline onLoadedData={() => setReady(true)} className="min-h-0 flex-1 rounded-xl bg-black object-contain" aria-label="Live camera preview" />
        <p role="status" className="text-center text-sm">{count} {count === 1 ? 'photo' : 'photos'} added{busy ? ' · processing…' : ''}</p>
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        {!ready && !error && <p className="text-center text-sm">Starting camera… Allow camera access if prompted.</p>}
        <Button variant="primary" size="lg" onClick={() => void takePhoto()} disabled={!ready || busy}>{busy ? 'Adding photo…' : 'Take photo'}</Button>
        <Button variant="ghost" onClick={onFallback} disabled={busy}>Use phone camera / choose photos</Button>
      </div>
    </dialog>
  )
}
