// الرئيسية بالتصميم «الليلي الذهبي» كما أرسله صاحب التطبيق: مشهد ليلي، وشعار التطبيق في الوسط، وبطاقة زجاجية
// لمواقيت الصلاة (الوقت الكبير، والمدينة والتاريخ، والصلوات الست)، وبطاقة «آية اليوم» بتلاوتها، وأربع خانات للأقسام.
// البيانات كلها من التطبيق نفسه (لا تغيير في الوظائف).
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, CalendarDays, MapPin, Navigation, Play, Settings as Cog } from 'lucide-react'
import { useQuran } from '../../hooks'
import { useSettings } from '../../state/SettingsContext'
import { cityLabel } from '../../services/cities'
import type { SavedLocation } from '../../state/settings'
import { PRAYERS, PRAYER_LABELS, nextPrayer, todayTimes, type PrayerSettings } from '../../services/prayer'
import { dayKey, formatGregorian, formatTime } from '../../lib/dates'
import { ayahOfDay } from '../../services/daily'
import { player } from '../../services/audio'
import { goldenPhoto } from '../../themes/golden'

const asset = (f: string) => `${import.meta.env.BASE_URL}golden/${f}`

function countdown(ms: number): string {
  const t = Math.max(0, Math.floor(ms / 1000))
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(Math.floor(t / 3600))}:${p(Math.floor((t % 3600) / 60))}:${p(t % 60)}`
}

/** «4:32 م» → الرقم وحده واللاحقة وحدها (لعرض الرقم كبيرًا كما في التصميم) */
function splitTime(s: string): [string, string] {
  const m = s.match(/^(.*?)\s*([^\d\s:٠-٩]+)$/)
  return m ? [m[1], m[2]] : [s, '']
}

function BeadsIcon() {
  return (
    <svg width="34" height="34" viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      {[[20, 5], [27, 7], [32, 12], [33, 19], [30, 25], [8, 12], [13, 7], [7, 19], [10, 25]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="2.6" />)}
      <path d="M13 28 Q20 31 27 28" /><circle cx="20" cy="31" r="2.6" /><path d="M20 34 V38 M17 38 h6" />
    </svg>
  )
}
function MosqueIcon() {
  return (
    <svg width="36" height="34" viewBox="0 0 44 40" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 22 Q12 12 22 8 Q32 12 32 22" /><path d="M22 8 V4 M22 3 a1 1 0 1 0 0.1 0" />
      <path d="M6 36 V16 l2 -4 l2 4 V36 M34 36 V16 l2 -4 l2 4 V36" /><path d="M10 22 H34 V36 H10 Z" />
      <path d="M19 36 V29 Q22 25 25 29 V36" /><path d="M3 36 H41" />
    </svg>
  )
}

const TILES = [
  { to: '/quran', title: 'القرآن الكريم', icon: <BookOpen size={34} strokeWidth={1.5} /> },
  { to: '/adhkar', title: 'الأذكار والأدعية', icon: <BeadsIcon /> },
  { to: '/prayer', title: 'أوقات الصلاة', icon: <MosqueIcon /> },
  { to: '/qibla', title: 'القبلة', icon: <span className="nh-qibla"><Navigation size={20} strokeWidth={1.8} /></span> },
]

export function NightHome({ now, loc, prayer, rest }: {
  now: Date
  loc: SavedLocation | null | undefined
  prayer: PrayerSettings
  rest: ReactNode
}) {
  const { data } = useQuran()
  const { settings } = useSettings()
  const np = loc ? nextPrayer(loc, prayer, now) : null
  const times = loc ? todayTimes(loc, prayer, now) : null
  const ref = ayahOfDay(dayKey(now, loc?.tz))
  const surah = data?.meta.surahs[ref.surah - 1]
  const verse = data?.verses[ref.surah - 1]?.[ref.ayah - 1]
  const [big, suf] = np && loc ? splitTime(formatTime(np.time, loc.tz)) : ['', '']
  return (
    <div className="nh-home">
      <header className="nh-head" style={{ backgroundImage: `url("${goldenPhoto('bg-home')}")` }}>
        <div className="nh-veil" />
        <Link to="/settings" className="nh-gear" aria-label="الإعدادات"><Cog size={22} /></Link>
        <div className="nh-brand">
          <img className="nh-logo" src={asset('logo-night.png')} alt="" />
          <h1>رفيق المسلم</h1>
          <p><i />معاً .. نحو حياة أرقى بالإيمان<i /></p>
        </div>
      </header>

      <section className="nh-prayer" aria-label="مواقيت الصلاة">
        {np && loc && times ? (
          <>
            <div className="nh-top">
              <Link to="/prayer" className="nh-next">
                <span className="nh-title">مواقيت الصلاة</span>
                <span className="nh-time" dir="ltr"><b>{big}</b><small>{suf}</small></span>
                <span className="nh-name"><i />{PRAYER_LABELS[np.name]}<i /></span>
                <span className="nh-count">باقٍ <b dir="ltr">{countdown(np.time.getTime() - now.getTime())}</b></span>
              </Link>
              <div className="nh-place">
                <span><MapPin size={18} /> {cityLabel(loc)}</span>
                <span><CalendarDays size={18} /> {formatGregorian(now, loc.tz)}</span>
              </div>
            </div>
            <div className="nh-times">
              {PRAYERS.map((p) => (
                <span key={p} className={'nh-t' + (p === np.name ? ' on' : '')}><small>{PRAYER_LABELS[p]}</small><b dir="ltr">{splitTime(formatTime(times[p], loc.tz))[0]}</b></span>
              ))}
            </div>
          </>
        ) : <Link to="/prayer" className="nh-empty">اختر مدينتك لعرض مواقيت الصلاة</Link>}
      </section>

      <section className="nh-verse" style={{ ['--img' as string]: `url("${asset('verse-stand.jpg')}")` }} aria-label="آية اليوم">
        <span className="nh-tag"><BookOpen size={20} /> <b>آية اليوم</b></span>
        {verse && surah ? (
          <>
            <Link to={`/quran/${ref.surah}?ayah=${ref.ayah}`} className="nh-ayah">﴿{verse}﴾</Link>
            <small className="nh-ref">سورة {surah.name} - الآية {ref.ayah}</small>
            <span className="nh-play-row"><i />
              <button type="button" className="nh-play" aria-label="استمع للآية"
                onClick={() => player.play({ reciterId: settings.reciterId, surah: ref.surah, surahName: surah.name, from: ref.ayah, to: ref.ayah })}><Play size={16} /></button>
              <i /></span>
          </>
        ) : <small className="nh-ref">جارٍ تحميل الآية…</small>}
      </section>

      <nav className="nh-tiles" aria-label="الأقسام">
        {TILES.map((t) => <Link key={t.to} to={t.to} className="nh-tile">{t.icon}<span>{t.title}</span></Link>)}
      </nav>

      <div className="nh-rest">{rest}</div>
    </div>
  )
}
