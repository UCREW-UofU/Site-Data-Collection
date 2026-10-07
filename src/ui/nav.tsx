import type { ReactNode } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { IconButton } from './kit'
import {
  ChevronLeftIcon,
  ExportIcon,
  GridIcon,
  SettingsIcon,
  TagIcon,
} from './icons'

export function TopBar({
  title,
  subtitle,
  back,
  right,
}: {
  title: string
  subtitle?: string
  back?: string | (() => void)
  right?: ReactNode
}) {
  const navigate = useNavigate()
  const goBack = () => {
    if (typeof back === 'function') back()
    else if (typeof back === 'string') navigate(back)
    else navigate(-1)
  }
  return (
    <header className="pt-safe sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-3xl items-center gap-2 px-2">
        {back !== undefined && (
          <IconButton onClick={goBack} aria-label="Back">
            <ChevronLeftIcon />
          </IconButton>
        )}
        <div className="min-w-0 flex-1 px-1">
          <div className="truncate text-[15px] font-semibold text-[var(--text)]">
            {title}
          </div>
          {subtitle && (
            <div className="truncate text-xs text-[var(--text-3)]">{subtitle}</div>
          )}
        </div>
        {right}
      </div>
    </header>
  )
}

const tabCls = ({ isActive }: { isActive: boolean }) =>
  `flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition ${
    isActive ? 'text-brand-600' : 'text-[var(--text-3)]'
  }`

export function BottomNav({ siteId }: { siteId: string }) {
  return (
    <nav className="pb-safe sticky bottom-0 z-30 border-t border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur">
      <div className="mx-auto flex max-w-3xl">
        <NavLink to={`/sites/${siteId}/board`} className={tabCls} end>
          <TagIcon width={22} height={22} />
          Systems
        </NavLink>
        <NavLink to={`/sites/${siteId}/browse`} className={tabCls}>
          <GridIcon width={22} height={22} />
          Photos
        </NavLink>
        <NavLink to={`/sites/${siteId}/setup`} className={tabCls}>
          <SettingsIcon width={22} height={22} />
          Setup
        </NavLink>
        <NavLink to={`/sites/${siteId}/export`} className={tabCls}>
          <ExportIcon width={22} height={22} />
          Export
        </NavLink>
      </div>
    </nav>
  )
}

/** Page scaffold: sticky TopBar + scrolling content + optional BottomNav. */
export function Page({
  topBar,
  siteId,
  children,
}: {
  topBar?: ReactNode
  siteId?: string
  children: ReactNode
}) {
  return (
    <div className="flex min-h-full flex-col bg-[var(--surface-2)]">
      {topBar}
      <main className="mx-auto w-full max-w-3xl flex-1 px-3 py-4">{children}</main>
      {siteId && <BottomNav siteId={siteId} />}
    </div>
  )
}
