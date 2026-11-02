// مكتبة الأحاديث النبوية: الكتب السبعة بنصوصها الكاملة، والتصفح بالكتاب والباب، والبحث، وتفاصيل الحديث.
// كل ما يظهر من القاعدة كما هو؛ وما لا تحويه القاعدة (الشرح والفوائد والباب التفصيلي) يظهر «غير متوفر» صراحة.
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { BookOpen, ChevronLeft, ChevronRight, Copy, Download, Heart, Library, Minus, Moon, Plus, Search, Share2, Star, Trash2, WifiOff } from 'lucide-react'
import { PageHead, Spinner } from '../../components/Common'
import { toast, useLive } from '../../hooks'
import { copyText, shareText } from '../../platform'
import { HADITH } from '../../content/hadith'
import { toArabicDigits } from '../../lib/arabic'
import {
  BOOKS, UNAVAILABLE_BOOKS, COMPANIONS, TOPICS, SOURCE_NOTE, bookIndex, bookInfo, downloadBook, downloadedSections, getHadith, loadFavs, loadReadPrefs,
  loadSection, relatedHadith, removeBook, saveReadPrefs, searchHadith, searchTopics, sectionFor, sectionTitle, shareTextFor, splitIsnad, takhrijFromGrades, toggleFav,
  type BookId, type Hadith, type ReadPrefs, type SearchHit, type SearchMode,
} from '../../services/hadithLib'
import { LEVEL_LABEL } from '../../services/hadithGrades'

const n2 = (n: number) => toArabicDigits(n)
const PAGE = 25

function useReadPrefs(): [ReadPrefs, (p: Partial<ReadPrefs>) => void] {
  const [p, setP] = useState<ReadPrefs>({ size: 1.25, night: false })
  useEffect(() => { loadReadPrefs().then(setP).catch(() => {}) }, [])
  const set = (x: Partial<ReadPrefs>) => setP((cur) => { const next = { ...cur, ...x }; saveReadPrefs(next).catch(() => {}); return next })
  return [p, set]
}

function ReadBar({ p, set }: { p: ReadPrefs; set: (x: Partial<ReadPrefs>) => void }) {
  return (
    <div className="hd-readbar" role="group" aria-label="إعدادات القراءة">
      <button className="btn btn-sm icon-btn" aria-label="تصغير الخط" onClick={() => set({ size: Math.max(0.95, +(p.size - 0.1).toFixed(2)) })}><Minus size={16} /></button>
      <span className="small">الخط</span>
      <button className="btn btn-sm icon-btn" aria-label="تكبير الخط" onClick={() => set({ size: Math.min(2.2, +(p.size + 0.1).toFixed(2)) })}><Plus size={16} /></button>
      <button className={'btn btn-sm' + (p.night ? ' btn-primary' : '')} aria-pressed={p.night} onClick={() => set({ night: !p.night })}><Moon size={14} /> القراءة الليلية</button>
    </div>
  )
}

/** حالة التنزيل والعمل دون إنترنت لكتاب */
function useHave() {
  return useLive(() => downloadedSections(), ['kv:hadith:have'], {} as Record<string, number[]>)
}

// ---------- الصفحة الرئيسية للمكتبة ----------
export function HadithHome() {
  const nav = useNavigate()
  const [q, setQ] = useState('')
  const have = useHave()
  const favs = useLive(() => loadFavs(), ['kv:hadith:favs'], [])
  return (
    <div className="page hd-page">
      <PageHead title="الأحاديث النبوية" subtitle="الكتب السبعة بنصوصها الكاملة وأسانيدها، مع أحكام العلماء منسوبة إليهم" />
      <form className="card hd-search-box" onSubmit={(e) => { e.preventDefault(); if (q.trim()) nav(`/hadith/search?q=${encodeURIComponent(q.trim())}`) }}>
        <Search size={18} />
        <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث بكلمة أو عبارة أو اسم راوٍ…" aria-label="البحث في الأحاديث" />
        <button className="btn btn-primary btn-sm" type="submit">بحث</button>
      </form>
      <section aria-labelledby="hd-books">
        <h2 id="hd-books" className="hd-h2">كتب الحديث</h2>
        <div className="hd-books">
          {BOOKS.map((b) => {
            const idx = bookIndex(b.id)!
            const got = (have[b.id] ?? []).length
            return (
              <Link key={b.id} to={`/hadith/book/${b.id}`} className="hd-book card">
                <span className="hd-book-icon"><BookOpen size={22} /></span>
                <strong>{b.name}</strong>
                <small>{b.author} (ت {n2(b.died)}هـ)</small>
                <small className="muted">{n2(idx.total)} حديثًا • {n2(idx.sections.length)} كتابًا</small>
                {got > 0 && <span className="hd-badge">{got >= idx.sections.length ? 'محفوظ دون إنترنت' : `محفوظ جزئيًا (${n2(got)})`}</span>}
              </Link>
            )
          })}
          {UNAVAILABLE_BOOKS.map((b) => (
            <div key={b.name} className="hd-book card unavailable" aria-disabled="true">
              <span className="hd-book-icon"><BookOpen size={22} /></span>
              <strong>{b.name}</strong>
              <small>{b.author} (ت {n2(b.died)}هـ)</small>
              <small className="muted">{b.reason}</small>
            </div>
          ))}
        </div>
      </section>
      <section className="card" aria-labelledby="hd-topics">
        <h2 id="hd-topics" className="hd-h2" style={{ marginTop: 0 }}>تصفح حسب الموضوع</h2>
        <div className="chips">{TOPICS.map((t) => <Link key={t} className="chip" to={`/hadith/search?topic=${encodeURIComponent(t)}`}>{t}</Link>)}</div>
      </section>
      <div className="hd-links">
        <Link className="list-card" to="/hadith/favorites"><span className="icon-chip"><Heart size={18} /></span><span className="lc-body"><strong>الأحاديث المحفوظة</strong><small>{favs.length ? `${n2(favs.length)} حديثًا` : 'احفظ ما تريد الرجوع إليه'}</small></span><ChevronLeft size={18} /></Link>
        <Link className="list-card" to="/hadith/selected"><span className="icon-chip"><Star size={18} /></span><span className="lc-body"><strong>مختارات من الصحيحين</strong><small>{n2(HADITH.reduce((a, c) => a + c.items.length, 0))} حديثًا مصنفة بالموضوع</small></span><ChevronLeft size={18} /></Link>
      </div>
      <p className="small muted">{SOURCE_NOTE} شرح الأحاديث وفوائدها لم يُضَف بعد، لأنه يحتاج مصدرًا علميًا موثقًا.</p>
    </div>
  )
}

// ---------- صفحة الكتاب: أبوابه الكبرى ----------
export function HadithBookPage() {
  const { book = '' } = useParams()
  const b = bookInfo(book)
  const idx = bookIndex(book)
  const have = useHave()
  const [busy, setBusy] = useState<string | null>(null)
  const [q, setQ] = useState('')
  if (!b || !idx) return <div className="page"><PageHead title="الكتاب غير موجود" /><Link to="/hadith">العودة إلى المكتبة</Link></div>
  const got = new Set(have[b.id] ?? [])
  const all = got.size >= idx.sections.length
  const dl = async () => {
    setBusy('جارٍ التنزيل…')
    try { const n = await downloadBook(b.id, setBusy); toast(`حُفظ ${b.name} على الجهاز (${n2(n)} حديثًا)`) } catch { toast('تعذر التنزيل — تحقق من الاتصال بالإنترنت وأعد المحاولة') }
    setBusy(null)
  }
  const list = idx.sections.filter((s) => !q.trim() || (s.ar ?? '').includes(q.trim()))
  return (
    <div className="page hd-page">
      <PageHead title={b.name} subtitle={`${b.author} (ت ${n2(b.died)}هـ) • ${n2(idx.total)} حديثًا`} />
      <section className="card stack" style={{ gap: 8 }}>
        <p className="small" style={{ margin: 0 }}><strong>منهج الكتاب: </strong>{b.method}</p>
        <div className="row" style={{ flexWrap: 'wrap' }}>
          {all
            ? <button className="btn btn-sm" onClick={async () => { await removeBook(b.id); toast('حُذف الكتاب من الجهاز') }}><Trash2 size={14} /> حذف النسخة المحفوظة</button>
            : <button className="btn btn-sm btn-primary" disabled={!!busy} onClick={dl}><Download size={14} /> {busy ?? 'تنزيل الكتاب كاملًا للعمل دون إنترنت والبحث فيه'}</button>}
          <Link className="btn btn-sm" to={`/hadith/search?book=${b.id}`}><Search size={14} /> البحث في الكتاب</Link>
        </div>
      </section>
      <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث في عناوين الكتب…" aria-label="البحث في العناوين" />
      <ul className="plain stack" style={{ gap: 6 }}>
        {list.map((s) => (
          <li key={s.n}>
            <Link className="list-card" to={`/hadith/book/${b.id}/${s.n}`}>
              <span className="icon-chip hd-num">{n2(s.n)}</span>
              <span className="lc-body"><strong>{sectionTitle(s)}</strong><small>{n2(s.count)} حديثًا{s.first != null ? ` • من ${n2(s.first)} إلى ${n2(s.last ?? s.first)}` : ''}{got.has(s.n) ? ' • محفوظ' : ''}</small></span>
              <ChevronLeft size={18} />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

function GradeChips({ h }: { h: Hadith }) {
  if (!h.grades.length) return null
  const top = h.grades[0]
  return <span className={'hd-grade ' + top.level}>{top.ar} — {top.byAr}{h.grades.length > 1 ? ` (+${n2(h.grades.length - 1)})` : ''}</span>
}

function HadithCard({ h, size }: { h: Hadith; size: number }) {
  const { matn } = splitIsnad(h.text)
  return (
    <Link to={`/hadith/h/${h.book}/${h.n}`} className="card hd-card">
      <span className="hd-card-num">{n2(h.an ?? h.n)}</span>
      <p className="hd-matn" style={{ fontSize: `${size}rem` }}>{matn.length > 420 ? matn.slice(0, 420) + '…' : matn}</p>
      <GradeChips h={h} />
    </Link>
  )
}

// ---------- صفحة الكتاب الفرعي: الأحاديث بالتدريج ----------
export function HadithSectionPage() {
  const { book = '', section = '' } = useParams()
  const b = bookInfo(book)
  const s = bookIndex(book)?.sections.find((x) => x.n === Number(section))
  const [list, setList] = useState<Hadith[] | null>(null)
  const [err, setErr] = useState(false)
  const [shown, setShown] = useState(PAGE)
  const [p, set] = useReadPrefs()
  const load = useCallback(() => {
    if (!b || !s) return
    setErr(false); setList(null)
    loadSection(b.id, s.n).then(setList).catch(() => setErr(true))
  }, [b, s])
  useEffect(load, [load])
  if (!b || !s) return <div className="page"><PageHead title="غير موجود" /><Link to="/hadith">العودة إلى المكتبة</Link></div>
  return (
    <div className={'page hd-page' + (p.night ? ' hd-night' : '')}>
      <PageHead title={sectionTitle(s)} subtitle={`${b.name} • ${n2(s.count)} حديثًا`} />
      <ReadBar p={p} set={set} />
      {err ? (
        <section className="card" role="alert"><WifiOff size={18} /> تعذر تحميل الأحاديث: هذا الجزء لم يُحفظ على الجهاز بعد ويحتاج اتصالًا بالإنترنت.<div className="row" style={{ marginTop: 8 }}><button className="btn btn-sm" onClick={load}>إعادة المحاولة</button></div></section>
      ) : !list ? <Spinner label="جارٍ تحميل الأحاديث" /> : (
        <>
          <div className="stack" style={{ gap: 8 }}>{list.slice(0, shown).map((h) => <HadithCard key={h.n} h={h} size={p.size} />)}</div>
          {shown < list.length && <button className="btn" onClick={() => setShown((x) => x + PAGE)}>عرض المزيد ({n2(list.length - shown)} متبقٍ)</button>}
        </>
      )}
    </div>
  )
}

function Field({ label, children, missing }: { label: string; children?: React.ReactNode; missing?: string }) {
  return (
    <div className="hd-field">
      <span className="hd-field-label">{label}</span>
      <div className={'hd-field-value' + (missing ? ' missing' : '')}>{missing ?? children}</div>
    </div>
  )
}

// ---------- تفاصيل الحديث ----------
export function HadithDetailPage() {
  const { book = '', num = '' } = useParams()
  const nav = useNavigate()
  const b = bookInfo(book)
  const n = Number(num)
  const [h, setH] = useState<Hadith | null | undefined>(undefined)
  const [related, setRelated] = useState<SearchHit[] | null>(null)
  const [p, set] = useReadPrefs()
  const favs = useLive(() => loadFavs(), ['kv:hadith:favs'], [])
  const load = useCallback(() => {
    if (!b) return
    setH(undefined); setRelated(null)
    getHadith(b.id, n).then((x) => { setH(x); if (x) relatedHadith(x).then(setRelated).catch(() => setRelated([])) }).catch(() => setH(null))
  }, [b, n])
  useEffect(load, [load])
  if (!b) return <div className="page"><PageHead title="غير موجود" /><Link to="/hadith">العودة إلى المكتبة</Link></div>
  const idx = bookIndex(b.id)!
  const sec = h ? idx.sections.find((s) => s.n === h.section) ?? sectionFor(b.id, n) : sectionFor(b.id, n)
  const maxN = Math.max(...idx.sections.map((s) => s.last ?? 0))
  const fav = !!h && favs.some((f) => f.book === h.book && f.n === h.n)
  const parts = h ? splitIsnad(h.text) : null
  const takhrij = h ? takhrijFromGrades(h) : []
  return (
    <div className={'page hd-page' + (p.night ? ' hd-night' : '')}>
      <PageHead title={`${b.name} — حديث ${n2(h?.an ?? n)}`} subtitle={sec ? sectionTitle(sec) : undefined} />
      <ReadBar p={p} set={set} />
      {h === undefined ? <Spinner label="جارٍ تحميل الحديث" /> : h === null ? (
        <section className="card" role="alert"><WifiOff size={18} /> تعذر تحميل الحديث: لم يُحفظ على الجهاز ويحتاج اتصالًا بالإنترنت، أو أن الرقم غير موجود في الكتاب.<div className="row" style={{ marginTop: 8 }}><button className="btn btn-sm" onClick={load}>إعادة المحاولة</button></div></section>
      ) : (
        <>
          <article className="card hd-detail">
            {parts!.isnad && <p className="hd-isnad" style={{ fontSize: `${p.size * 0.8}rem` }}>{parts!.isnad}</p>}
            <p className="hd-matn big" style={{ fontSize: `${p.size * 1.12}rem` }}>{parts!.matn}</p>
            <div className="row hd-actions">
              <button className={'btn btn-sm' + (fav ? ' btn-primary' : '')} aria-pressed={fav} onClick={async () => toast((await toggleFav(h)) ? 'حُفظ في المفضلة' : 'أُزيل من المفضلة')}><Heart size={14} /> {fav ? 'محفوظ' : 'حفظ'}</button>
              <button className="btn btn-sm" onClick={async () => toast((await copyText(shareTextFor(h))) ? 'نُسخ نص الحديث مع مصدره' : 'تعذر النسخ')}><Copy size={14} /> نسخ</button>
              <button className="btn btn-sm" onClick={async () => { const r = await shareText('حديث نبوي', shareTextFor(h)); if (r === 'copied') toast('نُسخ النص للمشاركة') }}><Share2 size={14} /> مشاركة</button>
            </div>
          </article>
          <section className="card hd-fields" aria-label="بيانات الحديث">
            <Field label="المصدر">{b.name} — {b.author} (ت {n2(b.died)}هـ)</Field>
            <Field label="رقم الحديث">{h.an != null ? <>{n2(h.an)} <span className="muted small">(ترقيم الطبعة العربية{b.id === 'muslim' ? ': محمد فؤاد عبد الباقي' : ''})</span></> : n2(h.n)}<span className="muted small"> • التسلسلي في القاعدة: {n2(h.n)} • موضعه في الكتاب الفرعي: {n2(h.refHadith)}</span></Field>
            <Field label="الكتاب">{sec ? sectionTitle(sec) : `الكتاب رقم ${n2(h.section)}`}</Field>
            <Field label="الباب" missing="غير متوفر: القاعدة تحدد الكتاب الفرعي فقط دون عنوان الباب التفصيلي." />
            <Field label="الصحابي الراوي" missing={parts!.isnad ? 'يظهر في السند أعلاه؛ لا يوجد في القاعدة حقل مستقل لاسم الصحابي، فلا نستخرجه آليًا تجنبًا للخطأ.' : 'لا يوجد في القاعدة حقل مستقل لاسم الصحابي.'} />
            {h.grades.length ? (
              <Field label="درجة الحديث">
                <ul className="plain stack" style={{ gap: 4 }}>
                  {h.grades.map((g, i) => <li key={i}><span className={'hd-grade ' + g.level}>{g.ar}</span> <span className="small">— {g.byAr}</span>{g.untranslated && <span className="small muted"> (الأصل: {g.raw})</span>}</li>)}
                </ul>
                {new Set(h.grades.map((g) => g.level)).size > 1 && <p className="small muted" style={{ margin: '4px 0 0' }}>اختلفت أحكام العلماء على هذا الحديث كما يظهر أعلاه؛ كلٌّ منسوب إلى قائله.</p>}
              </Field>
            ) : (
              <Field label="درجة الحديث">{b.graded ? <span className="muted">لا يوجد حكم لهذا الحديث في القاعدة.</span> : <span>لا توجد درجة لكل حديث في القاعدة. منهج الكتاب: {b.method}</span>}</Field>
            )}
            {takhrij.length ? <Field label="التخريج">{takhrij.join('؛ ')} <span className="muted small">(كما ورد في أحكام القاعدة)</span></Field> : <Field label="التخريج" missing="غير متوفر في القاعدة لهذا الحديث." />}
            <Field label="الشرح وتفسير المعاني" missing="غير متوفر بعد: يُضاف فقط من شرح علمي منشور يُذكر اسم مؤلفه وطبعته، ولا يُكتب شرح من عندنا." />
            <Field label="الفوائد والأحكام" missing="غير متوفرة بعد للسبب نفسه." />
            <p className="small muted" style={{ margin: 0 }}>{SOURCE_NOTE}</p>
          </section>
          <section className="card" aria-label="أحاديث متقاربة">
            <h2 className="hd-h2" style={{ marginTop: 0 }}>أحاديث متقاربة في اللفظ</h2>
            {related === null ? <Spinner label="جارٍ البحث" /> : related.length ? (
              <ul className="plain stack" style={{ gap: 6 }}>
                {related.map((r) => <li key={`${r.h.book}:${r.h.n}`}><Link className="list-card" to={`/hadith/h/${r.h.book}/${r.h.n}`}><span className="lc-body"><strong>{bookInfo(r.h.book)?.name} — {n2(r.h.an ?? r.h.n)}</strong><small>{splitIsnad(r.h.text).matn.slice(0, 110)}…</small></span><ChevronLeft size={18} /></Link></li>)}
              </ul>
            ) : <p className="small muted" style={{ margin: 0 }}>لم يُعثر على حديث متقارب فيما حُفظ على الجهاز. نزّل كتبًا أخرى من المكتبة لتوسيع المقارنة.</p>}
            <p className="small muted" style={{ margin: '6px 0 0' }}>المقارنة آلية بحسب تشابه الكلمات، وليست حكمًا بأن الحديثين حديث واحد.</p>
          </section>
          <nav className="row hd-pager" aria-label="التنقل بين الأحاديث">
            <button className="btn" disabled={n <= 1} onClick={() => nav(`/hadith/h/${b.id}/${n - 1}`)}><ChevronRight size={16} /> السابق</button>
            {sec && <Link className="btn" to={`/hadith/book/${b.id}/${sec.n}`}><Library size={16} /> الكتاب</Link>}
            <button className="btn" disabled={n >= maxN} onClick={() => nav(`/hadith/h/${b.id}/${n + 1}`)}>التالي <ChevronLeft size={16} /></button>
          </nav>
        </>
      )}
    </div>
  )
}

// ---------- البحث ----------
const MODES: { id: SearchMode | 'topic'; label: string; hint: string }[] = [
  { id: 'words', label: 'كلمات', hint: 'كل الكلمات في نص الحديث بأي ترتيب' },
  { id: 'phrase', label: 'عبارة كاملة', hint: 'العبارة كما هي في النص' },
  { id: 'narrator', label: 'الراوي أو الصحابي', hint: 'يبحث عن الاسم في سند الحديث' },
  { id: 'topic', label: 'الموضوع', hint: 'في عناوين الكتب الفرعية لكل الكتب' },
]

export function HadithSearchPage() {
  const [params, setParams] = useSearchParams()
  const [q, setQ] = useState(params.get('q') ?? params.get('topic') ?? '')
  const [mode, setMode] = useState<SearchMode | 'topic'>(params.get('topic') ? 'topic' : (params.get('mode') as SearchMode) || 'words')
  const [book, setBook] = useState<BookId | 'all'>((params.get('book') as BookId) || 'all')
  const [res, setRes] = useState<{ hits: SearchHit[]; searchedBooks: BookId[]; total: number } | null>(null)
  const [busy, setBusy] = useState(false)
  const [p] = useReadPrefs()
  const topics = useMemo(() => (mode === 'topic' ? searchTopics(q) : []), [mode, q])
  const run = useCallback(async (query: string, m: SearchMode | 'topic', bk: BookId | 'all') => {
    if (m === 'topic' || query.trim().length < 2) { setRes(null); return }
    setBusy(true)
    try { setRes(await searchHadith(query, m, bk === 'all' ? null : [bk])) } finally { setBusy(false) }
  }, [])
  useEffect(() => { if (q) run(q, mode, book) }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const submit = (e?: React.FormEvent) => { e?.preventDefault(); setParams({ q, mode, ...(book !== 'all' ? { book } : {}) }, { replace: true }); run(q, mode, book) }
  const missing = res ? BOOKS.filter((b) => (book === 'all' || b.id === book) && !res.searchedBooks.includes(b.id)) : []
  return (
    <div className="page hd-page">
      <PageHead title="البحث في الأحاديث" subtitle="البحث في نصوص الكتب المحفوظة على جهازك، والموضوعات في كل الكتب" />
      <form className="card stack" style={{ gap: 10 }} onSubmit={submit}>
        <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="اكتب كلمة أو عبارة أو اسمًا…" aria-label="نص البحث" />
        <div className="chips" role="radiogroup" aria-label="نوع البحث">
          {MODES.map((m) => <button key={m.id} type="button" role="radio" aria-checked={mode === m.id} className={'chip' + (mode === m.id ? ' active' : '')} onClick={() => setMode(m.id)}>{m.label}</button>)}
        </div>
        <p className="small muted" style={{ margin: 0 }}>{MODES.find((m) => m.id === mode)?.hint}</p>
        {mode === 'narrator' && <div className="chips" aria-label="صحابة">{COMPANIONS.map((c) => <button key={c} type="button" className="chip" onClick={() => { setQ(c); run(c, 'narrator', book) }}>{c}</button>)}</div>}
        {mode !== 'topic' && (
          <select className="input" value={book} onChange={(e) => setBook(e.target.value as BookId | 'all')} aria-label="الكتاب">
            <option value="all">كل الكتب المحفوظة</option>
            {BOOKS.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        )}
        <button className="btn btn-primary" type="submit"><Search size={16} /> بحث</button>
      </form>
      {mode === 'topic' ? (
        q.trim().length >= 2 && (
          <section className="stack" style={{ gap: 6 }} aria-label="نتائج الموضوع">
            <p className="small muted">{topics.length ? `${n2(topics.length)} كتابًا فرعيًا بعنوان فيه «${q}»` : 'لا توجد كتب فرعية بهذا العنوان.'}</p>
            {topics.map(({ book: b, section: s }) => <Link key={`${b.id}:${s.n}`} className="list-card" to={`/hadith/book/${b.id}/${s.n}`}><span className="lc-body"><strong>{sectionTitle(s)}</strong><small>{b.name} • {n2(s.count)} حديثًا</small></span><ChevronLeft size={18} /></Link>)}
          </section>
        )
      ) : busy ? <Spinner label="جارٍ البحث" /> : res && (
        <section className="stack" style={{ gap: 8 }} aria-label="نتائج البحث">
          {!res.searchedBooks.length ? (
            <div className="card">لا توجد كتب محفوظة على الجهاز للبحث فيها بعد. افتح أي كتاب واضغط «تنزيل الكتاب كاملًا» ثم ابحث.<div className="row" style={{ marginTop: 8 }}><Link className="btn btn-sm" to="/hadith">كتب الحديث</Link></div></div>
          ) : <p className="small muted">{res.total ? `${n2(res.total)} نتيجة${res.total > res.hits.length ? ` (يُعرض أول ${n2(res.hits.length)})` : ''} في: ${res.searchedBooks.map((x) => bookInfo(x)?.name).join('، ')}` : 'لا نتائج فيما حُفظ على الجهاز.'}</p>}
          {missing.length > 0 && res.searchedBooks.length > 0 && <p className="small muted">لم يُبحث في: {missing.map((b) => b.name).join('، ')} (غير محفوظة على الجهاز).</p>}
          {res.hits.map(({ h }) => <div key={`${h.book}:${h.n}`}><small className="muted">{bookInfo(h.book)?.name}</small><HadithCard h={h} size={p.size * 0.9} /></div>)}
        </section>
      )}
    </div>
  )
}

// ---------- المحفوظة ----------
export function HadithFavoritesPage() {
  const favs = useLive(() => loadFavs(), ['kv:hadith:favs'], [])
  return (
    <div className="page hd-page">
      <PageHead title="الأحاديث المحفوظة" subtitle="ما حفظته من مكتبة الأحاديث" />
      {favs.length ? (
        <ul className="plain stack" style={{ gap: 6 }}>
          {favs.map((f) => <li key={`${f.book}:${f.n}`}><Link className="list-card" to={`/hadith/h/${f.book}/${f.n}`}><span className="lc-body"><strong>{bookInfo(f.book)?.name} — {n2(f.n)}</strong><small>{f.snippet}…</small></span><ChevronLeft size={18} /></Link></li>)}
        </ul>
      ) : <div className="card">لم تحفظ أحاديث بعد. افتح أي حديث واضغط «حفظ».</div>}
    </div>
  )
}

/** مستويات الأحكام (للمفتاح التوضيحي) */
export const GRADE_LEGEND = LEVEL_LABEL
