// الرئيسية في «وضع رمضان» بتصميم فاخر هادئ (كحلي ليلي وذهبي، وإضاءة فوانيس دافئة):
// شعار التطبيق واسمه، ثم بطاقة مواقيت الصلاة (الصلاة الحالية مميزة، والعدّ التنازلي للتالية، والصلوات الست)،
// ثم بطاقة رمضان (التهنئة، والإفطار والسحور وعدّهما، وعبارة إيمانية موثقة تتجدد يوميًا).
// البيانات كلها من التطبيق نفسه؛ لا تغيير في الوظائف.
import { Link } from 'react-router-dom'
import { Bell, Settings as Cog, MapPin, Sunrise, Sun, SunMedium, Sunset, Moon, CloudSun, BookOpen, Sparkles, Compass, Clock } from 'lucide-react'
import type { SavedLocation } from '../../state/settings'
import { cityLabel } from '../../services/cities'
import { PRAYERS, PRAYER_LABELS, nextPrayer, prayerTimesFor, todayTimes, type PrayerName, type PrayerSettings } from '../../services/prayer'
import { addDays, dateParts, dayKey, formatHijri, formatTime } from '../../lib/dates'
import { ramadanStatus } from '../../services/ramadan'
import { toArabicDigits } from '../../lib/arabic'
// صور وضع رمضان من تصميم صاحب التطبيق (لهذا الثيم فقط): الشعار الرمضاني، وأفق المسجد، والفانوس، وبطاقة «رمضان كريم»، والمصحف والفانوس
import brandImg from '../../assets/ramadan/brand.webp'
import skylineImg from '../../assets/ramadan/skyline.webp'
import lanternImg from '../../assets/ramadan/lantern.webp'
import bannerImg from '../../assets/ramadan/banner.webp'
import tableImg from '../../assets/ramadan/table.webp'

const ICONS: Record<PrayerName, typeof Sun> = { fajr: Sunrise, sunrise: CloudSun, dhuhr: Sun, asr: SunMedium, maghrib: Sunset, isha: Moon }

/** عبارات إيمانية قصيرة بنصها من صحيح البخاري (مع رقم الحديث)، تتجدد كل يوم */
export const RAMADAN_PHRASES: { text: string; source: string }[] = [
  { text: 'مَنْ صَامَ رَمَضَانَ إِيمَانًا وَاحْتِسَابًا غُفِرَ لَهُ مَا تَقَدَّمَ مِنْ ذَنْبِهِ', source: 'صحيح البخاري (38)' },
  { text: 'تَسَحَّرُوا فَإِنَّ فِي السَّحُورِ بَرَكَةً', source: 'صحيح البخاري (1923)' },
  { text: 'الصِّيَامُ جُنَّةٌ', source: 'صحيح البخاري (1894)' },
]

export function cd(ms: number): string {
  const t = Math.max(0, Math.floor(ms / 1000))
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(Math.floor(t / 3600))}:${p(Math.floor((t % 3600) / 60))}:${p(t % 60)}`
}

function splitTime(s: string): [string, string] {
  const m = s.match(/^(.*?)\s*([^\d\s:٠-٩]+)$/)
  return m ? [m[1], m[2]] : [s, '']
}

/** الصلاة «الآن» (آخر صلاة دخل وقتها اليوم) أو null قبل الفجر وبعد الشروق حتى الظهر */
export function currentPrayer(times: Record<PrayerName, Date>, now: Date): PrayerName | null {
  let cur: PrayerName | null = null
  for (const p of PRAYERS) if (p !== 'sunrise' && times[p].getTime() <= now.getTime()) cur = p
  if (cur === 'fajr' && times.sunrise.getTime() <= now.getTime()) return null
  return cur
}

/** الحدث القادم في رمضان: الإفطار (المغرب) أو نهاية السحور (الفجر) */
export function ramadanNext(loc: SavedLocation, prayer: PrayerSettings, now: Date): { kind: 'iftar' | 'suhoor'; at: Date } {
  const t = prayerTimesFor(loc, dateParts(now, loc.tz), prayer)
  if (now < t.fajr) return { kind: 'suhoor', at: t.fajr }
  if (now < t.maghrib) return { kind: 'iftar', at: t.maghrib }
  return { kind: 'suhoor', at: prayerTimesFor(loc, dateParts(addDays(now, 1), loc.tz), prayer).fajr }
}

export function RamadanHome({ now, loc, prayer, hijriOffset }: { now: Date; loc: SavedLocation | null | undefined; prayer: PrayerSettings; hijriOffset: number }) {
  const times = loc ? todayTimes(loc, prayer, now) : null
  const np = loc ? nextPrayer(loc, prayer, now) : null
  const cur = times ? currentPrayer(times, now) : null
  const shown: PrayerName | null = cur ?? np?.name ?? null
  const [big, suf] = loc && times && shown ? splitTime(formatTime(cur ? times[cur] : np!.time, loc.tz)) : ['', '']
  const rs = ramadanStatus(now, loc?.tz, hijriOffset)
  const ev = loc ? ramadanNext(loc, prayer, now) : null
  const k = dayKey(now, loc?.tz)
  const phrase = RAMADAN_PHRASES[[...k].reduce((n, ch) => n + ch.charCodeAt(0), 0) % RAMADAN_PHRASES.length]

  return (
    <div className="rm-home">
      <header className="rm-hero">
        <RamadanSky skyline={false} />
        <img className="rm-skyline" src={skylineImg} alt="" />
        <nav className="rm-btns" aria-label="اختصارات">
          <Link to="/settings" aria-label="الإعدادات"><Cog size={22} /></Link>
          <Link to="/reminders" aria-label="التذكيرات"><Bell size={22} /></Link>
        </nav>
        <div className="rm-brand">
          <h1 className="sr-only">رفيق المسلم</h1>
          <img className="rm-brand-img" src={brandImg} alt="رفيق المسلم — دليلك في دينك ورفيقك في حياتك" />
        </div>
      </header>

      <section className="rm-card rm-prayer" aria-label="مواقيت الصلاة">
        <div className="rm-card-head"><span>مواقيت الصلاة</span><MosqueIcon /></div>
        {loc && times && np && shown ? (
          <>
            <Link to="/prayer" className="rm-now">
              <span className="rm-now-text">
                <span className={'rm-badge' + (cur ? '' : ' next')}>{cur ? 'الآن' : 'القادمة'}</span>
                <b className="rm-now-name">{PRAYER_LABELS[shown]}</b>
                <span className="rm-now-time" dir="ltr"><b>{big}</b> <small>{suf}</small></span>
              </span>
              <img className="rm-now-lantern" src={lanternImg} alt="" />
            </Link>
            <div className="rm-left" aria-live="polite">
              <span><Clock size={16} /> متبقي على {PRAYER_LABELS[np.name]}</span>
              <b dir="ltr">{cd(np.time.getTime() - now.getTime())}</b>
            </div>
            <ul className="rm-times">
              {PRAYERS.map((p) => {
                const Icon = ICONS[p]
                const on = p === shown
                return (
                  <li key={p} className={on ? 'on' : undefined}>
                    <Icon size={20} aria-hidden="true" />
                    <span>{PRAYER_LABELS[p]}</span>
                    <b>{formatTime(times[p], loc.tz)}</b>
                  </li>
                )
              })}
            </ul>
            <Link to="/prayer" className="rm-city"><MapPin size={15} /> {cityLabel(loc)}</Link>
          </>
        ) : <Link to="/prayer" className="rm-empty">اختر مدينتك لعرض مواقيت الصلاة</Link>}
      </section>

      <Link to="/ramadan" className="rm-card rm-ramadan" aria-label="رمضان: الإفطار والسحور">
        <img className="rm-banner" src={bannerImg} alt="رمضان كريم — تقبّل الله منا ومنكم" />
        <div className="rm-ramadan-body">
          <h2 className="sr-only">رمضان كريم</h2>
          <p className="rm-sub">{rs.inRamadan && rs.day ? `اليوم ${toArabicDigits(rs.day)} من رمضان · ${formatHijri(now, loc?.tz, hijriOffset)}` : rs.daysUntil ? `بقي نحو ${toArabicDigits(rs.daysUntil)} يومًا على رمضان` : 'تقبّل الله منا ومنكم'}</p>
          {loc && times && ev && (
            <>
              <div className="rm-pair">
                <span className={ev.kind === 'iftar' ? 'on' : undefined}><small>الإفطار</small><b>{formatTime(times.maghrib, loc.tz)}</b></span>
                <span className={ev.kind === 'suhoor' ? 'on' : undefined}><small>السحور حتى الفجر</small><b>{formatTime(ev.kind === 'suhoor' ? ev.at : times.fajr, loc.tz)}</b></span>
              </div>
              <div className="rm-count">{ev.kind === 'iftar' ? 'متبقي على الإفطار' : 'متبقي على نهاية السحور'} <b dir="ltr">{cd(ev.at.getTime() - now.getTime())}</b></div>
            </>
          )}
          <blockquote className="rm-phrase">«{phrase.text}» <cite>{phrase.source}</cite></blockquote>
        </div>
      </Link>

      <nav className="rm-quick" aria-label="الأقسام">
        <Link to="/quran"><BookOpen size={22} /><span>القرآن</span></Link>
        <Link to="/adhkar"><Sparkles size={22} /><span>الأذكار</span></Link>
        <Link to="/qibla"><Compass size={22} /><span>القبلة</span></Link>
        <Link to="/ramadan"><Moon size={22} /><span>إمساكية رمضان</span></Link>
      </nav>
      <img className="rm-table" src={tableImg} alt="" />
    </div>
  )
}

/** سماء رمضان: نجوم خافتة، وهلال بتوهج ذهبي، وفانوسان معلّقان يتأرجحان بهدوء، وأفق مسجد بنوافذ مضيئة */
export function RamadanSky({ skyline = true }: { skyline?: boolean }) {
  return (
    <svg className="rm-sky" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <radialGradient id="rmGlow" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stopColor="#f6d58e" stopOpacity="0.55" /><stop offset="1" stopColor="#f6d58e" stopOpacity="0" /></radialGradient>
        <radialGradient id="rmLamp" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stopColor="#ffcf7a" stopOpacity="0.9" /><stop offset="0.4" stopColor="#ffb44f" stopOpacity="0.35" /><stop offset="1" stopColor="#ffb44f" stopOpacity="0" /></radialGradient>
        <linearGradient id="rmMoon" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fbe7b0" /><stop offset="1" stopColor="#d9ae5c" /></linearGradient>
        <mask id="rmCres"><rect width="400" height="300" fill="#fff" /><circle cx="92" cy="62" r="30" fill="#000" /></mask>
      </defs>
      {Array.from({ length: 34 }, (_, i) => {
        const x = (i * 97.3) % 400, y = (i * 53.7) % 170
        return <circle key={i} className="rm-star" cx={x} cy={y} r={i % 5 === 0 ? 1.4 : 0.8} style={{ animationDelay: `${(i % 7) * 0.6}s` }} />
      })}
      <circle cx="78" cy="72" r="60" fill="url(#rmGlow)" />
      <circle cx="78" cy="72" r="32" fill="url(#rmMoon)" mask="url(#rmCres)" />
      <g className="rm-lamp" style={{ transformOrigin: '318px 0px' }}>
        <line x1="318" y1="0" x2="318" y2="64" stroke="#c9a24a" strokeWidth="1.2" />
        <circle cx="318" cy="96" r="44" fill="url(#rmLamp)" />
        <Lamp x={318} y={64} s={1} />
      </g>
      <g className="rm-lamp b" style={{ transformOrigin: '362px 0px' }}>
        <line x1="362" y1="0" x2="362" y2="104" stroke="#c9a24a" strokeWidth="1" />
        <circle cx="362" cy="128" r="32" fill="url(#rmLamp)" />
        <Lamp x={362} y={104} s={0.72} />
      </g>
      {/* أفق المسجد */}
      {skyline && <><g fill="#081127">
        <path d="M0 300V262h40v-8h10v8h30v-14q0-22 26-30 26 8 26 30v14h24v-40h6v-14l3-8 3 8v14h6v40h30v-24q0-34 46-48 46 14 46 48v24h30v-40h6v-14l3-8 3 8v14h6v40h24v-14q0-22 26-30 26 8 26 30v14h28V300z" />
      </g>
      <g fill="#ffcf7a" opacity="0.75">
        {[[118, 262], [126, 262], [205, 262], [213, 262], [221, 262], [229, 262], [300, 262], [308, 262]].map(([x, y]) => <rect key={x} x={x} y={y} width="4" height="8" rx="2" />)}
      </g></>}
    </svg>
  )
}

function Lamp({ x, y, s }: { x: number; y: number; s: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} stroke="#c9a24a" strokeWidth="1.4" strokeLinejoin="round">
      <path d="M-6 0h12l4 8h-20z" fill="#2a2216" />
      <path d="M-14 8h28l-4 46h-20z" fill="#ffcf7a" fillOpacity="0.85" />
      <path d="M-7 8l-2 46M7 8l2 46M0 8v46" stroke="#a8823a" strokeWidth="1" />
      <path d="M-12 54h24l-6 10h-12z" fill="#2a2216" />
      <circle cx="0" cy="-3" r="3" fill="none" />
    </g>
  )
}


function MosqueIcon() {
  return (
    <svg viewBox="0 0 32 24" width="30" height="22" aria-hidden="true" fill="none" stroke="#d6b46a" strokeWidth="1.5" strokeLinejoin="round">
      <path d="M6 22V12M26 22V12M6 12l-1-3 1-3 1 3zM26 12l-1-3 1-3 1 3zM10 22v-6q0-6 6-8 6 2 6 8v6M3 22h26M16 8V5" />
    </svg>
  )
}

