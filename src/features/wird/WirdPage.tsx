import { useState } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, CircleCheck, Clock, Brain, Sparkles, Pause, Play, RotateCcw, Trash2 } from 'lucide-react'
import { PageHead, ProgressBar, Spinner } from '../../components/Common'
import { ConfirmSheet } from '../../components/Sheet'
import { toast, useLive, useNow, useQuran } from '../../hooks'
import { completedCount, createPlan, DEFAULT_MINUTES_PER_PAGE, pagesForMinutes, progress, saveKhatmas, TOTAL_PAGES, type KhatmaPlan } from '../../services/khatma'
import { adhkarLog, memo, reading } from '../../db/repos'
import { dayKey, formatCountdown, formatTime } from '../../lib/dates'
import { useSettings } from '../../state/SettingsContext'
import { nextPrayer, PRAYER_LABELS } from '../../services/prayer'
import type { AdhkarLog, MemoSegment, ReadLog } from '../../db/db'
import { KhatmaCard, useKhatmas } from './KhatmaCard'

function NewPlanForm({ onDone }: { onDone: () => void }) {
  const state = useKhatmas()
  const { settings, update } = useSettings()
  const [mode, setMode] = useState<'days' | 'pages' | 'minutes'>('days')
  const [minutes, setMinutes] = useState(15)
  const [minPerPage, setMinPerPage] = useState(DEFAULT_MINUTES_PER_PAGE)
  const [remindAt, setRemindAt] = useState(settings.notifications.wird ?? '')
  const [days, setDays] = useState(30)
  const [custom, setCustom] = useState('')
  const [pages, setPages] = useState(4)
  const [start, setStart] = useState(1)
  const [name, setName] = useState('')
  if (!state) return null
  const targetDays = custom ? Number(custom) : days
  const minutePages = pagesForMinutes(minutes, minPerPage)
  const valid = mode === 'pages' ? pages >= 1 && pages <= 604 : mode === 'minutes' ? minutes >= 1 && minutes <= 600 : targetDays >= 1 && targetDays <= 3650
  return (
    <form className="stack" onSubmit={async (e) => {
      e.preventDefault()
      if (!valid) return
      const today = dayKey()
      // خطة نشطة واحدة في كل وقت؛ تُوقف السابقة مؤقتًا دون حذف تقدمها
      const plans = state.plans.map((p) => (p.status === 'active' ? { ...p, status: 'paused' as const } : p))
      plans.push(createPlan({ name, mode: mode === 'minutes' ? 'pages' : mode, targetDays, pagesPerDay: mode === 'minutes' ? minutePages : pages, startPage: start, today, ...(mode === 'minutes' ? { minutesPerDay: minutes } : {}) }))
      await saveKhatmas({ ...state, plans })
      // وقت القراءة المفضل: تذكير الورد (اختياري)
      if (remindAt !== (settings.notifications.wird ?? '')) update((st) => ({ notifications: { ...st.notifications, wird: remindAt || null } }))
      toast('بدأت الختمة الجديدة — وفقك الله')
      onDone()
    }}>
      <div className="row" role="radiogroup" aria-label="نوع الخطة">
        <button type="button" role="radio" aria-checked={mode === 'days'} className={'btn btn-sm' + (mode === 'days' ? ' btn-primary' : '')} onClick={() => setMode('days')}>بمدة محددة</button>
        <button type="button" role="radio" aria-checked={mode === 'pages'} className={'btn btn-sm' + (mode === 'pages' ? ' btn-primary' : '')} onClick={() => setMode('pages')}>بعدد صفحات يومي</button>
        <button type="button" role="radio" aria-checked={mode === 'minutes'} className={'btn btn-sm' + (mode === 'minutes' ? ' btn-primary' : '')} onClick={() => setMode('minutes')}>بالوقت المتاح يوميًا</button>
      </div>
      {mode === 'days' ? (
        <div className="row">
          {[7, 15, 30, 60].map((d) => <button type="button" key={d} className={'btn btn-sm' + (!custom && days === d ? ' btn-gold' : '')} onClick={() => { setDays(d); setCustom('') }}>{d} يومًا</button>)}
          <label className="row small">مدة أخرى
            <input className="input" style={{ width: 90, minHeight: 32 }} type="number" min={1} max={3650} value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="أيام" />
          </label>
        </div>
      ) : mode === 'minutes' ? (
        <div className="grid grid-2" style={{ gap: '0.75rem' }}>
          <label className="field"><span>الدقائق المتاحة يوميًا</span><input className="input" type="number" min={1} max={600} value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} /></label>
          <label className="field"><span>متوسط دقائقك للصفحة (تقديري)</span><input className="input" type="number" min={0.5} max={10} step={0.5} value={minPerPage} onChange={(e) => setMinPerPage(Number(e.target.value))} /></label>
        </div>
      ) : (
        <label className="field" style={{ maxWidth: 260 }}><span>عدد الصفحات يوميًا</span>
          <input className="input" type="number" min={1} max={604} value={pages} onChange={(e) => setPages(Number(e.target.value))} />
        </label>
      )}
      <div className="grid grid-2" style={{ gap: '0.75rem' }}>
        <label className="field"><span>البدء من الصفحة</span><input className="input" type="number" min={1} max={604} value={start} onChange={(e) => setStart(Number(e.target.value))} /></label>
        <label className="field"><span>اسم الخطة (اختياري)</span><input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: ختمة رمضان" /></label>
      </div>
      <label className="field" style={{ maxWidth: 260 }}><span>وقت القراءة المفضل (تذكير اختياري)</span>
        <input className="input" type="time" value={remindAt} onChange={(e) => setRemindAt(e.target.value)} aria-label="وقت القراءة المفضل" />
      </label>
      {valid && mode === 'minutes' && <p className="small muted" style={{ margin: 0 }}>نحو {minutePages} صفحات يوميًا، وتنتهي الختمة خلال نحو {Math.ceil((TOTAL_PAGES - start + 1) / minutePages)} يومًا. التقدير يعتمد على متوسطك، وعدّله متى شئت.</p>}
      {valid && mode !== 'minutes' && <p className="small muted" style={{ margin: 0 }}>{mode === 'days' ? `نحو ${Math.ceil((TOTAL_PAGES - start + 1) / targetDays)} صفحات يوميًا، ويُعاد الحساب تلقائيًا بحسب تقدمك.` : `تنتهي الختمة خلال نحو ${Math.ceil((TOTAL_PAGES - start + 1) / pages)} يومًا.`}</p>}
      <div className="row"><button className="btn btn-primary" disabled={!valid}>بدء الختمة</button><button type="button" className="btn btn-ghost" onClick={onDone}>إلغاء</button></div>
    </form>
  )
}

function PlanRow({ plan, onChange, onAskDelete }: { plan: KhatmaPlan; onChange: (p: KhatmaPlan) => void; onAskDelete: () => void }) {
  return (
    <div className="spread small" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
      <span style={{ minWidth: 0 }}>
        <strong>{plan.name}</strong> <span className={'badge ' + (plan.status === 'done' ? 'badge-success' : '')}>{plan.status === 'done' ? `اكتملت ${plan.completedAt}` : plan.status === 'paused' ? 'موقوفة' : 'نشطة'}</span>
        <div className="muted">بدأت {plan.startedAt || '—'} • {Math.round(progress(plan) * 100)}٪</div>
      </span>
      <span className="row">
        {plan.status === 'paused' && <button className="btn btn-ghost btn-sm" onClick={() => onChange({ ...plan, status: 'active' })}><Play size={14} /> استئناف</button>}
        {plan.status === 'active' && <button className="btn btn-ghost btn-sm" onClick={() => onChange({ ...plan, status: 'paused' })}><Pause size={14} /> إيقاف مؤقت</button>}
        {plan.status !== 'done' && <button className="btn btn-ghost btn-sm icon-btn" aria-label="حذف الخطة" onClick={onAskDelete}><Trash2 size={14} /></button>}
      </span>
    </div>
  )
}

export function WirdPage() {
  const { data } = useQuran()
  const { settings } = useSettings()
  const now = useNow(1000)
  const today = dayKey()
  const state = useKhatmas()
  const [creating, setCreating] = useState(false)
  const [confirm, setConfirm] = useState<{ kind: 'delete' | 'reset'; plan: KhatmaPlan } | null>(null)
  const segs = useLive(() => memo.all(), ['memo'], [] as MemoSegment[])
  const adhkar = useLive(() => adhkarLog.forDay(today), ['adhkarLog'], [] as AdhkarLog[], [today])
  const reads = useLive(() => reading.forDay(today), ['readLog'], [] as ReadLog[], [today])
  if (!data || !state) return <Spinner />
  const loc = settings.location
  const np = loc ? nextPrayer(loc, settings.prayer, now) : null
  const dueCount = segs.filter((s) => !s.paused && s.status !== 'new' && s.due <= today).length
  const doneCats = new Set(adhkar.map((a) => a.category))
  const ayahsToday = new Set(reads.flatMap((r) => Array.from({ length: r.to - r.from + 1 }, (_, i) => `${r.surah}:${r.from + i}`))).size
  // مهمة المراجعة تُحسب فقط لمن لديه خطة حفظ
  const tasks = [doneCats.has('morning'), doneCats.has('evening'), ayahsToday > 0, ...(segs.length ? [dueCount === 0] : [])]
  const doneN = tasks.filter(Boolean).length
  const updatePlan = (p: KhatmaPlan) => {
    const plans = state.plans.map((x) => (x.id === p.id ? p : p.status === 'active' && x.status === 'active' ? { ...x, status: 'paused' as const } : x))
    return saveKhatmas({ ...state, plans })
  }
  const others = state.plans.filter((p) => p.status !== 'active')

  return (
    <>
      <PageHead title="ورد اليوم" subtitle="ما تيسّر لك اليوم — بلا لوم إن فاتك شيء، والبدء من جديد متاح دائمًا" />
      <div className="grid grid-2">
        <section className="card">
          <h2><BookOpen size={18} /> ختمة القرآن</h2>
          {creating ? <NewPlanForm onDone={() => setCreating(false)} /> : (
            <>
              <KhatmaCard data={data} />
              <div className="row" style={{ marginTop: 10 }}>
                <button className="btn btn-sm" onClick={() => setCreating(true)}>ختمة جديدة</button>
                {state.plans.some((p) => p.status === 'active') && <button className="btn btn-ghost btn-sm" onClick={() => setConfirm({ kind: 'reset', plan: state.plans.find((p) => p.status === 'active')! })}><RotateCcw size={14} /> إعادة ضبط الخطة</button>}
              </div>
            </>
          )}
        </section>
        <section className="card">
          <h2>ملخص اليوم</h2>
          <ProgressBar value={doneN / tasks.length} label="إنجاز اليوم" />
          <p className="small muted" style={{ marginTop: 6 }}>{ayahsToday} آية مقروءة اليوم • {doneCats.size} من الأذكار مسجّلة{segs.length ? ` • ${dueCount} مراجعة متبقية` : ''}</p>
          <h3 style={{ marginTop: '1rem' }}><Clock size={16} /> الصلاة القادمة</h3>
          {np && loc ? <p style={{ margin: 0 }}><strong>{PRAYER_LABELS[np.name]}</strong> {formatTime(np.time, loc.tz)} — بعد <span className="countdown" style={{ fontSize: '1.1rem' }}>{formatCountdown(np.time.getTime() - now.getTime())}</span></p> : <Link to="/prayer">اختر مدينتك لعرض المواقيت</Link>}
        </section>
        <section className="card">
          <h2><Brain size={18} /> الحفظ والمراجعة</h2>
          {segs.length ? <p>{dueCount ? `لديك ${dueCount} مقطعًا للمراجعة اليوم.` : 'لا مراجعات مستحقة اليوم.'}</p> : <p className="muted">لم تضف هدف حفظ بعد.</p>}
          <Link className="btn btn-sm" to="/memorize">اذهب إلى الحفظ</Link>
        </section>
        <section className="card">
          <h2><Sparkles size={18} /> الأذكار</h2>
          <div className="row">
            {[['morning', 'أذكار الصباح'], ['evening', 'أذكار المساء'], ['after-prayer', 'بعد الصلاة'], ['sleep', 'أذكار النوم']].map(([id, label]) => (
              <Link key={id} to={`/adhkar/${id}`} className={'btn btn-sm' + (doneCats.has(id) ? ' btn-gold' : '')}>{doneCats.has(id) && <CircleCheck size={14} />} {label}</Link>
            ))}
          </div>
        </section>
        <section className="card" style={{ gridColumn: '1 / -1' }}>
          <h2>سجل الختمات</h2>
          <p className="small muted">الختمات المكتملة: {completedCount(state)}</p>
          {others.length ? <div className="stack" style={{ gap: 8 }}>{others.map((p) => <PlanRow key={p.id} plan={p} onChange={updatePlan} onAskDelete={() => setConfirm({ kind: 'delete', plan: p })} />)}</div> : <p className="muted small">لا توجد خطط سابقة.</p>}
        </section>
      </div>
      <p className="small muted" style={{ marginTop: '1rem' }}>هذه الأهداف اختيارية لمساعدتك على الانتظام، وليست مقياسًا لإيمانك. <Link to="/journey">اختر برنامجًا يناسبك</Link></p>
      <ConfirmSheet open={!!confirm} onClose={() => setConfirm(null)}
        title={confirm?.kind === 'delete' ? 'حذف الخطة' : 'إعادة ضبط الخطة'}
        message={confirm?.kind === 'delete' ? `ستُحذف خطة «${confirm.plan.name}». سجل قراءتك العام يبقى محفوظًا.` : `ستعود خطة «${confirm?.plan.name}» إلى صفحتها الأولى ويُمسح سجلها. سجل قراءتك العام يبقى محفوظًا.`}
        confirmLabel={confirm?.kind === 'delete' ? 'حذف' : 'إعادة الضبط'} danger
        onConfirm={async () => {
          if (!confirm) return
          if (confirm.kind === 'delete') await saveKhatmas({ ...state, plans: state.plans.filter((p) => p.id !== confirm.plan.id) })
          else await saveKhatmas({ ...state, plans: state.plans.map((p) => (p.id === confirm.plan.id ? { ...p, nextPage: 1, log: [], startedAt: today } : p)) })
          toast('تم')
        }} />
    </>
  )
}
