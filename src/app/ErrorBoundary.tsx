import { Component, type ReactNode } from 'react'

/**
 * Last-resort net so a bug in one screen shows a recoverable message instead
 * of a blank white page. Deliberately dependency-free (no app components,
 * just Tailwind utility classes) so it can't itself fail the same way.
 */
export class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    console.error('Site Collect crashed:', error, info.componentStack)
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    return (
      <div className="flex min-h-full flex-col items-center justify-center gap-3 bg-[var(--surface-2)] p-8 text-center">
        <p className="text-base font-semibold text-[var(--text)]">
          Something went wrong on this screen
        </p>
        <p className="max-w-sm text-sm text-[var(--text-3)]">
          Your data is safe — it's all still on this device. Reloading usually
          fixes it.
        </p>
        <p className="max-w-sm break-words font-mono text-xs text-[var(--text-3)]">
          {error.message}
        </p>
        <button
          onClick={() => location.reload()}
          className="mt-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-medium text-white"
        >
          Reload
        </button>
        <a href="/" className="text-sm text-[var(--text-3)] underline">
          Back to Sites
        </a>
      </div>
    )
  }
}
