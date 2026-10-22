import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useDocumentTitle } from '../hooks'

const MOBILE = '(max-width: 900px)'
function useMobile(): boolean {
  const [m, setM] = useState(() => typeof window !== 'undefined' && !!window.matchMedia?.(MOBILE).matches)
  useEffect(() => {
    const mq = window.matchMedia?.(MOBILE)
    if (!mq) return
    const on = () => setM(mq.matches)
    mq.addEventListener?.('change', on)
    return () => mq.removeEventListener?.('change', on)
  }, [])
  return m
}

/** عنوان الصفحة: على الجوال يظهر في الشريط الأخضر العلوي نفسه (كما في التصميم المعتمد)، وعلى الشاشات الكبيرة في رأس الصفحة */
export function PageHead({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  useDocumentTitle(title)
  const mobile = useMobile()
  const [slot, setSlot] = useState<HTMLElement | null>(null)
  useEffect(() => { setSlot(mobile ? document.getElementById('topbar-title') : null) }, [mobile])
  const h1 = <h1>{title}</h1>
  if (mobile && slot) {
    return (
      <>
        {createPortal(h1, slot)}
        {(subtitle || actions) && (
          <div className="page-sub">
            {subtitle && <p>{subtitle}</p>}
            {actions && <div className="row">{actions}</div>}
          </div>
        )}
      </>
    )
  }
  return (
    <div className="page-head">
      <div>
        {h1}
        {subtitle && <p>{subtitle}</p>}
      </div>
      {actions && <div className="row">{actions}</div>}
    </div>
  )
}

export function Spinner({ label = 'جارٍ التحميل' }: { label?: string }) {
  return <div className="spinner" role="status" aria-label={label} />
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="empty">{children}</div>
}

export function Tabs<T extends string>({ value, onChange, items, label }: { value: T; onChange: (v: T) => void; items: { id: T; label: string }[]; label: string }) {
  return (
    <div className="tabs" role="tablist" aria-label={label}>
      {items.map((it) => (
        <button key={it.id} role="tab" className="tab" aria-selected={value === it.id} onClick={() => onChange(it.id)}>
          {it.label}
        </button>
      ))}
    </div>
  )
}

export function ProgressBar({ value, label }: { value: number; label?: string }) {
  const pct = Math.max(0, Math.min(100, Math.round(value * 100)))
  return (
    <div className="progress" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <span style={{ width: pct + '%' }} />
    </div>
  )
}

/** حلقة تقدم دائرية */
export function Ring({ value, size = 96, label }: { value: number; size?: number; label: string }) {
  const pct = Math.max(0, Math.min(100, Math.round(value * 100)))
  const r = 42
  const c = 2 * Math.PI * r
  return (
    <div className="ring" style={{ width: size, height: size }} role="progressbar" aria-label={label} aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
        <circle cx="50" cy="50" r={r} fill="none" stroke="var(--surface-2)" strokeWidth="9" />
        <circle cx="50" cy="50" r={r} fill="none" stroke="var(--primary)" strokeWidth="9" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)} style={{ transition: 'stroke-dashoffset 0.4s ease' }} />
      </svg>
      <b>{pct}٪</b>
    </div>
  )
}
