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

const ARCHES = [
  { to: '/quran', title: 'القرآن الكريم', icon: BookOpen },
  { to: '/adhkar', title: 'الأذكار', icon: Sparkles },
  { to: '/prayer', title: 'الصلاة', icon: Clock3 },
  { to: '/qibla', title: 'القبلة', icon: Compass },
  { to: '/more', title: 'المزيد', icon: Star },
]

/** عداد تنازلي للصلاة القادمة شامل الثواني: س:د:ث */
function countdown(ms: number): string {
  const t = Math.max(0, Math.floor(ms / 1000))
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(Math.floor(t / 3600))}:${p(Math.floor((t % 3600) / 60))}:${p(t % 60)}`
}

/** مسجد مصمت بالذهبي (قبة ومئذنتان) كما في بطاقة الصلاة بالتصميم */
function MosqueSolid() {
  return (
    <svg className="gd-mosque" viewBox="0 0 100 80" aria-hidden="true" fill="url(#gd-gold-grad)">
      <path d="M50 6 l2 5 h-4 z M49 11 h2 v4 h-2 z" />
      <path d="M28 46 C28 30 40 22 50 16 C60 22 72 30 72 46 Z" />
      <circle cx="50" cy="14" r="2" />
      <path d="M12 20 l4 -10 l4 10 z M13 20 h6 v54 h-6 z M11 32 h10 v3 h-10 z" />
      <path d="M80 20 l4 -10 l4 10 z M81 20 h6 v54 h-6 z M79 32 h10 v3 h-10 z" />
      <path d="M22 50 C22 44 27 41 30 40 C33 41 38 44 38 50 Z M62 50 C62 44 67 41 70 40 C73 41 78 44 78 50 Z" />
      <path fillRule="evenodd" d="M22 48 h56 v26 h-56 z M45 74 v-12 a5 5 0 0 1 10 0 v12 z M29 70 v-8 a3 3 0 0 1 6 0 v8 z M65 70 v-8 a3 3 0 0 1 6 0 v8 z" />
      <rect x="6" y="74" width="88" height="4" rx="1" />
    </svg>
  )
}

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
            <svg className="gd-prayer-frame" viewBox="0 0 200 200" preserveAspectRatio="none" aria-hidden="true">
              <path className="gd-f-fill" d="M22 28 H62 C68 28 72 22 78 16 C86 9 94 7 100 2 C106 7 114 9 122 16 C128 22 132 28 138 28 H178 Q178 38 188 38 V170 Q178 170 178 180 H118 Q106 180 100 194 Q94 180 82 180 H22 Q22 170 12 170 V38 Q22 38 22 28 Z" />
              <path className="gd-f-pat" d="M22 28 H62 C68 28 72 22 78 16 C86 9 94 7 100 2 C106 7 114 9 122 16 C128 22 132 28 138 28 H178 Q178 38 188 38 V170 Q178 170 178 180 H118 Q106 180 100 194 Q94 180 82 180 H22 Q22 170 12 170 V38 Q22 38 22 28 Z" />
              <path className="gd-f-out" d="M22 28 H62 C68 28 72 22 78 16 C86 9 94 7 100 2 C106 7 114 9 122 16 C128 22 132 28 138 28 H178 Q178 38 188 38 V170 Q178 170 178 180 H118 Q106 180 100 194 Q94 180 82 180 H22 Q22 170 12 170 V38 Q22 38 22 28 Z" />
              <path className="gd-f-in" d="M22 28 H62 C68 28 72 22 78 16 C86 9 94 7 100 2 C106 7 114 9 122 16 C128 22 132 28 138 28 H178 Q178 38 188 38 V170 Q178 170 178 180 H118 Q106 180 100 194 Q94 180 82 180 H22 Q22 170 12 170 V38 Q22 38 22 28 Z" transform="translate(100 100) scale(0.94 0.92) translate(-100 -100)" />
            </svg>
            <span className="gd-prayer-title"><Clock3 size={18} /> مواقيت الصلاة</span>
            {np && loc ? (<>
              <span className="gd-prayer-body">
                <span className="gd-prayer-text">
                  <strong className="gd-prayer-name">{PRAYER_LABELS[np.name]}</strong>
                  <b className="gd-prayer-time">{formatTime(np.time, loc.tz)}</b>
                </span>
                <MosqueSolid />
              </span>
              <span className="gd-count" aria-label="الوقت المتبقي على الأذان">باقٍ على الأذان <b dir="ltr">{countdown(np.time.getTime() - now.getTime())}</b></span>
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
