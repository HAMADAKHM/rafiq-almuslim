// قفل الميزات المدفوعة الجديدة فقط (لا يُستخدم أبدًا على ميزة موجودة في النسخة المجانية).
// يحمل data-plus-lock لتتحقق اختبارات الحماية (e2e/free-core.spec.ts) أنه لا يظهر في غير مكانه.
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Gem } from 'lucide-react'
import { usePlus } from './PlusContext'

export function PlusGate({ feature, title, children }: { feature: string; title: string; children: ReactNode }) {
  const p = usePlus()
  if (p.entitled) return <>{children}</>
  return (
    <div className="card plus-lock" data-plus-lock={feature}>
      <Gem size={28} aria-hidden="true" />
      <h3>{title} — من مزايا رفيق بلس</h3>
      <p className="muted">ميزة إضافية اختيارية. القرآن والأذكار والأدعية والمواقيت والتلاوة مجانية دائمًا.</p>
      <Link className="btn btn-gold" to="/plus">تعرّف على رفيق بلس</Link>
    </div>
  )
}
