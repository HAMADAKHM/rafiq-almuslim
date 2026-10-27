import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, NavLink, useParams } from 'react-router-dom'
import {
  CircleCheck, Star, Plus, AArrowDown, AArrowUp, ChevronLeft, Sun, Moon, Landmark, BedDouble, Sunrise, DoorOpen, Utensils, Plane,
  Droplets, Sparkles, Heart, BookOpen, HandHeart, Users, Coins, CloudSun, ShieldPlus, RefreshCcw, HeartPulse, Route, MessageCircleHeart,
} from 'lucide-react'
import { Empty, PageHead, Tabs } from '../../components/Common'
import { AdhkarSession } from './AdhkarSession'
import { DhikrCard } from '../../components/DhikrCard'
import { ADHKAR } from '../../content/adhkar'
import { DUAS } from '../../content/duas'
import { HADITH } from '../../content/hadith'
import { adhkarLog, favorites, kv } from '../../db/repos'
import { useSettings } from '../../state/SettingsContext'
import { toast, useLive } from '../../hooks'
import { dayKey } from '../../lib/dates'
import { searchSkeleton } from '../../lib/arabic'
import type { ContentCategory } from '../../content/types'
import type { Favorite, AdhkarLog } from '../../db/db'
import { PaintedScene } from '../../components/Scene'
import { adhkarForNow } from '../../services/daily'
import { loadTasbih, todayTotal } from '../../services/tasbih'
import { daysBetween } from '../../lib/dates'

/** بطاقة الأذكار الحالية بلوحة، وبطاقة المسبحة (أعلى مكتبة الأذكار) */
function AdhkarFeature({ doneToday }: { doneToday: Set<string> }) {
  const { settings } = useSettings()
  const hour = Number(new Intl.DateTimeFormat('en-GB', { timeZone: settings.location?.tz, hour: '2-digit', hour12: false }).format(new Date())) % 24
  const now = adhkarForNow(hour)
  const today = dayKey(new Date(), settings.location?.tz)
  const tasbih = useLive(() => loadTasbih(), ['kv:tasbih'], null)
  const tone = now.id === 'morning' ? 'dawn' : now.id === 'evening' ? 'sunset' : 'night'
  return (
    <>
      <Link to={`/adhkar/${now.id}`} className="feature-card" aria-label={`${now.title}: قراءة الأذكار`}>
        <PaintedScene tone={tone} variant="hero" className="feature-art" />
        <h2>{now.title}</h2>
        <p>{doneToday.has(now.id) ? 'أتممتها اليوم، تقبّل الله منك' : now.id === 'morning' ? 'ابدأ يومك بذكر الله' : now.id === 'evening' ? 'اختم نهارك بذكر الله' : 'نم على ذكر الله'}</p>
        <span className="btn btn-sm">قراءة الأذكار</span>
      </Link>
      <Link to="/tasbih" className="tasbih-mini" aria-label="المسبحة">
        <span className="tm-ring">{tasbih ? todayTotal(tasbih, today) : 0}</span>
        <span><strong>المسبحة</strong><small>تسبيحات اليوم • اضغط للتسبيح</small></span>
      </Link>
    </>
  )
}

/** حديث اليوم: من مكتبة الصحيحين، يتغير كل يوم */
function HadithFeature() {
  const all = HADITH.flatMap((c) => c.items)
  const h = all[Math.max(0, daysBetween('2026-01-01', dayKey())) % all.length]
  return (
    <section className="hadith-feature" aria-label="حديث اليوم">
      <div className="hf-kicker">حديث اليوم</div>
      <p className="hf-text">«{h.text}»</p>
      <div className="hf-src">{h.source}{h.note ? ` — ${h.note}` : ''}</div>
    </section>
  )
}

const SOURCE_NOTE = 'الأذكار مختارة مما ثبت في السنة كما جمعه كتاب «حصن المسلم»، مع التخريج. الأعداد لا تُذكر إلا حيث وردت في النص. زر 🔊 يشغّل التسجيل الصوتي من مشروع حصن المسلم (hisnmuslim.com) بإذنه، للأذكار التي يطابق نصها التسجيل.'
const HADITH_NOTE = 'مختارات من الصحيحين (البخاري ومسلم) مع رقم الحديث للتحقق. ما كان جزءًا من حديث أطول مذكور في ملاحظته.'

function useFavs(kind: Favorite['kind']) {
  const all = useLive(() => favorites.all(), ['favorites'], [] as Favorite[])
  return useMemo(() => new Set(all.filter((f) => f.kind === kind).map((f) => f.itemId)), [all, kind])
}

const CAT_ICONS: Record<string, typeof Sun> = {
  morning: Sun, evening: Moon, 'after-prayer': Landmark, sleep: BedDouble, waking: Sunrise, home: DoorOpen, food: Utensils,
  travel: Plane, mosque: Droplets, misc: Sparkles, salawat: Heart,
  quranic: BookOpen, sunnah: HandHeart, parents: Users, rizq: Coins, relief: CloudSun, distress: MessageCircleHeart,
  istighfar: RefreshCcw, healing: ShieldPlus, 'travel-dua': Route, general: HeartPulse,
  jawami: BookOpen, salah: Landmark, akhlaq: Heart, ibadat: Sparkles, muamalat: Coins,
}

export function catIcon(id: string) { return CAT_ICONS[id] ?? Sparkles }

/** تبويبات المكتبة: الأذكار والأدعية والأذكار الشخصية */
export function LibraryTabs() {
  return (
    <nav className="lib-tabs" aria-label="أقسام المكتبة">
      <NavLink to="/adhkar" className={({ isActive }) => (isActive ? 'active' : '')}>الأذكار</NavLink>
      <NavLink to="/duas" className={({ isActive }) => (isActive ? 'active' : '')}>الأدعية</NavLink>
      <NavLink to="/hadith" className={({ isActive }) => (isActive ? 'active' : '')}>الأحاديث</NavLink>
      <NavLink to="/my-adhkar" className={({ isActive }) => (isActive ? 'active' : '')}>أذكاري</NavLink>
      <NavLink to="/tasbih" className={({ isActive }) => (isActive ? 'active' : '')}>المسبحة</NavLink>
    </nav>
  )
}

function CategoryGrid({ cats, base, doneToday }: { cats: ContentCategory[]; base: string; doneToday?: Set<string> }) {
  const { settings, update } = useSettings()
  const [manage, setManage] = useState(false)
  const hidden = new Set(settings.hiddenCats ?? [])
  const hiddenHere = cats.filter((c) => hidden.has(c.id)).length
  const toggle = (id: string, show: boolean) => update({ hiddenCats: show ? [...hidden].filter((x) => x !== id) : [...hidden, id] })
  return (
    <div className="list-stack cat-list">
      <div className="row" style={{ justifyContent: 'flex-end' }}>
        <button className="btn btn-ghost btn-sm" aria-pressed={manage} onClick={() => setManage(!manage)}>
          {manage ? 'تم' : hiddenHere ? `إدارة الأقسام (${hiddenHere} مخفية)` : 'إخفاء أقسام'}
        </button>
      </div>
      {manage && <p className="small muted" style={{ margin: 0 }}>أزل علامة القسم لإخفائه من القائمة. يبقى متاحًا في البحث، ويمكن إظهاره في أي وقت.</p>}
      {cats.filter((c) => manage || !hidden.has(c.id)).map((c) => {
        const Icon = catIcon(c.id)
        if (manage) return (
          <label key={c.id} className="list-card check">
            <input type="checkbox" className="switch-input" checked={!hidden.has(c.id)} onChange={(e) => toggle(c.id, e.target.checked)} aria-label={`إظهار ${c.title}`} />
            <span className="icon-chip"><Icon size={22} aria-hidden="true" /></span>
            <span className="lc-body"><strong>{c.title}</strong></span>
          </label>
        )
        return (
          <Link key={c.id} to={`${base}/${c.id}`} className="list-card">
            <span className="icon-chip"><Icon size={22} aria-hidden="true" /></span>
            <span className="lc-body"><strong>{c.title}</strong><small>{c.items.length} {base === '/hadith' ? (c.items.length > 10 ? 'حديثًا' : 'أحاديث') : c.items.length > 10 ? 'ذكرًا' : 'أذكار'}</small></span>
            <span className="lc-end">
              {doneToday?.has(c.id) && <CircleCheck size={20} color="var(--success)" aria-label="أُتمّت اليوم" />}
              <ChevronLeft size={18} aria-hidden="true" />
            </span>
          </Link>
        )
      })}
    </div>
  )
}

export function ContentLibrary({ kind }: { kind: 'adhkar' | 'duas' | 'hadith' }) {
  const { category } = useParams()
  const cats = kind === 'adhkar' ? ADHKAR : kind === 'hadith' ? HADITH : DUAS
  const base = '/' + kind
  const favKind = kind === 'adhkar' ? 'dhikr' : kind === 'hadith' ? 'hadith' : 'dua'
  const favs = useFavs(favKind)
  const today = dayKey()
  const logs = useLive(() => adhkarLog.forDay(today), ['adhkarLog'], [] as AdhkarLog[], [today])
  const doneToday = useMemo(() => new Set(logs.map((l) => l.category)), [logs])
  const { settings, update } = useSettings()
  const progressKey = `adhkar:progress:${today}`
  const saved = useLive(() => kv.get<Record<string, number>>(progressKey, {}), ['kv:' + progressKey], {} as Record<string, number>, [progressKey])
  const [counts, setCounts] = useState<Record<string, number>>({})
  useEffect(() => setCounts(saved), [saved])
  const setCount = (id: string, n: number) => setCounts((prev) => {
    const next = { ...prev, [id]: n }
    kv.set(progressKey, next).catch(() => {})
    return next
  })
  const scale = settings.adhkarFontScale
  const [q, setQ] = useState('')
  const [onlyFav, setOnlyFav] = useState(false)
  const title = kind === 'adhkar' ? 'الأذكار' : kind === 'hadith' ? 'الأحاديث النبوية' : 'الأدعية'
  const cat = cats.find((c) => c.id === category)
  const view = settings.adhkarView
  const autoLog = useCallback(async () => {
    if (!cat || kind !== 'adhkar' || doneToday.has(cat.id)) return
    await adhkarLog.complete(today, cat.id)
    toast(`أتممت ${cat.title} — سُجّل الإتمام، تقبّل الله`)
  }, [cat, kind, doneToday, today])

  const items = useMemo(() => {
    const pool = cat ? cat.items : cats.flatMap((c) => c.items)
    const sk = searchSkeleton(q)
    return pool.filter((it) => (!onlyFav || favs.has(it.id)) && (!sk || searchSkeleton((it.text ?? '') + ' ' + it.source + ' ' + (it.note ?? '')).includes(sk)))
  }, [cat, cats, q, onlyFav, favs])

  const showList = !!cat || !!q || onlyFav
  const sessionMode = !!cat && !q && !onlyFav && view === 'session' && kind !== 'hadith'

  return (
    <>
      <PageHead title={cat ? cat.title : title} subtitle={cat ? <Link to={base}>← كل التصنيفات</Link> : kind === 'hadith' ? HADITH_NOTE : SOURCE_NOTE} />
      {!cat && <LibraryTabs />}
      {cat && kind !== 'hadith' && (
        <Tabs label="طريقة العرض" value={view} onChange={(v) => update({ adhkarView: v })} items={[{ id: 'session', label: 'جلسة: ذكر تلو الآخر' }, { id: 'list', label: 'قائمة' }]} />
      )}
      {!sessionMode && (
      <div className="row" style={{ marginBottom: '1rem' }}>
          <input className="input" style={{ maxWidth: 380 }} value={q} onChange={(e) => setQ(e.target.value)} placeholder={`ابحث في ${title}…`} aria-label={`بحث في ${title}`} />
          <button className="btn" aria-pressed={onlyFav} onClick={() => setOnlyFav((f) => !f)}><Star size={16} fill={onlyFav ? 'var(--gold)' : 'none'} /> المفضلة</button>
          <button className="btn icon-btn" aria-label="تصغير النص" onClick={() => update({ adhkarFontScale: Math.max(0.8, +(scale - 0.1).toFixed(2)) })}><AArrowDown size={18} /></button>
          <button className="btn icon-btn" aria-label="تكبير النص" onClick={() => update({ adhkarFontScale: Math.min(1.8, +(scale + 0.1).toFixed(2)) })}><AArrowUp size={18} /></button>
        </div>
      )}
      {!showList && kind === 'adhkar' && <AdhkarFeature doneToday={doneToday} />}
      {!showList && kind === 'adhkar' && (
        <Link to="/my-adhkar?new=1" className="list-card add-dhikr" style={{ marginBottom: '1rem' }}>
          <span className="icon-chip green"><Plus size={22} /></span>
          <span className="lc-body"><strong>إضافة ذكر</strong><small>أضف ذكرًا أو دعاءً خاصًا بك مع عدّاد، يظهر في «أذكاري»</small></span>
          <span className="lc-end"><ChevronLeft size={18} /></span>
        </Link>
      )}
      {!showList && kind === 'hadith' && <HadithFeature />}
      {!showList && <CategoryGrid cats={cats} base={base} doneToday={kind === 'adhkar' ? doneToday : undefined} />}
      {!showList && kind === 'adhkar' && (
        <section style={{ marginTop: '1.25rem' }}>
          <h2 className="section-title">أقسام ذات صلة</h2>
          <div className="list-stack">
            <Link to="/duas/healing" className="list-card"><span className="icon-chip green"><ShieldPlus size={22} /></span><span className="lc-body"><strong>الرقية الشرعية</strong><small>أدعية الشفاء والرقية الثابتة</small></span><span className="lc-end"><ChevronLeft size={18} /></span></Link>
            <Link to="/duas" className="list-card"><span className="icon-chip green"><HandHeart size={22} /></span><span className="lc-body"><strong>الأدعية المأثورة</strong><small>من القرآن والسنة، مصنفة حسب المناسبة</small></span><span className="lc-end"><ChevronLeft size={18} /></span></Link>
          </div>
        </section>
      )}
      {sessionMode && cat && (
        <>
          {cat.intro && <p className="alert alert-info small">{cat.intro}</p>}
          <AdhkarSession key={cat.id} items={cat.items} counts={counts} onCount={setCount} favs={favs} favKind={favKind}
            onAllDone={kind === 'adhkar' ? autoLog : undefined} doneLabel={`أتممت ${cat.title}`} />
        </>
      )}
      {showList && !sessionMode && (
        <div className="stack" style={{ ['--adhkar-scale' as string]: scale }}>
          {cat?.intro && <p className="alert alert-info">{cat.intro}</p>}
          {items.map((it, i) => (
            <DhikrCard key={it.id} item={it} fav={favs.has(it.id)} favKind={favKind} withCounter={kind === 'adhkar'}
              count={counts[it.id] ?? 0} onCount={(n) => setCount(it.id, n)}
              onNext={i < items.length - 1 ? () => document.getElementById(`dhikr-${items[i + 1].id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }) : undefined} />
          ))}
          {items.length === 0 && <Empty>لا توجد نتائج.</Empty>}
          {cat && kind === 'adhkar' && (
            <div className="card spread">
              <span>{doneToday.has(cat.id) ? 'سجّلت إتمام هذه الأذكار اليوم. تقبّل الله.' : 'هل أتممت هذه الأذكار؟ التسجيل اختياري لمتابعة تقدمك.'}</span>
              <button className="btn btn-primary" onClick={async () => { await adhkarLog.complete(today, cat.id); toast('سُجّل الإتمام — تقبّل الله') }}>
                <CircleCheck size={16} /> {doneToday.has(cat.id) ? 'تسجيل مرة أخرى' : 'تسجيل الإتمام'}
              </button>
            </div>
          )}
        </div>
      )}
    </>
  )
}
