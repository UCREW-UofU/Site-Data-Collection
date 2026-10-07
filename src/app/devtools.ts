/** Dev-only console helpers. Exposed on `window.sc` when running `vite dev`. */
import JSZip from 'jszip'
import ExcelJS from 'exceljs'
import { db } from '@/db/db'
import * as repo from '@/db/repo'
import * as bundle from '@/lib/bundle'
import * as merge from '@/lib/merge'

async function fakePhoto(label: string): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = 480
  canvas.height = 360
  const ctx = canvas.getContext('2d')!
  const hue = [...label].reduce((a, c) => a + c.charCodeAt(0), 0) % 360
  ctx.fillStyle = `hsl(${hue} 40% 30%)`
  ctx.fillRect(0, 0, 480, 360)
  ctx.fillStyle = 'white'
  ctx.font = 'bold 34px system-ui'
  ctx.fillText(label, 24, 190)
  return new Promise((res) => canvas.toBlob((b) => res(b!), 'image/jpeg', 0.8))
}

async function seed() {
  const site = await repo.createSite({
    code: 'UU-2026-DemoBldg',
    name: 'Demo Building',
    address: '123 Campus Dr',
    assessmentDate: '2026-09-09',
  })
  const systems = await repo.listSystems(site.id)
  const byName = (n: string) => systems.find((s) => s.name === n)!

  const specs: [string, string, string, string[]][] = [
    ['Cooling', 'Chiller 1', 'Serves the whole building. 300 ton centrifugal, no VFD.', ['Chiller 1 nameplate', 'Chiller 1 overview']],
    ['Cooling', 'CHW Pump 2', 'Lead chilled-water pump. Runs constantly.', ['CHW Pump 2']],
    ['Heating', 'Boiler 1', 'Primary hot water boiler. Original equipment, ~1998.', ['Boiler 1 nameplate', 'Boiler 1 gauge']],
    ['Compressed Air', 'Main air compressor', 'Rotary screw, serves the shop. Short-cycles.', ['Air compressor']],
  ]
  for (const [sysName, obsName, note, photoLabels] of specs) {
    const sys = byName(sysName)
    const obs = await repo.createObservation({
      siteId: site.id,
      systemId: sys.id,
      name: obsName,
      note,
    })
    for (const lbl of photoLabels) {
      const img = await fakePhoto(lbl)
      await repo.addPhoto({
        observationId: obs.id,
        siteId: site.id,
        systemId: sys.id,
        image: img,
        thumb: img,
        width: 480,
        height: 360,
      })
    }
  }
  return site.id
}

async function wipe() {
  await db.delete()
  location.reload()
}

export function installDevtools() {
  Object.assign(window, {
    sc: { db, repo, bundle, merge, JSZip, ExcelJS, seed, wipe, fakePhoto },
  })
  console.info('[site-collect] dev tools ready: window.sc.seed() / window.sc.wipe()')
}
