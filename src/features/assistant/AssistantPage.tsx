import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ShieldCheck, Library, Send } from 'lucide-react'
import { PageHead, Spinner } from '../../components/Common'
import { useQuran } from '../../hooks'
import { ADHKAR } from '../../content/adhkar'
import { DUAS } from '../../content/duas'
import { HADITH } from '../../content/hadith'
import { findContent, findVerses, isFiqhQuestion, matchTopics, queryWords } from '../../services/assistant'
import { toArabicDigits } from '../../lib/arabic'

const EXAMPLES = ['دعاء الهم والحزن', 'أذكار قبل النوم', 'فضل صلاة الجماعة', 'الصبر', 'دعاء للوالدين', 'الرزق']

export function AssistantPage() {
  const { data } = useQuran()
  const [sp, setSp] = useSearchParams()
  const [q, setQ] = useState(sp.get('q') ?? '')
  const asked = sp.get('q') ?? ''
  const res = useMemo(() => {
    if (!data || !asked.trim()) return null
    const words = queryWords(asked)
    return {
      words,
      fiqh: isFiqhQuestion(asked),
      topics: matchTopics(words),
      verses: findVerses(data, words, 5),
      hadith: findContent(HADITH, words, 4),
      adhkar: [...findContent(ADHKAR, words, 4).map((h) => ({ ...h, base: '/adhkar' })), ...findContent(DUAS, words, 4).map((h) => ({ ...h, base: '/duas' }))].sort((a, b) => b.score - a.score).slice(0, 5),
    }
  }, [data, asked])
  const ask = (text: string) => { setQ(text); setSp(text.trim() ? { q: text.trim() } : {}) }
  const empty = res && !res.topics.length && !res.verses.length && !res.hadith.length && !res.adhkar.length

  return (
    <>
      <PageHead title="المساعد الإسلامي" subtitle="يدلّك على الآيات والأحاديث والأذكار المتعلقة بسؤالك من مصادر التطبيق الموثقة" />
      <div className="alert small" style={{ display: 'flex', gap: 8 }}>
        <ShieldCheck size={18} aria-hidden="true" style={{ flexShrink: 0 }} />
        <span>يعمل على جهازك دون إنترنت ولا يُرسَل سؤالك إلى أي خادم. لا يكتب المساعد نصوصًا من عنده ولا يُفتي: يعرض نصوص المصحف والأحاديث المخرّجة والأذكار كما هي بمصادرها.</span>
      </div>
      <form className="chat-bar" style={{ marginTop: '0.75rem' }} onSubmit={(e) => { e.preventDefault(); ask(q) }}>
        <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="اكتب سؤالك هنا… مثل: دعاء القلق" aria-label="سؤالك للمساعد" />
        <button className="btn btn-primary" disabled={!q.trim()} aria-label="ابحث"><Send size={16} /> ابحث</button>
      </form>
      {!asked && (
        <div className="row" style={{ marginTop: '0.75rem' }} aria-label="أمثلة">
          {EXAMPLES.map((x) => <button key={x} className="btn btn-sm" onClick={() => ask(x)}>{x}</button>)}
        </div>
      )}
      {asked && !data && <Spinner />}
      {res && (
        <div className="stack" style={{ marginTop: '1rem' }}>
          <div className="chat-q">{asked}</div>
          {res.fiqh && (
            <p className="alert alert-gold small" role="note">
              سؤالك عن حكم شرعي. المساعد لا يُصدر فتاوى ولا أحكامًا؛ ارجع إلى عالم موثوق أو إلى دار الإفتاء الرسمية في بلدك، فالأحكام تختلف باختلاف الأحوال. وهذه نصوص متعلقة بموضوعك للاطلاع:
            </p>
          )}
          {res.topics.length > 0 && (
            <section className="card stack chat-a" aria-label="أقسام مقترحة">
              <h2 style={{ margin: 0 }}>أقسام تفيدك</h2>
              {res.topics.map((t) => (
                <div key={t.id}>
                  <strong className="small">{t.title}</strong>
                  <div className="row" style={{ marginTop: 4 }}>{t.links.map((l) => <Link key={l.to} className="btn btn-sm" to={l.to}>{l.label}</Link>)}</div>
                </div>
              ))}
            </section>
          )}
          {res.verses.length > 0 && (
            <section className="card stack chat-a" aria-label="آيات متعلقة">
              <h2 style={{ margin: 0 }}>آيات فيها كلمات سؤالك</h2>
              {res.verses.map((v) => (
                <div key={`${v.surah}:${v.ayah}`} style={{ borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
                  <p className="quran-text" style={{ fontSize: '1.35rem', margin: 0 }}>{v.text}</p>
                  <div className="row small" style={{ marginTop: 4 }}>
                    <Link to={`/quran/${v.surah}?ayah=${v.ayah}`}>سورة {data!.meta.surahs[v.surah - 1].name} • الآية {toArabicDigits(v.ayah)}</Link>
                    <Link className="btn btn-sm btn-ghost" to={`/learn?s=${v.surah}&a=${v.ayah}`} aria-label={`تفسير ${data!.meta.surahs[v.surah - 1].name} ${v.ayah}`}><Library size={14} /> التفسير</Link>
                  </div>
                </div>
              ))}
              <p className="small muted" style={{ margin: 0 }}>الآيات مرتبة بحسب تطابق الكلمات لا بحسب المعنى؛ اقرأ التفسير لفهم السياق.</p>
            </section>
          )}
          {res.hadith.length > 0 && (
            <section className="card stack chat-a" aria-label="أحاديث متعلقة">
              <h2 style={{ margin: 0 }}>أحاديث من الصحيحين</h2>
              {res.hadith.map(({ cat, it }) => (
                <div key={it.id}>
                  <p className="dhikr-text" style={{ margin: 0 }}>{it.text}</p>
                  <div className="small muted">{it.source}{it.note ? ` • ${it.note}` : ''} — <Link to={`/hadith/${cat.id}`}>{cat.title}</Link></div>
                </div>
              ))}
            </section>
          )}
          {res.adhkar.length > 0 && (
            <section className="card stack chat-a" aria-label="أذكار وأدعية متعلقة">
              <h2 style={{ margin: 0 }}>أذكار وأدعية</h2>
              {res.adhkar.map(({ cat, it, base }) => (
                <div key={it.id}>
                  <p className="dhikr-text" style={{ margin: 0 }}>{it.text}</p>
                  <div className="small muted">{it.source} — <Link to={`${base}/${cat.id}`}>{cat.title}</Link></div>
                </div>
              ))}
            </section>
          )}
          {empty && <p className="muted">لم أجد في مصادر التطبيق نصوصًا مطابقة لسؤالك. جرّب كلمات أخرى أو <Link to={`/search?q=${encodeURIComponent(asked)}`}>البحث الشامل</Link>.</p>}
        </div>
      )}
    </>
  )
}
