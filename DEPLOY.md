# Deploying Site Collect

Static PWA → **Cloudflare Pages**, project **`site-collect`**.

| | |
|---|---|
| Live (production) | https://site-collect.pages.dev |
| GitHub repo | https://github.com/UCREW-Creed/site-collect (private) |
| Cloudflare account | personal (creedmccord@gmail.com) — move to a program-owned account later if needed |
| Cloudflare account ID | `6f0c294e2a8fd63d21b826007bb99d88` |

## Deploy manually (works today)

From the project folder, signed in with `wrangler login`:

```bash
npm run deploy
```

That builds and uploads `dist/` to the `site-collect` Pages project. Each run
prints a unique preview URL; the `--branch=main` in the script also updates
production (`site-collect.pages.dev`).

## Auto-deploy on push (optional)

`.github/workflows/deploy.yml` already runs tests + build on every push to `main`
and will also deploy **once a Cloudflare API token is added**:

1. Cloudflare dashboard → **My Profile → API Tokens → Create Token**.
   Use a **Custom token** with permission **Account → Cloudflare Pages → Edit**
   (scope it to the one account). Copy the token.
2. Add it as a repo secret:
   ```bash
   gh secret set CLOUDFLARE_API_TOKEN --body "PASTE_TOKEN_HERE"
   ```
   (`CLOUDFLARE_ACCOUNT_ID` is already set.)
3. Next push to `main` deploys automatically. Until then the workflow still runs
   and passes — it just skips the deploy step.

## Email-to-lead (`functions/api/send-bundle.ts`)

The Export screen has an **Email to lead** button that POSTs the person's bundle
to a Cloudflare Pages Function, which forwards it to the lead as an email
attachment. It is **not stored** anywhere in between (no R2). Bundles over ~22 MB
are rejected — those fall back to "Export my bundle".

Until a mail provider is configured the button returns a clear "not set up"
message and the app tells people to use Export instead.

### Configure a provider (pick one)

**Brevo (recommended)** — perpetual free tier (300 emails/day, no card, no
domain required; SendGrid's free plan is now a 60-day trial only, so this is
the better default).
1. brevo.com → free account → **Senders, Domains & Dedicated IPs → Senders**
   → add + verify one sender address (click the confirmation email — a Gmail
   works fine). Then **Settings → SMTP & API → API Keys** → create a key.
2. Set Pages env vars (dashboard → Settings → Environment variables, *Production*):
   - `BREVO_API_KEY` = the key (mark as secret)
   - `MAIL_FROM` = `Site Collect <the-verified-address@example.com>`
   - `MAIL_PROVIDER` = `brevo` (optional; auto-detected)

**Resend** — nicest API and generous limits, but needs a domain you can add
DNS records to (won't send to arbitrary recipients otherwise).
1. resend.com → add + verify your domain → create an API key.
2. Same env vars as above with `RESEND_API_KEY` / `MAIL_PROVIDER=resend`.

**SendGrid (Twilio)** — works the same way (single sender verification, no
domain needed) but the free plan is now a 60-day trial, so treat it as
temporary/testing only. `SENDGRID_API_KEY` / `MAIL_PROVIDER=sendgrid`.

Set the key via CLI instead of the dashboard if you prefer:
```bash
npx wrangler pages secret put BREVO_API_KEY   # or RESEND_API_KEY / SENDGRID_API_KEY
# MAIL_FROM / MAIL_PROVIDER are plain vars — set in the dashboard
```

**No provider set up yet, or don't want one?** Nothing breaks — "Email to lead"
shows a clear "not set up" message, and **"Export my bundle" already tries the
device's native share sheet first** (`src/lib/download.ts`), which is a
perfectly good fallback: on iOS/Android/most tablets it opens Mail/Gmail/AirDrop
with the zip already attached (no download to Files), only falling back to a
plain download on browsers that don't support sharing files (notably desktop
Chrome/Firefox on Windows).

**Status: configured and working.** `BREVO_API_KEY` / `MAIL_FROM` (`creed.mccord@utah.edu`)
/ `MAIL_PROVIDER=brevo` are set in Cloudflare Pages → Production, and a live
send-bundle test landed in the inbox on 2026-09-21 (Brevo flags this sender as
domain-unauthenticated — see the deliverability note above — but it delivered
fine at test volume). Rotate `BREVO_API_KEY` in Brevo + update the Cloudflare
secret if it's ever suspected of leaking (e.g. pasted somewhere it shouldn't
have been) — free and instant, no user-facing disruption.

### Per-site

Each device sets its own **Setup → Site info → Lead email** (there's no more
shared-setup sync between devices — see below). Each person can also set their
own email in Settings — used as Reply-To when they send.

## No more "Join a site" (removed 2026-09-21)

Earlier versions had a pre-visit "Join a site" flow (QR code / setup file) so
every phone's system list and site id matched before going out. **Removed at
the user's request** — field users now just work with their own local site;
the built-in system list auto-seeds identically for everyone, so nothing
needs to be pre-synced. The lead instead names the assessment for real as a
step inside the **Merge** tool, which overrides whatever individual bundles
were locally called. One consequence: **Lead email doesn't propagate
automatically anymore** — if multiple devices will use "Email to lead," each
one needs it typed in separately under Setup → Site info.

## Notes

- `public/_redirects` — SPA fallback so deep links (`/sites/:id/capture`) work on
  hard refresh. `public/_headers` — long cache for hashed assets, no-cache for
  `sw.js` / `index.html` / manifest.
- `.nvmrc` pins Node 24 for CI.
- The project was created as **Direct Upload** (`wrangler pages project create
  --force`). To switch to Cloudflare's Git integration instead, delete the
  project in the dashboard and recreate it connected to the GitHub repo with
  build command `npm run build` and output dir `dist`.
- Moving to a different host (Netlify, etc.): `_redirects` is portable as-is;
  you'd swap `_headers`/`wrangler.jsonc`/the workflow for that host's equivalent.
