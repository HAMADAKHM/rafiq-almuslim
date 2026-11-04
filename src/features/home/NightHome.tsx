// الرئيسية بالتصميم «الليلي الذهبي» كما أرسله صاحب التطبيق: مشهد ليلي، وشعار التطبيق في الوسط، وبطاقة زجاجية
// لمواقيت الصلاة (الوقت الكبير، والمدينة والتاريخ، والصلوات الست)، وبطاقة «آية اليوم» بتلاوتها، وأربع خانات للأقسام.
// البيانات كلها من التطبيق نفسه (لا تغيير في الوظائف).
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Bell, BookOpen, CalendarDays, MapPin, Palette, Play, Settings as Cog } from 'lucide-react'
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

/** خانات الأقسام بأيقونات صاحب التطبيق الذهبية نفسها (من تصميمه) */
const TILES = [
  { to: '/quran', title: 'القرآن الكريم', icon: 'quran' },
  { to: '/adhkar', title: 'الأذكار والأدعية', icon: 'adhkar' },
  { to: '/prayer', title: 'أوقات الصلاة', icon: 'prayer' },
  { to: '/qibla', title: 'القبلة', icon: 'qibla' },
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
        <nav className="nh-btns" aria-label="اختصارات">
          <Link to="/reminders" aria-label="التذكيرات"><Bell size={24} /></Link>
          <Link to="/plus/themes" aria-label="الثيمات"><Palette size={24} /></Link>
          <Link to="/settings" aria-label="الإعدادات"><Cog size={24} /></Link>
        </nav>
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
        {TILES.map((t) => <Link key={t.to} to={t.to} className="nh-tile"><img src={asset(`nt-${t.icon}.png`)} alt="" /><span>{t.title}</span></Link>)}
      </nav>

      <div className="nh-rest">{rest}</div>
    </div>
  )
}
