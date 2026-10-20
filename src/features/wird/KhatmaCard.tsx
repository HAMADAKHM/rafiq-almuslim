import { useState } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, CircleCheck } from 'lucide-react'
import { ProgressBar } from '../../components/Common'
import { toast, useLive } from '../../hooks'
import { activePlan, dailyTarget, loadKhatmas, progress, recordPages, type KhatmaState } from '../../services/khatma'
import { firstAyahOf, type QuranData } from '../../services/quran'
import { dayKey } from '../../lib/dates'

export function useKhatmas() {
  return useLive(() => loadKhatmas(), ['kv:khatmas', 'kv:wird'], null as KhatmaState | null)
}

/** بطاقة الورد اليومي للخطة النشطة: الهدف المحسوب، ونسبة الإنجاز، وتسجيل القراءة */
export function KhatmaCard({ data, compact }: { data: QuranData; compact?: boolean }) {
  const state = useKhatmas()
  const [upTo, setUpTo] = useState<string>('')
  const today = dayKey()
  if (!state) return null
  const plan = activePlan(state)
  if (!plan) {
    return (
      <div className="stack" style={{ gap: 8 }}>
        <p className="muted small" style={{ margin: 0 }}>لا توجد خطة ختمة نشطة. اختر مدة تناسبك وسنحسب وردك اليومي.</p>
        <Link className="btn btn-primary btn-sm" to="/wird" style={{ alignSelf: 'start' }}>ابدأ ختمة</Link>
      </div>
    )
  }
  const t = dailyTarget(plan, today)
  const doneToday = t.doneToday >= t.pages
  const start = firstAyahOf(data.meta, 'page', Math.min(604, plan.nextPage))
  const record = async (to: number) => {
    await recordPages(state, plan.id, to, data.meta, today)
    toast(to >= 604 ? 'أتممت الختمة — تقبّل الله منك' : `سُجّلت القراءة حتى الصفحة ${to}`)
    setUpTo('')
  }
  return (
    <div className="stack" style={{ gap: 8 }}>
      <div className="spread">
        <strong>{plan.name}</strong>
        <span className="badge">{Math.round(progress(plan) * 100)}٪</span>
      </div>
      <ProgressBar value={progress(plan)} label="التقدم في الختمة" />
      <p className="small" style={{ margin: 0 }}>
        {doneToday ? <><CircleCheck size={14} color="var(--success)" /> أتممت ورد اليوم ({t.doneToday} صفحة)</> : <>ورد اليوم: الصفحات <strong>{t.from}–{t.to}</strong> ({t.pages} صفحة){t.doneToday > 0 && ` — قرأت ${t.doneToday}`}</>}
      </p>
      {!compact && <p className="small muted" style={{ margin: 0 }}>المتبقي {605 - plan.nextPage} صفحة{plan.mode === 'days' ? ` • ${t.daysLeft} يومًا حسب خطتك` : ''}</p>}
      <div className="row">
        {start && <Link className="btn btn-primary btn-sm" to={`/mushaf/${plan.nextPage}`}><BookOpen size={14} /> اقرأ الآن</Link>}
        {!doneToday && <button className="btn btn-sm" onClick={() => record(t.to)}><CircleCheck size={14} /> قرأت ورد اليوم</button>}
      </div>
      {!compact && (
        <form className="row small" onSubmit={(e) => { e.preventDefault(); const n = Number(upTo); if (n >= plan.nextPage && n <= 604) record(n); else toast(`أدخل صفحة بين ${plan.nextPage} و604`) }}>
          <label className="row">سجّل حتى الصفحة
            <input className="input" style={{ width: 90, minHeight: 32 }} type="number" min={plan.nextPage} max={604} value={upTo} onChange={(e) => setUpTo(e.target.value)} />
          </label>
          <button className="btn btn-sm">تسجيل</button>
        </form>
      )}
    </div>
  )
}
