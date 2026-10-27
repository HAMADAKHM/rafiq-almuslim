// «رفيقي يذكّرني» (رفيق بلس): كل إعدادات التذكير الذكي في مكان واحد.
import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { BellRing, BookOpen, Check, Hourglass, Pause, Play, Volume2, VolumeX } from 'lucide-react'
import { PageHead } from '../../components/Common'
import { DhikrCard } from '../../components/DhikrCard'
import { PlusGate } from '../../billing/PlusGate'
import { useSettings } from '../../state/SettingsContext'
import type { CompanionSettings, PrayerKey } from '../../state/settings'
import { PRAYER_LABELS } from '../../services/prayer'
import { ACTUAL_KEY, loadDoneToday, markDhikrDone, restoreActualFromLast } from '../../services/companionStore'
import { clampInterval, COMPANION_GROUPS, findPoolItem, INTERVAL_CHOICES, positionRoute, positionText, PRAYER_END_NOTE, type QuranPosition } from '../../services/companion'
import { atLocalTime, buildSchedule } from '../../services/reminders'
import { addDays, dateParts, dayKey } from '../../lib/dates'
import { favorites, kv } from '../../db/repos'
import { toast, useLive, useNow } from '../../hooks'
import { speakArabic, stopSpeaking, voiceAvailable } from '../../platform/voice'
import { toArabicDigits } from '../../lib/arabic'

const DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
const PRAYERS: PrayerKey[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha']

function DayPicker({ days, onChange, label }: { days: number[]; onChange: (d: number[]) => void; label: string }) {
  return (
    <div className="row" role="group" aria-label={label} style={{ flexWrap: 'wrap', gap: 6 }}>
      {DAYS.map((d, i) => (
        <button key={d} type="button" className={'chip' + (days.includes(i) ? ' active' : '')} aria-pressed={days.includes(i)}
          onClick={() => onChange(days.includes(i) ? days.filter((x) => x !== i) : [...days, i].sort())}>{d}</button>
      ))}
    </div>
  )
}

const fmtTime = (d: Date, tz?: string) => new Intl.DateTimeFormat('ar', { hour: 'numeric', minute: '2-digit', timeZone: tz }).format(d)
const fmtDay = (d: Date, tz?: string) => new Intl.DateTimeFormat('ar', { weekday: 'long', day: 'numeric', month: 'long', timeZone: tz }).format(d)

export function CompanionPage() {
  const { settings, update } = useSettings()
  const c = settings.companion
  const tz = settings.location?.tz
  const set = <K extends keyof CompanionSettings>(k: K, p: Partial<CompanionSettings[K]>) => update({ companion: { ...c, [k]: { ...c[k], ...p } } })
  const [customOpen, setCustomOpen] = useState(!INTERVAL_CHOICES.includes(c.adhkar.interval))
  const [untilDate, setUntilDate] = useState('')
  const n = settings.notifications
  const nowD = useNow(60_000)
  const now = nowD.getTime()
  const actual = useLive(() => kv.get<QuranPosition | null>(ACTUAL_KEY, null), ['kv:' + ACTUAL_KEY], null)
  const travelOn = c.travel.enabled
  const paused = c.adhkar.pausedUntil && c.adhkar.pausedUntil > now ? c.adhkar.pausedUntil : null

  // معاينة صادقة: ما سيُجدول فعلًا بحسب الإعدادات الحالية
  const upcoming = useMemo(() => {
    if (!settings.location) return []
    return buildSchedule({ ...settings, notifications: { ...n, enabled: true } }, nowD, 2)
      .filter((r) => r.kind === 'dhikr-interval' || r.kind === 'quran-time' || r.kind === 'prayer-end').slice(0, 6)
  }, [settings, n, nowD])

  const pauseFor = (ms: number | 'day' | 'date') => {
    if (ms === 'day') {
      const day = dateParts(addDays(new Date(), 1), tz ?? 'UTC')
      set('adhkar', { pausedUntil: atLocalTime(day, '00:00', tz ?? 'UTC').getTime() })
      toast('أُوقف التذكير الدوري حتى الغد')
    } else if (ms === 'date') {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(untilDate)) return
      const [y, m, d] = untilDate.split('-').map(Number)
      set('adhkar', { pausedUntil: atLocalTime({ y, m, d }, '00:00', tz ?? 'UTC').getTime() })
      toast('أُوقف التذكير الدوري حتى التاريخ المحدد')
    } else {
      set('adhkar', { pausedUntil: now + ms })
      toast('أُوقف التذكير الدوري ساعة')
    }
  }

  return (
    <div className="page">
      <PageHead title="رفيقي يذكّرني" subtitle="تذكير لطيف بالذكر وبموعدك مع القرآن وبقرب خروج وقت الصلاة — بإشعارات محلية على جهازك" />
      <PlusGate feature="companion" title="رفيقي يذكّرني">
        <div className="stack">
          {(!n.enabled || !settings.location) && (
            <section className="card alert-gold">
              <p style={{ margin: 0 }}>
                تعمل هذه التذكيرات عبر إشعارات جهازك{!settings.location ? ' وتحتاج مدينتك لحساب الأوقات' : ''}. فعّل الإشعارات من صفحة التذكيرات — يُطلب الإذن مرة واحدة فقط، ولا يُرسل شيء خارج جهازك.
              </p>
              <div className="row" style={{ marginTop: 8 }}>
                <Link className="btn btn-sm btn-primary" to="/reminders">تفعيل الإشعارات</Link>
                {!settings.location && <Link className="btn btn-sm" to="/prayer">اختيار المدينة</Link>}
              </div>
            </section>
          )}

          {/* ---------- الذكر الدوري ---------- */}
          <section className="card" aria-labelledby="cmp-adhkar">
            <div className="spread">
              <h2 id="cmp-adhkar" style={{ margin: 0 }}><BellRing size={18} aria-hidden="true" /> ذكّرني بالذكر</h2>
              <label className="check switch"><input type="checkbox" className="switch-input" role="switch" checked={c.adhkar.enabled} onChange={(e) => set('adhkar', { enabled: e.target.checked })} aria-label="تفعيل تذكير الأذكار الدوري" /></label>
            </div>
            <p className="small muted">ذكر قصير من السنة كل مدة تختارها، بترتيب متناوب لا يكرر الذكر نفسه، ولا يُعاد عليك ذكر أكملته اليوم.</p>
            {c.adhkar.enabled && (
              <div className="stack" style={{ gap: 10 }}>
                <div className="field"><span>كل</span>
                  <div className="row" role="radiogroup" aria-label="فترة التذكير" style={{ flexWrap: 'wrap', gap: 6 }}>
                    {INTERVAL_CHOICES.map((m) => (
                      <button key={m} type="button" role="radio" aria-checked={!customOpen && c.adhkar.interval === m} className={'chip' + (!customOpen && c.adhkar.interval === m ? ' active' : '')}
                        onClick={() => { setCustomOpen(false); set('adhkar', { interval: m }) }}>{m < 60 ? `${toArabicDigits(m)} دقيقة` : m === 60 ? 'ساعة' : 'ساعتين'}</button>
                    ))}
                    <button type="button" role="radio" aria-checked={customOpen} className={'chip' + (customOpen ? ' active' : '')} onClick={() => setCustomOpen(true)}>مدة أخرى</button>
                  </div>
                  {customOpen && (
                    <label className="row small" style={{ marginTop: 6 }}>
                      <input className="input" type="number" min={10} max={720} style={{ width: 100 }} value={c.adhkar.interval} aria-label="المدة بالدقائق"
                        onChange={(e) => set('adhkar', { interval: clampInterval(Number(e.target.value)) })} /> دقيقة (من ١٠ إلى ٧٢٠)
                    </label>
                  )}
                </div>
                <div className="row">
                  <label className="row small">من <input className="input" type="time" style={{ width: 130 }} value={c.adhkar.start} aria-label="بداية التذكير" onChange={(e) => e.target.value && set('adhkar', { start: e.target.value })} /></label>
                  <label className="row small">إلى <input className="input" type="time" style={{ width: 130 }} value={c.adhkar.end} aria-label="نهاية التذكير" onChange={(e) => e.target.value && set('adhkar', { end: e.target.value })} /></label>
                </div>
                {c.adhkar.end <= c.adhkar.start && <p className="alert alert-error small">اجعل وقت النهاية بعد وقت البداية.</p>}
                <DayPicker label="أيام تذكير الأذكار" days={c.adhkar.days} onChange={(days) => set('adhkar', { days })} />
                <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
                  <legend className="small">أنواع الأذكار</legend>
                  <div className="grid grid-2" style={{ gap: 6 }}>
                    {COMPANION_GROUPS.map((g) => (
                      <label key={g.id} className="check small"><input type="checkbox" className="switch-input" checked={c.adhkar.groups.includes(g.id)}
                        onChange={(e) => set('adhkar', { groups: e.target.checked ? [...c.adhkar.groups, g.id] : c.adhkar.groups.filter((x) => x !== g.id) })} /> {g.label}</label>
                    ))}
                  </div>
                  {!c.adhkar.groups.length && <p className="alert alert-gold small">اختر نوعًا واحدًا على الأقل.</p>}
                </fieldset>
                <label className="check"><input type="checkbox" className="switch-input" checked={c.adhkar.sound} onChange={(e) => set('adhkar', { sound: e.target.checked })} />
                  {c.adhkar.sound ? <Volume2 size={16} aria-hidden="true" /> : <VolumeX size={16} aria-hidden="true" />}
                  <span>صوت الإشعار<span className="small muted"> — نغمة الإشعار في جهازك. أطفئه للوضع الهادئ: إشعار مكتوب فقط. وضع الصامت وعدم الإزعاج في جهازك يُحترمان دائمًا</span></span>
                </label>
                <div className="card-inset">
                  {paused ? (
                    <div className="spread">
                      <span className="small"><Pause size={14} aria-hidden="true" /> متوقف حتى {fmtDay(new Date(paused), tz)} {fmtTime(new Date(paused), tz)}</span>
                      <button className="btn btn-sm" onClick={() => set('adhkar', { pausedUntil: null })}><Play size={14} aria-hidden="true" /> استئناف</button>
                    </div>
                  ) : (
                    <div className="row" style={{ flexWrap: 'wrap', gap: 6 }}>
                      <span className="small muted">إيقاف مؤقت:</span>
                      <button className="btn btn-sm" onClick={() => pauseFor(3600_000)}>ساعة</button>
                      <button className="btn btn-sm" onClick={() => pauseFor('day')}>بقية اليوم</button>
                      <input className="input" type="date" style={{ width: 160 }} value={untilDate} aria-label="الإيقاف حتى تاريخ" onChange={(e) => setUntilDate(e.target.value)} />
                      <button className="btn btn-sm" disabled={!untilDate} onClick={() => pauseFor('date')}>حتى هذا التاريخ</button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>

          {/* ---------- موعدي مع القرآن ---------- */}
          <section className="card" aria-labelledby="cmp-quran">
            <div className="spread">
              <h2 id="cmp-quran" style={{ margin: 0 }}><BookOpen size={18} aria-hidden="true" /> موعدي مع القرآن</h2>
              <label className="check switch"><input type="checkbox" className="switch-input" role="switch" checked={c.quran.enabled} onChange={(e) => set('quran', { enabled: e.target.checked })} aria-label="تفعيل موعدي مع القرآن" /></label>
            </div>
            <p className="small muted">إشعار يومي يعرض آخر موضع قرأته فعلًا، ويفتح المصحف عنده مباشرة. لا يُعدّ وصول الإشعار قراءةً، ولا يتغير موضعك إلا بقراءتك.</p>
            <div className="card-inset spread" style={{ marginBottom: 10 }}>
              <span className="small"><b>آخر قراءة فعلية:</b> {actual ? `${positionText(actual).replace('تابع من ', '')}${actual.juz ? `، الجزء ${actual.juz}` : ''} — ${fmtDay(new Date(actual.at), tz)}` : 'لم تُسجَّل بعد'}</span>
              <span className="row">
                {actual && <Link className="btn btn-sm btn-primary" to={positionRoute(actual)}>متابعة</Link>}
                <button className="btn btn-sm" onClick={async () => toast((await restoreActualFromLast()) ? 'اعتُمد آخر موضع فتحته موضعًا لقراءتك' : 'لا يوجد موضع محفوظ بعد')}>استعادة من آخر موضع مفتوح</button>
              </span>
            </div>
            <p className="small muted" style={{ marginTop: 0 }}>تُسجَّل القراءة الفعلية بعد بقائك على الصفحة 20 ثانية والتلاوة الصوتية متوقفة. انتقال الصفحات مع التلاوة وحده لا يغيّرها.</p>
            {c.quran.enabled && (
              <div className="stack" style={{ gap: 10 }}>
                <div className="row" style={{ flexWrap: 'wrap' }}>
                  {c.quran.times.map((t, i) => (
                    <span key={i} className="row">
                      <input className="input" type="time" style={{ width: 130 }} value={t} aria-label={`الموعد ${i + 1}`} onChange={(e) => e.target.value && set('quran', { times: c.quran.times.map((x, k) => (k === i ? e.target.value : x)) })} />
                      {c.quran.times.length > 1 && <button className="btn btn-ghost btn-sm" aria-label={`حذف الموعد ${i + 1}`} onClick={() => set('quran', { times: c.quran.times.filter((_, k) => k !== i) })}>×</button>}
                    </span>
                  ))}
                  {c.quran.times.length < 4 && <button className="btn btn-sm" onClick={() => set('quran', { times: [...c.quran.times, '06:00'] })}>+ موعد آخر</button>}
                </div>
                <DayPicker label="أيام موعد القرآن" days={c.quran.days} onChange={(days) => set('quran', { days })} />
                <div className="row">
                  <label className="field" style={{ margin: 0 }}><span>الورد اليومي</span>
                    <span className="row">
                      <input className="input" type="number" min={1} max={c.quran.amount.unit === 'juz' ? 30 : c.quran.amount.unit === 'pages' ? 604 : 300} style={{ width: 90 }} value={c.quran.amount.value} aria-label="مقدار الورد"
                        onChange={(e) => set('quran', { amount: { ...c.quran.amount, value: Math.max(1, Number(e.target.value) || 1) } })} />
                      <select className="select" value={c.quran.amount.unit} aria-label="وحدة الورد" onChange={(e) => set('quran', { amount: { ...c.quran.amount, unit: e.target.value as 'pages' } })}>
                        <option value="pages">صفحات</option><option value="ayahs">آيات</option><option value="juz">أجزاء</option>
                      </select>
                    </span>
                  </label>
                  <label className="field" style={{ margin: 0 }}><span>«ذكّرني لاحقًا» بعد</span>
                    <select className="select" value={c.quran.snoozeMinutes} onChange={(e) => set('quran', { snoozeMinutes: Number(e.target.value) })}>
                      {[10, 15, 30, 60].map((m) => <option key={m} value={m}>{m === 60 ? 'ساعة' : `${toArabicDigits(m)} دقيقة`}</option>)}
                    </select>
                  </label>
                </div>
                <label className="check"><input type="checkbox" className="switch-input" checked={c.quran.sound} onChange={(e) => set('quran', { sound: e.target.checked })} /> صوت الإشعار</label>
              </div>
            )}
          </section>

          {/* ---------- قرب خروج وقت الصلاة ---------- */}
          <section className="card" aria-labelledby="cmp-end">
            <div className="spread">
              <h2 id="cmp-end" style={{ margin: 0 }}><Hourglass size={18} aria-hidden="true" /> قرب خروج وقت الصلاة</h2>
              <label className="check switch"><input type="checkbox" className="switch-input" role="switch" checked={c.prayerEnd.enabled} onChange={(e) => set('prayerEnd', { enabled: e.target.checked })} aria-label="تفعيل تذكير قرب خروج وقت الصلاة" /></label>
            </div>
            <p className="small muted">تنبيه قبل انتهاء وقت الصلاة بدقائق تختارها، لمن لم يصلِّ بعد.</p>
            {c.prayerEnd.enabled && (
              <div className="stack" style={{ gap: 10 }}>
                <label className="field" style={{ margin: 0 }}><span>قبل خروج الوقت بـ</span>
                  <select className="select" style={{ maxWidth: 200 }} value={c.prayerEnd.minutesBefore} onChange={(e) => set('prayerEnd', { minutesBefore: Number(e.target.value) })}>
                    {[10, 15, 20, 30, 45, 60].map((m) => <option key={m} value={m}>{m === 60 ? 'ساعة' : `${toArabicDigits(m)} دقيقة`}</option>)}
                  </select>
                </label>
                <ul className="plain stack" style={{ gap: 4 }}>
                  {PRAYERS.map((p) => (
                    <li key={p}><label className="check small"><input type="checkbox" className="switch-input" checked={c.prayerEnd.perPrayer[p]} onChange={(e) => set('prayerEnd', { perPrayer: { ...c.prayerEnd.perPrayer, [p]: e.target.checked } })} /> {PRAYER_LABELS[p]} <span className="muted">— {PRAYER_END_NOTE[p]}</span></label></li>
                  ))}
                </ul>
                <p className="small muted" style={{ margin: 0 }}>
                  الأوقات محسوبة بطريقة الحساب المختارة في الإعدادات. ووقت العشاء المختار إلى نصف الليل لحديث عبد الله بن عمرو: «ووقت صلاة العشاء إلى نصف الليل الأوسط» (رواه مسلم 612)، ويُحسب هنا منتصفًا بين المغرب والفجر.
                </p>
              </div>
            )}
          </section>

          {/* ---------- رفيقي اليومي + الهدف الصغير + وضع السفر ---------- */}
          <section className="card" aria-labelledby="cmp-card" id="card">
            <h2 id="cmp-card" style={{ margin: 0 }}>بطاقة «رفيقي اليومي» في الرئيسية</h2>
            <p className="small muted">اختر ما يظهر فيها. يمكنك نقلها أو إخفاؤها كلها من «تخصيص الرئيسية».</p>
            <div className="grid grid-2" style={{ gap: 6 }}>
              {([['wird', 'ورد القرآن التالي'], ['position', 'آخر موضع محفوظ'], ['dhikr', 'الذكر التالي ووقته'], ['goal', 'الهدف الصغير']] as const).map(([k, label]) => (
                <label key={k} className="check small"><input type="checkbox" className="switch-input" checked={c.card[k]} onChange={(e) => set('card', { [k]: e.target.checked })} /> {label}</label>
              ))}
            </div>
            <h3 style={{ marginBottom: 4 }}>هدف صغير كل يوم</h3>
            <div className="row">
              <label className="row small"><input className="input" type="number" min={0} max={20} style={{ width: 80 }} value={c.goal.pages} aria-label="صفحات الهدف اليومي" onChange={(e) => set('goal', { pages: Math.min(20, Math.max(0, Number(e.target.value) || 0)) })} /> صفحة قرآن</label>
              <label className="row small"><input className="input" type="number" min={0} max={30} style={{ width: 80 }} value={c.goal.adhkar} aria-label="أذكار الهدف اليومي" onChange={(e) => set('goal', { adhkar: Math.min(30, Math.max(0, Number(e.target.value) || 0)) })} /> أذكار</label>
            </div>
            <p className="small muted">تُحسب الصفحات المقروءة فعلًا فقط، والأذكار التي سجّلت إتمامها. لا لوم عند الانقطاع — كل يوم بداية جديدة.</p>
            <h3 style={{ marginBottom: 4 }}>وضع السفر</h3>
            <label className="check"><input type="checkbox" className="switch-input" role="switch" checked={travelOn} onChange={(e) => set('travel', { enabled: e.target.checked, until: e.target.checked ? c.travel.until : null })} aria-label="وضع السفر" />
              <span>إيقاف الذكر الدوري وموعد القرآن مؤقتًا<span className="small muted"> — تبقى تذكيرات الصلاة. وإن تغيّرت مدينتك فاخترها يدويًا من المواقيت (لا نتتبع موقعك)</span></span>
            </label>
            {c.travel.enabled && (
              <label className="row small" style={{ marginTop: 6 }}>حتى <input className="input" type="date" style={{ width: 160 }} aria-label="نهاية وضع السفر"
                value={c.travel.until ? dayKey(new Date(c.travel.until), tz) : ''}
                onChange={(e) => { const v = e.target.value; if (!v) { set('travel', { until: null }); return } const [y, m, d] = v.split('-').map(Number); set('travel', { until: atLocalTime({ y, m, d }, '00:00', tz ?? 'UTC').getTime() }) }} />
                <span className="muted">(اتركه فارغًا ليبقى حتى تُطفئه)</span></label>
            )}
          </section>

          <section className="card" aria-labelledby="cmp-next">
            <h2 id="cmp-next">القادم من تذكيراتك</h2>
            {upcoming.length ? (
              <ul className="plain stack small" style={{ gap: 4 }}>
                {upcoming.map((r) => <li key={r.id}><b>{fmtDay(r.at, tz)} {fmtTime(r.at, tz)}</b> — {r.title}: <span className="muted">{r.body.length > 70 ? r.body.slice(0, 70) + '…' : r.body}</span></li>)}
              </ul>
            ) : <p className="small muted">لا توجد تذكيرات قادمة بحسب اختياراتك الحالية.</p>}
            <p className="small muted" style={{ margin: 0 }}>قد يؤخر نظام الهاتف الإشعار دقائق في وضع توفير الطاقة. للدقة اسمح «بالتنبيهات الدقيقة» من صفحة التذكيرات.</p>
          </section>
        </div>
      </PlusGate>
    </div>
  )
}

/** صفحة الذكر التي يفتحها إشعار التذكير الدوري */
export function CompanionDhikrPage() {
  const { id = '' } = useParams()
  const nav = useNavigate()
  const { settings } = useSettings()
  const found = findPoolItem(id)
  const favs = useLive(() => favorites.all(), ['favorites'], [])
  const done = useLive(() => loadDoneToday(settings.location?.tz), ['kv:companion:done'], { date: '', ids: [] as string[] })
  const [count, setCount] = useState(0)
  const [speaking, setSpeaking] = useState(false)
  if (!found) {
    return (
      <div className="page">
        <PageHead title="رفيقي يذكّرني" />
        <p className="notice">لم نجد هذا الذكر. <Link to="/adhkar">افتح الأذكار</Link></p>
      </div>
    )
  }
  const { item, group } = found
  const isDone = done.ids.includes(item.id)
  const favKind = COMPANION_GROUPS.find((g) => g.id === group)?.source === 'adhkar' ? 'dhikr' : 'dua'
  const listen = async () => {
    if (speaking) { await stopSpeaking(); setSpeaking(false); return }
    if (!(await voiceAvailable())) { toast('لا يتوفر صوت عربي على هذا الجهاز'); return }
    setSpeaking(true)
    try { await speakArabic(item.text ?? '') } catch { toast('تعذّر تشغيل الصوت') }
    setSpeaking(false)
  }
  return (
    <div className="page">
      <PageHead title="رفيقي يذكّرني" subtitle={COMPANION_GROUPS.find((g) => g.id === group)?.label} />
      <div className="stack">
        <DhikrCard item={item} fav={favs.some((f) => f.itemId === item.id)} favKind={favKind} withCounter={!!item.count && item.count > 1} count={count} onCount={setCount} />
        <div className="row" style={{ flexWrap: 'wrap' }}>
          <button className="btn btn-primary" disabled={isDone} onClick={async () => { await markDhikrDone(item.id, settings.location?.tz); toast('سُجّل الذكر — جزاك الله خيرًا'); nav('/') }}>
            <Check size={16} aria-hidden="true" /> {isDone ? 'قرأته اليوم' : 'قرأت الذكر'}
          </button>
          <button className="btn" onClick={listen} aria-pressed={speaking}><Volume2 size={16} aria-hidden="true" /> {speaking ? 'إيقاف' : 'استمع'}</button>
          <Link className="btn btn-ghost" to="/companion">إعدادات التذكير</Link>
        </div>
        <p className="small muted">«استمع» يقرأ النص بصوت جهازك العربي (ليس تسجيلًا لقارئ). المصدر مذكور أسفل الذكر.</p>
      </div>
    </div>
  )
}
