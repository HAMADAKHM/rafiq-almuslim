import { useEffect, useMemo, useRef, useState } from 'react'
import { PaintedScene, type PaintTone } from '../components/Scene'
import { LogoMark } from '../components/Art'
import { SADAQAH_LINE, HOME_CARD } from '../content/dedication'
import { ONLINE_ADHANS } from '../content/onlineAdhans'
import { HADITH } from '../content/hadith'
import { METHODS, PRAYER_LABELS, PRAYERS, nextPrayer, suggestMethod, todayTimes, type MethodId, type PrayerName } from '../services/prayer'
import { cityLabel, loadCities, searchCities, type City } from '../services/cities'
import { ayahOfDay, dhikrOfDay } from '../services/daily'
import { loadQuran, type QuranData } from '../services/quran'
import { dayKey, daysBetween, formatGregorian, formatHijri, formatCountdown } from '../lib/dates'
import { toArabicDigits } from '../lib/arabic'
import { loadTv, saveTv, tvPhase, TV_PRAYERS, type TvPrayer, type TvSettings } from './state'
import { RECITE_MODES, TV_RECITERS } from './recite'
import { resetRecitePos, useRecitation } from './useRecitation'
import { reciterById } from '../content/reciters'

declare const __TV_VERSION__: string
const TV_VERSION = typeof __TV_VERSION__ === 'string' ? __TV_VERSION__ : ''
const ADHAN_URL = ONLINE_ADHANS[0].url
const ROTATE_MS = 25_000
/** داخل تطبيق Android TV: الصوت مسموح دون ضغطة، والشاشة كاملة أصلًا */
const IN_APP = typeof location !== 'undefined' && new URLSearchParams(location.search).has('app')
/** وضع شاشة التوقف في تطبيق Android TV: عرض فقط بلا أزرار */
const DREAM = typeof location !== 'undefined' && new URLSearchParams(location.search).has('dream')
/** جسر تطبيق Android TV (غير موجود في المتصفح) */
type Bridge = { openScreensaverSettings(): boolean; getAutostart(): boolean; setAutostart(on: boolean): void }
const bridge = (): Bridge | null => (window as unknown as { RafiqTV?: Bridge }).RafiqTV ?? null

function toneFor(p?: PrayerName): PaintTone {
  if (p === 'fajr' || p === 'sunrise') return 'dawn'
  if (p === 'isha') return 'night'
  return 'sunset'
}

function clock(d: Date, tz: string, hour12: boolean, seconds = false): string {
  return new Intl.DateTimeFormat('ar-u-nu-latn', { timeZone: tz, hour: 'numeric', minute: '2-digit', second: seconds ? '2-digit' : undefined, hour12 }).format(d)
}

function useNow(ms = 1000) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => { const t = setInterval(() => setNow(new Date()), ms); return () => clearInterval(t) }, [ms])
  return now
}

/** محتوى يتبدل: آية اليوم، وحديث اليوم، وذكر اليوم — من المصحف والمكتبة الموثقة */
function useRotating(data: QuranData | null, day: string) {
  return useMemo(() => {
    const out: { title: string; text: string; ref: string; quran?: boolean }[] = []
    if (data) {
      const a = ayahOfDay(day)
      out.push({ title: 'آية اليوم', text: data.verses[a.surah - 1][a.ayah - 1], ref: `سورة ${data.meta.surahs[a.surah - 1].name} • الآية ${toArabicDigits(a.ayah)}`, quran: true })
    }
    const all = HADITH.flatMap((c) => c.items)
    const h = all[Math.max(0, daysBetween('2026-01-01', day)) % all.length]
    out.push({ title: 'حديث اليوم', text: h.text ?? '', ref: h.source })
    const d = dhikrOfDay(day)
    if (d.item.text) out.push({ title: 'ذكر اليوم', text: d.item.text, ref: d.item.source })
    return out
  }, [data, day])
}

export function TvApp() {
  const [s, setS] = useState<TvSettings>(() => loadTv())
  const [setup, setSetup] = useState(() => !loadTv().city)
  const [data, setData] = useState<QuranData | null>(null)
  const [unlocked, setUnlocked] = useState(IN_APP)
  const [slide, setSlide] = useState(0)
  const now = useNow()
  const audio = useRef<HTMLAudioElement | null>(null)
  const playedFor = useRef<string>('')

  useEffect(() => { loadQuran().then(setData).catch(() => {}) }, [])
  // بدأت الواجهة: تُخفى رسالة التحميل
  useEffect(() => { const b = document.getElementById('boot'); if (b && !document.getElementById('boot-err')) b.style.display = 'none' }, [])
  useEffect(() => { const t = setInterval(() => setSlide((x) => x + 1), ROTATE_MS); return () => clearInterval(t) }, [])

  // إبقاء الشاشة مضاءة حين يدعمها المتصفح
  useEffect(() => {
    const nav = navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<unknown> } }
    nav.wakeLock?.request('screen').catch(() => {})
  }, [])

  // المتصفحات تمنع الصوت حتى أول ضغطة: أول ضغطة على جهاز التحكم تفعّل صوت الأذان
  useEffect(() => {
    if (unlocked) return
    const unlock = () => {
      const a = new Audio(ADHAN_URL)
      a.muted = true
      a.play().then(() => { a.pause(); setUnlocked(true) }).catch(() => setUnlocked(true))
    }
    window.addEventListener('keydown', unlock, { once: true })
    window.addEventListener('click', unlock, { once: true })
    return () => { window.removeEventListener('keydown', unlock); window.removeEventListener('click', unlock) }
  }, [unlocked])

  const city = s.city
  const day = dayKey(now, city?.tz)
  const rotating = useRotating(data, day)
  const times = city ? todayTimes(city, s.prayer, now) : null
  const np = city ? nextPrayer(city, s.prayer, now) : null
  const phase = times ? tvPhase(now, times, s.iqama) : { kind: 'normal' as const }

  // الأذان عند دخول الوقت (أولوية على التلاوة)، مرة لكل صلاة، مع إعادة المحاولة إن تعذر التحميل
  const [adhanPlaying, setAdhanPlaying] = useState(false)
  useEffect(() => {
    if (phase.kind !== 'adhan' || !s.adhan) return
    const key = `${day}:${phase.prayer}`
    if (playedFor.current === key) return
    playedFor.current = key
    let tries = 0
    const start = () => {
      const a = new Audio(ADHAN_URL)
      a.volume = 1
      audio.current = a
      setAdhanPlaying(true)
      a.onended = () => { setAdhanPlaying(false); audio.current = null }
      const retry = () => { if (audio.current !== a) return; if (++tries < 4) setTimeout(start, 8000); else setAdhanPlaying(false) }
      a.onerror = retry
      a.play().catch(retry)
    }
    start()
  }, [phase.kind, phase.kind === 'adhan' ? phase.prayer : '', day, s.adhan]) // eslint-disable-line react-hooks/exhaustive-deps
  const stopAdhan = () => { audio.current?.pause(); audio.current = null; setAdhanPlaying(false) }
  const update = (p: Partial<TvSettings>) => setS((prev) => { const next = { ...prev, ...p }; saveTv(next); return next })

  // التلاوة: تتوقف وقت الأذان وانتظار الإقامة، وتُستأنف بعدهما
  const hour = Number(new Intl.DateTimeFormat('en-GB', { timeZone: city?.tz, hour: '2-digit', hour12: false }).format(now)) % 24
  const rec = useRecitation(s, data, { day, hour }, phase.kind !== 'normal' || adhanPlaying)
  // أزرار الوسائط في جهاز التحكم: تشغيل/إيقاف التلاوة
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (['MediaPlayPause', 'MediaPlay', 'MediaPause', 'MediaStop'].includes(e.key)) update({ reciteOn: e.key === 'MediaPlay' ? true : e.key === 'MediaPause' || e.key === 'MediaStop' ? false : !s.reciteOn }) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [s.reciteOn]) // eslint-disable-line react-hooks/exhaustive-deps

  if (DREAM && (!city || !times || !np)) return <div className="tv tv-dream-empty"><p>افتح تطبيق «شاشة رفيق المسلم» واختر مدينتك لتظهر المواقيت هنا.</p></div>
  if (setup || !city || !times || !np) return <TvSetup s={s} data={data} onSave={(next) => { saveTv(next); setS(next); setSetup(false) }} canCancel={!!city} onCancel={() => setSetup(false)} />

  const playingText = rec.current && data ? {
    title: 'تلاوة الآن',
    text: data.verses[rec.current.surah - 1][rec.current.ayah - 1],
    ref: `سورة ${data.meta.surahs[rec.current.surah - 1].name} • الآية ${toArabicDigits(rec.current.ayah)} — ${reciterById(s.reciterId).name}`,
    quran: true,
  } : null
  const item = playingText ?? rotating[slide % Math.max(1, rotating.length)]
  const tone = toneFor(np.name)
  const left = np.time.getTime() - now.getTime()

  return (
    <div className="tv">
      <PaintedScene tone={tone} variant="hero" className="tv-art" />
      <div className="tv-veil" />

      <header className="tv-top">
        <div className="tv-brand"><span className="tv-logo"><LogoMark size={44} /></span><div><strong>{HOME_CARD.app}</strong><small>{city.nameAr ?? city.name}</small></div></div>
        <div className="tv-dates"><span>{formatGregorian(now, city.tz)}</span><span className="tv-hijri">{formatHijri(now, city.tz)}</span></div>
      </header>

      <main className="tv-main">
        <section className="tv-clock-col">
          <div className="tv-clock">{clock(now, city.tz, s.hour12, true)}</div>
          <div className="tv-next">
            <span className="tv-next-label">الصلاة القادمة</span>
            <span className="tv-next-name">{PRAYER_LABELS[np.name]}</span>
            <span className="tv-next-time">{clock(np.time, city.tz, s.hour12)}</span>
            <span className="tv-next-left">بعد <b>{formatCountdown(left)}</b></span>
          </div>
        </section>
        {item && (
          <section className={'tv-card' + (playingText ? ' playing' : '')} key={playingText ? `${rec.current!.surah}:${rec.current!.ayah}` : slide}>
            <div className="tv-card-title">{item.title}</div>
            <p className={'tv-card-text' + (item.quran ? ' quran' : '')}>{item.quran ? `﴿${item.text}﴾` : `«${item.text}»`}</p>
            <div className="tv-card-ref">{item.ref}</div>
            {rec.failed && <div className="tv-card-ref">تعذر تحميل التلاوة — تحقق من اتصال التلفاز بالإنترنت</div>}
          </section>
        )}
      </main>

      <section className="tv-prayers" aria-label="مواقيت اليوم">
        {PRAYERS.map((p) => (
          <div key={p} className={'tv-prayer' + (np.name === p && np.time.getTime() === times[p].getTime() ? ' next' : '') + (p === 'sunrise' ? ' sunrise' : '')}>
            <span>{PRAYER_LABELS[p]}</span>
            <b>{clock(times[p], city.tz, s.hour12)}</b>
            {p !== 'sunrise' && s.iqama[p as TvPrayer] > 0 && <small>الإقامة +{s.iqama[p as TvPrayer]} د</small>}
          </div>
        ))}
      </section>

      <footer className="tv-foot">
        <span className="tv-sadaqah">{SADAQAH_LINE} — {HOME_CARD.prayer}</span>
        {!DREAM && <span className="tv-actions">
          {!unlocked && s.adhan && <span className="tv-hint">اضغط أي زر في جهاز التحكم لتفعيل صوت الأذان</span>}
          {!IN_APP && <button className="tv-btn" onClick={() => document.documentElement.requestFullscreen?.().catch(() => {})}>ملء الشاشة</button>}
          <button className={'tv-btn' + (s.reciteOn ? ' on' : '')} onClick={() => update({ reciteOn: !s.reciteOn })}>{s.reciteOn ? '⏸ إيقاف القراءة' : '▶ تشغيل القراءة'}</button>
          <button className="tv-btn" onClick={() => setSetup(true)}>الإعدادات</button>
          <span className="tv-hint">{TV_VERSION}</span>
        </span>}
      </footer>

      {phase.kind === 'adhan' && (
        <div className="tv-overlay" role="alert">
          <PaintedScene tone={toneFor(phase.prayer)} variant="hero" className="tv-art" />
          <div className="tv-veil strong" />
          <div className="tv-overlay-body">
            <div className="tv-overlay-kicker">حان الآن وقت صلاة</div>
            <div className="tv-overlay-title">{PRAYER_LABELS[phase.prayer]}</div>
            <div className="tv-overlay-sub">{clock(phase.at, city.tz, s.hour12)} — {city.nameAr ?? city.name}</div>
            {s.adhan && <button className="tv-btn" autoFocus onClick={stopAdhan}>إيقاف صوت الأذان</button>}
          </div>
        </div>
      )}
      {phase.kind === 'iqama' && (
        <div className="tv-overlay" role="alert">
          <div className="tv-veil strong solid" />
          <div className="tv-overlay-body">
            <div className="tv-overlay-kicker">صلاة {PRAYER_LABELS[phase.prayer]} — الإقامة بعد</div>
            <div className="tv-overlay-title mono">{formatCountdown(phase.at.getTime() - now.getTime()).replace(/^00:/, '')}</div>
            <div className="tv-overlay-sub">استووا واعتدلوا، وسدّوا الفُرَج</div>
          </div>
        </div>
      )}
    </div>
  )
}

/** إعدادات الشاشة: المدينة، وطريقة الحساب، والأذان، ودقائق الإقامة */
function TvSetup({ s, data, onSave, canCancel, onCancel }: { s: TvSettings; data: QuranData | null; onSave: (s: TvSettings) => void; canCancel: boolean; onCancel: () => void }) {
  const [draft, setDraft] = useState<TvSettings>(s)
  const [q, setQ] = useState('')
  const [cities, setCities] = useState<City[] | null>(null)
  useEffect(() => { loadCities().then(setCities).catch(() => {}) }, [])
  const hits = useMemo(() => (cities && q.trim().length >= 2 ? searchCities(cities, q, undefined, 8) : []), [cities, q])
  const set = (p: Partial<TvSettings>) => setDraft((d) => ({ ...d, ...p }))
  return (
    <div className="tv tv-setup">
      <PaintedScene tone="night" variant="hero" className="tv-art" />
      <div className="tv-veil strong" />
      <div className="tv-setup-body">
        <h1><LogoMark size={40} /> إعداد شاشة رفيق المسلم</h1>
        <div className="tv-setup-grid">
          <section>
            <h2>المدينة</h2>
            <p className="tv-muted">{draft.city ? `المختارة: ${cityLabel(draft.city)}` : 'اكتب اسم مدينتك ثم اخترها من القائمة'}</p>
            <input className="tv-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="مثال: نابلس، الرياض، القاهرة" aria-label="اسم المدينة" autoFocus />
            <div className="tv-hits">
              {hits.map((c) => (
                <button key={c.id} className={'tv-btn' + (draft.city?.name === c.name && draft.city?.country === c.country ? ' on' : '')}
                  onClick={() => set({ city: { name: c.name, nameAr: c.nameAr, country: c.country, lat: c.lat, lng: c.lng, tz: c.tz }, prayer: { ...draft.prayer, method: suggestMethod(c.country) } })}>
                  {cityLabel(c)}
                </button>
              ))}
            </div>
          </section>
          <section>
            <h2>الحساب والصوت</h2>
            <label className="tv-field">طريقة الحساب
              <select className="tv-input" value={draft.prayer.method} onChange={(e) => set({ prayer: { ...draft.prayer, method: e.target.value as MethodId } })}>
                {METHODS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
              </select>
            </label>
            <label className="tv-field">حساب العصر
              <select className="tv-input" value={draft.prayer.madhab} onChange={(e) => set({ prayer: { ...draft.prayer, madhab: e.target.value as 'shafi' | 'hanafi' } })}>
                <option value="shafi">الجمهور (ظل المثل)</option>
                <option value="hanafi">الحنفي (ظل المثلين)</option>
              </select>
            </label>
            <label className="tv-check"><input type="checkbox" checked={draft.adhan} onChange={(e) => set({ adhan: e.target.checked })} /> تشغيل الأذان عند دخول الوقت (منصور الزهراني)</label>
            <label className="tv-check"><input type="checkbox" checked={draft.hour12} onChange={(e) => set({ hour12: e.target.checked })} /> نظام 12 ساعة</label>
            <h2>دقائق الإقامة بعد الأذان</h2>
            <div className="tv-iqama">
              {TV_PRAYERS.map((p) => (
                <label key={p} className="tv-field">{PRAYER_LABELS[p]}
                  <input className="tv-input" type="number" min={0} max={60} value={draft.iqama[p]} onChange={(e) => set({ iqama: { ...draft.iqama, [p]: Math.max(0, Math.min(60, Number(e.target.value) || 0)) } })} />
                </label>
              ))}
            </div>
            <p className="tv-muted">0 = بلا عدّاد للإقامة.</p>
          </section>
        </div>
        <section className="tv-auto">
          <h2>القراءة بصوت هادئ</h2>
          <label className="tv-check"><input type="checkbox" checked={draft.reciteOn} onChange={(e) => set({ reciteOn: e.target.checked })} /> تشغيل القراءة على الشاشة (تتوقف تلقائيًا وقت الأذان وتُستأنف بعد الصلاة)</label>
          <div className="tv-hits" role="radiogroup" aria-label="ما يُقرأ">
            {RECITE_MODES.map((m) => <button key={m.id} role="radio" aria-checked={draft.reciteMode === m.id} className={'tv-btn' + (draft.reciteMode === m.id ? ' on' : '')} onClick={() => set({ reciteMode: m.id })}>{m.label}</button>)}
          </div>
          <p className="tv-muted">{RECITE_MODES.find((m) => m.id === draft.reciteMode)?.hint}</p>
          <div className="tv-iqama">
            <label className="tv-field">القارئ
              <select className="tv-input" value={draft.reciterId} onChange={(e) => set({ reciterId: e.target.value })}>
                {TV_RECITERS.map((id) => reciterById(id)).map((r) => <option key={r.id} value={r.id}>{r.name} — {r.style}</option>)}
              </select>
            </label>
            {draft.reciteMode === 'surah' && (
              <label className="tv-field">البدء من سورة
                <select className="tv-input" value={draft.reciteSurah} onChange={(e) => set({ reciteSurah: Number(e.target.value) })}>
                  {(data?.meta.surahs ?? []).map((x) => <option key={x.n} value={x.n}>{x.n}. {x.name}</option>)}
                </select>
              </label>
            )}
            <label className="tv-field">مستوى الصوت
              <select className="tv-input" value={draft.reciteVolume} onChange={(e) => set({ reciteVolume: Number(e.target.value) })}>
                <option value={0.25}>هادئ جدًا</option>
                <option value={0.4}>هادئ</option>
                <option value={0.6}>متوسط</option>
                <option value={0.85}>مرتفع</option>
              </select>
            </label>
          </div>
          <p className="tv-muted">الأذان يُرفع دائمًا بصوت كامل عند دخول الوقت، وله الأولوية على القراءة.</p>
        </section>
        {bridge() && <TvAutoStart />}
        <div className="tv-setup-actions">
          <button className="tv-btn primary" disabled={!draft.city} onClick={() => { if (draft.reciteSurah !== s.reciteSurah) resetRecitePos(); onSave(draft) }}>حفظ وعرض الشاشة</button>
          {canCancel && <button className="tv-btn" onClick={onCancel}>إلغاء</button>}
        </div>
        <p className="tv-muted">{SADAQAH_LINE}</p>
        <p className="tv-muted">الإصدار {TV_VERSION}</p>
      </div>
    </div>
  )
}

/** تشغيل الشاشة وحدها: كشاشة توقف حين يُترك التلفاز، وعند تشغيل التلفاز (في تطبيق Android TV فقط) */
function TvAutoStart() {
  const b = bridge()!
  const [auto, setAuto] = useState(() => { try { return b.getAutostart() } catch { return false } })
  const [msg, setMsg] = useState('')
  return (
    <section className="tv-auto">
      <h2>تشغيل الشاشة تلقائيًا</h2>
      <p className="tv-muted">لتظهر المواقيت وحدها حين يُترك التلفاز دون استخدام: اختر «شاشة رفيق المسلم» شاشةً للتوقف (Screen saver)، وحدد بعد كم دقيقة تبدأ.</p>
      <div className="tv-setup-actions">
        <button className="tv-btn primary" onClick={() => setMsg(b.openScreensaverSettings() ? 'اختر «شاشة رفيق المسلم» من قائمة شاشة التوقف، ثم حدد وقت البدء.' : 'تعذر فتح الإعدادات: افتح إعدادات التلفاز ← تفضيلات الجهاز ← شاشة التوقف.')}>فتح إعدادات شاشة التوقف</button>
      </div>
      {msg && <p className="tv-muted">{msg}</p>}
      <label className="tv-check"><input type="checkbox" checked={auto} onChange={(e) => { b.setAutostart(e.target.checked); setAuto(e.target.checked) }} /> فتح الشاشة تلقائيًا عند تشغيل التلفاز</label>
    </section>
  )
}
