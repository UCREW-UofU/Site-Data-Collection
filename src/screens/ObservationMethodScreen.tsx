import { useNavigate, useParams } from 'react-router-dom'
import { useSite } from '@/app/queries'
import { Button } from '@/ui/kit'
import { Page, TopBar } from '@/ui/nav'
import { CameraIcon } from '@/ui/icons'

export function ObservationMethodScreen() {
  const { siteId = '' } = useParams()
  const site = useSite(siteId)
  const navigate = useNavigate()
  return (
    <Page topBar={<TopBar title="Make observation" subtitle={site?.name || site?.code} back={`/sites/${siteId}/dashboard`} />}>
      <h1 className="mb-2 text-lg font-semibold">How would you like to record it?</h1>
      <p className="mb-5 text-sm text-[var(--text-2)]">Choose an entry method, then select the system.</p>
      <div className="flex flex-col gap-3">
        <Button variant="primary" size="lg" onClick={() => navigate(`/sites/${siteId}/board?mode=photo`)}><CameraIcon width={20} height={20} /> Add photos</Button>
        <Button variant="secondary" size="lg" onClick={() => navigate(`/sites/${siteId}/board?mode=manual`)}>Add manually</Button>
      </div>
    </Page>
  )
}
