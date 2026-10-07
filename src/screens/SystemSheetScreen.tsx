import { useParams } from 'react-router-dom'
import { useSite, useSystems } from '@/app/queries'
import { formatDate } from '@/lib/format'
import { Button } from '@/ui/kit'
import { TopBar } from '@/ui/nav'

/** A clean, print-friendly list of the site's active systems. Hand it out on
 *  paper so the team knows which systems to file observations under. */
export function SystemSheetScreen() {
  const { siteId = '' } = useParams()
  const site = useSite(siteId)
  const systems = (useSystems(siteId) ?? []).filter((s) => s.active)

  return (
    <div className="min-h-full bg-white text-slate-900">
      <div className="print:hidden">
        <TopBar
          title="System list"
          back={`/sites/${siteId}/setup`}
          right={
            <Button variant="primary" onClick={() => window.print()}>
              Print
            </Button>
          }
        />
      </div>

      <div className="mx-auto max-w-2xl px-6 py-6 print:py-0">
        <header className="mb-4 border-b border-slate-300 pb-3">
          <h1 className="text-xl font-bold">{site?.name || site?.code || 'Site'}</h1>
          <p className="text-sm text-slate-600">
            {site?.code}
            {site?.assessmentDate ? ` · ${formatDate(site.assessmentDate)}` : ''} ·{' '}
            {systems.length} active systems
          </p>
          <p className="mt-1 text-xs text-slate-500">
            File every observation under one of these. New system on site? Add it in
            the app and tell the lead.
          </p>
        </header>

        <ol className="list-decimal space-y-2 pl-6 text-lg">
          {systems.map((s) => (
            <li key={s.id} className="font-medium">
              {s.name}
            </li>
          ))}
        </ol>

        {systems.length === 0 && (
          <p className="py-8 text-center text-slate-500">No active systems.</p>
        )}
      </div>
    </div>
  )
}
