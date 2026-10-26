// أدوات متجر الاختبار (تظهر في وضع الاختبار فقط): محاكاة إلغاء التجديد وانقطاع الإنترنت ورفض الدفع.
import { useState } from 'react'
import { billing } from '../../billing'
import { usePlus } from '../../billing/PlusContext'
import type { createSandbox } from '../../billing/sandbox'

type Sandbox = ReturnType<typeof createSandbox>

export function SandboxPanel() {
  const p = usePlus()
  const sb = billing() as Sandbox
  const [, force] = useState(0)
  if (sb.id !== 'sandbox') return null
  const toggle = (k: 'offline' | 'declined') => { sb.faults[k] = !sb.faults[k]; force((n) => n + 1) }
  return (
    <section className="card sandbox-panel" aria-label="أدوات الاختبار">
      <h3>أدوات الاختبار (بلا دفع)</h3>
      <div className="row wrap gap">
        <button className="btn" onClick={async () => { await sb.cancel(); await p.refresh() }}>إلغاء التجديد (كما في المتجر)</button>
        <button className="btn" onClick={() => toggle('offline')} aria-pressed={sb.faults.offline}>{sb.faults.offline ? '✓ ' : ''}محاكاة انقطاع الإنترنت</button>
        <button className="btn" onClick={() => toggle('declined')} aria-pressed={sb.faults.declined}>{sb.faults.declined ? '✓ ' : ''}محاكاة رفض الدفع</button>
        <button className="btn" onClick={async () => { await sb.reset(); await p.refresh() }}>مسح سجل متجر الاختبار</button>
      </div>
    </section>
  )
}
