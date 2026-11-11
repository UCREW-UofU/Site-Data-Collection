# Manual equipment entries

Current flow (2026-11-06): Add manually opens the same Name, Location and Notes
form used for photo entries, with no photo required. The equipment-type chooser
and structured fields described below are no longer used for new entries.
Previously saved structured nameplates remain editable and included in exports.

## Previous structured-entry implementation

Flow: Systems → equipment category → Add manually → equipment type → basic
nameplate fields → free-text notes. Only the entry name is required. Photos
can be added later. Every category, including custom categories, has Other
equipment. Technical values accept text so dual ratings and units can be copied
without guessing or converting. These are rated data, not measured loads.

Manual creation starts with a dedicated equipment-type chooser. The form then
shows manufacturer/model/serial, applicable voltage/current ratings, and up to
three equipment-specific prompts. Remaining ratings are under a collapsed
Additional ratings section. Changing type keeps previously entered values;
fields outside the current template remain available under Additional ratings.

Added Lighting, Water Heating, and Motors & Pumps to the existing defaults.
Existing names remain unchanged to preserve cross-device merge grouping.
Motors and pumps can also be recorded under their served heating/cooling system.

Manufacturer, model, serial and manufacture year (when listed) are common fields.
Equipment-specific prompts cover electrical ratings, motor speed/efficiency,
cooling capacity/refrigerant, heating input/output/fuel, airflow, water flow/head,
compressor capacity/pressure, lighting watts/count, and water-heater capacity.
Some performance ratings may be on the manufacturer's data sheet rather than
the plate; leave them blank when unavailable. No requirement to access live
equipment or infer missing ratings.

## Research basis

- DOE assessment tools cover motors, pumps, fans, lighting and process heat:
  https://www.energy.gov/cmei/ito/ito-software-tools
- Oregon State University assessment guidance on motor nameplate ratings:
  https://eec.oregonstate.edu/node/97
- Trane chiller identification, electrical and refrigerant nameplate information:
  https://www.trane.com/content/dam/Trane/Commercial/global/products-systems/equipment/chillers/water-cooled/Agility/HDWA-SVX002B-EN_11302022.pdf
- DOE energy handbook on boiler input/output and efficiency:
  https://betterbuildingssolutioncenter.energy.gov/sites/default/files/attachments/energy-information-handbook.pdf
- DOE compressed air sourcebook (including compressor data-sheet fields):
  https://www.energy.gov/sites/default/files/2014/05/f16/compressed_air_sourcebook.pdf
- NRCan commercial boiler fuel input/output capacity:
  https://natural-resources.canada.ca/energy-efficiency/energy-efficiency-regulations/gas-boilers-commercial

The selection of types and compact field sets is an implementation recommendation
based on these resources, not a mandatory assessment standard.

## Storage and exports

Optional unindexed `Observation.nameplate` stores the selected type and labeled
values. Older observations remain compatible; IndexedDB needs no reset.
Bundle manifests serialize this data unchanged. The updated merge app includes
photo-free observations and renders nameplate values in spreadsheet Notes,
alongside the free-text notes and contributor attribution. Older merge apps
do not support photo-free entries; use the updated app to merge these bundles.
