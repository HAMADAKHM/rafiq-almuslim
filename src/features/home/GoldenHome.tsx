// الرئيسية بالتصميم الذهبي كما أرسله صاحب التطبيق: رأس بصورة حقيقية (معلم دولة المستخدم إن توفرت صورته)،
// وبطاقة الموقع والتاريخ، وبطاقة الصلاة القادمة، وأقواس الأقسام، وبطاقات آخر قراءة والصلاة التالية والمسبحة وبلس،
// وشريط آية من المصحف. البيانات كلها من التطبيق نفسه (لا تغيير في الوظائف).
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Bell, BookOpen, CalendarDays, ChevronLeft, Clock3, Compass, Crown, MapPin, Palette, Play, Settings as Cog, Sparkles, Star } from 'lucide-react'
import { LogoMark } from '../../components/Art'
import { useQuran } from '../../hooks'
import { cityLabel } from '../../services/cities'
import type { SavedLocation } from '../../state/settings'
import { PRAYER_LABELS, nextPrayer, todayTimes, type PrayerSettings } from '../../services/prayer'
import { formatGregorian, formatHijri, formatTime } from '../../lib/dates'
import { goldenPhoto, landmarkFor } from '../../themes/golden'

const ARCHES = [
  { to: '/quran', title: 'القرآن الكريم', icon: BookOpen },
  { to: '/adhkar', title: 'الأذكار', icon: Sparkles },
  { to: '/prayer', title: 'الصلاة', icon: Clock3 },
  { to: '/qibla', title: 'القبلة', icon: Compass },
  { to: '/more', title: 'المزيد', icon: Star },
]

/** «ألا بذكر الله تطمئن القلوب»: الجزء الأخير من الآية 28 من سورة الرعد كما في نص المصحف (بعد علامة الوقف) */
function tailOfAyah(text: string): string {
  const parts = text.split('ۗ')
  return (parts.length > 1 ? parts[parts.length - 1] : text).trim()
}

export function GoldenHome({ now, loc, prayer, hijriOffset, last, resumeTo, plusEntitled, rest }: {
  now: Date
  loc: SavedLocation | null | undefined
  prayer: PrayerSettings
  hijriOffset: number
  last: { surah: number; ayah: number } | null
  resumeTo: string
  plusEntitled: boolean
  /** بقية بطاقات الرئيسية القابلة للتخصيص (لا تُحذف أي ميزة) */
  rest: ReactNode
}) {
  const { data } = useQuran()
  const np = loc ? nextPrayer(loc, prayer, now) : null
  const times = loc ? todayTimes(loc, prayer, now) : null
  const after = loc && np ? nextPrayer(loc, prayer, new Date(np.time.getTime() + 60_000)) : null
  const land = landmarkFor(loc?.country, loc?.name)
  const hero = goldenPhoto(land?.photo ?? 'bg-night')
  const surah = last && data ? data.meta.surahs[last.surah - 1] : null
  const verse = data ? tailOfAyah(data.verses[12][27]) : null
  return (
    <div className="gd-home">
      <header className="gd-head" style={{ backgroundImage: `url("${hero}")` }}>
        <div className="gd-head-veil" />
        <div className="gd-top">
          <div className="gd-brand">
            <span className="gd-logo"><LogoMark size={30} /></span>
            <span><strong>رفيق المسلم</strong><small>معك في كل وقت</small></span>
          </div>
          <nav className="gd-icons" aria-label="اختصارات">
            <Link to="/reminders" aria-label="التذكيرات"><Bell size={20} /></Link>
            <Link to="/plus/themes" aria-label="الثيمات"><Palette size={20} /></Link>
            <Link to="/settings" aria-label="الإعدادات"><Cog size={20} /></Link>
          </nav>
        </div>
        <div className="gd-side">
          <div className="gd-glass gd-info">
            <span><MapPin size={16} /> {loc ? cityLabel(loc) : 'اختر مدينتك'}</span>
            <span><CalendarDays size={16} /> {formatGregorian(now, loc?.tz)}</span>
            <span><CalendarDays size={16} /> {formatHijri(now, loc?.tz, hijriOffset)}</span>
          </div>
          <Link to="/prayer" className="gd-glass gd-prayer" aria-label="مواقيت الصلاة">
            <span className="gd-prayer-title"><Clock3 size={18} /> مواقيت الصلاة</span>
            {np && loc ? (
              <>
                <strong className="gd-prayer-name">{PRAYER_LABELS[np.name]}</strong>
                <b className="gd-prayer-time">{formatTime(np.time, loc.tz)}</b>
              </>
            ) : <span className="gd-prayer-empty">اختر مدينتك لعرض المواقيت</span>}
            <span className="gd-pill">عرض التفاصيل <ChevronLeft size={14} /></span>
          </Link>
        </div>
        {land && <span className="gd-landmark">{land.name}</span>}
      </header>

      <nav className="gd-arches" aria-label="الأقسام">
        {ARCHES.map((a) => <Link key={a.to} to={a.to} className="gd-arch"><a.icon size={30} strokeWidth={1.6} /><span>{a.title}</span></Link>)}
      </nav>

      {loc && times && (
        <Link to="/prayer" className="gd-times" aria-label="مواقيت اليوم">
          {(['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const).map((p) => (
            <span key={p} className={'gd-time-tile' + (np?.name === p ? ' on' : '')}><small>{PRAYER_LABELS[p]}</small><b>{formatTime(times[p], loc.tz)}</b></span>
          ))}
        </Link>
      )}

      <div className="gd-grid">
        <Link to={resumeTo} className="gd-card gd-cream" style={{ ['--img' as string]: `url("${goldenPhoto('p24')}")` }}>
          <span className="gd-card-title"><BookOpen size={18} /> آخر قراءة</span>
          <strong>{surah ? `سورة ${surah.name}` : 'سورة الفاتحة'}</strong>
          <small>{last && surah ? `الآية ${last.ayah} من ${surah.count}` : 'ابدأ القراءة، ويُحفظ موضعك'}</small>
          <span className="gd-btn">{last ? 'متابعة القراءة' : 'ابدأ القراءة'} <ChevronLeft size={14} /></span>
        </Link>
        <Link to="/prayer" className="gd-card gd-photo" style={{ ['--img' as string]: `url("${goldenPhoto('islamic-08')}")` }}>
          <span className="gd-card-title"><CalendarDays size={18} /> أوقات الصلاة القادمة</span>
          <strong>{after && loc ? PRAYER_LABELS[after.name] : '—'}</strong>
          <b className="gd-time">{after && loc ? formatTime(after.time, loc.tz) : ''}</b>
          <span className="gd-btn">كل المواعيد <ChevronLeft size={14} /></span>
        </Link>
        <Link to="/tasbih" className="gd-card gd-photo" style={{ ['--img' as string]: `url("${goldenPhoto('p32')}")` }}>
          <span className="gd-card-title">المسبحة الإلكترونية</span>
          <small>اذكر الله في أي وقت</small>
          <span className="gd-btn"><Play size={14} /> ابدأ التسبيح</span>
        </Link>
        <Link to="/plus" className="gd-card gd-photo gd-plus" style={{ ['--img' as string]: `url("${goldenPhoto('other-06')}")` }}>
          <span className="gd-card-title"><Crown size={18} /> رفيق المسلم بلس</span>
          <small>مميزات أكثر .. تجربة أفضل</small>
          <span className="gd-btn">{plusEntitled ? 'مزايا بلس' : 'اشترك الآن'} <ChevronLeft size={14} /></span>
        </Link>
      </div>

      {verse && (
        <Link to="/quran/13?ayah=28" className="gd-verse" aria-label="سورة الرعد، الآية 28">
          <span className="gd-verse-text">﴿{verse}﴾</span>
        </Link>
      )}

      <div className="gd-rest">{rest}</div>
    </div>
  )
}
