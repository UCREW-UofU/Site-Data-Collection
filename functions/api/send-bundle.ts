/**
 * POST /api/send-bundle  — email one person's export bundle to the site lead.
 *
 * multipart/form-data:
 *   file       the .sitecollect.zip
 *   to         lead email address
 *   fromName   who is sending (person name)
 *   siteCode   for the subject line
 *   replyTo    (optional) sender's email, set as Reply-To
 *   message    (optional) short note from the sender
 *
 * Server config (set as Pages env vars / secrets):
 *   MAIL_PROVIDER    "brevo" | "resend" | "sendgrid"  (defaults to whichever key is present)
 *   BREVO_API_KEY    for Brevo (recommended — perpetual free tier, no domain needed)
 *   RESEND_API_KEY   for Resend (needs a verified domain to mail arbitrary recipients)
 *   SENDGRID_API_KEY for SendGrid (now Twilio; free tier is a 60-day trial only)
 *   MAIL_FROM        verified sender, e.g. "Site Collect <assessments@example.com>"
 *                    or a bare address
 */

interface Env {
  MAIL_PROVIDER?: string
  BREVO_API_KEY?: string
  RESEND_API_KEY?: string
  SENDGRID_API_KEY?: string
  MAIL_FROM?: string
}

// Keep well under the Workers 128 MB memory ceiling (file + base64 + overhead).
const MAX_BYTES = 22 * 1024 * 1024
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const provider =
    env.MAIL_PROVIDER ||
    (env.BREVO_API_KEY ? 'brevo' : env.RESEND_API_KEY ? 'resend' : env.SENDGRID_API_KEY ? 'sendgrid' : '')
  if (!provider || !env.MAIL_FROM) {
    return json(
      { error: 'Emailing is not set up on the server yet — use “Export my bundle” instead.' },
      503,
    )
  }

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return json({ error: 'Bad request' }, 400)
  }

  const file = form.get('file')
  const to = String(form.get('to') || '').trim()
  const fromName = String(form.get('fromName') || 'A teammate').slice(0, 80)
  const siteCode = String(form.get('siteCode') || 'assessment').slice(0, 80)
  const replyTo = String(form.get('replyTo') || '').trim()
  const message = String(form.get('message') || '').slice(0, 1000)

  if (!(file instanceof File)) return json({ error: 'No bundle attached' }, 400)
  if (!EMAIL_RE.test(to)) return json({ error: 'The lead email address looks wrong' }, 400)
  if (replyTo && !EMAIL_RE.test(replyTo)) return json({ error: 'Your email address looks wrong' }, 400)
  if (file.size > MAX_BYTES) {
    return json(
      {
        error: `This bundle is ${(file.size / 1048576).toFixed(0)} MB — too big to email. Use “Export my bundle” and share the file directly.`,
      },
      413,
    )
  }

  const b64 = toBase64(await file.arrayBuffer())
  const filename = sanitizeFilename(file.name || `${siteCode}.sitecollect.zip`)
  const origin = new URL(request.url).origin
  const subject = `Site Collect bundle — ${siteCode} — from ${fromName}`
  const text =
    `${fromName} sent their Site Collect bundle for ${siteCode}.\n` +
    (message ? `\n"${message}"\n` : '') +
    `\nSave the attachment, then open the Merge tool to combine it with the rest of the team:\n${origin}/merge\n`

  try {
    if (provider === 'brevo') {
      await sendBrevo(env, { to, replyTo, subject, text, filename, b64 })
    } else if (provider === 'resend') {
      await sendResend(env, { to, replyTo, subject, text, filename, b64 })
    } else {
      await sendSendgrid(env, { to, replyTo, subject, text, filename, b64 })
    }
  } catch (e) {
    return json({ error: `Email provider rejected the message: ${(e as Error).message}` }, 502)
  }

  return json({ ok: true })
}

type MailArgs = {
  to: string
  replyTo: string
  subject: string
  text: string
  filename: string
  b64: string
}

async function sendBrevo(env: Env, m: MailArgs) {
  const sender = parseAddress(env.MAIL_FROM!)
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': env.BREVO_API_KEY!,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      sender,
      to: [{ email: m.to }],
      ...(m.replyTo ? { replyTo: { email: m.replyTo } } : {}),
      subject: m.subject,
      textContent: m.text,
      attachment: [{ name: m.filename, content: m.b64 }],
    }),
  })
  if (!res.ok) throw new Error(`${res.status} ${(await res.text()).slice(0, 200)}`)
}

async function sendResend(env: Env, m: MailArgs) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: env.MAIL_FROM,
      to: [m.to],
      ...(m.replyTo ? { reply_to: m.replyTo } : {}),
      subject: m.subject,
      text: m.text,
      attachments: [{ filename: m.filename, content: m.b64 }],
    }),
  })
  if (!res.ok) throw new Error(`${res.status} ${(await res.text()).slice(0, 200)}`)
}

async function sendSendgrid(env: Env, m: MailArgs) {
  const from = parseAddress(env.MAIL_FROM!)
  const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.SENDGRID_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: m.to }] }],
      from,
      ...(m.replyTo ? { reply_to: { email: m.replyTo } } : {}),
      subject: m.subject,
      content: [{ type: 'text/plain', value: m.text }],
      attachments: [
        {
          content: m.b64,
          filename: m.filename,
          type: 'application/zip',
          disposition: 'attachment',
        },
      ],
    }),
  })
  if (!res.ok) throw new Error(`${res.status} ${(await res.text()).slice(0, 200)}`)
}

function parseAddress(s: string): { email: string; name?: string } {
  const m = s.match(/^\s*(.*?)\s*<([^>]+)>\s*$/)
  return m ? { name: m[1] || undefined, email: m[2] } : { email: s.trim() }
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^\w.\-]+/g, '_').slice(0, 120) || 'bundle.zip'
}

function toBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf)
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
