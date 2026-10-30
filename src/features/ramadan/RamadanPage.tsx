// وضع رمضان (رفيق بلس): السحور والإفطار اليوم مع العدّ التنازلي، وجدول الشهر، وختمة رمضان،
// وتذكيرات السحور والإفطار، وتذكيرات صيام التطوع. بداية الشهر محسوبة، والعبرة برؤية الهلال في بلدك.
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Moon, Sunrise, BookOpen } from 'lucide-react'
import { PageHead } from '../../components/Common'
import { PaintedScene } from '../../components/Scene'
import { PlusGate } from '../../billing/PlusGate'
import { useSettings } from '../../state/SettingsContext'
import { EMPTY_QADA, QADA_KEY, markQada, nextRamadanEvent, qadaLeft, ramadanStatus, ramadanTable, type QadaState } from '../../services/ramadan'
import { todayTimes } from '../../services/prayer'
import { kv } from '../../db/repos'
import { useLive } from '../../hooks'
import { Minus, Plus as PlusIcon, Check, Palette } from 'lucide-react'
import { createPlan, loadKhatmas, saveKhatmas } from '../../services/khatma'
import { dayKey, formatCountdown, formatTime } from '../../lib/dates'
import { toArabicDigits } from '../../lib/arabic'
import type { Settings } from '../../state/settings'

function useNowTick(ms = 1000) {
  const [n, setN] = useState(() => new Date())
  useEffect(() => { const t = setInterval(() => setN(new Date()), ms); return () => clearInterval(t) }, [ms])
  return n
}

const MINUTES = [0, 10, 15, 20, 30, 45, 60]

/** أيام القضاء: عدد الأيام المطلوبة، وتسجيل كل يوم يُقضى (على الجهاز فقط) */
function QadaCard({ today }: { today: string }) {
  const q = useLive(() => kv.get<QadaState>(QADA_KEY, EMPTY_QADA), ['kv:' + QADA_KEY], EMPTY_QADA)
  const save = (n: QadaState) => kv.set(QADA_KEY, n)
  const left = qadaLeft(q)
  const pct = q.owed ? Math.round((Math.min(q.done.length, q.owed) / q.owed) * 100) : 0
  return (
    <section className="card" aria-label="أيام القضاء">
      <h2>أيام القضاء</h2>
      <p className="muted small">سجّل عدد الأيام التي عليك قضاؤها، ثم علّم كل يوم تصومه — يبقى على جهازك فقط.</p>
      <div className="row" style={{ alignItems: 'center', gap: 10 }}>
        <button className="btn btn-sm icon-btn" aria-label="إنقاص الأيام المطلوبة" disabled={q.owed <= 0} onClick={() => save({ ...q, owed: q.owed - 1 })}><Minus size={16} /></button>
        <span className="qada-owed"><b>{toArabicDigits(q.owed)}</b> يومًا عليّ</span>
        <button className="btn btn-sm icon-btn" aria-label="زيادة الأيام المطلوبة" disabled={q.owed >= 60} onClick={() => save({ ...q, owed: q.owed + 1 })}><PlusIcon size={16} /></button>
      </div>
      {q.owed > 0 && (
        <>
          <div className="qada-bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="تقدم القضاء"><span style={{ width: `${pct}%` }} /></div>
          <p className="small" style={{ margin: '6px 0' }}>قضيت {toArabicDigits(Math.min(q.done.length, q.owed))} من {toArabicDigits(q.owed)} — {left ? `بقي ${toArabicDigits(left)}` : 'أتممت القضاء، تقبّل الله'}</p>
          <button className="btn btn-primary btn-sm" disabled={q.done.includes(today) || !left} onClick={() => save(markQada(q, today))}><Check size={14} /> {q.done.includes(today) ? 'سُجّل صيام اليوم قضاءً' : 'صمت اليوم قضاءً'}</button>
          {q.done.length > 0 && (
            <div className="chips" style={{ marginTop: 8 }} aria-label="الأيام المقضية">
              {q.done.map((d) => <button key={d} className="chip" aria-label={`إزالة ${d}`} onClick={() => save({ ...q, done: q.done.filter((x) => x !== d) })}>{d} ✕</button>)}
            </div>
          )}
        </>
      )}
    </section>
  )
}

export function RamadanPage() {
  const { settings, update } = useSettings()
  const now = useNowTick()
  const nav = useNavigate()
  const loc = settings.location
  const tz = loc?.tz
  const st = useMemo(() => ramadanStatus(now, tz, settings.hijriOffset), [now.toDateString(), tz, settings.hijriOffset]) // eslint-disable-line react-hooks/exhaustive-deps
  const table = useMemo(() => ramadanTable(settings, st.start, settings.ramadan.imsakMinutes), [settings, st.start])
  const next = st.inRamadan ? nextRamadanEvent(table, now) : null
  const today = dayKey(now, tz)
  const r = settings.ramadan
  const f = settings.fasting
  const setR = (p: Partial<Settings['ramadan']>) => update({ ramadan: { ...r, ...p } })
  const setF = (p: Partial<Settings['fasting']>) => update({ fasting: { ...f, ...p } })
  const [msg, setMsg] = useState('')

  const startKhatma = async () => {
    const k = await loadKhatmas()
    const days = st.inRamadan ? Math.max(1, 30 - (st.day ?? 1) + 1) : 30
    k.plans.forEach((p) => { if (p.status === 'active') p.status = 'paused' })
    k.plans.unshift(createPlan({ name: 'ختمة رمضان', mode: 'days', targetDays: days, today }))
    await saveKhatmas(k)
    setMsg(`بدأت ختمة رمضان في ${toArabicDigits(days)} يومًا، وخطتك السابقة محفوظة متوقفة.`)
    setTimeout(() => nav('/wird'), 900)
  }

  return (
    <div className="page ramadan-page">
      <PageHead title="وضع رمضان" subtitle="السحور والإفطار، وختمة رمضان، وتذكيرات الصيام" />
      <PlusGate feature="ramadan" title="وضع رمضان">
        <section className="ramadan-hero">
          <PaintedScene tone={next?.kind === 'iftar' ? 'sunset' : 'night'} variant="hero" className="ramadan-art" />
          <div className="ramadan-hero-body">
            {st.inRamadan ? (
              <>
                <h2>رمضان {toArabicDigits(st.hijri.year)} — اليوم {toArabicDigits(st.day ?? 1)}</h2>
                {next && loc ? (
                  <>
                    <p>{next.kind === 'iftar' ? 'الإفطار (المغرب) بعد' : 'نهاية السحور (الفجر) بعد'}</p>
                    <strong className="ramadan-count">{formatCountdown(next.at.getTime() - now.getTime())}</strong>
                    <p>{formatTime(next.at, tz)} — {loc.nameAr ?? loc.name}</p>
                  </>
                ) : !loc ? <p>اختر مدينتك من <Link to="/prayer">المواقيت</Link> لتظهر مواعيد السحور والإفطار.</p> : <p>تقبّل الله منا ومنكم.</p>}
              </>
            ) : (
              <>
                <h2>{st.daysUntil != null ? `بقي على رمضان نحو ${toArabicDigits(st.daysUntil)} يومًا` : 'رمضان'}</h2>
                <p>بحسب التقويم المحسوب، والعبرة برؤية الهلال في بلدك. يمكن ضبط التقويم الهجري ±يومين من الإعدادات.</p>
              </>
            )}
          </div>
        </section>

        {msg && <p className="notice" role="status">{msg}</p>}

        {loc && (
          <section className="ramadan-times" aria-label="مواعيد اليوم">
            <div className="rt-tile suhoor"><Sunrise size={22} aria-hidden="true" /><small>السحور ينتهي (الفجر)</small><b>{formatTime(todayTimes(loc, settings.prayer, now).fajr, tz)}</b>{r.imsakMinutes > 0 && <small>الإمساك الاحتياطي: {formatTime(new Date(todayTimes(loc, settings.prayer, now).fajr.getTime() - r.imsakMinutes * 60_000), tz)}</small>}</div>
            <div className="rt-tile iftar"><Moon size={22} aria-hidden="true" /><small>الإفطار (المغرب)</small><b>{formatTime(todayTimes(loc, settings.prayer, now).maghrib, tz)}</b><small>{loc.nameAr ?? loc.name}</small></div>
          </section>
        )}

        <section className="card">
          <h2><Palette size={18} /> ثيم رمضان للتطبيق كله</h2>
          <p className="muted small">عند تفعيله يتحول التطبيق كله إلى «فوانيس رمضان»، وتظهر بطاقة السحور والإفطار في الرئيسية.</p>
          <div className="chips" role="radiogroup" aria-label="ثيم رمضان">
            {([['auto', 'تلقائي في شهر رمضان'], ['on', 'مفعّل الآن'], ['off', 'متوقف']] as const).map(([id, label]) => (
              <button key={id} type="button" role="radio" aria-checked={(r.theme ?? 'auto') === id} className={'chip' + ((r.theme ?? 'auto') === id ? ' active' : '')} onClick={() => setR({ theme: id })}>{label}</button>
            ))}
          </div>
        </section>

        <QadaCard today={today} />

        <Link to="/cards" className="list-card" style={{ marginBottom: '1rem' }}>
          <span className="icon-chip"><Moon size={20} aria-hidden="true" /></span>
          <span className="lc-body"><strong>بطاقات رمضان</strong><small>تهاني وآيات وأحاديث وأدعية رمضان — شاركها بلمسة</small></span>
        </Link>

        <section className="card">
          <h2><BookOpen size={18} /> ختمة رمضان</h2>
          <p className="muted">تقسيم المصحف على ما بقي من الشهر، مع متابعة يومية في «ورد اليوم».</p>
          <button className="btn btn-gold" onClick={startKhatma}>ابدأ ختمة رمضان</button>
        </section>

        <section className="card">
          <h2>التذكيرات في رمضان</h2>
          <label className="field"><span>تذكير السحور قبل الفجر</span>
            <select className="select" value={r.suhoorMinutes} onChange={(e) => setR({ suhoorMinutes: Number(e.target.value) })}>{MINUTES.map((m) => <option key={m} value={m}>{m ? `${toArabicDigits(m)} دقيقة` : 'بلا تذكير'}</option>)}</select>
          </label>
          <label className="field"><span>تذكير قبل الإفطار</span>
            <select className="select" value={r.iftarMinutes} onChange={(e) => setR({ iftarMinutes: Number(e.target.value) })}>{MINUTES.map((m) => <option key={m} value={m}>{m ? `${toArabicDigits(m)} دقائق` : 'بلا تذكير'}</option>)}</select>
          </label>
          <label className="field"><span>الإمساك الاحتياطي في الجدول (اختياري)</span>
            <select className="select" value={r.imsakMinutes} onChange={(e) => setR({ imsakMinutes: Number(e.target.value) })}>{[0, 5, 10, 15, 20].map((m) => <option key={m} value={m}>{m ? `قبل الفجر بـ ${toArabicDigits(m)} دقائق` : 'لا يُعرض'}</option>)}</select>
          </label>
          <p className="muted small">يجوز الأكل والشرب حتى أذان الفجر؛ الإمساك قبله احتياط اختياري يعرضه بعض الناس. التذكيرات تعمل مع تفعيل التنبيهات.</p>
        </section>

        <section className="card">
          <h2>{st.inRamadan ? 'جدول الشهر' : 'جدول رمضان القادم (تقديري)'}</h2>
          {!loc ? <p className="muted">اختر مدينتك أولًا.</p> : (
            <div className="table-wrap">
              <table className="ramadan-table">
                <thead><tr><th>اليوم</th><th>التاريخ</th>{r.imsakMinutes > 0 && <th>الإمساك</th>}<th><Sunrise size={14} /> الفجر</th><th><Moon size={14} /> المغرب</th></tr></thead>
                <tbody>
                  {table.map((d) => (
                    <tr key={d.key} className={d.key === today ? 'today' : ''}>
                      <td>{toArabicDigits(d.day)}</td>
                      <td>{new Intl.DateTimeFormat('ar', { timeZone: tz, day: 'numeric', month: 'short' }).format(d.date)}</td>
                      {r.imsakMinutes > 0 && <td>{d.imsak ? formatTime(d.imsak, tz) : ''}</td>}
                      <td>{formatTime(d.fajr, tz)}</td>
                      <td>{formatTime(d.maghrib, tz)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="card">
          <h2>من السنة</h2>
          <blockquote className="dhikr-text">«تسحّروا، فإنّ في السحور بركة»</blockquote>
          <p className="muted small">متفق عليه: البخاري (1923) ومسلم (1095)</p>
          <blockquote className="dhikr-text">«ذَهَبَ الظَّمَأُ، وَابْتَلَّتِ الْعُرُوقُ، وَثَبَتَ الْأَجْرُ إِنْ شَاءَ اللَّهُ»</blockquote>
          <p className="muted small">كان النبي ﷺ يقوله إذا أفطر — رواه أبو داود (2357)، وحسّنه الألباني</p>
        </section>

        <section className="card">
          <h2>تذكيرات صيام التطوع</h2>
          <label className="check"><input type="checkbox" checked={f.enabled} onChange={(e) => setF({ enabled: e.target.checked })} /> تذكير في الليلة السابقة</label>
          <label className="field"><span>وقت التذكير</span><input type="time" value={f.time} onChange={(e) => setF({ time: e.target.value })} /></label>
          {([['arafah', 'يوم عرفة'], ['ashura', 'تاسوعاء وعاشوراء'], ['shawwal', 'الست من شوال'], ['beed', 'الأيام البيض (13 و14 و15 من كل شهر هجري)'], ['monThu', 'الاثنين والخميس']] as const).map(([k, label]) => (
            <label key={k} className="check"><input type="checkbox" disabled={!f.enabled} checked={f[k]} onChange={(e) => setF({ [k]: e.target.checked })} /> {label}</label>
          ))}
          <p className="muted small">بحسب التقويم المحسوب، ولا تذكير في يومي العيد وأيام التشريق.</p>
        </section>
      </PlusGate>
    </div>
  )
}
