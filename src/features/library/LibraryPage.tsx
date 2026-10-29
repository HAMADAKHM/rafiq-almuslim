// «مكتبة المسلم»: مدخل واحد للمحتوى الموثق الموجود في التطبيق، و«المفضلة» الموحدة (علامات القرآن والآيات والأذكار والأدعية والأحاديث).
// الأقسام التي لم يُعدّ محتواها بعد (السيرة، الأسماء الحسنى، المقالات) تظهر بوضوح «قيد الإعداد» دون رابط،
// ولا تُضاف إلا من مصادر موثقة ومراجَعة.
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { BookMarked, BookOpen, CalendarDays, ChevronLeft, GraduationCap, HandHeart, Heart, ScrollText, Search, Sparkles, Star, X, Clock3 } from 'lucide-react'
import { PageHead, Spinner } from '../../components/Common'
import { useLive, useQuran } from '../../hooks'
import { bookmarks, favorites } from '../../db/repos'
import type { Bookmark, Favorite } from '../../db/db'
import { ADHKAR } from '../../content/adhkar'
import { DUAS } from '../../content/duas'
import { HADITH } from '../../content/hadith'
import type { ContentCategory } from '../../content/types'
import { searchSkeleton } from '../../lib/arabic'

const SECTIONS = [
  { to: '/hadith', icon: ScrollText, title: 'الأحاديث النبوية', hint: 'أحاديث من الصحيحين وكتب السنة مع تخريجها', color: '#3b82f6' },
  { to: '/stories', icon: BookOpen, title: 'قصص القرآن والأنبياء', hint: 'القصص كما وردت في الآيات، مع التفسير الميسر', color: '#22a861' },
  { to: '/duas', icon: HandHeart, title: 'الأدعية المصنفة', hint: 'أدعية من القرآن والسنة بحسب الموضوع', color: '#ec4899' },
  { to: '/adhkar', icon: Sparkles, title: 'الأذكار', hint: 'الصباح والمساء والنوم والصلاة والمنزل', color: '#f59e0b' },
  { to: '/calendar', icon: CalendarDays, title: 'التقويم والمناسبات', hint: 'التقويم الهجري والمناسبات الإسلامية', color: '#8b5cf6' },
  { to: '/learn', icon: GraduationCap, title: 'التفسير والتعلّم', hint: 'التفسير الميسر ودروس قصيرة', color: '#14a3b8' },
  { to: '/favorites', icon: Heart, title: 'المحفوظ للقراءة لاحقًا', hint: 'المفضلة وعلامات القرآن', color: '#ef5350' },
]
const SOON = [
  { title: 'السيرة النبوية', hint: 'قيد الإعداد من مصادر موثقة' },
  { title: 'أسماء الله الحسنى', hint: 'قيد الإعداد مع الأدلة من القرآن والسنة' },
  { title: 'مقالات إسلامية', hint: 'قيد الإعداد بعد المراجعة' },
]

export function LibraryPage() {
  const [q, setQ] = useState('')
  const k = searchSkeleton(q.trim())
  const list = SECTIONS.filter((s) => !k || searchSkeleton(`${s.title} ${s.hint}`).includes(k))
  return (
    <>
      <PageHead title="مكتبة المسلم" subtitle="المحتوى الموثق في مكان واحد — كل مادة بمصدرها" />
      <div className="stack more-page" style={{ gap: '1rem' }}>
        <label className="more-search">
          <Search size={18} aria-hidden="true" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث في المكتبة" aria-label="ابحث في المكتبة" />
          {q && <button className="icon-btn" onClick={() => setQ('')} aria-label="مسح"><X size={16} /></button>}
        </label>
        <div className="more-list">
          {list.map(({ to, icon: Icon, title, hint, color }) => (
            <Link key={to} to={to} className="more-row">
              <span className="mr-icon" style={{ background: color }}><Icon size={20} aria-hidden="true" /></span>
              <span className="mr-body"><span className="mr-title">{title}</span><small>{hint}</small></span>
              <ChevronLeft size={18} className="mr-chev" aria-hidden="true" />
            </Link>
          ))}
          {!list.length && <p className="muted" style={{ textAlign: 'center' }}>لا يوجد قسم بهذا الاسم.</p>}
        </div>
        {!q && (
          <section aria-label="أقسام قيد الإعداد">
            <h2 className="more-group-title">قيد الإعداد</h2>
            <div className="more-list">
              {SOON.map((s) => (
                <div key={s.title} className="more-row soon" aria-disabled="true">
                  <span className="mr-icon" style={{ background: '#9aa3a0' }}><Clock3 size={20} aria-hidden="true" /></span>
                  <span className="mr-body"><span className="mr-title">{s.title}</span><small>{s.hint}</small></span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  )
}

function findItem(cats: ContentCategory[], id: string) {
  for (const c of cats) { const it = c.items.find((i) => i.id === id); if (it) return { cat: c, item: it } }
  return null
}

/** المفضلة الموحدة: كل ما حفظه المستخدم من الأقسام */
export function FavoritesPage() {
  const { data } = useQuran()
  const marks = useLive(() => bookmarks.all(), ['bookmarks'], [] as Bookmark[])
  const favs = useLive(() => favorites.all(), ['favorites'], [] as Favorite[])
  const groups = useMemo(() => {
    const by = (k: Favorite['kind']) => favs.filter((f) => f.kind === k).sort((a, b) => b.createdAt - a.createdAt)
    const content = (k: 'dhikr' | 'dua' | 'hadith', cats: ContentCategory[], base: string) => by(k).map((f) => ({ f, hit: findItem(cats, f.itemId), base })).filter((x) => x.hit)
    return { ayahs: by('ayah'), adhkar: content('dhikr', ADHKAR, '/adhkar'), duas: content('dua', DUAS, '/duas'), hadith: content('hadith', HADITH, '/hadith') }
  }, [favs])
  const empty = !marks.length && !favs.length
  return (
    <>
      <PageHead title="المفضلة والعلامات" subtitle="ما حفظته من القرآن والأذكار والأدعية والأحاديث — على جهازك" />
      {empty ? (
        <div className="card" style={{ textAlign: 'center' }}>
          <Star size={28} aria-hidden="true" />
          <p>لم تحفظ شيئًا بعد.</p>
          <p className="small muted">اضغط على أي آية لإضافة علامة أو حفظها، أو على النجمة بجانب أي ذكر أو دعاء أو حديث.</p>
          <Link className="btn btn-primary btn-sm" to="/quran">افتح القرآن</Link>
        </div>
      ) : (
        <div className="stack" style={{ gap: '1rem' }}>
          {!!marks.length && (
            <section className="card" aria-label="علامات القرآن">
              <h2><BookMarked size={18} /> علامات القرآن</h2>
              {!data ? <Spinner /> : (
                <ul className="fav-list">
                  {marks.map((m) => (
                    <li key={m.id}><Link to={`/quran/${m.surah}?ayah=${m.ayah}`}><b>{m.label || `سورة ${data.meta.surahs[m.surah - 1].name}`}</b><small>سورة {data.meta.surahs[m.surah - 1].name} — الآية {m.ayah}</small></Link></li>
                  ))}
                </ul>
              )}
            </section>
          )}
          {!!groups.ayahs.length && (
            <section className="card" aria-label="آيات مفضلة">
              <h2><Heart size={18} /> آيات مفضلة</h2>
              {!data ? <Spinner /> : (
                <ul className="fav-list">
                  {groups.ayahs.map((f) => {
                    const [s, a] = f.itemId.split(':').map(Number)
                    if (!data.verses[s - 1]?.[a - 1]) return null
                    return <li key={f.id}><Link to={`/quran/${s}?ayah=${a}`}><span className="quran-text fav-ayah">{data.verses[s - 1][a - 1]}</span><small>سورة {data.meta.surahs[s - 1].name}: {a}</small></Link></li>
                  })}
                </ul>
              )}
            </section>
          )}
          {([['أذكار مفضلة', groups.adhkar], ['أدعية مفضلة', groups.duas], ['أحاديث مفضلة', groups.hadith]] as const).map(([title, items]) => !!items.length && (
            <section key={title} className="card" aria-label={title}>
              <h2><Sparkles size={18} /> {title}</h2>
              <ul className="fav-list">
                {items.map(({ f, hit, base }) => (
                  <li key={f.id}><Link to={`${base}/${hit!.cat.id}`}><span className="fav-text">{hit!.item.text ?? hit!.cat.title}</span><small>{hit!.cat.title} — {hit!.item.source}</small></Link></li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </>
  )
}
