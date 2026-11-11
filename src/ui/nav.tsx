import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { IconButton } from './kit'
import {
  ChevronLeftIcon,
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
    <header className="pt-safe sticky top-0 z-30 border-t-4 border-t-brand-500 border-b border-b-[var(--border)] bg-[var(--surface)]/95 backdrop-blur">
      <div className="flex min-h-14 items-center gap-2 px-3 sm:gap-4 sm:px-4">
        <div className="shrink-0 rounded bg-white p-1">
          <img src="/ucrew-logo.svg" width="193" height="44" alt="U-CREW — The University of Utah" className="h-6 w-auto sm:h-7" />
        </div>
        <div className="mx-auto flex min-w-0 max-w-3xl flex-1 items-center gap-1 sm:gap-2">
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
      </div>
    </header>
  )
}

/** Page scaffold: sticky TopBar and scrolling content; Back handles navigation. */
export function Page({
  topBar,
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
    </div>
  )
}
