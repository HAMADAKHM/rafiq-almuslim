import { Link } from 'react-router-dom'
import { BookOpen, Brain, Clock, Compass, Sparkles, HandHeart, Headphones, GraduationCap, MapPin, CircleCheck } from 'lucide-react'
import { DedicationCard } from '../../components/DedicationCard'
import { ProgressBar, Spinner } from '../../components/Common'
import { useDocumentTitle, useLive, useNow, useQuran } from '../../hooks'
import { useSettings } from '../../state/SettingsContext'
import { nextPrayer, PRAYER_LABELS, PRAYERS, todayTimes } from '../../services/prayer'
import { dayKey, formatCountdown, formatGregorian, formatHijri, formatTime } from '../../lib/dates'
import { cityLabel } from '../../services/cities'
import { adhkarLog, kv, memo } from '../../db/repos'
import { WirdCard } from '../wird/WirdPage'
import { useAllLogs } from '../progress/ProgressPage'
import { computeStats, dailySeries } from '../../services/stats'
import type { LastRead } from '../quran/QuranIndexPage'
import type { AdhkarLog, MemoSegment } from '../../db/db'

const SHORTCUTS = [
  { to: '/quran', label: 'القرآن الكريم', icon: BookOpen },
  { to: '/listen', label: 'الاستماع', icon: Headphones },
  { to: '/prayer', label: 'المواقيت', icon: Clock },
  { to: '/qibla', label: 'القبلة', icon: Compass },
  { to: '/adhkar', label: 'الأذكار', icon: Sparkles },
  { to: '/duas', label: 'الأدعية', icon: HandHeart },
  { to: '/memorize', label: 'الحفظ', icon: Brain },
  { to: '/learn', label: 'التفسير', icon: GraduationCap },
]

export function HomePage() {
  useDocumentTitle('')
  const { settings } = useSettings()
  const { data } = useQuran()
  const now = useNow(1000)
  const loc = settings.location
  const today = dayKey(now, loc?.tz)
  const last = useLive(() => kv.get<LastRead | null>('quran:last', null), ['kv:quran:last'], null)
  const adhkar = useLive(() => adhkarLog.forDay(today), ['adhkarLog'], [] as AdhkarLog[], [today])
  const segs = useLive(() => memo.all(), ['memo'], [] as MemoSegment[])
  const { read, mlogs, adh } = useAllLogs()
  const stats = computeStats(read, segs, mlogs, adh, today)
  const week = dailySeries(read, mlogs, adh, today, 7)
  const weekAyahs = week.reduce((n, d) => n + d.ayahs, 0)
  const np = loc ? nextPrayer(loc, settings.prayer, now) : null
  const times = loc ? todayTimes(loc, settings.prayer, now) : null
  const done = new Set(adhkar.map((a) => a.category))
  const due = segs.filter((s) => !s.paused && s.status !== 'new' && s.due <= today).length
  const newSegs = segs.filter((s) => !s.paused && s.status === 'new').length

  return (
    <div className="stack" style={{ gap: '1rem' }}>
      {/* الهوية والتاريخ والصلاة القادمة */}
      <section className="card" style={{ background: 'linear-gradient(135deg, #0d4d3a, #0a3b2d)', color: '#fdfaf2', borderColor: 'transparent' }}>
        <div className="spread" style={{ alignItems: 'start' }}>
          <div>
            <h1 style={{ color: '#fdfaf2', marginBottom: 4 }}>رفيق المسلم</h1>
            <div style={{ opacity: 0.9 }}>{formatGregorian(now, loc?.tz)}</div>
            <div style={{ color: '#e8cf8a' }}>{formatHijri(now, loc?.tz, settings.hijriOffset)}</div>
            <Link to="/prayer" style={{ color: '#fdfaf2', opacity: 0.85, fontSize: '0.9rem' }}><MapPin size={14} /> {loc ? cityLabel(loc) : 'اختر مدينتك'}</Link>
          </div>
          {np && loc ? (
            <div style={{ textAlign: 'end' }} aria-live="polite">
              <div style={{ opacity: 0.85, fontSize: '0.9rem' }}>الصلاة القادمة</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{PRAYER_LABELS[np.name]} {formatTime(np.time, loc.tz)}</div>
              <div style={{ fontSize: '1.6rem', fontVariantNumeric: 'tabular-nums', color: '#e8cf8a' }} aria-label="الوقت المتبقي">{formatCountdown(np.time.getTime() - now.getTime())}</div>
            </div>
          ) : (
            <Link className="btn btn-gold" to="/prayer">اختر مدينتك لعرض مواقيت الصلاة</Link>
          )}
        </div>
        {times && loc && (
          <div className="row" style={{ marginTop: '0.75rem', gap: '0.4rem' }}>
            {PRAYERS.map((p) => (
              <span key={p} style={{ background: np?.name === p ? 'rgba(232,207,138,0.25)' : 'rgba(255,255,255,0.08)', padding: '0.25rem 0.6rem', borderRadius: 8, fontSize: '0.85rem' }}>
                {PRAYER_LABELS[p]} <strong style={{ fontVariantNumeric: 'tabular-nums' }}>{formatTime(times[p], loc.tz)}</strong>
              </span>
            ))}
          </div>
        )}
      </section>

      <div className="grid grid-2">
        <section className="card">
          <h2><BookOpen size={18} /> متابعة القراءة</h2>
          {!data ? <Spinner /> : last ? (
            <>
              <p style={{ margin: 0 }}>سورة <strong>{data.meta.surahs[last.surah - 1].name}</strong> — الآية {last.ayah}</p>
              <p className="quran-text" style={{ fontSize: '1.3rem', margin: '0.25rem 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{data.verses[last.surah - 1][last.ayah - 1]}</p>
              <Link className="btn btn-primary btn-sm" to={`/quran/${last.surah}?ayah=${last.ayah}`}>تابع القراءة</Link>
            </>
          ) : (
            <><p className="muted">ابدأ القراءة وسيُحفظ موضعك تلقائيًا.</p><Link className="btn btn-primary btn-sm" to="/quran/1">ابدأ من الفاتحة</Link></>
          )}
        </section>
        <DedicationCard />
      </div>

      <div className="grid grid-3">
        <section className="card">
          <h2>ورد اليوم</h2>
          {data ? <WirdCard data={data} compact /> : <Spinner />}
        </section>
        <section className="card">
          <h2><Sparkles size={18} /> أذكار اليوم</h2>
          <div className="stack" style={{ gap: 6 }}>
            {[['morning', 'أذكار الصباح'], ['evening', 'أذكار المساء'], ['after-prayer', 'أذكار بعد الصلاة']].map(([id, label]) => (
              <Link key={id} to={`/adhkar/${id}`} className="spread" style={{ textDecoration: 'none', color: 'inherit' }}>
                <span>{label}</span>
                {done.has(id) ? <span className="badge badge-success"><CircleCheck size={12} /> تم</span> : <span className="badge">لم تُسجّل</span>}
              </Link>
            ))}
          </div>
        </section>
        <section className="card">
          <h2><Brain size={18} /> الحفظ والمراجعة</h2>
          {segs.length ? (
            <>
              <p style={{ margin: 0 }}>{due ? `${due} مقطع للمراجعة اليوم` : 'لا مراجعات مستحقة اليوم'}</p>
              <p className="small muted">{newSegs} مقطعًا جديدًا في خطتك • {stats.memo.memorizedAyahs} آية محفوظة</p>
              <ProgressBar value={stats.memo.totalAyahs ? stats.memo.memorizedAyahs / stats.memo.totalAyahs : 0} label="تقدم الحفظ" />
            </>
          ) : <p className="muted small">لم تحدد هدف حفظ بعد.</p>}
          <Link className="btn btn-sm" style={{ marginTop: 8 }} to="/memorize">{segs.length ? 'ابدأ الجلسة' : 'أضف هدف حفظ'}</Link>
        </section>
      </div>

      <section className="card">
        <div className="spread">
          <h2 style={{ margin: 0 }}>ملخص التقدم</h2>
          <Link to="/progress" className="small">التفاصيل</Link>
        </div>
        <div className="grid grid-3" style={{ marginTop: 8 }}>
          <div className="stat"><b>{weekAyahs}</b><span className="small muted">آية هذا الأسبوع</span></div>
          <div className="stat"><b>{stats.readingDays}</b><span className="small muted">يوم قراءة إجمالًا</span></div>
          <div className="stat"><b>{stats.streak}</b><span className="small muted">أيام متتالية من النشاط</span></div>
        </div>
      </section>

      <nav aria-label="اختصارات" className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))' }}>
        {SHORTCUTS.map(({ to, label, icon: Icon }) => (
          <Link key={to} to={to} className="card card-link" style={{ textAlign: 'center', padding: '0.9rem 0.5rem' }}>
            <Icon size={22} color="var(--primary)" aria-hidden="true" />
            <div style={{ marginTop: 4 }}>{label}</div>
          </Link>
        ))}
      </nav>
      <p className="small muted" style={{ textAlign: 'center' }}>جديد هنا؟ <Link to="/journey">ابدأ رحلتك</Link> ببرنامج يناسب وقتك.</p>
    </div>
  )
}
