import { useState } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, CircleCheck } from 'lucide-react'
import { ProgressBar, Ring } from '../../components/Common'
import { toast, useLive } from '../../hooks'
import { activePlan, actualPaceEta, dailyTarget, extendPlan, juzProgress, loadKhatmas, progress, recordPages, saveKhatmas, scheduleStatus, weekStats, type KhatmaState } from '../../services/khatma'
import { useMemo } from 'react'
import { firstAyahOf, type QuranData } from '../../services/quran'
import { dayKey } from '../../lib/dates'

export function useKhatmas() {
  return useLive(() => loadKhatmas(), ['kv:khatmas', 'kv:wird'], null as KhatmaState | null)
}

/** الجزء الحالي وعدد الأجزاء المكتملة (من بيانات المصحف) */
function JuzLine({ data, nextPage, done }: { data: QuranData; nextPage: number; done: boolean }) {
  const starts = useMemo(() => { const out: number[] = []; for (let g = 0; g < data.meta.juz.length; g++) if (out[data.meta.juz[g] - 1] === undefined) out[data.meta.juz[g] - 1] = data.meta.page[g]; return out }, [data])
  const j = juzProgress({ nextPage, status: done ? 'done' : 'active' } as Parameters<typeof juzProgress>[0], starts)
  return <div className="small muted">{done ? 'اكتملت الأجزاء الثلاثون' : `الجزء الحالي: ${j.current} • تم ${j.completed} من 30 جزءًا`}</div>
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
  const eta = plan.status === 'active' ? actualPaceEta(plan, today) : null
  const sched = scheduleStatus(plan, today)
  const doneToday = t.doneToday >= t.pages
  const start = firstAyahOf(data.meta, 'page', Math.min(604, plan.nextPage))
  const record = async (to: number) => {
    await recordPages(state, plan.id, to, data.meta, today)
    toast(to >= 604 ? 'أتممت الختمة — تقبّل الله منك' : `سُجّلت القراءة حتى الصفحة ${to}`)
    setUpTo('')
  }
  return (
    <div className="stack" style={{ gap: 8 }}>
      {compact ? (
        <>
          <div className="spread">
            <strong>{plan.name}</strong>
            <span className="badge">{Math.round(progress(plan) * 100)}٪</span>
          </div>
          <ProgressBar value={progress(plan)} label="التقدم في الختمة" />
        </>
      ) : (
        <div className="khatma-head">
          <Ring value={progress(plan)} label="التقدم في الختمة" />
          <div>
            <strong className="khatma-name">{plan.name}</strong>
            <div className="small muted">{plan.nextPage - 1} من 604 صفحة{plan.mode === 'days' ? ` • متبقٍّ ${t.daysLeft} يومًا` : ''}</div>
            <JuzLine data={data} nextPage={plan.nextPage} done={plan.status === 'done'} />
            {plan.minutesPerDay && <div className="small muted">خطة بالوقت: {plan.minutesPerDay} دقيقة يوميًا (~{plan.pagesPerDay} صفحات)</div>}
            <div className="small muted">بدأت {plan.startedAt}</div>
          </div>
        </div>
      )}
      <p className="small" style={{ margin: 0 }}>
        {doneToday ? <><CircleCheck size={14} color="var(--success)" /> أتممت ورد اليوم ({t.doneToday} صفحة)</> : <>ورد اليوم: الصفحات <strong>{t.from}–{t.to}</strong> ({t.pages} صفحة){t.doneToday > 0 && ` — قرأت ${t.doneToday}`}</>}
      </p>
      {!compact && <p className="small muted" style={{ margin: 0 }}>المتبقي {605 - plan.nextPage} صفحة{plan.mode === 'days' ? ` • ${t.daysLeft} يومًا حسب خطتك` : ''}{eta ? ` • بمعدلك الفعلي في آخر أسبوعين (${eta.pagesPerDay} صفحة يوميًا): نحو ${eta.days} يومًا` : ''}</p>}
      {!compact && sched.behind && (
        <div className="alert alert-gold small" role="status">
          لتنتهي الختمة في موعدها صار وردك {sched.currentPace} صفحة يوميًا (الوتيرة الأصلية {sched.originalPace}). يمكنك تمديد الموعد {sched.extendDays} يومًا لتعود إلى وتيرتك.
          <div className="row" style={{ marginTop: 6 }}>
            <button className="btn btn-sm" onClick={async () => { await saveKhatmas({ ...state, plans: state.plans.map((x) => (x.id === plan.id ? extendPlan(x, sched.extendDays) : x)) }); toast(`مُدِّد الموعد ${sched.extendDays} يومًا`) }}>تمديد الموعد</button>
          </div>
        </div>
      )}
      {!compact && (() => {
        const w = weekStats(plan, today)
        return (
          <div className="week-goal" aria-label="هدف الأسبوع">
            <div className="spread small"><span>آخر 7 أيام: <strong>{w.read}</strong> من نحو {w.target} صفحة</span><span className="muted">{w.activeDays} من 7 أيام</span></div>
            <ProgressBar value={w.read / w.target} label="تقدم هدف الأسبوع" />
          </div>
        )
      })()}
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
