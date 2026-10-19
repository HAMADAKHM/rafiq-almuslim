import { useState } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, CircleCheck, Clock, Brain, Sparkles } from 'lucide-react'
import { PageHead, ProgressBar, Spinner } from '../../components/Common'
import { toast, useLive, useNow, useQuran } from '../../hooks'
import { completeWird, DEFAULT_WIRD, getWird, saveWird, wirdTarget, type WirdPlan } from '../../services/plans'
import { firstAyahOf, type QuranData } from '../../services/quran'
import { adhkarLog, memo, reading } from '../../db/repos'
import { dayKey, formatCountdown, formatTime } from '../../lib/dates'
import { useSettings } from '../../state/SettingsContext'
import { nextPrayer, PRAYER_LABELS } from '../../services/prayer'
import type { AdhkarLog, MemoSegment, ReadLog } from '../../db/db'

export function WirdCard({ data, compact }: { data: QuranData; compact?: boolean }) {
  const plan = useLive(() => getWird(), ['kv:wird'], null as WirdPlan | null)
  const [edit, setEdit] = useState(false)
  const [ppd, setPpd] = useState(4)
  const today = dayKey()
  if (!plan || edit) {
    return (
      <div className="stack">
        <p className="small muted" style={{ margin: 0 }}>حدد عدد الصفحات اليومي (مصحف المدينة 604 صفحات). يمكنك تغييره في أي وقت.</p>
        <div className="row">
          <select className="select" style={{ width: 'auto' }} value={ppd} onChange={(e) => setPpd(Number(e.target.value))} aria-label="عدد الصفحات يوميًا">
            {[1, 2, 3, 4, 5, 10, 20].map((n) => <option key={n} value={n}>{n} {n <= 10 ? 'صفحات' : 'صفحة'} يوميًا — ختمة كل {Math.ceil(604 / n)} يومًا</option>)}
          </select>
          <button className="btn btn-primary" onClick={async () => { await saveWird({ ...(plan ?? { ...DEFAULT_WIRD, startedAt: today }), pagesPerDay: ppd }); setEdit(false); toast('حُفظ الورد اليومي') }}>حفظ</button>
          {plan && <button className="btn btn-ghost" onClick={() => setEdit(false)}>إلغاء</button>}
        </div>
      </div>
    )
  }
  const { from, to } = wirdTarget(plan, data.meta)
  const start = firstAyahOf(data.meta, 'page', from)!
  const done = plan.lastDone === today
  return (
    <div className="stack" style={{ gap: '0.5rem' }}>
      <div><strong>{done ? 'أتممت ورد اليوم — تقبّل الله' : `الصفحات ${from}–${to}`}</strong>
        <div className="small muted">تبدأ من سورة {data.meta.surahs[start.surah - 1].name} الآية {start.ayah} • الختمات المكتملة: {plan.khatmas}</div>
      </div>
      <ProgressBar value={(plan.nextPage - 1) / data.meta.pages} label="التقدم في الختمة" />
      <div className="row">
        <Link className="btn btn-primary btn-sm" to={`/quran/${start.surah}?ayah=${start.ayah}`}><BookOpen size={14} /> اقرأ الورد</Link>
        {!done && <button className="btn btn-sm" onClick={async () => { await completeWird(plan, data.meta, today); toast('سُجّل إتمام الورد') }}><CircleCheck size={14} /> أتممت الورد</button>}
        {!compact && <button className="btn btn-ghost btn-sm" onClick={() => { setPpd(plan.pagesPerDay); setEdit(true) }}>تعديل الكمية</button>}
        {!compact && <button className="btn btn-ghost btn-sm" onClick={async () => { if (confirm('بدء ختمة جديدة من الصفحة الأولى؟')) { await saveWird({ ...plan, nextPage: 1, lastDone: undefined }); toast('بدأت ختمة جديدة') } }}>البدء من جديد</button>}
      </div>
    </div>
  )
}

export function WirdPage() {
  const { data } = useQuran()
  const { settings } = useSettings()
  const now = useNow(1000)
  const today = dayKey()
  const segs = useLive(() => memo.all(), ['memo'], [] as MemoSegment[])
  const adhkar = useLive(() => adhkarLog.forDay(today), ['adhkarLog'], [] as AdhkarLog[], [today])
  const reads = useLive(() => reading.forDay(today), ['readLog'], [] as ReadLog[], [today])
  if (!data) return <Spinner />
  const loc = settings.location
  const np = loc ? nextPrayer(loc, settings.prayer, now) : null
  const dueCount = segs.filter((s) => !s.paused && s.status !== 'new' && s.due <= today).length
  const doneCats = new Set(adhkar.map((a) => a.category))
  const ayahsToday = new Set(reads.flatMap((r) => Array.from({ length: r.to - r.from + 1 }, (_, i) => `${r.surah}:${r.from + i}`))).size
  // مهمة المراجعة تُحسب فقط لمن لديه خطة حفظ
  const tasks = [doneCats.has('morning'), doneCats.has('evening'), ayahsToday > 0, ...(segs.length ? [dueCount === 0] : [])]
  const doneN = tasks.filter(Boolean).length

  return (
    <>
      <PageHead title="ورد اليوم" subtitle="ما تيسّر لك اليوم — بلا لوم إن فاتك شيء، والبدء من جديد متاح دائمًا" />
      <div className="grid grid-2">
        <section className="card">
          <h2><Clock size={18} /> الصلاة القادمة</h2>
          {np && loc ? (
            <p style={{ margin: 0 }}><strong>{PRAYER_LABELS[np.name]}</strong> {formatTime(np.time, loc.tz)} — بعد <span className="countdown" style={{ fontSize: '1.1rem' }}>{formatCountdown(np.time.getTime() - now.getTime())}</span></p>
          ) : <Link to="/prayer">اختر مدينتك لعرض المواقيت</Link>}
        </section>
        <section className="card">
          <h2>ملخص اليوم</h2>
          <ProgressBar value={doneN / tasks.length} label="إنجاز اليوم" />
          <p className="small muted" style={{ marginTop: 6 }}>{ayahsToday} آية مقروءة اليوم • {doneCats.size} من الأذكار مسجّلة • {dueCount} مراجعة متبقية</p>
        </section>
        <section className="card">
          <h2><BookOpen size={18} /> ورد القرآن</h2>
          <WirdCard data={data} />
        </section>
        <section className="card">
          <h2><Brain size={18} /> الحفظ والمراجعة</h2>
          {segs.length ? <p>{dueCount ? `لديك ${dueCount} مقطعًا للمراجعة اليوم.` : 'لا مراجعات مستحقة اليوم.'}</p> : <p className="muted">لم تضف هدف حفظ بعد.</p>}
          <Link className="btn btn-sm" to="/memorize">اذهب إلى الحفظ</Link>
        </section>
        <section className="card" style={{ gridColumn: '1 / -1' }}>
          <h2><Sparkles size={18} /> الأذكار</h2>
          <div className="row">
            {[['morning', 'أذكار الصباح'], ['evening', 'أذكار المساء'], ['after-prayer', 'أذكار بعد الصلاة'], ['sleep', 'أذكار النوم']].map(([id, label]) => (
              <Link key={id} to={`/adhkar/${id}`} className={'btn' + (doneCats.has(id) ? ' btn-gold' : '')}>{doneCats.has(id) && <CircleCheck size={14} />} {label}</Link>
            ))}
          </div>
        </section>
      </div>
      <p className="small muted" style={{ marginTop: '1rem' }}>هذه الأهداف اختيارية لمساعدتك على الانتظام، وليست مقياسًا لإيمانك. <Link to="/journey">اختر برنامجًا يناسبك</Link></p>
    </>
  )
}
