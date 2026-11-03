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
import { PRAYER_LABELS, nextPrayer, type PrayerSettings } from '../../services/prayer'
import { formatGregorian, formatHijri, formatTime } from '../../lib/dates'
import { goldenPhoto, landmarkFor } from '../../themes/golden'
import { MosqueMark } from './GoldenPages'

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
  const after = loc && np ? nextPrayer(loc, prayer, new Date(np.time.getTime() + 60_000)) : null
  const land = landmarkFor(loc?.country, loc?.name)
  const hero = goldenPhoto(land?.photo ?? 'bg-home')
  const surah = last && data ? data.meta.surahs[last.surah - 1] : null
  const verse = data ? tailOfAyah(data.verses[12][27]) : null
  return (
    <div className="gd-home">
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
        <defs>
          <linearGradient id="gd-gold-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#fff1c1" /><stop offset="0.35" stopColor="#e7c46e" /><stop offset="0.65" stopColor="#b88a2e" /><stop offset="1" stopColor="#f6dc93" />
          </linearGradient>
          <linearGradient id="gd-green-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#0f4a37" /><stop offset="1" stopColor="#062a1f" />
          </linearGradient>
          <pattern id="gd-star-pat" width="16" height="16" patternUnits="userSpaceOnUse">
            <path d="M8 1 L10 6 L15 8 L10 10 L8 15 L6 10 L1 8 L6 6 Z" fill="none" stroke="#e7c46e" strokeWidth="0.6" />
          </pattern>
        </defs>
      </svg>
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
          <Link to="/prayer" className="gd-prayer" aria-label="مواقيت الصلاة">
            <svg className="gd-prayer-frame" viewBox="0 0 200 170" preserveAspectRatio="none" aria-hidden="true">
              <path className="gd-f-fill" d="M12 30 Q12 20 22 20 H70 Q86 20 92 11 Q96 4 100 2 Q104 4 108 11 Q114 20 130 20 H178 Q188 20 188 30 V70 Q180 78 188 86 V140 Q188 150 178 150 H130 Q114 150 108 159 Q104 166 100 168 Q96 166 92 159 Q86 150 70 150 H22 Q12 150 12 140 V86 Q20 78 12 70 Z" />
              <path className="gd-f-pat" d="M12 30 Q12 20 22 20 H70 Q86 20 92 11 Q96 4 100 2 Q104 4 108 11 Q114 20 130 20 H178 Q188 20 188 30 V70 Q180 78 188 86 V140 Q188 150 178 150 H130 Q114 150 108 159 Q104 166 100 168 Q96 166 92 159 Q86 150 70 150 H22 Q12 150 12 140 V86 Q20 78 12 70 Z" />
              <path className="gd-f-out" d="M12 30 Q12 20 22 20 H70 Q86 20 92 11 Q96 4 100 2 Q104 4 108 11 Q114 20 130 20 H178 Q188 20 188 30 V70 Q180 78 188 86 V140 Q188 150 178 150 H130 Q114 150 108 159 Q104 166 100 168 Q96 166 92 159 Q86 150 70 150 H22 Q12 150 12 140 V86 Q20 78 12 70 Z" />
              <path className="gd-f-in" d="M12 30 Q12 20 22 20 H70 Q86 20 92 11 Q96 4 100 2 Q104 4 108 11 Q114 20 130 20 H178 Q188 20 188 30 V70 Q180 78 188 86 V140 Q188 150 178 150 H130 Q114 150 108 159 Q104 166 100 168 Q96 166 92 159 Q86 150 70 150 H22 Q12 150 12 140 V86 Q20 78 12 70 Z" transform="translate(100 85) scale(0.95 0.9) translate(-100 -85)" />
            </svg>
            <span className="gd-prayer-title"><Clock3 size={18} /> مواقيت الصلاة</span>
            {np && loc ? (<>
              <span className="gd-prayer-body">
                <span className="gd-prayer-text">
                  <strong className="gd-prayer-name">{PRAYER_LABELS[np.name]}</strong>
                  <b className="gd-prayer-time">{formatTime(np.time, loc.tz)}</b>
                </span>
                <MosqueMark />
              </span>
              <span className="gd-divider" aria-hidden="true"><i /><b /><i /></span>
            </>) : <span className="gd-prayer-empty">اختر مدينتك لعرض المواقيت</span>}
            <span className="gd-btn">عرض التفاصيل <ChevronLeft size={14} /></span>
          </Link>
        </div>
        {land && <span className="gd-landmark">{land.name}</span>}
      </header>

      <nav className="gd-arches" aria-label="الأقسام">
        {ARCHES.map((a) => (
          <Link key={a.to} to={a.to} className="gd-arch">
            <svg className="gd-arch-shape" viewBox="0 0 100 130" preserveAspectRatio="none" aria-hidden="true"><path d="M4 128 V52 Q4 30 28 20 Q44 13 50 2 Q56 13 72 20 Q96 30 96 52 V128 Z" /><path className="gd-arch-in" d="M4 128 V52 Q4 30 28 20 Q44 13 50 2 Q56 13 72 20 Q96 30 96 52 V128 Z" transform="translate(50 70) scale(0.86 0.9) translate(-50 -70)" /></svg>
            <a.icon size={30} strokeWidth={1.6} /><span>{a.title}</span><i className="gd-arch-dot" />
          </Link>
        ))}
      </nav>

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
