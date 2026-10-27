import { useEffect, useMemo, useRef, useState } from 'react'
import { PaintedScene, type PaintTone } from '../components/Scene'
import { SceneCanvas, ScenePreview } from './SceneCanvas'
import { SCENES, sceneInfo, type SceneId } from './scenes'
import { LogoMark } from '../components/Art'
import { SADAQAH_LINE, HOME_CARD } from '../content/dedication'
import { ONLINE_ADHANS } from '../content/onlineAdhans'
import { HADITH } from '../content/hadith'
import { METHODS, PRAYER_LABELS, PRAYERS, nextPrayer, suggestMethod, todayTimes, upcomingDays, type MethodId, type PrayerName } from '../services/prayer'
import { cityLabel, loadCities, searchCities, type City } from '../services/cities'
import { ayahOfDay, dhikrOfDay } from '../services/daily'
import { loadQuran, type QuranData } from '../services/quran'
import { dayKey, daysBetween, formatGregorian, formatHijri, formatCountdown } from '../lib/dates'
import { toArabicDigits } from '../lib/arabic'
import { DEFAULT_TV, loadTv, normalizeTv, saveTv, shiftedTz, tvPhase, TV_PRAYERS, type TvPrayer, type TvSettings } from './state'
import { RECITE_MODES, TV_RECITERS } from './recite'
import { resetRecitePos, useRecitation } from './useRecitation'
import { voiceStatus } from './voice'
import { reciterById } from '../content/reciters'

declare const __TV_VERSION__: string
const TV_VERSION = typeof __TV_VERSION__ === 'string' ? __TV_VERSION__ : ''
const ADHAN_URL = ONLINE_ADHANS[0].url
const ROTATE_MS = 25_000
/** داخل تطبيق Android TV: الصوت مسموح دون ضغطة، والشاشة كاملة أصلًا */
/** تطبيق Samsung (Tizen): الصوت مسموح دون ضغطة، والشاشة كاملة */
const TIZEN = typeof window !== 'undefined' && 'tizen' in window
const IN_APP = TIZEN || (typeof location !== 'undefined' && new URLSearchParams(location.search).has('app'))
/** وضع شاشة التوقف في تطبيق Android TV: عرض فقط بلا أزرار */
const DREAM = typeof location !== 'undefined' && new URLSearchParams(location.search).has('dream')
/** جسر تطبيق Android TV (غير موجود في المتصفح) */
type Bridge = {
  openScreensaverSettings(): boolean; getAutostart(): boolean; setAutostart(on: boolean): void
  canOpenFromBackground?(): boolean; openOverlaySettings?(): boolean; getIdleTakeover?(): boolean; setIdleTakeover?(on: boolean): void; setSchedule?(json: string): void
  getStatus?(): string; stopAdhan?(): void; openAccessibilitySettings?(): boolean; setIdleMinutes?(m: number): void; startService?(): void; setQuietIdle?(on: boolean): void; clearSnooze?(): void
  openAndroidSettings?(): boolean; getDevice?(): string; getHomeMode?(): boolean; setHomeMode?(on: boolean): void; pressHome?(): void
  getApps?(): string; launchApp?(pkg: string): boolean; openOriginalHome?(): boolean
  startPairing?(): string; stopPairing?(): void; getRemoteStatus?(): string; removeRemoteDevice?(id: string): void; setRemoteSnapshot?(json: string): void; takeRemotePatch?(): string
}
interface TvAppEntry { label: string; pkg: string; icon: string }
interface NativeStatus { service?: boolean; overlay?: boolean; accessibility?: boolean; quietIdle?: boolean; canOpen?: boolean; hdmi?: boolean; snoozeUntil?: number; idleMinutes?: number; idleReason?: string; idleSince?: number; events?: Record<string, number> }
const EVENT_LABELS: Record<string, string> = {
  service_start: 'بدء خدمة الخلفية', boot: 'تشغيل التلفاز', screen_on: 'استيقاظ الشاشة', idle: 'عدم استخدام', idle_quiet: 'عدم استخدام (سكون)', prayer_alarm: 'منبه وقت الصلاة', idle_snoozed: 'إيقاف مؤقت (رجعت فور الفتح)', service_restart: 'إعادة تشغيل الخدمة', wake_detected: 'فتح التلفاز من الاستعداد', dream: 'شاشة توقف التلفاز',
  open_screen: 'فتح شاشة المواقيت', open_blocked: 'مُنع الفتح (ينقص إذن)', adhan_background: 'أذان من الخلفية', accessibility_on: 'تفعيل مراقب عدم الاستخدام',
  idle_snoozed_60min: 'إيقاف مؤقت ساعة (رجعت فور الفتح)', snooze_cleared: 'إلغاء الإيقاف المؤقت', idle_open_failed: 'تعذّر الفتح', active_screen_on: 'استيقاظ الشاشة', active_wake: 'فتح التلفاز',
  idle_skip_media_active: 'لم تُفتح: فيديو أو صوت يعمل', idle_skip_hdmi_foreground: 'لم تُفتح: التلفاز على جهاز HDMI', idle_skip_snoozed: 'لم تُفتح: إيقاف مؤقت',
  idle_skip_needs_overlay_permission: 'لم تُفتح: ينقص إذن الظهور فوق التطبيقات', idle_skip_needs_accessibility: 'لم تُفتح: فعّل إمكانية الوصول', idle_skip_disabled: 'الفتح التلقائي متوقف',
  idle_skip_adhan: 'لم تُفتح: الأذان يُرفع', adhan_media_keys_only: 'الأذان: يوقفه زر التشغيل/الإيقاف فقط',
}
/** حالة مؤقت عدم الاستخدام الآن، بلغة واضحة */
const IDLE_STATE: Record<string, string> = {
  waiting: 'ينتظر عدم الاستخدام', media_active: 'متوقف: فيديو أو صوت يعمل الآن', hdmi_foreground: 'متوقف: التلفاز على جهاز HDMI', snoozed: 'متوقف مؤقتًا',
  needs_overlay_permission: 'لا يعمل: ينقص إذن «الظهور فوق التطبيقات»', needs_accessibility: 'لا يعمل: فعّل «إمكانية الوصول» أو خيار السكون', disabled: 'متوقف من الإعدادات',
  screen_visible: 'الشاشة ظاهرة الآن', adhan: 'الأذان يُرفع',
}
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
  const [apps, setApps] = useState<TvAppEntry[] | null>(null)
  const now = useNow()
  const audio = useRef<HTMLAudioElement | null>(null)
  const playedFor = useRef<string>('')

  useEffect(() => { loadQuran().then(setData).catch(() => {}) }, [])
  // بدأت الواجهة: تُخفى رسالة التحميل
  useEffect(() => { const b = document.getElementById('boot'); if (b && !document.getElementById('boot-err')) b.style.display = 'none' }, [])
  useEffect(() => { const t = setInterval(() => setSlide((x) => x + 1), ROTATE_MS); return () => clearInterval(t) }, [])

  // Samsung: منع شاشة التوقف، وزر الرجوع يغلق الإعدادات أو التطبيق
  useEffect(() => {
    if (!TIZEN) return
    type W = { webapis?: { appcommon?: { setScreenSaver(s: number): void; AppCommonScreenSaverState: { SCREEN_SAVER_OFF: number } } }; tizen?: { application: { getCurrentApplication(): { exit(): void } } } }
    const w = window as unknown as W
    try { w.webapis?.appcommon?.setScreenSaver(w.webapis.appcommon.AppCommonScreenSaverState.SCREEN_SAVER_OFF) } catch { /* غير متاح */ }
    const onKey = (e: KeyboardEvent) => {
      if (e.keyCode !== 10009) return
      e.preventDefault()
      if (document.querySelector('.tv-setup')) { (document.querySelector('.tv-setup-nav .tv-nav.save') as HTMLButtonElement | null)?.click(); return }
      try { w.tizen?.application.getCurrentApplication().exit() } catch { /* لا شيء */ }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

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

  // التوقيت الصيفي/الشتوي اليدوي يغيّر المنطقة الزمنية للعرض فقط
  const tzView = s.city ? shiftedTz(s.city.tz, s.clockShift, now) : ''
  const city = useMemo(() => (s.city ? { ...s.city, tz: tzView } : null), [s.city, tzView])
  const day = dayKey(now, city?.tz)
  const rotating = useRotating(data, day)
  const times = city ? todayTimes(city, s.prayer, now) : null
  const np = city ? nextPrayer(city, s.prayer, now) : null
  const phase = times ? tvPhase(now, times, s.iqama) : { kind: 'normal' as const }

  // الأذان عند دخول الوقت (أولوية على التلاوة)، مرة لكل صلاة، مع إعادة المحاولة إن تعذر التحميل
  const [adhanPlaying, setAdhanPlaying] = useState(false)
  // الشاشة مخفية (التلفاز على تطبيق آخر): تتوقف التلاوة، وخدمة التطبيق ترفع الأذان بنفسها
  const [hidden, setHidden] = useState(() => typeof document !== 'undefined' && document.hidden)
  useEffect(() => {
    const on = () => setHidden(document.hidden)
    document.addEventListener('visibilitychange', on)
    return () => document.removeEventListener('visibilitychange', on)
  }, [])
  useEffect(() => {
    if (phase.kind !== 'adhan' || !s.adhan) return
    const key = `${day}:${phase.prayer}`
    if (playedFor.current === key) return
    playedFor.current = key
    if (hidden && bridge()?.setSchedule) return
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
  // جدول الأذان لأسبوع: تفتح خدمة التطبيق الشاشة عند دخول الوقت ولو كان التلفاز على تطبيق آخر
  useEffect(() => {
    const b = bridge()
    if (!b?.setSchedule || !city) return
    const all = upcomingDays(city, s.prayer, 7, new Date()).flatMap((d) => TV_PRAYERS.map((p) => ({ t: d.times[p].getTime(), name: PRAYER_LABELS[p] }))).filter((x) => x.t > Date.now() - 120_000)
    try { b.setSchedule(JSON.stringify({ adhan: s.adhan, url: ADHAN_URL, times: all.map((x) => x.t), names: all.map((x) => x.name) })) } catch { /* خارج التطبيق */ }
  }, [city, s.prayer, s.adhan, day]) // eslint-disable-line react-hooks/exhaustive-deps
  const stopAdhan = () => {
    audio.current?.pause(); audio.current = null; setAdhanPlaying(false)
    // أذان خدمة التطبيق (بدأ والتلفاز على تطبيق آخر ثم فُتحت الشاشة) يتوقف أيضًا
    try { bridge()?.stopAdhan?.() } catch { /* خارج التطبيق */ }
  }
  // شاشة الأذان أو الإقامة ظاهرة: أي زر أو ضغطة يوقف الأذان ويغلقها فورًا (تعود الشاشة العادية)
  const phaseKey = phase.kind === 'normal' ? '' : `${day}:${phase.kind}:${phase.prayer}`
  const [closedPhase, setClosedPhase] = useState('')
  const overlayOpen = phaseKey !== '' && closedPhase !== phaseKey
  useEffect(() => {
    if (!adhanPlaying && !overlayOpen) return
    const stop = (e: Event) => { e.preventDefault(); e.stopPropagation(); stopAdhan(); if (phaseKey) setClosedPhase(phaseKey) }
    window.addEventListener('keydown', stop, true)
    window.addEventListener('click', stop, true)
    return () => { window.removeEventListener('keydown', stop, true); window.removeEventListener('click', stop, true) }
  }, [adhanPlaying, overlayOpen, phaseKey]) // eslint-disable-line react-hooks/exhaustive-deps
  const update = (p: Partial<TvSettings>) => setS((prev) => { const next = { ...prev, ...p }; saveTv(next); return next })

  // «التحكم من الجوال»: تعديلات تصل من تطبيق رفيق المسلم بلس عبر خدمة التلفاز، وتُطبَّق وتُحفظ هنا
  useEffect(() => {
    const b = bridge()
    if (!b?.takeRemotePatch) return
    const apply = () => {
      try {
        const raw = b.takeRemotePatch!()
        if (!raw) return
        const patch = JSON.parse(raw) as Partial<TvSettings>
        setS((prev) => { const next = normalizeTv({ ...prev, ...patch }); saveTv(next); return next })
      } catch { /* تعديل غير صالح يُتجاهل */ }
    }
    const w = window as unknown as { __rafiqRemoteApply?: () => void; __rafiqNextScene?: () => void }
    w.__rafiqRemoteApply = apply
    w.__rafiqNextScene = () => window.dispatchEvent(new Event('rafiq-next-scene'))
    apply()
    const vis = () => { if (document.visibilityState === 'visible') apply() }
    document.addEventListener('visibilitychange', vis)
    return () => { document.removeEventListener('visibilitychange', vis); delete w.__rafiqRemoteApply; delete w.__rafiqNextScene }
  }, [])
  // ما يراه الجوال من إعدادات الشاشة
  useEffect(() => { try { bridge()?.setRemoteSnapshot?.(JSON.stringify(remoteView(s))) } catch { /* لا شيء */ } }, [s])

  // التلاوة: تتوقف وقت الأذان وانتظار الإقامة، وتُستأنف بعدهما
  const hour = Number(new Intl.DateTimeFormat('en-GB', { timeZone: city?.tz, hour: '2-digit', hour12: false }).format(now)) % 24
  const rec = useRecitation(s, data, { day, hour }, phase.kind !== 'normal' || adhanPlaying || hidden)
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
    text: rec.current.ayah === 0 ? data.verses[0][0] : data.verses[rec.current.surah - 1][rec.current.ayah - 1],
    ref: `سورة ${data.meta.surahs[rec.current.surah - 1].name} • ${rec.current.ayah === 0 ? 'البسملة' : `الآية ${toArabicDigits(rec.current.ayah)}`} — ${reciterById(s.reciterId).name}`,
    quran: true,
  } : null
  const spoken = rec.dhikr ? {
    title: `${rec.dhikr.title} — ${rec.dhikr.voice ? 'يُقرأ الآن' : 'اقرأ معنا'}`,
    text: rec.dhikr.text,
    ref: `${rec.dhikr.source}${rec.dhikr.count && rec.dhikr.count > 1 ? ` • يُقال ${toArabicDigits(rec.dhikr.count)} ${rec.dhikr.count <= 10 ? 'مرات' : 'مرة'}` : ''}`,
    quran: false,
  } : null
  const item = playingText ?? spoken ?? rotating[slide % Math.max(1, rotating.length)]
  const tone = toneFor(np.name)
  const left = np.time.getTime() - now.getTime()

  return (
    <div className="tv">
      {s.scene === 'classic' || !s.animate
        ? <><PaintedScene tone={tone} variant="hero" className="tv-art" /><div className="tv-veil" />{s.animate && <SkyLife night={tone === 'night'} />}</>
        : <><SceneCanvas scene={s.scene === 'rotate' ? null : s.scene} playlist={s.playlist} rotateMin={s.rotateMin} shuffle={s.shuffle} quality={s.quality} className="tv-art" /><div className="tv-veil scene" /></>}

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
          <section className={'tv-card' + (playingText || spoken ? ' playing' : '')} key={playingText ? `${rec.current!.surah}:${rec.current!.ayah}` : spoken ? `d:${spoken.text.slice(0, 24)}` : slide}>
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
          {bridge()?.openOriginalHome
            ? <button className="tv-btn" onClick={() => { const b = bridge()!; if (!b.openOriginalHome!()) { try { setApps(JSON.parse(b.getApps?.() ?? '[]') as TvAppEntry[]) } catch { setApps([]) } } }}>واجهة التلفاز</button>
            : bridge()?.getApps && <button className="tv-btn" onClick={() => { try { setApps(JSON.parse(bridge()!.getApps!()) as TvAppEntry[]) } catch { setApps([]) } }}>التطبيقات</button>}
          <button className="tv-btn" onClick={() => setSetup(true)}>الإعدادات</button>
          <span className="tv-hint">{TV_VERSION}</span>
        </span>}
      </footer>

      {apps && (
        <div className="tv-overlay tv-apps" role="dialog" aria-label="التطبيقات" onKeyDown={(e) => { if (e.key === 'Escape' || e.key === 'Backspace' || e.keyCode === 10009) setApps(null) }}>
          <div className="tv-veil strong solid" />
          <div className="tv-apps-body">
            <h2>التطبيقات</h2>
            <div className="tv-apps-grid">
              {apps.map((a, i) => (
                <button key={a.pkg} className="tv-app" autoFocus={i === 0} onClick={() => { bridge()?.launchApp?.(a.pkg); setApps(null) }}>
                  <img src={a.icon} alt="" /><span>{a.label}</span>
                </button>
              ))}
            </div>
            <button className="tv-btn" onClick={() => setApps(null)}>رجوع إلى المواقيت</button>
          </div>
        </div>
      )}

      {phase.kind === 'adhan' && overlayOpen && (
        <div className="tv-overlay" role="alert">
          <PaintedScene tone={toneFor(phase.prayer)} variant="hero" className="tv-art" />
          <div className="tv-veil strong" />
          <div className="tv-overlay-body">
            <div className="tv-overlay-kicker">حان الآن وقت صلاة</div>
            <div className="tv-overlay-title">{PRAYER_LABELS[phase.prayer]}</div>
            <div className="tv-overlay-sub">{clock(phase.at, city.tz, s.hour12)} — {city.nameAr ?? city.name}</div>
            <div className="tv-overlay-sub">{adhanPlaying ? 'اضغط أي زر لإيقاف الأذان وإغلاق هذه الشاشة' : 'اضغط أي زر لإغلاق هذه الشاشة'}</div>
          </div>
        </div>
      )}
      {phase.kind === 'iqama' && overlayOpen && (
        <div className="tv-overlay" role="alert">
          <div className="tv-veil strong solid" />
          <div className="tv-overlay-body">
            <div className="tv-overlay-kicker">صلاة {PRAYER_LABELS[phase.prayer]} — الإقامة بعد</div>
            <div className="tv-overlay-title mono">{formatCountdown(phase.at.getTime() - now.getTime()).replace(/^00:/, '')}</div>
            <div className="tv-overlay-sub">استووا واعتدلوا، وسدّوا الفُرَج</div>
            <div className="tv-overlay-sub">اضغط أي زر لإغلاق هذه الشاشة</div>
          </div>
        </div>
      )}
    </div>
  )
}

/** حياة هادئة في الخلفية: أسراب طيور تعبر السماء بأجنحة تخفق، وغيوم تسير ببطء */
function SkyLife({ night }: { night: boolean }) {
  const bird = (x: number, y: number, s: number, d: number) => (
    <g transform={`translate(${x} ${y}) scale(${s})`} key={`${x}-${y}`}>
      <path className="tv-wing" style={{ animationDelay: `${d}s` }} d="M0 6 Q6 0 12 6 Q18 0 24 6" />
    </g>
  )
  const flock = (n: number) => [bird(0, 10, 1, 0), bird(30, 0, 0.8, 0.2), bird(26, 26, 0.85, 0.4), bird(58, 14, 0.7, 0.1), bird(62, 34, 0.6, 0.3)].slice(0, n)
  return (
    <div className={'tv-art tv-life' + (night ? ' night' : '')} aria-hidden="true">
      <span className="tv-cloud c1" /><span className="tv-cloud c2" /><span className="tv-cloud c3" />
      <svg className="tv-flock f1" viewBox="0 0 90 50">{flock(5)}</svg>
      <svg className="tv-flock f2" viewBox="0 0 90 50">{flock(3)}</svg>
      <svg className="tv-flock f3" viewBox="0 0 90 50">{flock(4)}</svg>
    </div>
  )
}

/** حالة الصوت العربي لقراءة الأذكار */
function VoiceNote() {
  const [st, setSt] = useState(voiceStatus)
  useEffect(() => { const t = setInterval(() => setSt(voiceStatus()), 1500); return () => clearInterval(t) }, [])
  return (
    <p className={'tv-permission' + (st === 'ok' ? ' ok' : '')}>
      {st === 'ok' ? '✓ يوجد صوت عربي في التلفاز: الآيات بصوت القارئ، وبقية الأذكار بالصوت العربي للتلفاز (قراءة آلية للنص الموثق كما هو).'
        : st === 'init' ? 'جارٍ تجهيز الصوت العربي…'
        : 'لا يوجد صوت عربي في التلفاز: تُتلى الآيات بصوت القارئ، وتظهر بقية الأذكار نصًّا. لإضافة الصوت ثبّت «Google Text-to-Speech» (خدمات Google للكلام) من متجر التطبيقات واختر العربية.'}
    </p>
  )
}

type SetupPage = 'city' | 'prayer' | 'iqama' | 'scenes' | 'remote' | 'recite' | 'voice' | 'auto'

/** الإعدادات التي يقرؤها الجوال ويستطيع تعديلها (RemoteCore.validate في Java يقبل هذه فقط) */
function remoteView(s: TvSettings) {
  return {
    scene: s.scene, playlist: s.playlist, rotateMin: s.rotateMin, shuffle: s.shuffle, quality: s.quality, animate: s.animate,
    adhan: s.adhan, hour12: s.hour12, reciteOn: s.reciteOn, reciteVolume: s.reciteVolume, clockShift: s.clockShift,
    city: s.city ? (s.city.nameAr ?? s.city.name) : '',
  }
}

/** ربط الجوال: رمز من 6 أرقام يظهر هنا ويُكتب في تطبيق رفيق المسلم بلس، وقائمة الأجهزة المرتبطة */
function TvRemotePage() {
  const b = bridge()!
  type St = { pairing?: boolean; code?: string; until?: number; ip?: string; port?: number; devices?: { id: string; name: string; at: number; seen?: number }[] }
  const read = (): St => { try { return JSON.parse(b.getRemoteStatus?.() || '{}') as St } catch { return {} } }
  const [st, setSt] = useState<St>(read)
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => { const t = setInterval(() => { setSt(read()); setNow(Date.now()) }, 1000); return () => clearInterval(t) }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const left = st.pairing && st.until ? Math.max(0, Math.round((st.until - now) / 1000)) : 0
  const fmt = (t: number) => new Intl.DateTimeFormat('ar-u-nu-latn', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).format(new Date(t))
  return (
    <>
      <h2>التحكم من الجوال</h2>
      <p className="tv-muted">من تطبيق «رفيق المسلم بلس» في جوالك (على شبكة الواي فاي نفسها): غيّر المشهد والمدة والجودة، وأوقف الأذان، وغيّر مدة عدم الاستخدام — دون جهاز التحكم.</p>
      {st.pairing && st.code ? (
        <div className="tv-pair-box">
          <span className="tv-muted">اكتب هذا الرمز في الجوال</span>
          <b className="tv-pair-code" dir="ltr">{st.code.slice(0, 3)} {st.code.slice(3)}</b>
          <span className="tv-muted">ينتهي بعد {Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')}</span>
          <button className="tv-btn" onClick={() => { b.stopPairing?.(); setSt(read()) }}>إلغاء الربط</button>
        </div>
      ) : (
        <button className="tv-choice on" style={{ width: '100%' }} onClick={() => { try { b.startPairing?.() } catch { /* لا شيء */ } setSt(read()) }}>📱 ربط جوال جديد</button>
      )}
      <p className="tv-muted">عنوان التلفاز في الشبكة (للإدخال اليدوي إن لم يظهر تلقائيًا): <b dir="ltr">{st.ip || '—'}{st.port ? `:${st.port}` : ''}</b></p>
      <h2>الأجهزة المرتبطة</h2>
      {st.devices && st.devices.length ? (
        <div className="tv-choices" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
          {st.devices.map((d) => (
            <button key={d.id} className="tv-choice" onClick={() => { b.removeRemoteDevice?.(d.id); setSt(read()) }}>
              {d.name} — {d.seen ? `آخر اتصال ${fmt(d.seen)}` : `رُبط ${fmt(d.at)}`} • اضغط للإزالة
            </button>
          ))}
        </div>
      ) : <p className="tv-muted">لا يوجد جوال مرتبط.</p>}
      <p className="tv-muted">الأمان: الرمز لا يُرسل عبر الشبكة، وكل أمر بعد الربط موقّع ومؤقّت، والاتصال من الشبكة المنزلية فقط. يمكنك إزالة أي جهاز من هنا.</p>
    </>
  )
}

/** مكتبة المشاهد: معاينة حية للمشهد المحدد بالأسهم، وعرض مشهد واحد أو التنقل بين المفضلة */
function TvScenesPage({ draft, set }: { draft: TvSettings; set: (p: Partial<TvSettings>) => void }) {
  const [focus, setFocus] = useState<SceneId | null>(null)
  const inList = (id: SceneId) => draft.playlist.includes(id)
  const toggleList = (id: SceneId) => set({ playlist: inList(id) ? draft.playlist.filter((x) => x !== id) : [...draft.playlist, id] })
  const cats = [...new Set(SCENES.map((x) => x.category))]
  return (
    <>
      <h2>مشاهد الشاشة</h2>
      <p className="tv-muted">مشاهد حيّة مرسومة داخل التطبيق (لا تحتاج إنترنت). اختر مشهدًا واحدًا، أو دع الشاشة تتنقل بين مشاهدك المفضلة بتلاشٍ ناعم.</p>
      <Choices label="طريقة العرض" cols={3} value={draft.scene === 'rotate' || draft.scene === 'classic' ? draft.scene : 'one'}
        onChange={(v) => set({ scene: v === 'one' ? (focus ?? SCENES[0].id) : v as 'rotate' | 'classic' })}
        options={[{ id: 'rotate', label: 'تنقل بين المشاهد' }, { id: 'one', label: 'مشهد واحد' }, { id: 'classic', label: 'الرسم الأصلي (طيور وغيوم)' }]} />
      {cats.map((cat) => (
        <div key={cat}>
          <h3 className="tv-muted" style={{ margin: '0.6rem 0 0.3rem' }}>{cat}</h3>
          <div className="tv-scene-grid">
            {SCENES.filter((x) => x.category === cat).map((x) => (
              <div key={x.id} className={'tv-scene-card' + (draft.scene === x.id ? ' on' : '')}>
                <button className="tv-scene-main" onFocus={() => setFocus(x.id)} onMouseEnter={() => setFocus(x.id)} onClick={() => set({ scene: x.id })} aria-label={`عرض مشهد ${x.name}`}>
                  <ScenePreview id={x.id} live={focus === x.id} />
                  <span className="tv-scene-name">{draft.scene === x.id ? '✓ ' : ''}{x.name}</span>
                </button>
                <button className={'tv-scene-fav' + (inList(x.id) ? ' on' : '')} onClick={() => toggleList(x.id)} aria-pressed={inList(x.id)}>{inList(x.id) ? '★ في القائمة' : '☆ أضف للتنقل'}</button>
              </div>
            ))}
          </div>
        </div>
      ))}
      {focus && <p className="tv-muted">{sceneInfo(focus)?.note}</p>}
      {draft.scene === 'rotate' && (
        <>
          <p className="tv-muted">{draft.playlist.length ? `قائمة التنقل: ${draft.playlist.map((id) => sceneInfo(id)?.name).join('، ')}` : 'لم تختر مفضلة: تتنقل الشاشة بين كل المشاهد.'}</p>
          <Choices label="مدة كل مشهد" cols={5} value={draft.rotateMin} onChange={(m) => set({ rotateMin: m })}
            options={[{ id: 5, label: '5 دقائق' }, { id: 10, label: '10 دقائق' }, { id: 20, label: '20 دقيقة' }, { id: 30, label: '30 دقيقة' }, { id: 60, label: 'ساعة' }]} />
          <Toggle on={draft.shuffle} onChange={(v) => set({ shuffle: v })} label="ترتيب عشوائي" />
          {draft.playlist.length > 1 && <button className="tv-btn" onClick={() => set({ playlist: [] })}>مسح قائمة التنقل (العودة لكل المشاهد)</button>}
        </>
      )}
      <Choices label="الجودة" cols={3} value={draft.quality} onChange={(q) => set({ quality: q })}
        options={[{ id: 'auto', label: 'تلقائي (Full HD)' }, { id: 'eco', label: 'اقتصادي (تلفاز ضعيف)' }, { id: 'high', label: 'عالية (حتى 4K)' }]} />
      <Toggle on={draft.animate} onChange={(v) => set({ animate: v })} label="الحركة (أوقفها في التلفزيونات البطيئة جدًا)" />
      <button className="tv-btn" onClick={() => set({ scene: DEFAULT_TV.scene, playlist: [], rotateMin: DEFAULT_TV.rotateMin, shuffle: true, quality: 'auto', animate: true })}>إعادة الإعداد الافتراضي للمشاهد</button>
    </>
  )
}

/** أزرار اختيار كبيرة (أسهل من القوائم المنسدلة بجهاز التحكم) */
function Choices<T extends string | number>({ value, options, onChange, label, cols = 3 }: { value: T; options: { id: T; label: string }[]; onChange: (v: T) => void; label: string; cols?: number }) {
  return (
    <div className="tv-choices" role="radiogroup" aria-label={label} style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
      {options.map((o) => <button key={String(o.id)} role="radio" aria-checked={value === o.id} className={'tv-choice' + (value === o.id ? ' on' : '')} onClick={() => onChange(o.id)}>{value === o.id ? '✓ ' : ''}{o.label}</button>)}
    </div>
  )
}

/** مفتاح تشغيل/إيقاف بزر كبير */
function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return <button role="switch" aria-checked={on} className={'tv-toggle' + (on ? ' on' : '')} onClick={() => onChange(!on)}><span>{label}</span><b>{on ? 'مفعّل' : 'متوقف'}</b></button>
}

/** رقم بزرّي − و + (أسهل من الكتابة بجهاز التحكم) */
function Stepper({ value, onChange, min, max, label, suffix = '' }: { value: number; onChange: (v: number) => void; min: number; max: number; label: string; suffix?: string }) {
  return (
    <div className="tv-stepper" aria-label={label}>
      <span className="tv-stepper-label">{label}</span>
      <button className="tv-step" onClick={() => onChange(Math.max(min, value - 1))} aria-label={`إنقاص ${label}`}>−</button>
      <b>{value}{suffix}</b>
      <button className="tv-step" onClick={() => onChange(Math.min(max, value + 1))} aria-label={`زيادة ${label}`}>+</button>
    </div>
  )
}

const QUICK_SURAHS = [1, 2, 18, 36, 55, 56, 67, 112]

/** إعدادات الشاشة: صفحات قصيرة بأزرار كبيرة تُستخدم بأسهم جهاز التحكم وزر الموافقة، بلا تمرير */
function TvSetup({ s, data, onSave, canCancel, onCancel }: { s: TvSettings; data: QuranData | null; onSave: (s: TvSettings) => void; canCancel: boolean; onCancel: () => void }) {
  const [draft, setDraft] = useState<TvSettings>(s)
  const [page, setPage] = useState<SetupPage>(s.city ? 'prayer' : 'city')
  const [q, setQ] = useState('')
  const [cities, setCities] = useState<City[] | null>(null)
  useEffect(() => { loadCities().then(setCities).catch(() => {}) }, [])
  const hits = useMemo(() => (cities && q.trim().length >= 2 ? searchCities(cities, q, undefined, 9) : []), [cities, q])
  const set = (p: Partial<TvSettings>) => setDraft((d) => ({ ...d, ...p }))
  const b = bridge()
  const pages: { id: SetupPage; label: string }[] = [
    { id: 'city', label: '📍 المدينة' },
    { id: 'prayer', label: '🕌 الصلاة والأذان' },
    { id: 'iqama', label: '⏱ الإقامة' },
    { id: 'scenes', label: '🌌 المشاهد' },
    ...(b?.startPairing ? [{ id: 'remote' as const, label: '📱 التحكم من الجوال' }] : []),
    { id: 'recite', label: '📖 القراءة' },
    { id: 'voice', label: '🎙 القارئ والصوت' },
    ...(b ? [{ id: 'auto' as const, label: '⚡ التشغيل التلقائي' }] : []),
  ]
  const surahs = data?.meta.surahs ?? []
  return (
    <div className="tv tv-setup">
      <PaintedScene tone="night" variant="hero" className="tv-art" />
      <div className="tv-veil strong" />
      <div className="tv-setup-body">
        <h1><LogoMark size={40} /> إعدادات شاشة رفيق المسلم</h1>
        <div className="tv-setup-layout">
          <nav className="tv-setup-nav" aria-label="أقسام الإعدادات">
            {pages.map((p) => <button key={p.id} className={'tv-nav' + (page === p.id ? ' on' : '')} aria-current={page === p.id ? 'page' : undefined} onClick={() => setPage(p.id)} autoFocus={page === p.id}>{p.label}</button>)}
            <button className="tv-nav save" disabled={!draft.city} onClick={() => { if (draft.reciteSurah !== s.reciteSurah) resetRecitePos(); onSave(draft) }}>✓ حفظ وعرض الشاشة</button>
            {canCancel && <button className="tv-nav" onClick={onCancel}>إلغاء</button>}
          </nav>
          <section className="tv-setup-page">
            {page === 'scenes' && <TvScenesPage draft={draft} set={set} />}
            {page === 'remote' && <TvRemotePage />}
            {page === 'city' && (
              <>
                <h2>المدينة</h2>
                <p className="tv-muted">{draft.city ? `المختارة: ${cityLabel(draft.city)}` : 'اكتب اسم مدينتك بلوحة المفاتيح ثم اخترها من الأزرار'}</p>
                <input className="tv-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="مثال: نابلس، الرياض، القاهرة" aria-label="اسم المدينة" />
                <div className="tv-choices" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
                  {hits.map((c) => (
                    <button key={c.id} className={'tv-choice' + (draft.city?.name === c.name && draft.city?.country === c.country ? ' on' : '')}
                      onClick={() => set({ city: { name: c.name, nameAr: c.nameAr, country: c.country, lat: c.lat, lng: c.lng, tz: c.tz }, prayer: { ...draft.prayer, method: suggestMethod(c.country) } })}>
                      {cityLabel(c)}
                    </button>
                  ))}
                </div>
              </>
            )}
            {page === 'prayer' && (
              <>
                <h2>الأذان</h2>
                <Toggle on={draft.adhan} onChange={(v) => set({ adhan: v })} label="رفع الأذان عند دخول الوقت (منصور الزهراني)" />
                <Toggle on={draft.hour12} onChange={(v) => set({ hour12: v })} label="نظام 12 ساعة" />
                <h2>التوقيت الصيفي والشتوي</h2>
                <Choices label="التوقيت الصيفي والشتوي" cols={3} value={draft.clockShift} onChange={(v) => set({ clockShift: v })}
                  options={[{ id: 0, label: 'تلقائي حسب المدينة' }, { id: 60, label: 'تقديم ساعة (+1)' }, { id: -60, label: 'تأخير ساعة (−1)' }]} />
                {draft.city && <p className="tv-muted">الساعة على الشاشة الآن: {clock(new Date(), shiftedTz(draft.city.tz, draft.clockShift, new Date()), draft.hour12)} — غيّر هذا فقط إن كانت تختلف ساعة عن الوقت الصحيح في بلدك.</p>}
                <h2>حساب العصر</h2>
                <Choices label="حساب العصر" cols={2} value={draft.prayer.madhab} onChange={(v) => set({ prayer: { ...draft.prayer, madhab: v } })} options={[{ id: 'shafi', label: 'الجمهور (ظل المثل)' }, { id: 'hanafi', label: 'الحنفي (ظل المثلين)' }]} />
                <h2>طريقة الحساب</h2>
                <Choices label="طريقة الحساب" cols={3} value={draft.prayer.method} onChange={(v) => set({ prayer: { ...draft.prayer, method: v as MethodId } })} options={METHODS.map((m) => ({ id: m.id, label: m.label }))} />
              </>
            )}
            {page === 'iqama' && (
              <>
                <h2>دقائق الإقامة بعد الأذان</h2>
                <p className="tv-muted">بعد الأذان يظهر عدّاد تنازلي للإقامة. 0 = بلا عدّاد.</p>
                <div className="tv-steppers">
                  {TV_PRAYERS.map((p) => <Stepper key={p} label={PRAYER_LABELS[p]} suffix=" د" min={0} max={60} value={draft.iqama[p]} onChange={(v) => set({ iqama: { ...draft.iqama, [p]: v } })} />)}
                </div>
              </>
            )}
            {page === 'recite' && (
              <>
                <Toggle on={draft.reciteOn} onChange={(v) => set({ reciteOn: v })} label="القراءة على الشاشة (تتوقف وقت الأذان وتُستأنف بعده)" />
                <h2>ما يُقرأ</h2>
                <Choices label="ما يُقرأ" cols={3} value={draft.reciteMode} onChange={(v) => set({ reciteMode: v })} options={RECITE_MODES.map((m) => ({ id: m.id, label: m.label }))} />
                {draft.reciteMode === 'adhkar' && <VoiceNote />}
                {draft.reciteMode === 'surah' && (
                  <>
                    <div className="tv-stepper wide" aria-label="سورة البدء">
                      <span className="tv-stepper-label">البدء من</span>
                      <button className="tv-step" onClick={() => set({ reciteSurah: draft.reciteSurah <= 1 ? 114 : draft.reciteSurah - 1 })} aria-label="السورة السابقة">−</button>
                      <b>{draft.reciteSurah}. سورة {surahs[draft.reciteSurah - 1]?.name ?? ''}</b>
                      <button className="tv-step" onClick={() => set({ reciteSurah: draft.reciteSurah >= 114 ? 1 : draft.reciteSurah + 1 })} aria-label="السورة التالية">+</button>
                    </div>
                    <Choices label="سور مختارة" cols={4} value={draft.reciteSurah} onChange={(v) => set({ reciteSurah: v })} options={QUICK_SURAHS.map((n) => ({ id: n, label: surahs[n - 1]?.name ?? String(n) }))} />
                  </>
                )}
              </>
            )}
            {page === 'voice' && (
              <>
                <h2>القارئ</h2>
                <Choices label="القارئ" cols={3} value={draft.reciterId} onChange={(v) => set({ reciterId: v })} options={TV_RECITERS.map((id) => reciterById(id)).map((r) => ({ id: r.id, label: `${r.name}${r.style.includes('مجود') ? ' (مجود)' : ''}` }))} />
                <h2>مستوى الصوت</h2>
                <Choices label="مستوى الصوت" cols={4} value={draft.reciteVolume} onChange={(v) => set({ reciteVolume: v })} options={[{ id: 0.25, label: 'هادئ جدًا' }, { id: 0.4, label: 'هادئ' }, { id: 0.6, label: 'متوسط' }, { id: 0.85, label: 'مرتفع' }]} />
              </>
            )}
            {page === 'auto' && b && <TvAutoStart />}
          </section>
        </div>
        <p className="tv-muted tv-setup-foot">{SADAQAH_LINE} • الإصدار {TV_VERSION}</p>
      </div>
    </div>
  )
}

/** تشغيل الشاشة وحدها (في تطبيق Android TV فقط): خطوات واضحة وحالة الخدمات */
function TvAutoStart() {
  const b = bridge()!
  const read = (): NativeStatus => { try { return JSON.parse(b.getStatus?.() || '{}') as NativeStatus } catch { return {} } }
  const [st, setSt] = useState<NativeStatus>(read)
  const [auto, setAuto] = useState(() => { try { return b.getAutostart() } catch { return false } })
  useEffect(() => {
    try { b.startService?.() } catch { /* لا شيء */ }
    const t = setInterval(() => setSt(read()), 2000)
    return () => clearInterval(t)
  }, [b]) // eslint-disable-line react-hooks/exhaustive-deps
  const minutes = st.idleMinutes ?? 5
  const [home, setHome] = useState(() => { try { return b.getHomeMode?.() ?? false } catch { return false } })
  const device = (() => { try { return b.getDevice?.() ?? '' } catch { return '' } })()
  const fmt = (t: number) => new Intl.DateTimeFormat('ar-u-nu-latn', { weekday: 'short', hour: 'numeric', minute: '2-digit' }).format(new Date(t))
  const events = Object.entries(st.events ?? {}).sort((a, c) => c[1] - a[1]).slice(0, 8)
  const left = st.idleSince && minutes > 0 && st.idleReason === 'waiting' ? Math.max(0, Math.ceil((st.idleSince + minutes * 60_000 - Date.now()) / 60_000)) : null
  return (
    <>
      <h2>الأسهل: شاشة المواقيت واجهةً رئيسية للتلفاز (بلا أي إذن)</h2>
      <Toggle on={home} onChange={(v) => { b.setHomeMode?.(v); setHome(v); if (v) setTimeout(() => b.pressHome?.(), 400) }} label="تظهر المواقيت عند تشغيل التلفاز وعند ضغط زر Home (وواجهة التلفاز الأصلية من زر «واجهة التلفاز»)" />
      {home && <p className="tv-muted">إن ظهرت نافذة «اختر التطبيق الرئيسي»: اختر «شاشة رفيق المسلم» ثم «دائمًا». للرجوع إلى واجهة التلفاز الأصلية: أوقف هذا الخيار.</p>}
      <h2>اختياري: فتحها بعد عدم الاستخدام ووقت الأذان فوق يوتيوب</h2>
      <div className={'tv-permission' + (st.accessibility || (st.quietIdle !== false && st.canOpen) ? ' ok' : '')}>
        {st.accessibility
          ? '✓ مفعّل: تُفتح شاشة المواقيت بعد دقائق من ترك التلفاز، وتُفتح عند تشغيله، وأي زر يوقف الأذان.'
          : st.canOpen
            ? (st.quietIdle !== false
              ? `✓ مفعّل بلا إذن: تُفتح بعد المدة المختارة إن لم يعمل فيديو أو صوت أو جهاز HDMI (بلايستيشن)${st.hdmi ? ' — جهاز HDMI يعمل الآن' : ''}. فُتحت بالخطأ؟ اضغط «رجوع» فتعود ولا تُفتح ساعة${st.snoozeUntil && st.snoozeUntil > Date.now() ? ` (متوقفة حتى ${fmt(st.snoozeUntil)})` : ''}.`
              : 'متوقف: فعّل الخيار التالي لتُفتح شاشة المواقيت بعد عدم الاستخدام.')
            : 'افتح «إمكانية الوصول» ثم اختر «شاشة رفيق المسلم» وفعّلها ووافق، ثم ارجع بزر الرجوع. (يعرف وقت آخر ضغطة فقط، ولا يقرأ الشاشة)'}
      </div>
      {!st.accessibility && st.canOpen && (
        <Toggle on={st.quietIdle !== false} onChange={(v) => { b.setQuietIdle?.(v); setSt({ ...st, quietIdle: v }) }} label="فتح المواقيت بعد عدم الاستخدام دون «إمكانية الوصول» (حين لا يعمل صوت أو فيديو)" />
      )}
      {!st.accessibility && !(st.canOpen && st.quietIdle !== false) && (
        <div className="tv-choices" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
          <button className="tv-choice on" onClick={() => b.openAccessibilitySettings?.()}>فتح إعدادات إمكانية الوصول</button>
          <button className="tv-choice" onClick={() => b.openAndroidSettings?.()}>فتح إعدادات Android الكاملة</button>
        </div>
      )}
      <Choices label="مدة عدم الاستخدام" cols={5} value={minutes} onChange={(m) => { b.setIdleMinutes?.(m); setSt({ ...st, idleMinutes: m }) }}
        options={[{ id: 5, label: '5 دقائق' }, { id: 10, label: '10 دقائق' }, { id: 15, label: '15 دقيقة' }, { id: 30, label: '30 دقيقة' }, { id: 0, label: 'إيقاف' }]} />
      <Toggle on={auto} onChange={(v) => { b.setAutostart(v); setAuto(v) }} label="فتح المواقيت عند تشغيل التلفاز" />
      <div className="tv-status">
        <span>{st.service ? '✓' : '✗'} خدمة الخلفية</span>
        <span>{st.accessibility || (st.quietIdle !== false && st.canOpen) ? '✓' : '✗'} مراقب عدم الاستخدام{!st.accessibility && st.canOpen ? ' (بالسكون)' : ''}</span>
        <span>{st.overlay ? '✓' : '—'} الظهور فوق التطبيقات (اختياري: شريط الأذان)</span>
        {!st.overlay && <button className="tv-btn" onClick={() => b.openOverlaySettings?.()}>منح إذن الظهور فوق التطبيقات</button>}
      </div>
      {st.idleReason ? <p className="tv-muted">مؤقت عدم الاستخدام الآن: {IDLE_STATE[st.idleReason] ?? st.idleReason}{left != null ? ` — تُفتح بعد نحو ${left} دقيقة دون استخدام` : ''}</p> : null}
      {st.snoozeUntil && st.snoozeUntil > Date.now() ? <button className="tv-btn" onClick={() => { b.clearSnooze?.(); setSt({ ...st, snoozeUntil: 0 }) }}>إلغاء الإيقاف المؤقت الآن</button> : null}
      <p className="tv-muted">الأذان فوق يوتيوب والقنوات: لا يخرج من المحتوى. {st.accessibility ? 'أي زر يوقف الأذان.' : st.overlay ? 'يظهر شريط علوي وأي زر يوقف الأذان.' : 'يوقفه زر التشغيل/الإيقاف ▶❚❚. لإيقافه بأي زر: فعّل «إمكانية الوصول» أو إذن «الظهور فوق التطبيقات».'}</p>
      {events.length > 0 && <p className="tv-muted">آخر الأحداث: {events.map(([k, t]) => `${EVENT_LABELS[k] ?? k} (${fmt(t)})`).join(' • ')}</p>}
      {device && <p className="tv-muted">الجهاز: {device}</p>}
    </>
  )
}
