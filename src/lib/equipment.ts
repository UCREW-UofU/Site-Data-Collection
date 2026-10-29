import type { Observation } from '@/db/types'

export type Nameplate = { equipmentType: string; values: Record<string, string> }
type Equipment = { name: string; fields: string[] }
const electrical = ['Voltage (V)', 'Phase', 'Frequency (Hz)', 'Rated current (A)']
const motor = ['Motor power (hp or kW)', 'Rated speed (RPM)', 'Nominal efficiency (%)', ...electrical]
const pump = ['Rated flow (GPM)', 'Rated head (ft)', ...motor]
const cooling = ['Rated cooling capacity (tons or Btu/h)', 'Refrigerant type', 'Refrigerant charge (lb)', 'Minimum circuit ampacity (A)', 'Maximum overcurrent protection (A)', ...electrical]
const heating = ['Fuel / energy source', 'Rated input (Btu/h or kW)', 'Rated output (Btu/h or kW)', 'Rated efficiency (%; include rating type)']
const fan = ['Rated airflow (CFM)', 'Rated static pressure (in. w.c.)', ...motor]
const types = (names: string[], fields: string[]): Equipment[] => names.map((name) => ({ name, fields }))

// Field prompts, not required specifications: copy only what the plate lists.
// Sources and scope are recorded in EQUIPMENT-FIELDS.md.
const categories: Record<string, Equipment[]> = {
  airside: [...types(['Air handler', 'Supply / return fan', 'Exhaust fan', 'Make-up air unit'], fan), ...types(['Rooftop HVAC unit'], [...cooling, ...heating]), ...types(['VAV / fan-coil unit'], ['Rated airflow (CFM)', 'Heating capacity (Btu/h or kW)', ...electrical])],
  cooling: [...types(['Chiller', 'Air conditioner / condensing unit', 'Heat pump', 'Refrigeration unit'], cooling), ...types(['Cooling tower'], ['Rated capacity (tons)', 'Rated water flow (GPM)', ...motor]), ...types(['Chilled / condenser water pump'], pump)],
  heating: [...types(['Hot-water boiler', 'Steam boiler', 'Furnace / unit heater', 'Process heater / oven'], [...heating, 'Maximum allowable working pressure (psi)', ...electrical]), ...types(['Heating water pump'], pump), ...types(['Heat exchanger'], ['Rated capacity (Btu/h)', 'Design pressure (psi)', 'Design temperature (°F)'])],
  controls: [...types(['Variable frequency drive (VFD)'], ['Rated power (hp or kW)', 'Input voltage (V)', 'Input phase', 'Output voltage (V)', 'Rated output current (A)']), ...types(['Controller / thermostat', 'Sensor / meter'], ['Device function', 'Supply voltage (V)', 'Rated range / units'])],
  'compressed-air': [...types(['Air compressor'], ['Compressor type', 'Rated airflow (CFM; include rating basis)', 'Rated pressure (psig)', 'Motor power (hp or kW)', 'Package input power (kW)', ...electrical]), ...types(['Air dryer'], ['Dryer type', 'Rated airflow (CFM)', 'Rated pressure (psig)', 'Rated input power (kW)', ...electrical]), ...types(['Air receiver'], ['Tank volume (gal)', 'Maximum allowable working pressure (psi)'])],
  production: [...types(['Process heater / oven / kiln'], heating), ...types(['Production machine', 'Conveyor', 'Vacuum pump'], ['Equipment function', 'Rated power (hp or kW)', ...electrical])],
  lighting: [...types(['Light fixture', 'Lamp / LED driver'], ['Lamp / fixture type', 'Rated watts per fixture (W)', 'Lamps per fixture', 'Fixture quantity', 'Voltage (V)', 'Rated light output (lumens)'])],
  'water-heating': [...types(['Storage water heater', 'Tankless water heater', 'Heat-pump water heater'], [...heating, 'Tank volume (gal)', 'Recovery rate (GPH; include temperature rise)', 'Efficiency rating (UEF / thermal %)']), ...types(['Hot-water recirculation pump'], pump)],
  'motors-pumps': [...types(['Electric motor'], motor), ...types(['Pump'], pump), ...types(['Fan'], fan)],
}
export const commonFields = ['Manufacturer', 'Model number', 'Serial number', 'Manufacture year (if listed)']
export function equipmentOptions(key: string): Equipment[] {
  return [...(categories[key] ?? []), { name: 'Other equipment', fields: ['Equipment type / purpose', 'Rated capacity / power (include units)', ...electrical] }]
}
export function nameplateFields(key: string, type: string): string[] {
  return [...commonFields, ...(equipmentOptions(key).find((e) => e.name === type)?.fields ?? [])]
}
export function observationText(observation: Pick<Observation, 'note' | 'nameplate'>): string {
  const plate = observation.nameplate
  if (!plate) return observation.note
  return [
    `Equipment type: ${plate.equipmentType}`,
    ...Object.entries(plate.values).filter(([, value]) => value.trim()).map(([label, value]) => `${label}: ${value}`),
    observation.note ? `Notes: ${observation.note}` : '',
  ].filter(Boolean).join('\n')
}
