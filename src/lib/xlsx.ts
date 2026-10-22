import ExcelJS from 'exceljs'
import { downscaleBlob } from './image'
import { normalizeSystemName } from './systems'
import type { MergedPhoto, MergeResult } from './merge'

const MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

// Display size for embedded photos (px). Nameplate text stays readable; the
// full-resolution files are in the folders alongside.
const EMBED_MAX_EDGE = 1100
const DISPLAY_W = 340
const DISPLAY_H_CAP = 430
const PX_PER_ROW = 15 // approx default Excel row height in px

/** Excel worksheet names: ≤31 chars, no []:*?/\, unique, non-blank. */
function sheetNamer() {
  const used = new Set<string>(['summary', 'equipment'])
  return (raw: string) => {
    let base = (raw || 'System').replace(/[[\]:*?/\\]/g, ' ').trim().slice(0, 28) || 'System'
    let name = base
    let n = 2
    while (used.has(name.toLowerCase())) name = `${base} ${n++}`.slice(0, 31)
    used.add(name.toLowerCase())
    return name
  }
}

export async function buildIndexWorkbook(result: MergeResult): Promise<Blob> {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Site Collect'
  wb.created = new Date()

  /* ------------------------------ Summary ----------------------------- */
  const sum = wb.addWorksheet('Summary')
  sum.getColumn(1).width = 26
  sum.getColumn(2).width = 60
  const put = (label: string, value: string | number) => {
    const r = sum.addRow([label, value])
    r.getCell(1).font = { bold: true }
  }
  put('Site', result.site?.name || result.site?.code || '')
  put('Site code', result.site?.code || '')
  put('Assessment date', result.site?.assessmentDate || '')
  put('Bundles merged', result.bundles.map((b) => b.person).join(', '))
  put('Observations', result.totals.observations)
  put('Photos', result.totals.photos)
  put('Systems', result.totals.systems)
  sum.addRow([])

  const usageHead = sum.addRow([
    'System (as typed)',
    'Observations',
    'Photos',
    'Contributors',
    'Folded into',
  ])
  usageHead.font = { bold: true }
  for (const u of result.systemUsage) {
    sum.addRow([u.system, u.observations, u.photos, u.contributors.join(', '), u.renamedTo ?? ''])
  }

  /* A sortable index alongside the existing photo-rich system sheets. */
  const equipment = wb.addWorksheet('Equipment')
  equipment.columns = [
    { header: 'System', key: 'system', width: 22 },
    { header: 'Equipment name', key: 'name', width: 30 },
    { header: 'Location', key: 'location', width: 36 },
    { header: 'Notes', key: 'note', width: 55 },
    { header: 'Photos', key: 'photoCount', width: 10 },
    { header: 'Contributors', key: 'contributors', width: 28 },
    { header: 'Photo folder', key: 'folder', width: 60 },
  ]
  equipment.getRow(1).font = { bold: true }
  equipment.views = [{ state: 'frozen', ySplit: 1 }]
  equipment.autoFilter = 'A1:G1'
  for (const o of result.observations) {
    equipment.addRow({ ...o, location: o.location || '', contributors: o.contributors.join(', ') })
  }
  equipment.eachRow((r) => { r.alignment = { wrapText: true, vertical: 'top' } })

  /* --------------------------- per-system tabs ------------------------ */
  const nameSheet = sheetNamer()
  // group observations + their photos by final system name
  const bySystem = new Map<
    string,
    { system: string; obs: { name: string; location: string; note: string; contributors: string[]; photos: MergedPhoto[] }[] }
  >()
  for (const o of result.observations) {
    const key = normalizeSystemName(o.system)
    let g = bySystem.get(key)
    if (!g) {
      g = { system: o.system, obs: [] }
      bySystem.set(key, g)
    }
    g.obs.push({
      name: o.name,
      location: o.location || '',
      note: o.note,
      contributors: o.contributors,
      photos: result.photos.filter((p) => p.folder === o.folder),
    })
  }

  for (const g of [...bySystem.values()].sort((a, b) => a.system.localeCompare(b.system))) {
    const ws = wb.addWorksheet(nameSheet(g.system))
    ws.getColumn(1).width = 3
    ws.getColumn(2).width = 22
    for (let c = 3; c <= 20; c++) ws.getColumn(c).width = 9

    let row = 1
    const title = ws.getCell(row, 2)
    title.value = g.system
    title.font = { bold: true, size: 15 }
    row += 2

    for (const o of g.obs) {
      const h = ws.getCell(row, 2)
      h.value = o.name
      h.font = { bold: true, size: 12 }
      ws.mergeCells(row, 2, row, 12)
      row++

      const meta = ws.getCell(row, 2)
      meta.value = `${o.photos.length} photo${o.photos.length === 1 ? '' : 's'}${
        o.contributors.length ? ` · ${o.contributors.join(', ')}` : ''
      }`
      meta.font = { italic: true, color: { argb: 'FF6B7280' } }
      ws.mergeCells(row, 2, row, 12)
      row++

      ws.getCell(row, 2).value = 'Location'
      ws.getCell(row, 2).font = { bold: true }
      const locationCell = ws.getCell(row, 3)
      locationCell.value = o.location
      locationCell.alignment = { wrapText: true, vertical: 'top' }
      ws.mergeCells(row, 3, row, 14)
      ws.getRow(row).height = Math.min(160, 20 + Math.ceil(o.location.length / 60) * 15)
      row++

      ws.getCell(row, 2).value = 'Notes'
      ws.getCell(row, 2).font = { bold: true }
      const noteCell = ws.getCell(row, 3)
      noteCell.value = o.note || '—'
      noteCell.alignment = { wrapText: true, vertical: 'top' }
      ws.mergeCells(row, 3, row, 14)
      ws.getRow(row).height = Math.min(160, 20 + Math.ceil((o.note.length || 1) / 60) * 15)
      row += 2

      // Embed the photos, 3 per image-row.
      let maxRowsThisBlock = 0
      let placed = false
      for (let i = 0; i < o.photos.length; i++) {
        const mp = o.photos[i]
        const embed = await toEmbeddable(mp.image)
        if (!embed) continue
        placed = true
        const col = 2 + (i % 3) * 6 // 0-indexed tl.col below
        const rowBlock = Math.floor(i / 3)
        const dispH = Math.min(DISPLAY_H_CAP, Math.round(DISPLAY_W * (embed.h / embed.w || 0.75)))
        const rowsTall = Math.ceil(dispH / PX_PER_ROW) + 1
        maxRowsThisBlock = Math.max(maxRowsThisBlock, (rowBlock + 1) * (rowsTall + 1))
        const id = wb.addImage({ buffer: embed.buffer, extension: 'jpeg' })
        ws.addImage(id, {
          tl: { col: col - 1, row: row - 1 + rowBlock * (rowsTall + 1) },
          ext: { width: DISPLAY_W, height: dispH },
        })
      }
      if (!placed && o.photos.length) {
        ws.getCell(row, 2).value = '(photos could not be embedded — see the folder)'
        ws.getCell(row, 2).font = { italic: true, color: { argb: 'FF9CA3AF' } }
        maxRowsThisBlock = 1
      }
      row += Math.max(maxRowsThisBlock, 1) + 2
    }
  }

  const buf = await wb.xlsx.writeBuffer()
  return new Blob([buf], { type: MIME })
}

async function toEmbeddable(
  blob: Blob,
): Promise<{ buffer: ArrayBuffer; w: number; h: number } | null> {
  try {
    const { blob: small, width, height } = await downscaleBlob(blob, EMBED_MAX_EDGE)
    if (!width || !height) return null
    return { buffer: await small.arrayBuffer(), w: width, h: height }
  } catch {
    return null
  }
}
