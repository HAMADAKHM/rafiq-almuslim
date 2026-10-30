import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BookOpen, Trash2 } from 'lucide-react'
import { PageHead, Spinner, Tabs, Empty } from '../../components/Common'
import { VoiceAyahSearch } from '../../components/VoiceAyahSearch'
import { useLive, useQuran } from '../../hooks'
import { firstAyahOf, parseRef, searchSurahs, type QuranData } from '../../services/quran'
import { bookmarks, favorites, kv, notes } from '../../db/repos'
import type { Favorite } from '../../db/db'
import { toArabicDigits } from '../../lib/arabic'

type Tab = 'surahs' | 'juz' | 'hizb' | 'page' | 'bookmarks' | 'favorites' | 'notes'

export interface LastRead { surah: number; ayah: number; at: number; page?: number }

export function QuranIndexPage() {
  const { data, error } = useQuran()
  const [tab, setTab] = useState<Tab>('surahs')
  const last = useLive(() => kv.get<LastRead | null>('quran:last', null), ['kv:quran:last'], null)
  if (error) return <div className="alert alert-error">{error}</div>
  if (!data) return <Spinner />
  return (
    <>
      <PageHead title="القرآن الكريم" subtitle="المصحف برواية حفص عن عاصم — الرسم العثماني"
        actions={<>{last && <Link className="btn btn-primary" to={`/quran/${last.surah}?ayah=${last.ayah}`}><BookOpen size={16} /> متابعة: {data.meta.surahs[last.surah - 1].name} {last.ayah}</Link>}<VoiceAyahSearch /></>} />
      <Link to={last ? `/read?s=${last.surah}&a=${last.ayah}` : '/read?s=1&a=1'} className="list-card r2-try" style={{ marginBottom: '1rem' }}>
        <span className="icon-chip"><BookOpen size={20} aria-hidden="true" /></span>
        <span className="lc-body"><strong>جرّب القارئ الجديد (تجريبي)</strong><small>سبعة أوضاع: الكلاسيكي، المريح، كبار السن، الليلي، الملوّن، الأطفال، والترجمة — القارئ الحالي باقٍ كما هو</small></span>
      </Link>
      <Tabs value={tab} onChange={setTab} label="فهارس المصحف" items={[
        { id: 'surahs', label: 'السور' }, { id: 'juz', label: 'الأجزاء' }, { id: 'hizb', label: 'الأحزاب' },
        { id: 'page', label: 'الصفحات' }, { id: 'bookmarks', label: 'العلامات' }, { id: 'favorites', label: 'الآيات المفضلة' }, { id: 'notes', label: 'ملاحظاتي' },
      ]} />
      {tab === 'surahs' && <SurahList data={data} />}
      {tab === 'juz' && <PartList data={data} kind="juz" />}
      {tab === 'hizb' && <PartList data={data} kind="hizb" />}
      {tab === 'page' && <PageJump data={data} />}
      {tab === 'bookmarks' && <BookmarkList data={data} />}
      {tab === 'favorites' && <FavoriteAyahs data={data} />}
      {tab === 'notes' && <NotesList data={data} />}
    </>
  )
}

function SurahList({ data }: { data: QuranData }) {
  const [q, setQ] = useState('')
  const nav = useNavigate()
  const list = useMemo(() => searchSurahs(data.meta, q), [data, q])
  const ref = parseRef(data.meta, q)
  return (
    <>
      <form className="row" style={{ marginBottom: '1rem' }} onSubmit={(e) => { e.preventDefault(); if (ref) nav(`/quran/${ref.surah}?ayah=${ref.ayah}`); else if (list.length === 1) nav(`/quran/${list[0].n}`) }}>
        <input className="input" style={{ maxWidth: 420 }} value={q} onChange={(e) => setQ(e.target.value)} placeholder="اسم السورة أو رقمها، أو مرجع مثل 2:255" aria-label="بحث في السور" />
        {ref && <button className="btn btn-primary" type="submit">اذهب إلى {data.meta.surahs[ref.surah - 1].name} {ref.ayah}</button>}
      </form>
      <div className="surah-list">
        {list.map((s) => (
          <Link key={s.n} to={`/quran/${s.n}`} className="card card-link surah-item">
            <span className="surah-num"><span>{s.n}</span></span>
            <span style={{ flex: 1 }}>
              <strong className="classic-text" style={{ fontSize: '1.2rem' }}>{s.name}</strong>
              <div className="small muted">{s.type === 'meccan' ? 'مكية' : 'مدنية'} • {s.count} آية • {s.tr}</div>
            </span>
          </Link>
        ))}
      </div>
      {list.length === 0 && <Empty>لا توجد سورة بهذا الاسم.</Empty>}
    </>
  )
}

function PartList({ data, kind }: { data: QuranData; kind: 'juz' | 'hizb' }) {
  const count = kind === 'juz' ? 30 : 60
  return (
    <div className="surah-list">
      {Array.from({ length: count }, (_, i) => {
        const ref = kind === 'juz' ? firstAyahOf(data.meta, 'juz', i + 1) : firstAyahOf(data.meta, 'rub', i * 4 + 1)
        if (!ref) return null
        const s = data.meta.surahs[ref.surah - 1]
        const text = data.verses[ref.surah - 1][ref.ayah - 1]
        return (
          <Link key={i} to={`/quran/${ref.surah}?ayah=${ref.ayah}`} className="card card-link surah-item">
            <span className="surah-num"><span>{i + 1}</span></span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <strong>{kind === 'juz' ? 'الجزء' : 'الحزب'} {toArabicDigits(i + 1)}</strong>
              <div className="small muted">{s.name} {ref.ayah}</div>
              <div className="small" style={{ fontFamily: 'var(--font-quran)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{text}</div>
            </span>
          </Link>
        )
      })}
    </div>
  )
}

function PageJump({ data }: { data: QuranData }) {
  const [p, setP] = useState('1')
  const nav = useNavigate()
  const n = Number(p)
  const valid = Number.isInteger(n) && n >= 1 && n <= data.meta.pages
  const ref = valid ? firstAyahOf(data.meta, 'page', n) : null
  return (
    <section className="card" style={{ maxWidth: 520 }}>
      <form onSubmit={(e) => { e.preventDefault(); if (ref) nav(`/quran/${ref.surah}?ayah=${ref.ayah}`) }} className="stack">
        <label className="field"><span>رقم الصفحة (1–{data.meta.pages}) وفق مصحف المدينة</span>
          <input className="input" type="number" min={1} max={data.meta.pages} value={p} onChange={(e) => setP(e.target.value)} />
        </label>
        {ref && <p className="muted small">تبدأ الصفحة {n} من سورة {data.meta.surahs[ref.surah - 1].name} الآية {ref.ayah}</p>}
        {!valid && <p className="alert alert-error small">أدخل رقمًا بين 1 و{data.meta.pages}.</p>}
        <button className="btn btn-primary" disabled={!ref}>اذهب إلى الصفحة</button>
      </form>
    </section>
  )
}

function BookmarkList({ data }: { data: QuranData }) {
  const list = useLive(() => bookmarks.all(), ['bookmarks'], [])
  if (!list.length) return <Empty>لا توجد علامات مرجعية بعد. اضغط على أيقونة العلامة بجانب أي آية لإضافتها.</Empty>
  return (
    <div className="stack">
      {list.map((b) => (
        <div key={b.id} className="card spread">
          <Link to={`/quran/${b.surah}?ayah=${b.ayah}`} style={{ flex: 1, textDecoration: 'none', color: 'inherit' }}>
            <strong>{b.label ? `${b.label} — ` : ''}{data.meta.surahs[b.surah - 1].name} — الآية {b.ayah}</strong>
            <p className="quran-text" style={{ fontSize: '1.3rem', margin: 0 }}>{data.verses[b.surah - 1][b.ayah - 1]}</p>
          </Link>
          <button className="btn btn-ghost icon-btn" aria-label="حذف العلامة" onClick={() => bookmarks.toggle(b.surah, b.ayah)}><Trash2 size={16} /></button>
        </div>
      ))}
    </div>
  )
}

function NotesList({ data }: { data: QuranData }) {
  const list = useLive(() => notes.all(), ['notes'], [])
  if (!list.length) return <Empty>لا توجد ملاحظات بعد. يمكنك إضافة ملاحظة شخصية على أي آية من القارئ.</Empty>
  return (
    <div className="stack">
      {list.map((n) => (
        <div key={n.id} className="card">
          <div className="spread">
            <Link to={`/quran/${n.surah}?ayah=${n.ayah}`}><strong>{data.meta.surahs[n.surah - 1].name} — الآية {n.ayah}</strong></Link>
            <button className="btn btn-ghost icon-btn" aria-label="حذف الملاحظة" onClick={() => n.id && notes.remove(n.id)}><Trash2 size={16} /></button>
          </div>
          <p style={{ whiteSpace: 'pre-wrap', margin: '0.5rem 0 0' }}>{n.text}</p>
          <div className="small muted">{new Date(n.updatedAt).toLocaleString('ar-u-nu-latn')}</div>
        </div>
      ))}
    </div>
  )
}

function FavoriteAyahs({ data }: { data: QuranData }) {
  const list = useLive(() => favorites.all(), ['favorites'], [] as Favorite[])
  const ayahs = list.filter((f) => f.kind === 'ayah').sort((a, b) => b.createdAt - a.createdAt)
  if (!ayahs.length) return <Empty>لا توجد آيات مفضلة بعد. اضغط على أي آية ثم «المفضلة».</Empty>
  return (
    <div className="stack">
      {ayahs.map((f) => {
        const [s, a] = f.itemId.split(':').map(Number)
        return (
          <div key={f.id} className="card spread">
            <Link to={`/quran/${s}?ayah=${a}`} style={{ flex: 1, textDecoration: 'none', color: 'inherit' }}>
              <strong>{data.meta.surahs[s - 1].name} — الآية {a}</strong>
              <p className="quran-text" style={{ fontSize: '1.3rem', margin: 0 }}>{data.verses[s - 1][a - 1]}</p>
            </Link>
            <button className="btn btn-ghost icon-btn" aria-label="إزالة من المفضلة" onClick={() => favorites.toggle('ayah', f.itemId)}><Trash2 size={16} /></button>
          </div>
        )
      })}
    </div>
  )
}
