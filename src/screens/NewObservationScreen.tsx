import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { equipmentOptions, type Nameplate } from '@/lib/equipment'
import { NameplateFields } from '@/ui/NameplateFields'
import { useSystem } from '@/app/queries'
import { useSettings } from '@/app/settings'
import { capturePhoto, type CapturedPhoto } from '@/app/capture'
import { addPhoto, createObservation } from '@/db/repo'
import { plural } from '@/lib/format'
import { Banner, Button, TextArea, TextField } from '@/ui/kit'
import { Page, TopBar } from '@/ui/nav'
import { Thumb } from '@/ui/Thumb'
import { AlertIcon, CameraIcon, PlusIcon, XIcon } from '@/ui/icons'
import { useToast } from '@/ui/toast'

export function NewObservationScreen() {
  const { siteId = '', systemId = '' } = useParams()
  const system = useSystem(systemId)
  const { settings } = useSettings()
  const toast = useToast()
  const navigate = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)
  const [searchParams] = useSearchParams()
  const [manual, setManual] = useState(searchParams.get('manual') === '1')
  const [nameplate, setNameplate] = useState<Nameplate>({ equipmentType: '', values: {} })
  const [choosingType, setChoosingType] = useState(true)
  const systemKey = system?.defaultKey || system?.normalizedName.toLowerCase() || ''

  const [photos, setPhotos] = useState<CapturedPhoto[]>([])
  const [name, setName] = useState('')
  const [location, setLocation] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [processing, setProcessing] = useState(false)
  const openedOnce = useRef(false)

  // Camera-first: fire the picker as soon as we land here.
  useEffect(() => {
    if (!manual && !openedOnce.current) {
      openedOnce.current = true
      fileRef.current?.click()
    }
  }, [manual])

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
    if (!name.trim() || (!manual && photos.length === 0)) return
    setBusy(true)
    try {
      const obs = await createObservation({ siteId, systemId, name, location, note, nameplate: manual && nameplate.equipmentType ? nameplate : undefined })
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
      navigate(`/sites/${siteId}/systems/${systemId}`)
    } finally {
      setBusy(false)
    }
  }

  const cancel = () => navigate(`/sites/${siteId}/systems/${systemId}`)

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

      {manual && choosingType ? (
        <div className="flex flex-col gap-3">
          <h1 className="text-lg font-semibold">What type of equipment?</h1>
          <p className="text-sm text-[var(--text-2)]">Choose a type to get the right nameplate fields.</p>
          {equipmentOptions(systemKey).map((equipment) => (
            <Button key={equipment.name} variant="secondary" size="lg" className="w-full" onClick={() => {
              setNameplate((previous) => ({ ...previous, equipmentType: equipment.name }))
              setChoosingType(false)
            }}>{equipment.name}</Button>
          ))}
          <Button variant="ghost" onClick={() => nameplate.equipmentType ? setChoosingType(false) : cancel()}>Cancel</Button>
        </div>
      ) : photos.length === 0 && !manual ? (
        <div className="flex flex-col items-center gap-4 py-10">
          {processing ? (
            <div className="flex flex-col items-center gap-3 text-[var(--text-3)]">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
              Processing photo…
            </div>
          ) : (
            <>
              <p className="text-center text-sm text-[var(--text-3)]">
                Take at least one photo to start this observation.
              </p>
              <Button
                variant="primary"
                size="lg"
                onClick={() => fileRef.current?.click()}
              >
                <CameraIcon width={20} height={20} /> Take photo
              </Button>
              <Button variant="secondary" onClick={() => setManual(true)}>Add manually</Button>
              <button className="text-sm text-[var(--text-3)] underline" onClick={cancel}>
                Cancel
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {manual && <div className="flex items-center justify-between gap-3">
            <h1 className="text-lg font-semibold">{nameplate.equipmentType}</h1>
            <Button variant="ghost" onClick={() => setChoosingType(true)}>Change type</Button>
          </div>}
          {(!manual || photos.length > 0) && <div>
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
              <button
                onClick={() => fileRef.current?.click()}
                className="flex aspect-square flex-col items-center justify-center gap-0.5 rounded-lg border-2 border-dashed border-brand-400 text-brand-600"
              >
                <PlusIcon width={18} height={18} />
                <span className="text-[10px] leading-none">Add</span>
              </button>
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
            hint="The equipment, e.g. “Chiller 1”, “CHW Pump 2”, “Main air compressor”"
            placeholder="Chiller 1"
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
          {manual && <NameplateFields systemKey={systemKey} value={nameplate} onChange={setNameplate} showType={false} />}
          {manual && photos.length === 0 && <Button variant="secondary" onClick={() => fileRef.current?.click()}><CameraIcon width={18} height={18} /> Add photo (optional)</Button>}
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
              disabled={busy || processing || !name.trim() || (!manual && photos.length === 0)}
              onClick={save}
            >
              {busy ? 'Saving…' : 'Save observation'}
            </Button>
          </div>
        </div>
      )}
    </Page>
  )
}
