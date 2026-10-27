import { useMemo, useState, type ReactNode } from 'react'
import { usePlus } from '../../billing/PlusContext'
import { DailyCompanionCard } from '../companion/DailyCompanionCard'
import { Link } from 'react-router-dom'
import {
  BookOpen, Sparkles, MapPin, CircleCheck, Play, Image, SlidersHorizontal, ArrowUp, ArrowDown, Library,
  ChevronLeft, Bell, Heart, LayoutGrid, BookMarked, Sun, CloudSun, Sunset, Moon, MoonStar, Sunrise,
} from 'lucide-react'
import { DedicationCard } from '../../components/DedicationCard'
import { Spinner } from '../../components/Common'
import { Sheet } from '../../components/Sheet'
import { ShareCardDialog } from '../../components/ShareCardDialog'
import { useDocumentTitle, useLive, useNow, useQuran } from '../../hooks'
import { useSettings } from '../../state/SettingsContext'
import { HOME_CARD_LABELS, LOCKED_HOME_CARDS, MAX_QUICK_LINKS, QUICK_LINK_CHOICES, type HomeCardId } from '../../state/settings'
import { LINK_META } from '../../app/nav'
import { ADHKAR } from '../../content/adhkar'
import { catIcon } from '../adhkar/AdhkarPage'
import { MAX_DAILY_ADHKAR } from '../../state/settings'
import { LogoMark } from '../../components/Art'
import { WeatherChip } from '../weather/WeatherPage'
import { PaintedScene, type PaintTone } from '../../components/Scene'
import type { PrayerName } from '../../services/prayer'
import { nextPrayer, PRAYER_LABELS, PRAYERS, todayTimes } from '../../services/prayer'
import { dayKey, formatCountdown, formatGregorian, formatHijri, formatTime } from '../../lib/dates'
import { cityLabel } from '../../services/cities'
import { adhkarLog, kv, memo } from '../../db/repos'
import { KhatmaCard, useKhatmas } from '../wird/KhatmaCard'
import { activePlan, dailyTarget } from '../../services/khatma'
import { dailySuggestion } from '../../services/dailySuggest'
import { Lightbulb } from 'lucide-react'
import { useAllLogs } from '../progress/ProgressPage'
import { computeStats, dailySeries } from '../../services/stats'
import { adhkarForNow, ayahOfDay, greeting } from '../../services/daily'
import { loadTasbih, todayTotal } from '../../services/tasbih'
import { toArabicDigits } from '../../lib/arabic'
import { player } from '../../services/audio'
import type { LastRead } from '../quran/QuranIndexPage'
import type { AdhkarLog, MemoSegment } from '../../db/db'


/** لون المشهد بحسب الصلاة القادمة */
const PRAYER_ICONS: Record<PrayerName, typeof Sun> = { fajr: MoonStar, sunrise: Sunrise, dhuhr: Sun, asr: CloudSun, maghrib: Sunset, isha: Moon }

/** لون اللوحة بحسب الصلاة القادمة */
function toneFor(p?: PrayerName): PaintTone {
  if (p === 'fajr' || p === 'sunrise') return 'dawn'
  if (p === 'isha') return 'night'
  return 'sunset'
}

function humanLeft(ms: number): string {
  const m = Math.max(0, Math.round(ms / 60000))
  const h = Math.floor(m / 60)
  const mm = m % 60
  if (h === 0) return `${mm} دقيقة`
  return mm ? `${h} س ${mm} د` : `${h} ساعة`
}

function localHour(tz?: string, now = new Date()): number {
  return Number(new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', hour12: false }).format(now)) % 24
}

export function HomePage() {
  useDocumentTitle('')
  const { settings, update } = useSettings()
  const { entitled: plusEntitled } = usePlus()
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
  const week = dailySeries(read, mlogs, adh, today, 7)
  const todaySeries = week[6]
  const weekSum = { ayahs: week.reduce((n, d) => n + d.ayahs, 0), adhkar: week.reduce((n, d) => n + d.adhkar, 0), reviews: week.reduce((n, d) => n + d.reviews, 0), active: week.filter((d) => d.ayahs || d.adhkar || d.reviews).length }
  const [period, setPeriod] = useState<'day' | 'week'>('day')
  const np = loc ? nextPrayer(loc, settings.prayer, now) : null
  const times = loc ? todayTimes(loc, settings.prayer, now) : null
  const done = new Set(adhkar.map((a) => a.category))
  const due = segs.filter((s) => !s.paused && s.status !== 'new' && s.due <= today).length
  const nowAdhkar = adhkarForNow(hour)
  const khatmas = useKhatmas()
  const plan = khatmas ? activePlan(khatmas) : null
  const tgt = plan ? dailyTarget(plan, today) : null
  const suggestion = dailySuggestion({ hour, hasLocation: !!loc, adhkarDone: done, memoDue: due, khatma: plan && tgt ? { active: true, doneToday: tgt.doneToday >= tgt.pages, from: tgt.from, to: tgt.to, page: plan.nextPage } : { active: false, doneToday: false } })
  const aod = ayahOfDay(today)
  const aodText = data?.verses[aod.surah - 1][aod.ayah - 1]
  const aodName = data?.meta.surahs[aod.surah - 1].name
  const cardInput = useMemo(() => (aodText ? { kind: 'ayah' as const, heading: 'آية اليوم', text: aodText, reference: `[سورة ${aodName}: ${aod.ayah}]` } : null), [aodText, aodName, aod.ayah])

  const resumeTo = last ? (settings.readerMode === 'mushaf' && last.page ? `/mushaf/${last.page}` : `/quran/${last.surah}?ayah=${last.ayah}`) : '/quran/1'

  const cards: Record<HomeCardId, ReactNode> = {
    companion: <DailyCompanionCard />,
    suggest: (
      <Link to={suggestion.to} className="list-card suggest-card" aria-label={`اقتراح اليوم: ${suggestion.title}`}>
        <span className="icon-chip"><Lightbulb size={22} aria-hidden="true" /></span>
        <span className="lc-body"><small>اقتراح اليوم</small><strong>{suggestion.title}</strong><small>{suggestion.body}</small></span>
        <span className="btn btn-sm btn-primary">{suggestion.action}</span>
      </Link>
    ),
    continue: (
      <section className="card home-continue-card" aria-label="أكمل قراءتك">
        {!data ? <Spinner /> : (
          <Link to={resumeTo} className="resume">
            <span className="icon-chip green"><BookMarked size={22} /></span>
            <span className="lc-body">
              <h2>أكمل قراءتك</h2>
              {last
                ? <small>سورة {data.meta.surahs[last.surah - 1].name} — الآية {last.ayah}{last.page ? ` • الصفحة ${last.page}` : ''}</small>
                : <small>ابدأ من الفاتحة، وسيُحفظ موضعك تلقائيًا</small>}
              {last && <span className="quran-text resume-text">{data.verses[last.surah - 1][last.ayah - 1]}</span>}
            </span>
            <span className="go-btn" aria-hidden="true"><ChevronLeft size={20} /></span>
            <span className="sr-only">{last ? 'تابع القراءة' : 'ابدأ من الفاتحة'}</span>
          </Link>
        )}
      </section>
    ),
    khatma: <section className="card"><h2><BookOpen size={18} /> وردك اليومي</h2>{data ? <KhatmaCard data={data} compact /> : <Spinner />}</section>,
    adhkar: (
      <section className="card">
        <div className="spread"><h2 style={{ margin: 0 }}><Sparkles size={18} /> الأذكار</h2><Link className="small" to="/adhkar">المكتبة</Link></div>
        <p className="small muted" style={{ margin: '0.15rem 0 0.6rem' }}>{done.has(nowAdhkar.id) ? `أتممت ${nowAdhkar.title} اليوم. تقبّل الله.` : `الآن: ${nowAdhkar.title}`}</p>
        <div className="adhkar-tiles">
          {settings.dailyAdhkar.map((id) => ({ id, label: ADHKAR.find((c) => c.id === id)?.title ?? id, icon: catIcon(id) })).map(({ id, label, icon: Icon }) => (
            <Link key={id} to={`/adhkar/${id}`} className={'adhkar-tile' + (id === nowAdhkar.id ? ' now' : '') + (done.has(id) ? ' done' : '')}>
              <Icon size={20} aria-hidden="true" />
              <span>{label}</span>
              {done.has(id) && <CircleCheck size={14} className="tick" aria-label="أُتمّت اليوم" />}
            </Link>
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
                <Link className="btn btn-sm btn-gold" aria-label="تفسير آية اليوم" to={`/learn?s=${aod.surah}&a=${aod.ayah}`}><Library size={15} /> تفسير الآية</Link>
                <button className="btn btn-ghost btn-sm icon-btn" aria-label="مشاركة آية اليوم كصورة" onClick={() => setShareAyah(true)}><Image size={16} /></button>
              </span>
            </div>
          </>
        ) : <Spinner />}
      </section>
    ),
    quick: (
      <nav aria-label="وصول سريع" className="quick-grid">
        {settings.quickLinks.map((to) => {
          const m = LINK_META[to]
          if (!m) return null
          const Icon = m.icon
          return <Link key={to} to={to} className="quick-item"><span className="tile-icon"><Icon size={22} /></span><span>{m.label}</span></Link>
        })}
      </nav>
    ),
    summary: (
      <section className="card">
        <div className="spread">
          <h2 style={{ margin: 0 }}>{period === 'day' ? 'إنجاز اليوم' : 'إنجاز الأسبوع'}</h2>
          <span className="row">
            <span className="seg" role="radiogroup" aria-label="فترة الملخص">
              <button role="radio" aria-checked={period === 'day'} onClick={() => setPeriod('day')}>اليوم</button>
              <button role="radio" aria-checked={period === 'week'} onClick={() => setPeriod('week')}>الأسبوع</button>
            </span>
            <Link to="/progress" className="small">التفاصيل</Link>
          </span>
        </div>
        {period === 'day' ? (
          <div className="grid grid-4 compact-stats">
            <div className="stat"><b>{todaySeries.ayahs}</b><span className="small muted">آية</span></div>
            <div className="stat"><b>{done.size}</b><span className="small muted">أذكار</span></div>
            <div className="stat"><b>{tasbih ? todayTotal(tasbih, today) : 0}</b><span className="small muted">تسبيحة</span></div>
            <div className="stat"><b>{segs.length ? due : '—'}</b><span className="small muted">مراجعة متبقية</span></div>
          </div>
        ) : (
          <div className="grid grid-4 compact-stats">
            <div className="stat"><b>{weekSum.ayahs}</b><span className="small muted">آية</span></div>
            <div className="stat"><b>{weekSum.adhkar}</b><span className="small muted">أذكار</span></div>
            <div className="stat"><b>{weekSum.reviews}</b><span className="small muted">مراجعة</span></div>
            <div className="stat"><b>{weekSum.active}/7</b><span className="small muted">أيام نشاط</span></div>
          </div>
        )}
        {stats.streak > 1 && <p className="small muted" style={{ margin: '6px 0 0' }}>{stats.streak} أيام متتالية من النشاط</p>}
      </section>
    ),
    dedication: <DedicationCard />,
    shortcuts: (
      <Link to="/more" className="list-card">
        <span className="icon-chip green"><LayoutGrid size={22} /></span>
        <span className="lc-body"><strong>كل الأقسام</strong><small>الحفظ، الاستماع، التفسير، التقويم، الإعدادات والمزيد</small></span>
        <span className="lc-end"><ChevronLeft size={18} /></span>
      </Link>
    ),
  }

  // «رفيقي اليومي» من مزايا بلس: لا خانة فارغة ولا قفل في الرئيسية دون اشتراك
  const visible = settings.homeCards.filter((c) => c.visible && (c.id !== 'companion' || plusEntitled))
  const move = (i: number, d: -1 | 1) => {
    const list = [...settings.homeCards]
    const j = i + d
    if (j < 0 || j >= list.length) return
    ;[list[i], list[j]] = [list[j], list[i]]
    update({ homeCards: list })
  }
  const toggleLink = (to: string, on: boolean) => {
    const cur = settings.quickLinks
    if (on && cur.length >= MAX_QUICK_LINKS) return
    update({ quickLinks: on ? [...cur, to] : cur.filter((x) => x !== to) })
  }
  const five = PRAYERS.filter((p) => p !== 'sunrise')

  return (
    <div className="home">
      <header className="home-hero">
        <PaintedScene tone={toneFor(np?.name)} variant="hero" className="home-hero-art" />
        <div className="home-hero-row">
          <Link to="/reminders" className="hero-icon" aria-label="إعدادات التذكير"><Bell size={20} /></Link>
          <span className="hero-avatar" aria-hidden="true">{settings.displayName.trim() ? settings.displayName.trim()[0] : <LogoMark size={24} />}</span>
          <div className="home-hero-text">
            <div className="hero-greet">{settings.displayName.trim() ? `السلام عليكم، ${settings.displayName.trim()}` : greeting(hour, today)}</div>
            {settings.displayName.trim() && <div className="hero-sub">{greeting(hour, today)}</div>}
            <div className="hero-sub">{formatGregorian(now, loc?.tz)}</div>
            <div className="hero-hijri">{formatHijri(now, loc?.tz, settings.hijriOffset)}</div>
            <WeatherChip />
          </div>
          <Link to="/about" className="hero-icon" aria-label="رسالة الوفاء"><Heart size={20} /></Link>
        </div>
      </header>

      <section className="next-card" aria-label="الصلاة القادمة">
        {np && loc && times ? (
          <>
            <Link to="/prayer" className="next-main">
              <div className="next-art"><PaintedScene tone={toneFor(np.name)} variant="card" /></div>
              <div className="next-info" aria-live="polite">
                <div className="next-label">الصلاة القادمة</div>
                <div className="next-name">{PRAYER_LABELS[np.name]}</div>
                <div className="next-time">{formatTime(np.time, loc.tz)}</div>
                <div className="next-left">باقي على الأذان <b>{humanLeft(np.time.getTime() - now.getTime())}</b></div>
                <div className="next-count" aria-label="الوقت المتبقي">{formatCountdown(np.time.getTime() - now.getTime())}</div>
              </div>
            </Link>
            <Link to="/prayer" className="next-city"><MapPin size={14} /> {cityLabel(loc)}</Link>
            <div className="prayer-pills">
              {five.map((p) => (
                <div key={p} className={'pill' + (np.name === p ? ' active' : '')}>
                  {(() => { const Icon = PRAYER_ICONS[p]; return <Icon size={17} aria-hidden="true" /> })()}
                  <span>{PRAYER_LABELS[p]}</span>
                  <b>{formatTime(times[p], loc.tz)}</b>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="next-empty">
            <div className="next-art"><PaintedScene tone="sunset" variant="card" /></div>
            <div>
              <strong>مواقيت الصلاة</strong>
              <p className="small muted" style={{ margin: '0.2rem 0 0.6rem' }}>اختر مدينتك أو استخدم موقعك لعرض المواقيت والعدّ التنازلي.</p>
              <Link className="btn btn-primary btn-sm" to="/prayer">اختر مدينتك لعرض مواقيت الصلاة</Link>
            </div>
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
        <label className="field" style={{ marginTop: '1rem' }}><span>اسمك للتحية (اختياري، يبقى على جهازك)</span>
          <input className="input" value={settings.displayName} maxLength={30} onChange={(e) => update({ displayName: e.target.value })} placeholder="مثال: محمد" />
        </label>
        <h3 style={{ marginTop: '1rem' }}>أذكاري اليومية في الرئيسية</h3>
        <p className="small muted">اختر حتى {MAX_DAILY_ADHKAR} من أقسام الأذكار الثابتة.</p>
        <div className="quick-choices">
          {ADHKAR.map((c) => {
            const on = settings.dailyAdhkar.includes(c.id)
            return (
              <label key={c.id} className="check">
                <input type="checkbox" checked={on} disabled={(!on && settings.dailyAdhkar.length >= MAX_DAILY_ADHKAR) || (on && settings.dailyAdhkar.length === 1)}
                  onChange={(e) => update({ dailyAdhkar: e.target.checked ? [...settings.dailyAdhkar, c.id] : settings.dailyAdhkar.filter((x) => x !== c.id) })} aria-label={`ذكر يومي: ${c.title}`} />
                {c.title}
              </label>
            )
          })}
        </div>
        <h3 style={{ marginTop: '1rem' }}>اختصارات الوصول السريع</h3>
        <p className="small muted">اختر حتى {MAX_QUICK_LINKS} أقسام تستخدمها كثيرًا.</p>
        <div className="quick-choices">
          {QUICK_LINK_CHOICES.map((to) => {
            const on = settings.quickLinks.includes(to)
            return (
              <label key={to} className="check">
                <input type="checkbox" checked={on} disabled={!on && settings.quickLinks.length >= MAX_QUICK_LINKS} onChange={(e) => toggleLink(to, e.target.checked)} aria-label={`اختصار ${LINK_META[to].label}`} />
                {LINK_META[to].label}
              </label>
            )
          })}
        </div>
      </Sheet>
      <ShareCardDialog open={shareAyah} onClose={() => setShareAyah(false)} input={shareAyah ? cardInput : null} />
    </div>
  )
}
