// Generates the PNG PWA icons from public/favicon.svg.
// Run: npm run gen:icons   (requires the optional devDependency `sharp`)
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const svgPath = resolve(root, 'public/favicon.svg')
const outDir = resolve(root, 'public/icons')

let sharp
try {
  sharp = (await import('sharp')).default
} catch {
  console.error(
    'This script needs `sharp`. Install it with:  npm i -D sharp\n' +
      'Then re-run:  npm run gen:icons',
  )
  process.exit(1)
}

const svg = await readFile(svgPath)
await mkdir(outDir, { recursive: true })

const bg = { r: 15, g: 23, b: 42, alpha: 1 } // #0f172a

async function render(size, { maskable = false } = {}) {
  const inner = maskable ? Math.round(size * 0.8) : size
  const pad = Math.round((size - inner) / 2)
  return sharp(svg)
    .resize(inner, inner)
    .extend({ top: pad, bottom: pad, left: pad, right: pad, background: bg })
    .flatten({ background: bg })
    .png()
    .toBuffer()
}

const jobs = [
  ['icons/icon-192.png', await render(192)],
  ['icons/icon-512.png', await render(512)],
  ['icons/icon-maskable-512.png', await render(512, { maskable: true })],
  ['apple-touch-icon.png', await render(180)],
  ['favicon-32.png', await render(32)],
]

for (const [name, buf] of jobs) {
  await writeFile(resolve(root, 'public', name), buf)
  console.log('wrote public/' + name)
}
