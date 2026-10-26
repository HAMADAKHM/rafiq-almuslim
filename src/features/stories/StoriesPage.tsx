// «التفسير كالقصة» (من مزايا رفيق بلس): قصص القرآن وسوره مشهدًا مشهدًا، قراءةً أو استماعًا.
// النص من المصحف، والتفسير من الكتب المعتمدة كما هو، والتلاوة بأصوات القرّاء.
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BookOpenText, Play } from 'lucide-react'
import { PageHead } from '../../components/Common'
import { PaintedScene } from '../../components/Scene'
import { PlusGate } from '../../billing/PlusGate'
import { STORIES } from '../../content/stories'
import { useQuran } from '../../hooks'
import { kv } from '../../db/repos'
import { toArabicDigits } from '../../lib/arabic'

export function StoriesPage() {
  const { data } = useQuran()
  const nav = useNavigate()
  const [surah, setSurah] = useState(18)
  const [done, setDone] = useState<Record<string, number>>({})
  useEffect(() => {
    Promise.all(STORIES.map(async (s) => [s.id, await kv.get<number>(`stories:pos:${s.id}`, 0)] as const)).then((r) => setDone(Object.fromEntries(r)))
  }, [])
  return (
    <div className="page stories-page">
      <PageHead title="التفسير كالقصة" subtitle="قصص القرآن وسوره مشهدًا مشهدًا: الآية بصوت القارئ، ثم معناها من التفسير الميسّر" />
      <PlusGate feature="stories" title="التفسير كالقصة">
        <section className="stories-grid" aria-label="قصص القرآن">
          {STORIES.map((s) => (
            <Link key={s.id} to={`/stories/${s.id}`} className="story-card">
              <PaintedScene tone={s.tone} variant="card" className="story-art" />
              <div className="story-body">
                <b>{s.title}</b>
                <span className="muted">{s.about}</span>
                <small className="muted">سورة {data?.meta.surahs[s.surah - 1].name ?? ''} • الآيات {toArabicDigits(s.from)}–{toArabicDigits(s.to)}{done[s.id] ? ' • أكملت جزءًا منها' : ''}</small>
              </div>
            </Link>
          ))}
        </section>
        <section className="card" aria-label="سورة كاملة كالقصة">
          <h2><BookOpenText size={20} /> سورة كاملة</h2>
          <p className="muted">اختر أي سورة لتمضي معها مشهدًا مشهدًا.</p>
          <div className="row wrap gap">
            <select value={surah} onChange={(e) => setSurah(Number(e.target.value))} aria-label="السورة">
              {(data?.meta.surahs ?? []).map((m, i) => <option key={i} value={i + 1}>{i + 1}. سورة {m.name}</option>)}
            </select>
            <button className="btn btn-gold" onClick={() => nav(`/stories/surah/${surah}`)}><Play size={16} /> ابدأ</button>
          </div>
        </section>
      </PlusGate>
    </div>
  )
}
