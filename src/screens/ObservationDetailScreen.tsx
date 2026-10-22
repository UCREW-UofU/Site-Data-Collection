import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useObservation, useObservationPhotos, useSystems } from '@/app/queries'
import { useSettings } from '@/app/settings'
import { capturePhoto } from '@/app/capture'
import {
  addPhoto,
  deleteObservation,
  deletePhoto,
  updateObservation,
} from '@/db/repo'
import { formatDateTime } from '@/lib/format'
import { Button, Card, Select, TextArea, TextField } from '@/ui/kit'
import { Page, TopBar } from '@/ui/nav'
import { Thumb } from '@/ui/Thumb'
import { CameraIcon, TrashIcon, XIcon } from '@/ui/icons'
import { useToast } from '@/ui/toast'

export function ObservationDetailScreen() {
  const { siteId = '', observationId = '' } = useParams()
  const observation = useObservation(observationId)
  const photos = useObservationPhotos(observationId)
  const systems = useSystems(siteId) ?? []
  const { settings } = useSettings()
  const toast = useToast()
  const navigate = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)

  const [name, setName] = useState('')
  const [location, setLocation] = useState('')
  const [note, setNote] = useState('')
  const [systemId, setSystemId] = useState('')
  const [loaded, setLoaded] = useState(false)
  const [busy, setBusy] = useState(false)
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    if (observation && !loaded) {
      setName(observation.name)
      setLocation(observation.location ?? '')
      setNote(observation.note)
      setSystemId(observation.systemId)
      setLoaded(true)
    }
  }, [observation, loaded])

  if (observation === undefined) {
    return (
      <Page topBar={<TopBar title="Observation" back={`/sites/${siteId}/board`} />}>
        <div className="py-16 text-center text-[var(--text-3)]">Loading…</div>
      </Page>
    )
  }
  if (observation === null) {
    return (
      <Page topBar={<TopBar title="Observation" back={`/sites/${siteId}/board`} />}>
        <p className="py-16 text-center text-[var(--text-3)]">Not found.</p>
      </Page>
    )
  }

  const dirty =
    name !== observation.name ||
    location !== (observation.location ?? '') ||
    note !== observation.note ||
    systemId !== observation.systemId

  const onFiles = async (files: FileList) => {
    setProcessing(true)
    try {
      for (const file of Array.from(files)) {
        const shot = await capturePhoto(file, settings)
        await addPhoto({
          observationId,
          siteId,
          systemId: observation.systemId,
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
      toast.show('Photo added')
    } catch (err) {
      console.error(err)
      toast.show('Could not add that photo', 'error')
    } finally {
      setProcessing(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const saveChanges = async () => {
    if (!name.trim()) return
    setBusy(true)
    try {
      await updateObservation(observationId, { name: name.trim(), location, note: note.trim(), systemId })
      toast.show('Saved')
      navigate(-1)
    } finally {
      setBusy(false)
    }
  }

  const removeObservation = async () => {
    if (!confirm(`Delete "${observation.name}" and its ${photos?.length ?? 0} photo(s)?`)) return
    await deleteObservation(observationId)
    toast.show('Observation deleted')
    navigate(`/sites/${siteId}/systems/${observation.systemId}`)
  }

  const removePhoto = async (id: string) => {
    if ((photos?.length ?? 0) <= 1) {
      toast.show('An observation needs at least one photo', 'error')
      return
    }
    if (confirm('Delete this photo?')) await deletePhoto(id)
  }

  return (
    <Page
      topBar={
        <TopBar
          title={observation.name}
          subtitle={`${observation.capturedBy} · ${formatDateTime(observation.updatedAt)}`}
          back={`/sites/${siteId}/systems/${observation.systemId}`}
          right={
            <Button variant="ghost" onClick={removeObservation} aria-label="Delete">
              <TrashIcon />
            </Button>
          }
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

      <div className="mb-4 flex flex-col gap-3">
        {(photos ?? []).map((p) => (
          <Card key={p.id} className="relative overflow-hidden">
            <Thumb
              blob={p.image}
              className="max-h-[55vh] w-full object-contain"
              rounded="rounded-2xl"
              alt=""
            />
            <button
              onClick={() => removePhoto(p.id)}
              className="absolute right-2 top-2 rounded-full bg-black/50 p-1.5 text-white backdrop-blur-sm"
              aria-label="Delete photo"
            >
              <XIcon width={15} height={15} />
            </button>
            {!p.decoded && (
              <div className="bg-amber-50 px-3 py-1.5 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                Stored as original (not resized in-browser).
              </div>
            )}
          </Card>
        ))}

        <Button
          variant="secondary"
          onClick={() => fileRef.current?.click()}
          disabled={processing}
        >
          {processing ? (
            'Processing…'
          ) : (
            <>
              <CameraIcon width={18} height={18} /> Add another photo
            </>
          )}
        </Button>
      </div>

      <div className="flex flex-col gap-3">
        <TextField
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
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
        <Select
          label="System"
          value={systemId}
          onChange={(e) => setSystemId(e.target.value)}
        >
          {systems.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
              {!s.active ? ' (off)' : ''}
            </option>
          ))}
        </Select>
      </div>

      <div className="sticky bottom-2 mt-5 flex gap-2">
        <Button variant="ghost" onClick={() => navigate(-1)} disabled={busy}>
          {dirty ? 'Cancel' : 'Back'}
        </Button>
        <Button
          variant="primary"
          size="lg"
          className="flex-1"
          onClick={saveChanges}
          disabled={busy || !name.trim() || !dirty}
        >
          {busy ? 'Saving…' : 'Save changes'}
        </Button>
      </div>
    </Page>
  )
}
