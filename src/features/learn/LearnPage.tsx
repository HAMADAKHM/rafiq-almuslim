import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Empty, PageHead, Spinner, Tabs } from '../../components/Common'
import { QuranRefText } from '../../components/QuranRefText'
import { useQuran } from '../../hooks'
import { LESSONS, KIDS_PLANNED } from '../../content/lessons'
import { TafsirPanel } from './TafsirPanel'

type Tab = 'tafsir' | 'gharib' | 'nuzul' | 'lessons' | 'kids'

export function LearnPage() {
  const [tab, setTab] = useState<Tab>('tafsir')
  return (
    <>
      <PageHead title="التفسير والتعلم" subtitle="محتوى من مصادر معروفة مع ذكر المصدر. ليس فتوى؛ ويُرجع في المسائل إلى أهل العلم." />
      <Tabs value={tab} onChange={setTab} label="أقسام التعلم" items={[
        { id: 'tafsir', label: 'التفسير' }, { id: 'gharib', label: 'معاني المفردات' }, { id: 'nuzul', label: 'أسباب النزول' },
        { id: 'lessons', label: 'دروس العبادات' }, { id: 'kids', label: 'للأطفال' },
      ]} />
      {tab === 'tafsir' && <AyahTafsir kind="tafsir" />}
      {tab === 'gharib' && <AyahTafsir kind="gharib" />}
      {tab === 'nuzul' && (
        <div className="alert alert-gold">
          لم يُضمَّن بعدُ مصدر معتمد لأسباب النزول قابل لإعادة الاستخدام، لذلك لا نعرض أسبابًا للنزول حتى لا يُنسب للقرآن ما لم يثبت.
          تتناول بعض كتب التفسير المتاحة (مثل ابن كثير والبغوي) أسباب النزول مع أسانيدها ضمن تفسير الآيات. نقطة التكامل مُعدّة في
          <code> src/services/tafsir.ts </code> لإضافة مصدر موثق لاحقًا.
        </div>
      )}
      {tab === 'lessons' && (
        <div className="grid grid-2">
          {LESSONS.map((l) => (
            <Link key={l.id} to={`/learn/${l.id}`} className="card card-link">
              <h2>{l.title}</h2>
              <p className="muted small" style={{ margin: 0 }}>{l.summary}</p>
            </Link>
          ))}
        </div>
      )}
      {tab === 'kids' && <Empty>{KIDS_PLANNED}</Empty>}
    </>
  )
}

function AyahTafsir({ kind }: { kind: 'tafsir' | 'gharib' }) {
  const { data } = useQuran()
  const [surah, setSurah] = useState(1)
  const [ayah, setAyah] = useState(1)
  if (!data) return <Spinner />
  const s = data.meta.surahs[surah - 1]
  return (
    <div className="stack">
      <div className="grid grid-2" style={{ gap: '0.75rem' }}>
        <label className="field"><span>السورة</span>
          <select className="select" value={surah} onChange={(e) => { setSurah(Number(e.target.value)); setAyah(1) }}>
            {data.meta.surahs.map((x) => <option key={x.n} value={x.n}>{x.n}. {x.name}</option>)}
          </select>
        </label>
        <label className="field"><span>الآية (1–{s.count})</span>
          <input className="input" type="number" min={1} max={s.count} value={ayah} onChange={(e) => setAyah(Math.min(s.count, Math.max(1, Number(e.target.value) || 1)))} />
        </label>
      </div>
      <section className="card">
        <QuranRefText ranges={[{ surah, from: ayah, to: ayah }]} />
        <TafsirPanel key={`${surah}:${ayah}:${kind}`} surah={surah} ayah={ayah} kind={kind} />
      </section>
      <p className="small muted">يُحمَّل التفسير من الإنترنت عند أول طلب لكل سورة، ثم يبقى محفوظًا على جهازك.</p>
    </div>
  )
}

export function LessonPage() {
  const { lessonId } = useParams()
  const l = LESSONS.find((x) => x.id === lessonId)
  if (!l) return <Empty>الدرس غير موجود. <Link to="/learn">العودة</Link></Empty>
  return (
    <>
      <PageHead title={l.title} subtitle={<Link to="/learn">← التفسير والتعلم</Link>} />
      <div className="stack" style={{ maxWidth: 820 }}>
        <p className="muted">{l.summary}</p>
        {l.quran && <section className="card"><QuranRefText ranges={l.quran} size="1.6rem" /></section>}
        <ol className="stack" style={{ paddingInlineStart: '1.2rem' }}>
          {l.steps.map((s, i) => (
            <li key={i} className="card">
              <h3>{s.title}</h3>
              <p style={{ margin: 0 }}>{s.body}</p>
              {s.evidence && <p className="source" style={{ margin: '0.4rem 0 0' }}>الدليل: {s.evidence}</p>}
            </li>
          ))}
        </ol>
        {l.notes?.map((n, i) => <p key={i} className="alert alert-info small">{n}</p>)}
        <p className="small muted">محتوى تعليمي مختصر يحتاج إلى مراجعة متخصص قبل النشر العام، وليس بديلًا عن التعلم على أهل العلم.</p>
      </div>
    </>
  )
}
