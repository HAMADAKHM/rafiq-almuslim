import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { PageHead, Spinner } from '../../components/Common'
import { VoiceAyahSearch } from '../../components/VoiceAyahSearch'
import { useQuran } from '../../hooks'
import { parseRef, searchAyahs, searchSurahs } from '../../services/quran'
import { searchSkeleton } from '../../lib/arabic'
import { ADHKAR } from '../../content/adhkar'
import { DUAS } from '../../content/duas'
import { HADITH } from '../../content/hadith'
import { LESSONS } from '../../content/lessons'
import type { ContentCategory } from '../../content/types'

function searchContent(cats: ContentCategory[], sk: string) {
  return cats.flatMap((c) => c.items.filter((it) => searchSkeleton(`${it.text ?? ''} ${it.note ?? ''} ${it.source} ${c.title}`).includes(sk)).map((it) => ({ cat: c, it })))
}

export function SearchPage() {
  const { data } = useQuran()
  const [sp, setSp] = useSearchParams()
  const [q, setQ] = useState(sp.get('q') ?? '')
  const sk = searchSkeleton(q)
  const res = useMemo(() => {
    if (!data || sk.length < 2) return null
    return {
      ref: parseRef(data.meta, q),
      surahs: searchSurahs(data.meta, q).slice(0, 10),
      ayahs: searchAyahs(data, q, 60),
      adhkar: searchContent(ADHKAR, sk),
      duas: searchContent(DUAS, sk),
      hadith: searchContent(HADITH, sk),
      lessons: LESSONS.filter((l) => searchSkeleton(l.title + ' ' + l.summary + ' ' + l.steps.map((s) => s.title + ' ' + s.body).join(' ')).includes(sk)),
    }
  }, [data, q, sk])

  return (
    <>
      <PageHead title="البحث" subtitle="في السور والآيات والأذكار والأدعية والدروس — دون اعتبار للتشكيل أو اختلاف الهمزات" />
      <form className="row" onSubmit={(e) => { e.preventDefault(); setSp(q ? { q } : {}) }}>
        <input className="input" autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="مثال: الصبر، الرحمن، 2:255، أذكار النوم" aria-label="كلمة البحث" style={{ maxWidth: 560, flex: 1 }} />
        <VoiceAyahSearch compact />
      </form>
      {!data && <Spinner />}
      {res && (
        <div className="stack" style={{ marginTop: '1rem' }}>
          {res.ref && <Link className="btn btn-primary" style={{ alignSelf: 'start' }} to={`/quran/${res.ref.surah}?ayah=${res.ref.ayah}`}>اذهب إلى {data!.meta.surahs[res.ref.surah - 1].name} {res.ref.ayah}</Link>}
          {res.surahs.length > 0 && res.surahs.length < 114 && (
            <section className="card"><h2>السور</h2><div className="row">{res.surahs.map((s) => <Link key={s.n} className="btn btn-sm" to={`/quran/${s.n}`}>{s.name}</Link>)}</div></section>
          )}
          <section className="card">
            <h2>الآيات ({res.ayahs.total}{res.ayahs.total > res.ayahs.hits.length ? `، يُعرض أول ${res.ayahs.hits.length}` : ''})</h2>
            {res.ayahs.hits.length === 0 && <p className="muted">لا توجد آيات مطابقة.</p>}
            <div className="stack" style={{ gap: 4 }}>
              {res.ayahs.hits.map((h) => (
                <Link key={`${h.surah}:${h.ayah}`} to={`/quran/${h.surah}?ayah=${h.ayah}`} style={{ textDecoration: 'none', color: 'inherit', borderBottom: '1px solid var(--border)', paddingBottom: 6 }}>
                  <span className="small" style={{ color: 'var(--primary)' }}>{data!.meta.surahs[h.surah - 1].name} {h.ayah}</span>
                  <p className="quran-text" style={{ fontSize: '1.35rem', margin: 0 }}>{h.text}</p>
                </Link>
              ))}
            </div>
          </section>
          {res.hadith.length > 0 && (
            <section className="card">
              <h2>الأحاديث ({res.hadith.length})</h2>
              <ul className="small">
                {res.hadith.map(({ cat, it }) => <li key={it.id}><Link to={`/hadith/${cat.id}`}>{cat.title}</Link>: {(it.text ?? '').slice(0, 90)}… <span className="muted">— {it.source}</span></li>)}
              </ul>
            </section>
          )}
          {(res.adhkar.length > 0 || res.duas.length > 0) && (
            <section className="card">
              <h2>الأذكار والأدعية ({res.adhkar.length + res.duas.length})</h2>
              <ul>
                {res.adhkar.map(({ cat, it }) => <li key={it.id}><Link to={`/adhkar/${cat.id}`}>{cat.title}</Link>: {(it.text ?? it.source).slice(0, 90)}…</li>)}
                {res.duas.map(({ cat, it }) => <li key={it.id}><Link to={`/duas/${cat.id}`}>{cat.title}</Link>: {(it.text ?? it.source).slice(0, 90)}…</li>)}
              </ul>
            </section>
          )}
          {res.lessons.length > 0 && (
            <section className="card"><h2>الدروس</h2><ul>{res.lessons.map((l) => <li key={l.id}><Link to={`/learn/${l.id}`}>{l.title}</Link></li>)}</ul></section>
          )}
          <p className="small muted">البحث في التفسير: افتح التفسير من القارئ أو من صفحة «التفسير والتعلم» (يُحمَّل عند الطلب).</p>
        </div>
      )}
    </>
  )
}
