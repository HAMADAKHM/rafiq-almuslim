import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { CircleCheck, Star, AArrowDown, AArrowUp } from 'lucide-react'
import { Empty, PageHead } from '../../components/Common'
import { DhikrCard } from '../../components/DhikrCard'
import { ADHKAR } from '../../content/adhkar'
import { DUAS } from '../../content/duas'
import { adhkarLog, favorites, kv } from '../../db/repos'
import { useSettings } from '../../state/SettingsContext'
import { toast, useLive } from '../../hooks'
import { dayKey } from '../../lib/dates'
import { searchSkeleton } from '../../lib/arabic'
import type { ContentCategory } from '../../content/types'
import type { Favorite, AdhkarLog } from '../../db/db'

const SOURCE_NOTE = 'الأذكار مختارة مما ثبت في السنة كما جمعه كتاب «حصن المسلم»، مع التخريج. الأعداد لا تُذكر إلا حيث وردت في النص.'

function useFavs(kind: Favorite['kind']) {
  const all = useLive(() => favorites.all(), ['favorites'], [] as Favorite[])
  return useMemo(() => new Set(all.filter((f) => f.kind === kind).map((f) => f.itemId)), [all, kind])
}

function CategoryGrid({ cats, base, doneToday }: { cats: ContentCategory[]; base: string; doneToday?: Set<string> }) {
  return (
    <div className="grid grid-3">
      {cats.map((c) => (
        <Link key={c.id} to={`${base}/${c.id}`} className="card card-link">
          <div className="spread">
            <h2 style={{ margin: 0 }}>{c.title}</h2>
            {doneToday?.has(c.id) && <CircleCheck size={20} color="var(--success)" aria-label="أُتمّت اليوم" />}
          </div>
          <p className="muted small" style={{ margin: 0 }}>{c.items.length} عنصرًا</p>
        </Link>
      ))}
    </div>
  )
}

export function ContentLibrary({ kind }: { kind: 'adhkar' | 'duas' }) {
  const { category } = useParams()
  const cats = kind === 'adhkar' ? ADHKAR : DUAS
  const base = '/' + kind
  const favKind = kind === 'adhkar' ? 'dhikr' : 'dua'
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
  const title = kind === 'adhkar' ? 'الأذكار' : 'الأدعية'
  const cat = cats.find((c) => c.id === category)

  const items = useMemo(() => {
    const pool = cat ? cat.items : cats.flatMap((c) => c.items)
    const sk = searchSkeleton(q)
    return pool.filter((it) => (!onlyFav || favs.has(it.id)) && (!sk || searchSkeleton((it.text ?? '') + ' ' + it.source + ' ' + (it.note ?? '')).includes(sk)))
  }, [cat, cats, q, onlyFav, favs])

  const showList = !!cat || !!q || onlyFav

  return (
    <>
      <PageHead title={cat ? cat.title : title} subtitle={cat ? <Link to={base}>← كل التصنيفات</Link> : SOURCE_NOTE} />
      <div className="row" style={{ marginBottom: '1rem' }}>
        <input className="input" style={{ maxWidth: 380 }} value={q} onChange={(e) => setQ(e.target.value)} placeholder={`ابحث في ${title}…`} aria-label={`بحث في ${title}`} />
        <button className="btn" aria-pressed={onlyFav} onClick={() => setOnlyFav((f) => !f)}><Star size={16} fill={onlyFav ? 'var(--gold)' : 'none'} /> المفضلة</button>
        <button className="btn icon-btn" aria-label="تصغير النص" onClick={() => update({ adhkarFontScale: Math.max(0.8, +(scale - 0.1).toFixed(2)) })}><AArrowDown size={18} /></button>
        <button className="btn icon-btn" aria-label="تكبير النص" onClick={() => update({ adhkarFontScale: Math.min(1.8, +(scale + 0.1).toFixed(2)) })}><AArrowUp size={18} /></button>
      </div>
      {!showList && <CategoryGrid cats={cats} base={base} doneToday={kind === 'adhkar' ? doneToday : undefined} />}
      {showList && (
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
