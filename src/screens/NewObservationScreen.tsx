import { useRef, useState } from 'react'
import { MultiPhotoCamera } from '@/ui/MultiPhotoCamera'
import { useNavigate, useParams } from 'react-router-dom'
import { useSystem } from '@/app/queries'
import { useSettings } from '@/app/settings'
import { capturePhoto, type CapturedPhoto } from '@/app/capture'
import { addPhoto, createObservation } from '@/db/repo'
import { plural } from '@/lib/format'
import { Banner, Button, TextArea, TextField } from '@/ui/kit'
import { Page, TopBar } from '@/ui/nav'
import { Thumb } from '@/ui/Thumb'
import { AlertIcon, CameraIcon, XIcon } from '@/ui/icons'
import { useToast } from '@/ui/toast'
import { systemObservationExample } from '@/lib/systems'

export function NewObservationScreen() {
  const { siteId = '', systemId = '' } = useParams()
  const system = useSystem(systemId)
  const nameExample = systemObservationExample(system)
  const { settings } = useSettings()
  const toast = useToast()
  const navigate = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)
  const [cameraOpen, setCameraOpen] = useState(false)

  const [photos, setPhotos] = useState<CapturedPhoto[]>([])
  const [name, setName] = useState('')
  const [location, setLocation] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [processing, setProcessing] = useState(false)

  const onFiles = async (files: FileList) => {
    setProcessing(true)
    try {
      for (const file of Array.from(files)) {
        const shot = await capturePhoto(file, settings)
        setPhotos((p) => [...p, shot])
      }
    } catch (err) {
      console.error(err)
      toast.show('Could not read that photo', 'error')
    } finally {
      setProcessing(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const removeAt = (i: number) => setPhotos((p) => p.filter((_, j) => j !== i))

  const save = async () => {
    if (!name.trim() || processing || busy) return
    setBusy(true)
    try {
      const obs = await createObservation({ siteId, systemId, name, location, note })
      for (const shot of photos) {
        await addPhoto({
          observationId: obs.id,
          siteId,
          systemId,
          image: shot.image,
          thumb: shot.thumb,
          original: shot.original,
          width: shot.width,
          height: shot.height,
          decoded: shot.decoded,
          capturedAt: shot.capturedAt,
          gps: shot.gps,
        })
      }
      toast.show(`Saved to ${system?.name ?? 'system'}`)
      navigate(`/sites/${siteId}/dashboard`)
    } finally {
      setBusy(false)
    }
  }

  const cancel = () => navigate(`/sites/${siteId}/board`)

  return (
    <Page
      topBar={
        <TopBar
          title="New observation"
          subtitle={system?.name}
          back={cancel}
        />
      }
    >
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        className="hidden"
        onChange={(e) => e.target.files?.length && onFiles(e.target.files)}
      />

        <div className="flex flex-col gap-4">
          <Button variant="primary" size="lg" onClick={() => setCameraOpen(true)} disabled={processing || busy}>
            <CameraIcon width={20} height={20} /> {processing ? 'Processing photos…' : 'Add photos'}
          </Button>
          {photos.length > 0 && <div>
            <p className="mb-1.5 text-[13px] font-medium text-[var(--text-2)]">
              {plural(photos.length, 'photo')}
              {processing && ' · processing…'}
            </p>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
              {photos.map((p, i) => (
                <div key={i} className="relative aspect-square">
                  <Thumb blob={p.thumb ?? p.image} className="h-full w-full" alt="" />
                  <button
                    onClick={() => removeAt(i)}
                    className="absolute right-1 top-1 rounded-full bg-black/55 p-1 text-white backdrop-blur-sm"
                    aria-label="Remove photo"
                  >
                    <XIcon width={13} height={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>}

          {photos.some((p) => !p.decoded) && (
            <Banner tone="warn">
              <AlertIcon width={18} height={18} className="mt-0.5 shrink-0" />
              <span>
                One photo's format couldn't be resized in-browser (often iPhone
                HEIC). The original is kept; its thumbnail is unavailable.
              </span>
            </Banner>
          )}

          <TextField
            label="Name"
            hint={`Name the equipment, e.g. “${nameExample}”.`}
            placeholder={nameExample}
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
          <TextField
            label="Location (optional)"
            hint="Where this equipment is located. Applies to all photos in this entry."
            placeholder="e.g. Mechanical Room 2 or Roof, north side"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
          <TextArea
            label="Notes"
            placeholder="Equipment purpose and observations"
            rows={4}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />

          <div className="sticky bottom-2 flex gap-2">
            <Button variant="ghost" onClick={cancel} disabled={busy}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="lg"
              className="flex-1"
              disabled={busy || processing || !name.trim()}
              onClick={save}
            >
              {busy ? 'Saving…' : 'Save observation'}
            </Button>
          </div>
        </div>
      {cameraOpen && <MultiPhotoCamera
        onPhoto={async (file) => {
          const shot = await capturePhoto(file, settings)
          setPhotos((previous) => [...previous, { ...shot, capturedAt: new Date(file.lastModified).toISOString() }])
        }}
        onDone={() => setCameraOpen(false)}
        onFallback={() => { setCameraOpen(false); fileRef.current?.click() }}
      />}
    </Page>
  )
}
