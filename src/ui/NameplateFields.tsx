import { equipmentOptions, nameplateFields, type Nameplate } from '@/lib/equipment'
import { Select, TextField } from './kit'

export function NameplateFields({ systemKey, value, onChange, showType = true }: {
  systemKey: string
  value: Nameplate
  onChange: (value: Nameplate) => void
  showType?: boolean
}) {
  const options = equipmentOptions(systemKey)
  const fields = nameplateFields(systemKey, value.equipmentType)
  // Preserve filled fields when an entry is moved to another system/type.
  const extraFields = Object.keys(value.values).filter((key) => !fields.includes(key) && value.values[key])
  const identity = fields.filter((field) => ['Manufacturer', 'Model number', 'Serial number'].includes(field))
  const electrical = fields.filter((field) => /voltage|current/i.test(field) && !/overcurrent/i.test(field))
  const specific = fields.filter((field) => !identity.includes(field) && !electrical.includes(field) && !/manufacture year|phase|frequency|efficiency|overcurrent|ampacity|charge/i.test(field)).slice(0, 3)
  const basicFields = [...identity, ...electrical, ...specific]
  const additionalFields = [...fields.filter((field) => !basicFields.includes(field)), ...extraFields]
  const renderField = (label: string) => (
    <TextField key={label} label={label === 'Rated current (A)' ? 'Nameplate amps (A)' : label} value={value.values[label] ?? ''} onChange={(e) => onChange({ ...value, values: { ...value.values, [label]: e.target.value } })} />
  )
  return (
    <div className="flex flex-col gap-3">
      {showType && <Select label="Equipment type" value={value.equipmentType} onChange={(e) => onChange({ ...value, equipmentType: e.target.value })}>
        <option value="">Choose equipment type</option>
        {value.equipmentType && !options.some((o) => o.name === value.equipmentType) && <option>{value.equipmentType}</option>}
        {options.map((option) => <option key={option.name}>{option.name}</option>)}
      </Select>}
      {value.equipmentType && <>
        <p className="text-xs text-[var(--text-3)]">Copy the nameplate ratings. Leave anything you can't find blank.</p>
        {basicFields.map(renderField)}
        {additionalFields.length > 0 && <details>
          <summary className="cursor-pointer text-sm text-[var(--text-2)]">Additional ratings (optional)</summary>
          <div className="mt-3 flex flex-col gap-3">{additionalFields.map(renderField)}</div>
        </details>}
      </>}
    </div>
  )
}
