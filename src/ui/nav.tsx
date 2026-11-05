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
