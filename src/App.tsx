import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router-dom'
import { ErrorBoundary } from '@/app/ErrorBoundary'
import { SettingsProvider } from '@/app/settings'
import { ToastProvider } from '@/ui/toast'
import { UpdatePrompt } from '@/app/UpdatePrompt'
import { SitesScreen } from '@/screens/SitesScreen'
import { SystemsBoardScreen } from '@/screens/SystemsBoardScreen'
import { SystemScreen } from '@/screens/SystemScreen'
import { NewObservationScreen } from '@/screens/NewObservationScreen'
import { ObservationDetailScreen } from '@/screens/ObservationDetailScreen'
import { BrowseScreen } from '@/screens/BrowseScreen'
import { SiteSetupScreen } from '@/screens/SiteSetupScreen'
import { SettingsScreen } from '@/screens/SettingsScreen'
import { SystemSheetScreen } from '@/screens/SystemSheetScreen'

// ZIP + spreadsheet code (jszip, write-excel-file) is only needed here — split it out.
const ExportScreen = lazy(() =>
  import('@/screens/ExportScreen').then((m) => ({ default: m.ExportScreen })),
)
const MergeScreen = lazy(() =>
  import('@/screens/MergeScreen').then((m) => ({ default: m.MergeScreen })),
)

function SiteIndexRedirect() {
  const { siteId } = useParams()
  return <Navigate to={`/sites/${siteId}/board`} replace />
}

function Loading() {
  return (
    <div className="flex h-full items-center justify-center p-16 text-[var(--text-3)]">
      Loading…
    </div>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <SettingsProvider>
        <ToastProvider>
          <BrowserRouter>
            <Suspense fallback={<Loading />}>
              <Routes>
                <Route path="/" element={<SitesScreen />} />
                <Route path="/settings" element={<SettingsScreen />} />
                <Route path="/merge" element={<MergeScreen />} />
                <Route path="/sites/:siteId" element={<SiteIndexRedirect />} />
                <Route path="/sites/:siteId/board" element={<SystemsBoardScreen />} />
                <Route path="/sites/:siteId/browse" element={<BrowseScreen />} />
                <Route path="/sites/:siteId/setup" element={<SiteSetupScreen />} />
                <Route path="/sites/:siteId/system-sheet" element={<SystemSheetScreen />} />
                <Route path="/sites/:siteId/export" element={<ExportScreen />} />
                <Route path="/sites/:siteId/systems/:systemId" element={<SystemScreen />} />
                <Route
                  path="/sites/:siteId/systems/:systemId/new"
                  element={<NewObservationScreen />}
                />
                <Route
                  path="/sites/:siteId/observations/:observationId"
                  element={<ObservationDetailScreen />}
                />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
          <UpdatePrompt />
        </ToastProvider>
      </SettingsProvider>
    </ErrorBoundary>
  )
}
