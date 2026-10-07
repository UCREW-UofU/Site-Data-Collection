import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react'
import { useId } from 'react'

/* --------------------------------- Button -------------------------------- */

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'md' | 'lg'

const VARIANT: Record<Variant, string> = {
  primary:
    'bg-brand-500 text-white hover:bg-brand-600 active:bg-brand-700 disabled:bg-brand-500/50',
  secondary:
    'bg-[var(--surface-3)] text-[var(--text)] hover:brightness-95 active:brightness-90',
  ghost: 'bg-transparent text-[var(--text-2)] hover:bg-[var(--surface-3)]',
  danger: 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800',
}

const SIZE: Record<Size, string> = {
  md: 'h-11 px-4 text-[15px]',
  lg: 'h-14 px-5 text-base',
}

export function Button({
  variant = 'secondary',
  size = 'md',
  className = '',
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return (
    <button
      className={`inline-flex select-none items-center justify-center gap-2 rounded-xl font-medium transition disabled:cursor-not-allowed ${VARIANT[variant]} ${SIZE[size]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}

export function IconButton({
  className = '',
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`inline-flex h-10 w-10 items-center justify-center rounded-full text-[var(--text-2)] transition hover:bg-[var(--surface-3)] active:brightness-90 ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}

/* ------------------------------- Form fields ----------------------------- */

function FieldShell({
  label,
  hint,
  htmlFor,
  children,
}: {
  label?: string
  hint?: string
  htmlFor?: string
  children: ReactNode
}) {
  return (
    <label htmlFor={htmlFor} className="block">
      {label && (
        <span className="mb-1 block text-[13px] font-medium text-[var(--text-2)]">
          {label}
        </span>
      )}
      {children}
      {hint && <span className="mt-1 block text-xs text-[var(--text-3)]">{hint}</span>}
    </label>
  )
}

const inputCls =
  'w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 py-3 text-[15px] text-[var(--text)] outline-none placeholder:text-[var(--text-3)] focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30'

export function TextField({
  label,
  hint,
  className = '',
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { label?: string; hint?: string }) {
  const id = useId()
  return (
    <FieldShell label={label} hint={hint} htmlFor={id}>
      <input id={id} className={`${inputCls} ${className}`} {...rest} />
    </FieldShell>
  )
}

export function TextArea({
  label,
  hint,
  className = '',
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string; hint?: string }) {
  const id = useId()
  return (
    <FieldShell label={label} hint={hint} htmlFor={id}>
      <textarea id={id} rows={3} className={`${inputCls} resize-y ${className}`} {...rest} />
    </FieldShell>
  )
}

export function Select({
  label,
  hint,
  className = '',
  children,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement> & { label?: string; hint?: string }) {
  const id = useId()
  return (
    <FieldShell label={label} hint={hint} htmlFor={id}>
      <select id={id} className={`${inputCls} appearance-none ${className}`} {...rest}>
        {children}
      </select>
    </FieldShell>
  )
}

/* ---------------------------------- Chip --------------------------------- */

export function Chip({
  active = false,
  onClick,
  children,
}: {
  active?: boolean
  onClick?: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-[13px] font-medium transition ${
        active
          ? 'border-brand-500 bg-brand-500 text-white'
          : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text-2)] hover:border-brand-400'
      }`}
    >
      {children}
    </button>
  )
}

/* --------------------------------- Card ---------------------------------- */

export function Card({
  className = '',
  children,
}: {
  className?: string
  children: ReactNode
}) {
  return (
    <div
      className={`rounded-2xl border border-[var(--border)] bg-[var(--surface)] ${className}`}
    >
      {children}
    </div>
  )
}

export function EmptyState({
  icon,
  title,
  children,
}: {
  icon?: ReactNode
  title: string
  children?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      {icon && <div className="text-[var(--text-3)]">{icon}</div>}
      <p className="text-[15px] font-medium text-[var(--text)]">{title}</p>
      {children && <p className="max-w-xs text-sm text-[var(--text-3)]">{children}</p>}
    </div>
  )
}

export function Banner({
  tone = 'warn',
  children,
}: {
  tone?: 'warn' | 'info' | 'error'
  children: ReactNode
}) {
  const cls = {
    warn: 'bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-900',
    info: 'bg-sky-50 text-sky-900 border-sky-200 dark:bg-sky-950/40 dark:text-sky-200 dark:border-sky-900',
    error:
      'bg-red-50 text-red-900 border-red-200 dark:bg-red-950/40 dark:text-red-200 dark:border-red-900',
  }[tone]
  return (
    <div className={`flex items-start gap-2 rounded-xl border px-3 py-2.5 text-sm ${cls}`}>
      {children}
    </div>
  )
}
