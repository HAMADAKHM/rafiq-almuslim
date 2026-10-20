import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  BookOpen, Brain, Clock, Compass, Sparkles, HandHeart, Headphones, GraduationCap, MapPin, CircleCheck, CalendarDays,
  CircleDot, Play, Image, SlidersHorizontal, ArrowUp, ArrowDown, Library,
} from 'lucide-react'
import { DedicationCard } from '../../components/DedicationCard'
import { Spinner } from '../../components/Common'
import { Sheet } from '../../components/Sheet'
import { ShareCardDialog } from '../../components/ShareCardDialog'
import { useDocumentTitle, useLive, useNow, useQuran } from '../../hooks'
import { useSettings } from '../../state/SettingsContext'
import { HOME_CARD_LABELS, LOCKED_HOME_CARDS, type HomeCardId } from '../../state/settings'
import { nextPrayer, PRAYER_LABELS, PRAYERS, todayTimes } from '../../services/prayer'
import { dayKey, formatCountdown, formatGregorian, formatHijri, formatTime } from '../../lib/dates'
import { cityLabel } from '../../services/cities'
import { adhkarLog, kv, memo } from '../../db/repos'
import { KhatmaCard } from '../wird/KhatmaCard'
import { useAllLogs } from '../progress/ProgressPage'
import { computeStats, dailySeries } from '../../services/stats'
import { adhkarForNow, ayahOfDay, greeting } from '../../services/daily'
import { loadTasbih, todayTotal } from '../../services/tasbih'
import { toArabicDigits } from '../../lib/arabic'
import { player } from '../../services/audio'
import type { LastRead } from '../quran/QuranIndexPage'
import type { AdhkarLog, MemoSegment } from '../../db/db'

const SHORTCUTS = [
  { to: '/quran', label: 'القرآن الكريم', icon: BookOpen },
  { to: '/listen', label: 'الاستماع', icon: Headphones },
  { to: '/prayer', label: 'المواقيت', icon: Clock },
  { to: '/adhkar', label: 'الأذكار', icon: Sparkles },
  { to: '/memorize', label: 'الحفظ', icon: Brain },
  { to: '/learn', label: 'التفسير', icon: GraduationCap },
]

function localHour(tz?: string, now = new Date()): number {
  return Number(new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', hour12: false }).format(now)) % 24
}

export function HomePage() {
  useDocumentTitle('')
  const { settings, update } = useSettings()
  const { data } = useQuran()
  const now = useNow(1000)
  const loc = settings.location
  const today = dayKey(now, loc?.tz)
  const hour = localHour(loc?.tz, now)
  const last = useLive(() => kv.get<LastRead | null>('quran:last', null), ['kv:quran:last'], null)
  const adhkar = useLive(() => adhkarLog.forDay(today), ['adhkarLog'], [] as AdhkarLog[], [today])
  const segs = useLive(() => memo.all(), ['memo'], [] as MemoSegment[])
  const tasbih = useLive(() => loadTasbih(), ['kv:tasbih'], null)
  const { read, mlogs, adh } = useAllLogs()
  const [customize, setCustomize] = useState(false)
  const [shareAyah, setShareAyah] = useState(false)
  const stats = computeStats(read, segs, mlogs, adh, today)
  const todaySeries = dailySeries(read, mlogs, adh, today, 1)[0]
  const np = loc ? nextPrayer(loc, settings.prayer, now) : null
  const times = loc ? todayTimes(loc, settings.prayer, now) : null
  const done = new Set(adhkar.map((a) => a.category))
  const due = segs.filter((s) => !s.paused && s.status !== 'new' && s.due <= today).length
  const nowAdhkar = adhkarForNow(hour)
  const aod = ayahOfDay(today)
  const aodText = data?.verses[aod.surah - 1][aod.ayah - 1]
  const aodName = data?.meta.surahs[aod.surah - 1].name
  const cardInput = useMemo(() => (aodText ? { kind: 'ayah' as const, heading: 'آية اليوم', text: aodText, reference: `[سورة ${aodName}: ${aod.ayah}]` } : null), [aodText, aodName, aod.ayah])

  const cards: Record<HomeCardId, ReactNode> = {
    continue: (
      <section className="card">
        <h2><BookOpen size={18} /> أكمل قراءتك</h2>
        {!data ? <Spinner /> : last ? (
          <>
            <p style={{ margin: 0 }}>سورة <strong>{data.meta.surahs[last.surah - 1].name}</strong> — الآية {last.ayah}</p>
            <p className="quran-text" style={{ fontSize: '1.3rem', margin: '0.25rem 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{data.verses[last.surah - 1][last.ayah - 1]}</p>
            <div className="row">
              <Link className="btn btn-primary btn-sm" to={settings.readerMode === 'mushaf' && last.page ? `/mushaf/${last.page}` : `/quran/${last.surah}?ayah=${last.ayah}`}>تابع القراءة</Link>
              <Link className="btn btn-sm btn-ghost" to="/quran">فهرس السور</Link>
            </div>
          </>
        ) : (
          <><p className="muted">ابدأ القراءة وسيُحفظ موضعك تلقائيًا.</p><Link className="btn btn-primary btn-sm" to="/quran/1">ابدأ من الفاتحة</Link></>
        )}
      </section>
    ),
    khatma: <section className="card"><h2><BookOpen size={18} /> ورد القرآن</h2>{data ? <KhatmaCard data={data} compact /> : <Spinner />}</section>,
    adhkar: (
      <section className="card">
        <h2><Sparkles size={18} /> {nowAdhkar.title}</h2>
        <p className="small muted" style={{ marginTop: 0 }}>{done.has(nowAdhkar.id) ? 'سجّلت إتمامها اليوم. تقبّل الله.' : 'بحسب الوقت الحالي'}</p>
        <div className="row">
          <Link className={'btn btn-sm' + (done.has(nowAdhkar.id) ? '' : ' btn-primary')} to={`/adhkar/${nowAdhkar.id}`}>{done.has(nowAdhkar.id) ? <><CircleCheck size={14} /> تم</> : 'ابدأ الآن'}</Link>
          {['morning', 'evening', 'after-prayer'].filter((x) => x !== nowAdhkar.id).map((id) => (
            <Link key={id} className="btn btn-sm btn-ghost" to={`/adhkar/${id}`}>{done.has(id) && <CircleCheck size={12} color="var(--success)" />} {id === 'morning' ? 'الصباح' : id === 'evening' ? 'المساء' : 'بعد الصلاة'}</Link>
          ))}
        </div>
      </section>
    ),
    ayah: (
      <section className="card ayah-day">
        <h2>آية اليوم</h2>
        {aodText ? (
          <>
            <p className="quran-text" style={{ fontSize: '1.6rem', margin: '0.25rem 0' }}>{aodText} <span className="ayah-num">{toArabicDigits(aod.ayah)}</span></p>
            <div className="spread">
              <Link className="small" to={`/quran/${aod.surah}?ayah=${aod.ayah}`}>سورة {aodName}: {aod.ayah}</Link>
              <span className="row">
                <button className="btn btn-ghost btn-sm icon-btn" aria-label="استماع لآية اليوم" onClick={() => player.play({ reciterId: settings.reciterId, surah: aod.surah, surahName: aodName!, from: aod.ayah, to: aod.ayah })}><Play size={16} /></button>
                <Link className="btn btn-ghost btn-sm icon-btn" aria-label="تفسير آية اليوم" to={`/learn?s=${aod.surah}&a=${aod.ayah}`}><Library size={16} /></Link>
                <button className="btn btn-ghost btn-sm icon-btn" aria-label="مشاركة آية اليوم كصورة" onClick={() => setShareAyah(true)}><Image size={16} /></button>
              </span>
            </div>
          </>
        ) : <Spinner />}
      </section>
    ),
    quick: (
      <nav aria-label="وصول سريع" className="quick-grid">
        <Link to="/tasbih" className="quick-item"><CircleDot size={22} /><span>المسبحة</span></Link>
        <Link to="/duas" className="quick-item"><HandHeart size={22} /><span>الأدعية</span></Link>
        <Link to="/qibla" className="quick-item"><Compass size={22} /><span>القبلة</span></Link>
        <Link to="/calendar" className="quick-item"><CalendarDays size={22} /><span>التقويم</span></Link>
      </nav>
    ),
    summary: (
      <section className="card">
        <div className="spread"><h2 style={{ margin: 0 }}>إنجاز اليوم</h2><Link to="/progress" className="small">التفاصيل</Link></div>
        <div className="grid grid-4 compact-stats">
          <div className="stat"><b>{todaySeries.ayahs}</b><span className="small muted">آية</span></div>
          <div className="stat"><b>{done.size}</b><span className="small muted">أذكار</span></div>
          <div className="stat"><b>{tasbih ? todayTotal(tasbih, today) : 0}</b><span className="small muted">تسبيحة</span></div>
          <div className="stat"><b>{segs.length ? due : '—'}</b><span className="small muted">مراجعة متبقية</span></div>
        </div>
        {stats.streak > 1 && <p className="small muted" style={{ margin: '6px 0 0' }}>{stats.streak} أيام متتالية من النشاط</p>}
      </section>
    ),
    dedication: <DedicationCard />,
    shortcuts: (
      <nav aria-label="اختصارات" className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))' }}>
        {SHORTCUTS.map(({ to, label, icon: Icon }) => (
          <Link key={to} to={to} className="card card-link" style={{ textAlign: 'center', padding: '0.8rem 0.5rem' }}>
            <Icon size={22} color="var(--primary)" aria-hidden="true" />
            <div style={{ marginTop: 4 }}>{label}</div>
          </Link>
        ))}
      </nav>
    ),
  }

  const visible = settings.homeCards.filter((c) => c.visible)
  const move = (i: number, d: -1 | 1) => {
    const list = [...settings.homeCards]
    const j = i + d
    if (j < 0 || j >= list.length) return
    ;[list[i], list[j]] = [list[j], list[i]]
    update({ homeCards: list })
  }

  return (
    <div className="stack" style={{ gap: '1rem' }}>
      <section className="hero" aria-label="الصلاة القادمة">
        <div className="spread" style={{ alignItems: 'start' }}>
          <div>
            <div className="hero-greet">{greeting(hour, today)}</div>
            <div style={{ opacity: 0.9 }}>{formatGregorian(now, loc?.tz)}</div>
            <div className="hero-gold">{formatHijri(now, loc?.tz, settings.hijriOffset)}</div>
            <Link to="/prayer" className="hero-link"><MapPin size={14} /> {loc ? cityLabel(loc) : 'اختر مدينتك'}</Link>
          </div>
          {np && loc ? (
            <div style={{ textAlign: 'end' }} aria-live="polite">
              <div style={{ opacity: 0.85, fontSize: '0.9rem' }}>الصلاة القادمة</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 700 }}>{PRAYER_LABELS[np.name]} {formatTime(np.time, loc.tz)}</div>
              <div className="hero-count" aria-label="الوقت المتبقي">{formatCountdown(np.time.getTime() - now.getTime())}</div>
            </div>
          ) : (
            <Link className="btn btn-gold" to="/prayer">اختر مدينتك لعرض مواقيت الصلاة</Link>
          )}
        </div>
        {times && loc && (
          <div className="row" style={{ marginTop: '0.75rem', gap: '0.4rem' }}>
            {PRAYERS.map((p) => (
              <span key={p} className={'hero-chip' + (np?.name === p ? ' active' : '')}>
                {PRAYER_LABELS[p]} <strong style={{ fontVariantNumeric: 'tabular-nums' }}>{formatTime(times[p], loc.tz)}</strong>
              </span>
            ))}
          </div>
        )}
      </section>

      <div className="home-grid">
        {visible.map((c) => <div key={c.id} className={`home-cell home-${c.id}`}>{cards[c.id]}</div>)}
      </div>

      <div className="row" style={{ justifyContent: 'center' }}>
        <button className="btn btn-ghost btn-sm" onClick={() => setCustomize(true)}><SlidersHorizontal size={14} /> تخصيص الرئيسية</button>
        <Link className="btn btn-ghost btn-sm" to="/journey">ابدأ رحلتك</Link>
      </div>

      <Sheet open={customize} onClose={() => setCustomize(false)} title="تخصيص الرئيسية">
        <p className="small muted">اختر البطاقات التي تظهر ورتّبها. بطاقة الإهداء جزء ثابت من التطبيق، ويمكن تغيير موضعها.</p>
        <ul className="stack" style={{ listStyle: 'none', padding: 0, gap: 6 }}>
          {settings.homeCards.map((c, i) => (
            <li key={c.id} className="spread" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 6 }}>
              <label className="check">
                <input type="checkbox" checked={c.visible} disabled={LOCKED_HOME_CARDS.includes(c.id)}
                  onChange={(e) => update({ homeCards: settings.homeCards.map((x) => (x.id === c.id ? { ...x, visible: e.target.checked } : x)) })} />
                {HOME_CARD_LABELS[c.id]}
              </label>
              <span className="row">
                <button className="btn btn-ghost btn-sm icon-btn" aria-label={`نقل ${HOME_CARD_LABELS[c.id]} للأعلى`} disabled={i === 0} onClick={() => move(i, -1)}><ArrowUp size={14} /></button>
                <button className="btn btn-ghost btn-sm icon-btn" aria-label={`نقل ${HOME_CARD_LABELS[c.id]} للأسفل`} disabled={i === settings.homeCards.length - 1} onClick={() => move(i, 1)}><ArrowDown size={14} /></button>
              </span>
            </li>
          ))}
        </ul>
      </Sheet>
      <ShareCardDialog open={shareAyah} onClose={() => setShareAyah(false)} input={shareAyah ? cardInput : null} />
    </div>
  )
}
