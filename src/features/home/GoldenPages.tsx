// أجزاء الصفحات بالتصميم الذهبي كما في صور صاحب التطبيق (مواقيت الصلاة والقرآن الكريم)، فوق محتوى الصفحة نفسه.
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Bell, BookOpen, ChevronLeft, ChevronRight, Clock3, CloudSun, Hourglass, Layers, Moon, Star, Sun, Sunrise, Sunset, BookMarked } from 'lucide-react'
import { PRAYER_LABELS, nextPrayer, todayTimes, type PrayerName } from '../../services/prayer'
import { formatTime } from '../../lib/dates'
import type { Settings } from '../../state/settings'
import type { QuranData } from '../../services/quran'
import { goldenPhoto } from '../../themes/golden'

const ICON: Record<string, typeof Sun> = { fajr: Sunrise, dhuhr: Sun, asr: CloudSun, maghrib: Sunset, isha: Moon }
const FIVE = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const

function leftText(ms: number) {
  const m = Math.max(0, Math.round(ms / 60000))
  const h = Math.floor(m / 60)
  return h ? `${h} س ${m % 60} د` : `${m} د`
}

/** قبة مسجد بخط ذهبي (رمز داخل البطاقة كما في التصميم) */
export function MosqueMark() {
  return (
    <svg className="gp-mosque" viewBox="0 0 120 80" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round">
      <path d="M38 70 V44 Q60 18 82 44 V70" /><path d="M60 22 V12" /><circle cx="60" cy="9" r="3" />
      <path d="M18 70 V30 M14 30 h8 M18 30 l-0 -8" /><path d="M102 70 V30 M98 30 h8 M102 30 v-8" />
      <path d="M8 70 H112" /><path d="M52 70 V56 Q60 48 68 56 V70" />
    </svg>
  )
}

export function GoldenPrayerTop({ settings, now, update }: { settings: Settings; now: Date; update: (p: Partial<Settings>) => void }) {
  const loc = settings.location
  const [k, setK] = useState(1)
  if (!loc) return null
  const np = nextPrayer(loc, settings.prayer, now)
  const times = todayTimes(loc, settings.prayer, now)
  // الصلوات التالية بالترتيب (لبطاقة «أوقات الصلاة القادمة» بأسهمها)
  const upcoming: { name: PrayerName; time: Date }[] = []
  let t = new Date(np.time.getTime() + 60_000)
  for (let i = 0; i < 5; i++) { const x = nextPrayer(loc, settings.prayer, t); upcoming.push(x); t = new Date(x.time.getTime() + 60_000) }
  const shown = upcoming[Math.min(k - 1, upcoming.length - 1)]
  const n = settings.notifications
  const alertOn = n.minutesBefore > 0
  return (
    <div className="gp-prayer">
      <section className="gp-next" aria-live="polite">
        <MosqueMark />
        <div className="gp-next-text">
          <strong>{PRAYER_LABELS[np.name]}</strong>
          <b>{formatTime(np.time, loc.tz)}</b>
          <span><Hourglass size={16} /> باقٍ على الأذان: {leftText(np.time.getTime() - now.getTime())}</span>
        </div>
      </section>
      <div className="gp-tiles" aria-label="مواقيت اليوم">
        {FIVE.filter((p) => p !== np.name).map((p) => { const I = ICON[p]; return (
          <span key={p} className="gp-tile"><I size={22} /><small>{PRAYER_LABELS[p]}</small><b>{formatTime(times[p], loc.tz)}</b></span>
        ) })}
      </div>
      <section className="gp-row gp-upcoming" aria-label="أوقات الصلاة القادمة">
        <span className="gp-row-title"><Clock3 size={20} /> أوقات الصلاة القادمة</span>
        <div className="gp-upcoming-nav">
          <button type="button" aria-label="الصلاة التالية" onClick={() => setK((x) => Math.min(upcoming.length, x + 1))}><ChevronRight size={20} /></button>
          <b>{shown ? `${PRAYER_LABELS[shown.name]} ${formatTime(shown.time, loc.tz)}` : ''}</b>
          <button type="button" aria-label="الصلاة السابقة" onClick={() => setK((x) => Math.max(1, x - 1))}><ChevronLeft size={20} /></button>
        </div>
      </section>
      <section className="gp-row gp-alert">
        <span className="gp-row-title"><Bell size={20} /> تنبيه قبل الأذان</span>
        <Link to="/reminders" className="small">{alertOn ? `قبل ${n.minutesBefore} دقائق` : 'غير مفعّل'} <ChevronLeft size={14} /></Link>
        <label className="gp-switch"><input type="checkbox" role="switch" checked={alertOn} aria-label="تنبيه قبل الأذان"
          onChange={(e) => update({ notifications: { ...n, minutesBefore: e.target.checked ? 10 : 0 } })} /><span /></label>
      </section>
    </div>
  )
}

export function GoldenQuranTop({ data, last, onTab }: { data: QuranData; last: { surah: number; ayah: number } | null; onTab: (t: 'surahs' | 'juz' | 'page' | 'bookmarks') => void }) {
  const s = last ? data.meta.surahs[last.surah - 1] : null
  const go = (t: 'surahs' | 'juz' | 'page' | 'bookmarks') => { onTab(t); document.getElementById('quran-list')?.scrollIntoView({ behavior: 'smooth' }) }
  return (
    <div className="gq-top">
      <Link to={last ? `/quran/${last.surah}?ayah=${last.ayah}` : '/quran/1'} className="gq-start"><BookOpen size={20} /> ابدأ القراءة</Link>
      <div className="gq-tiles">
        <button type="button" onClick={() => go('surahs')}><BookMarked size={26} /><span>السور</span></button>
        <button type="button" onClick={() => go('juz')}><Layers size={26} /><span>الأجزاء</span></button>
        <button type="button" onClick={() => go('page')}><BookOpen size={26} /><span>الصفحات</span></button>
        <button type="button" onClick={() => go('bookmarks')}><Star size={26} /><span>العلامات</span></button>
      </div>
      <Link to={last ? `/quran/${last.surah}?ayah=${last.ayah}` : '/quran/1'} className="gq-last" style={{ ['--img' as string]: `url("${goldenPhoto('p24')}")` }}>
        <span className="gp-row-title"><BookOpen size={18} /> آخر قراءة</span>
        <strong>{s ? `سورة ${s.name}` : 'سورة الفاتحة'}</strong>
        <small>{last && s ? `الآية ${last.ayah} من ${s.count}` : 'ابدأ من الفاتحة'}</small>
        <ChevronLeft size={20} className="gq-chev" />
      </Link>
      <div className="gq-banner">القرآن نور في القلب وهدى في الطريق</div>
    </div>
  )
}
