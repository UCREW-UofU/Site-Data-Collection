# Site Collect

Offline-first field app for photographing and tagging equipment during energy
assessments — so a team of five walking one mechanical room comes back with photos
that are already sorted by system, attributed, and described.

## The problem it solves

Today, five people photograph the same nameplates, dump everything unlabeled into
the assessment folder, and nobody can tell which motor serves what. Site Collect
fixes that with **systems and observations**:

- **Systems** are high-level categories — Airside, Cooling, Heating, Controls,
  Compressed Air, Production, Misc (+ any a device adds). Each device toggles
  the ones its site has; the built-in seven auto-seed identically everywhere,
  so no pre-visit syncing is needed.
- An **observation** is one thing you document: a name ("Chiller 1"), an optional location
  ("Mechanical Room 2"), a note ("equipment purpose and observations"), and one or more photos (wide shot +
  nameplate, say). It's filed under a system.

At merge, observations group by system, equipment name, and location. Same names
at different locations stay separate; blank locations remain blank. Location
is shared by all photos in an entry and can be edited later. Older v2 bundles
without location still work. Use this updated app for both capture and merging;
older merge versions do not understand location. For entries without a location,
`Cooling/Chiller 1/` holds everyone's photos of that chiller with the combined
notes — and the lead gives the assessment its real name at that point, in the
Merge tool, regardless of what any individual phone called its site.

## Status

| Phase | What | State |
|---|---|---|
| 0–4 | Scaffold/PWA, capture, export, merge | ✅ |
| v2 | Reworked to systems (categories) + multi-photo observations | ✅ |
| — | Deployed to Cloudflare Pages | ✅ |
| — | `index.xlsx` rebuilt: one tab per system, photos embedded | ✅ |
| — | Email-to-lead (Brevo) — Export screen sends a bundle straight to the lead's inbox | ✅ |
| 5 | Polish: contact sheets, OCR assist, reminders | ⏳ |

Not yet done: testing on physical iPhone + Android (camera capture, HEIC
handling, storage limits, PWA install).

## Develop

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # unit tests (tag normalization, grouping, filenames)
npm run typecheck
npm run build && npm run preview   # test the PWA / service worker
```

`npm run gen:icons` regenerates the PWA PNGs from `public/favicon.svg` (needs `sharp`).

In dev, `window.sc` exposes `seed()` / `wipe()` / the Dexie handle for quick testing.

## How it works

- **All data is local.** Photos + metadata live in IndexedDB on each device. The
  static host only ever serves the app code — the one exception is "Email to
  lead," which routes a bundle through a Cloudflare Function to your email
  provider and isn't stored anywhere in between (see DEPLOY.md).
- **Client-generated UUIDs** everywhere, so bundles from different devices never
  collide. Consolidation groups by *normalized system/observation name*, not by id.
- **Working copies.** Captured photos are downscaled to a ~2400 px JPEG (nameplate
  text stays legible); full-resolution originals are kept only if you opt in.

## Deploy

Live at **https://site-collect.pages.dev** (Cloudflare Pages). Run `npm run deploy`
to ship a new build. See [`DEPLOY.md`](DEPLOY.md) for CI auto-deploy setup.

## Optional equipment location

Location is stored locally with the observation and travels in each exported
`.sitecollect.zip`, including bundles sent by email. The merged `index.xlsx`
contains an Equipment sheet with a Location column and a Location row beside
the photos on each system sheet. Blank values remain blank. With a location,
photo folders and filenames include it. No database reset is needed.
