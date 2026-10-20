import { useEffect, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'

/** لوحة سفلية خفيفة: تُغلق بزر الإغلاق أو Escape أو الضغط خارجها، ولا تغطي معظم الشاشة. */
export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const prev = document.activeElement as HTMLElement | null
    ref.current?.focus()
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('keydown', onKey); prev?.focus?.() }
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={ref} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <strong>{title}</strong>
          <button className="btn btn-ghost icon-btn" onClick={onClose} aria-label="إغلاق"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

/** تأكيد داخل الصفحة بدل نوافذ المتصفح (لا تعمل في بعض البيئات) */
export function ConfirmSheet({ open, title, message, confirmLabel, danger, onConfirm, onClose }: { open: boolean; title: string; message: string; confirmLabel: string; danger?: boolean; onConfirm: () => void; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <p>{message}</p>
      <div className="row">
        <button className={'btn ' + (danger ? 'btn-danger' : 'btn-primary')} onClick={() => { onConfirm(); onClose() }}>{confirmLabel}</button>
        <button className="btn btn-ghost" onClick={onClose}>إلغاء</button>
      </div>
    </Sheet>
  )
}
