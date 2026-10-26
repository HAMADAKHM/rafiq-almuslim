// خطة الحفظ الذكية (رفيق بلس): حصة يومية محسوبة حتى موعد الختم، تُضاف بعد حفظها إلى المراجعة المتباعدة.
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Brain, CheckCircle2, RotateCcw } from 'lucide-react'
import { PageHead, ProgressBar, Spinner } from '../../components/Common'
import { PlusGate } from '../../billing/PlusGate'
import { useQuran } from '../../hooks'
import { useSettings } from '../../state/SettingsContext'
import { kv, memo } from '../../db/repos'
import { initialSrs, effectiveStatus } from '../../services/srs'
import { expectedFinish, newMemoPlan, nextPortion, planProgress, remainingAyat, streakDays, totalAyat, planOrder, type MemoPlan } from '../../services/memoPlan'
import { dayKey } from '../../lib/dates'
import { toArabicDigits } from '../../lib/arabic'

const KEY = 'memo:plan'
const PRESETS = [
  { label: 'جزء عمّ من الناس', from: 114, to: 78 },
  { label: 'جزء تبارك', from: 67, to: 77 },
  { label: 'سورة الكهف', from: 18, to: 18 },
  { label: 'سورة البقرة', from: 2, to: 2 },
]
const fmt = (k: string) => new Intl.DateTimeFormat('ar', { dateStyle: 'long' }).format(new Date(k + 'T12:00:00'))

export function MemoPlanPage() {
  const { data } = useQuran()
  const { settings } = useSettings()
  const today = dayKey(new Date(), settings.location?.tz)
  const [plan, setPlan] = useState<MemoPlan | null | undefined>(undefined)
  const [from, setFrom] = useState(114)
  const [to, setTo] = useState(78)
  const [days, setDays] = useState(90)
  const [due, setDue] = useState(0)
  const [msg, setMsg] = useState('')
  useEffect(() => { kv.get<MemoPlan | null>(KEY, null).then(setPlan) }, [])
  useEffect(() => { memo.all().then((all) => setDue(all.filter((s) => !s.paused && s.due <= today && effectiveStatus(s, today) !== 'new').length)) }, [today, plan])
  const counts = useMemo(() => data?.meta.surahs.map((s) => s.count) ?? [], [data])
  if (!data || plan === undefined) return <Spinner />
  const name = (s: number) => data.meta.surahs[s - 1].name
  const save = (p: MemoPlan | null) => { setPlan(p); kv.set(KEY, p) }

  const total = totalAyat(planOrder(from, to), counts)
  const perDay = Math.max(1, Math.ceil(total / Math.max(1, days)))
  const today_ = plan ? nextPortion(plan, counts) : null
  const doneToday = !!plan?.log.includes(today)

  const markDone = async () => {
    if (!plan || !today_) return
    await memo.add(today_.portion.map((x) => ({ surah: x.surah, from: x.from, to: x.to, createdAt: Date.now(), ...initialSrs(today), status: 'learning' as const })))
    save({ ...plan, cursor: today_.cursor, log: [...new Set([...plan.log, today])] })
    setMsg('أُضيفت حصة اليوم إلى المراجعة المتباعدة. بارك الله فيك.')
  }

  return (
    <div className="page">
      <PageHead title="خطة الحفظ الذكية" subtitle="حصة يومية محسوبة حتى موعد الختم، مع مراجعة متباعدة" />
      <PlusGate feature="memo-plan" title="خطة الحفظ الذكية">
        {!plan ? (
          <section className="card stack">
            <h2><Brain size={18} /> خطة جديدة</h2>
            <div className="chips">{PRESETS.map((p) => <button key={p.label} className={'chip' + (from === p.from && to === p.to ? ' active' : '')} onClick={() => { setFrom(p.from); setTo(p.to) }}>{p.label}</button>)}</div>
            <div className="row wrap gap">
              <label className="field"><span>من سورة</span><select className="select" value={from} onChange={(e) => setFrom(Number(e.target.value))}>{data.meta.surahs.map((s, i) => <option key={i} value={i + 1}>{i + 1}. {s.name}</option>)}</select></label>
              <label className="field"><span>إلى سورة</span><select className="select" value={to} onChange={(e) => setTo(Number(e.target.value))}>{data.meta.surahs.map((s, i) => <option key={i} value={i + 1}>{i + 1}. {s.name}</option>)}</select></label>
            </div>
            <label className="field"><span>أريد الختم خلال</span>
              <select className="select" value={days} onChange={(e) => setDays(Number(e.target.value))}>{[30, 60, 90, 180, 365, 730].map((d) => <option key={d} value={d}>{d < 365 ? `${toArabicDigits(d)} يومًا` : d === 365 ? 'سنة' : 'سنتين'}</option>)}</select>
            </label>
            <p className="notice">{toArabicDigits(planOrder(from, to).length)} سورة • {toArabicDigits(total)} آية ← نحو <b>{toArabicDigits(perDay)} {perDay > 10 ? 'آية' : 'آيات'} يوميًا</b> جديدة، مع مراجعة ما سبق.</p>
            <button className="btn btn-gold" onClick={() => save(newMemoPlan(from, to, days, counts, today))}>ابدأ الخطة</button>
          </section>
        ) : (
          <>
            <section className="card stack">
              <h2>من سورة {name(plan.order[0])} إلى سورة {name(plan.order[plan.order.length - 1])}</h2>
              <ProgressBar value={planProgress(plan, counts)} label="تقدم الخطة" />
              <p className="muted small">أنجزت {toArabicDigits(Math.round(planProgress(plan, counts) * 100))}٪ • بقي {toArabicDigits(remainingAyat(plan, counts))} آية • الختم المتوقع: {fmt(expectedFinish(plan, counts, today))} • أيام متتالية: {toArabicDigits(streakDays(plan, today))}</p>
            </section>
            <section className="card stack">
              <h2>حصة اليوم ({toArabicDigits(plan.ayahsPerDay)} {plan.ayahsPerDay > 10 ? 'آية' : 'آيات'})</h2>
              {today_!.portion.length === 0 ? <p>أتممت الخطة كلها، تقبّل الله منك. واصل المراجعة من صفحة الحفظ.</p> : (
                <>
                  <ul>{today_!.portion.map((x) => <li key={`${x.surah}:${x.from}`}><Link to={`/quran/${x.surah}?ayah=${x.from}&flow=1`}>سورة {name(x.surah)}: الآيات {toArabicDigits(x.from)}–{toArabicDigits(x.to)}</Link></li>)}</ul>
                  {doneToday ? <p className="notice"><CheckCircle2 size={16} /> أتممت حصة اليوم.</p>
                    : <button className="btn btn-primary" onClick={markDone}><CheckCircle2 size={16} /> حفظتها — أضفها إلى المراجعة</button>}
                </>
              )}
              <p className="muted">مقاطع تحتاج مراجعة اليوم: <b>{toArabicDigits(due)}</b> — <Link to="/memorize">افتح صفحة المراجعة</Link></p>
            </section>
            {msg && <p className="notice" role="status">{msg}</p>}
            <button className="btn" onClick={() => { if (confirm('إنهاء الخطة؟ المقاطع المحفوظة تبقى في المراجعة.')) save(null) }}><RotateCcw size={16} /> خطة جديدة</button>
          </>
        )}
      </PlusGate>
    </div>
  )
}
