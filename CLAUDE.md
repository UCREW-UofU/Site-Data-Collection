# Site Collect — working notes for Claude

Offline PWA for tagging equipment photos on energy-assessment site visits, so a
5-person team's photos come back sorted by system. See `README.md` for the
phase status, `DEPLOY.md` for hosting/email-provider setup, and
`C:\Users\cmccord\.claude\plans\i-would-like-to-unified-rossum.md` for the
original plan (some of it is now superseded — this file + README/DEPLOY are
the current source of truth).

## Shell setup on this machine

Node and Git were installed via winget but the app's PATH is stale. Every
PowerShell command needs this prefix or `node`/`npm`/`git` won't be found:

```powershell
$env:Path = [Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [Environment]::GetEnvironmentVariable("Path","User")
```

(Restarting the Claude Code app once fixes this permanently.)

## Model (v2 — Dexie schema v2)

- **System** = a high-level category (Airside, Cooling, Heating, Controls,
  Compressed Air, Production, Misc + custom). Leads toggle each `active`.
  Defaults seeded by `repo.ensureDefaultSystems` (also the v1→v2 migration path).
- **Observation** = one documented thing: a required `name` + a `note` + one or
  more **Photos**, all under one system. This is the unit that groups at export.
- **Photo** = just image/thumb/original + exif + order. No per-photo metadata
  (kinds/descriptors/nameplate were removed — "simplest version" per the user).
- Screens: SystemsBoard → System → New/Detail Observation; Setup (toggles +
  custom + site info); Browse (system → observation). Camera fires on mount
  in NewObservation.

## No pre-visit shared setup (removed 2026-09-21)

There used to be a "Join a site" flow (scan a QR / open a setup file shared by
the lead so everyone's system list + site id matched before the visit). **This
was removed at the user's request** — `JoinScreen.tsx`, `ShareSetupSheet.tsx`,
`src/lib/setup.ts`, and `repo.importSetup` are all gone, along with the
`qrcode` and `@zxing/browser` dependencies.

Current model: every field user just creates their own local site (or the lead
does) — the 7 default systems auto-seed identically for everyone regardless, so
no pre-sync is needed for the common case. Consequence to remember: **`leadEmail`
no longer propagates automatically** — each device's Setup → Site info needs it
typed in separately if that device is going to use "Email to lead" itself; the
lead names the assessment for real (Name + Site code) as a step in **MergeScreen**,
overriding whatever individual bundles were locally called.

## Consolidation

- **Group key is the normalized system name, then normalized observation name**
  — `src/lib/systems.ts` (`normalizeSystemName`, `groupBySystem`, `applyRenameRules`).
  No fuzzy matching, no photo de-dup. Same-named observations from different people
  merge into ONE folder with combined `— name: note` text.
- Client UUIDs everywhere (`src/lib/id.ts`).
- Bundle = ZIP (`src/lib/bundle.ts` v2, has `observations[]`). Merge is in-memory
  desktop-only (`src/lib/merge.ts` → `src/lib/xlsx.ts`).
- Export tree: `<SiteCode>/<System>/<Observation>/<System>__<Observation>__<seq>__<person>__<date>.jpg`
- `index.xlsx` (ExcelJS, not write-excel-file) has a Summary tab + one tab per
  system, each observation listed with its notes and photos **embedded inline**
  (downscaled ~1100px — see `downscaleBlob` in `src/lib/image.ts`).
- Lazy-loaded routes keep jszip / exceljs out of the capture path (MergeScreen
  and ExportScreen pull them in on demand).

## Email-to-lead

`functions/api/send-bundle.ts` (Cloudflare Pages Function) forwards a bundle as
an email attachment via **Brevo** (current provider — perpetual free tier, no
domain needed; Resend/SendGrid also supported via `MAIL_PROVIDER`, see
DEPLOY.md). Configured and confirmed working against the live site. Bundles
over ~22 MB are rejected client-side with a message pointing back to "Export
my bundle" / the native share sheet.

**Rotating `BREVO_API_KEY` is two steps, not one**: regenerate in Brevo AND
update the Cloudflare Pages secret to match, or sends start failing with a 401
"Key not found" (happened once already).

## Constraints that bite

- `tsconfig` has `verbatimModuleSyntax` + `erasableSyntaxOnly`: use `import type`,
  no TS `enum`s (use `as const` arrays + union types), no param properties.
- TS 6: no `baseUrl` (use `paths` with `./` prefixes).
- iOS: HEIC may not decode in-canvas (`processImage` keeps the original, skips
  thumbnail, sets `decoded: false`); storage can be evicted — we call
  `navigator.storage.persist()` and show a usage meter.
- I (Claude) never type/paste API keys or other credentials into any field,
  dashboard, or CLI prompt — even when the user provides the value directly and
  asks for it. Point them to the exact dashboard steps instead.

## Dev

`npm run dev` · `npm test` · `npm run typecheck` (also typechecks `functions/`)
· `npm run build && npm run preview`. In dev, `window.sc` exposes `seed()`,
`wipe()`, `db`, `repo`, `bundle`, `merge`, `JSZip`, `ExcelJS`.

Local Function testing: `npx wrangler pages dev dist --port 8788` (reads
`.dev.vars`, gitignored, for fake provider keys during testing).
