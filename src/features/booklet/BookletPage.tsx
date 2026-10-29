// «كتيّب الأذكار» (رفيق بلس): اختر أقسام الأذكار والأدعية واكتب الإهداء، فيُنشأ كتيّب PDF بالنصوص
// ومصادرها كما هي في المكتبة الموثقة، تشاركه وتهديه (مثلًا على واتساب).
import { useState } from 'react'
import { BookMarked, FileDown } from 'lucide-react'
import { PageHead } from '../../components/Common'
import { PlusGate } from '../../billing/PlusGate'
import { useQuran, toast } from '../../hooks'
import { ADHKAR } from '../../content/adhkar'
import { DUAS } from '../../content/duas'
import type { ContentCategory } from '../../content/types'
import { itemText } from '../../content/itemText'
import type { QuranData } from '../../services/quran'
import { buildPdf, type PdfBlock } from '../../services/pdf'
import { shareImage } from '../../platform'

const ALL: ContentCategory[] = [...ADHKAR, ...DUAS]
const countNote = (n?: number) => (n && n > 1 ? ` — ${n} ${n <= 10 ? 'مرات' : 'مرة'}` : '')

export function bookletBlocks(o: { title: string; dedication: string; cats: string[] }, data: QuranData | null): PdfBlock[] {
  const blocks: PdfBlock[] = [{ type: 'title', text: o.title || 'كتيّب الأذكار' }]
  if (o.dedication.trim()) blocks.push({ type: 'subtitle', text: o.dedication.trim() })
  blocks.push({ type: 'divider' })
  for (const id of o.cats) {
    const c = ALL.find((x) => x.id === id)
    if (!c) continue
    blocks.push({ type: 'heading', text: c.title })
    for (const it of c.items) {
      const t = itemText(data, it)
      if (!t) continue
      blocks.push({ type: 'text', text: t, arabic: true }, { type: 'note', text: `${it.source}${countNote(it.count)}` })
    }
    blocks.push({ type: 'divider' })
  }
  blocks.push({ type: 'note', text: 'النصوص ومصادرها من تطبيق رفيق المسلم — صدقة جارية عن روح المرحوم الحاج قصي بديع خلفه «أبو محمد»' })
  return blocks
}

export function BookletPage() {
  const { data } = useQuran()
  const [title, setTitle] = useState('أذكار الصباح والمساء')
  const [dedication, setDedication] = useState('')
  const [cats, setCats] = useState<string[]>(['morning', 'evening'])
  const [busy, setBusy] = useState(false)
  const toggle = (id: string) => setCats((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]))
  const make = async () => {
    if (!cats.length) { toast('اختر قسمًا واحدًا على الأقل'); return }
    if (!data) { toast('لحظة… جارٍ تحميل المصحف لآيات الأذكار'); return }
    setBusy(true)
    try {
      const blob = await buildPdf(bookletBlocks({ title, dedication, cats: ALL.filter((c) => cats.includes(c.id)).map((c) => c.id) }, data), title || 'كتيّب الأذكار')
      const r = await shareImage(blob, `kutayyib-${Date.now().toString(36)}.pdf`, title || 'كتيّب الأذكار')
      toast(r === 'failed' ? 'تعذر حفظ الملف' : r === 'downloaded' ? 'نُزّل الكتيّب' : 'أُنشئ الكتيّب')
    } catch { toast('تعذر إنشاء الكتيّب') }
    setBusy(false)
  }
  return (
    <>
      <PageHead title="كتيّب الأذكار" subtitle="اصنع كتيّبًا بصيغة PDF تهديه لمن تحب" />
      <PlusGate feature="booklet" title="كتيّب الأذكار">
        <div className="stack">
          <section className="card stack" style={{ gap: 8 }}>
            <label className="field"><span>عنوان الكتيّب</span><input className="input" value={title} maxLength={60} onChange={(e) => setTitle(e.target.value)} /></label>
            <label className="field"><span>نص الإهداء (اختياري)</span><textarea className="input" rows={2} maxLength={200} value={dedication} onChange={(e) => setDedication(e.target.value)} placeholder="مثال: صدقة جارية عن روح والدي، رحمه الله" /></label>
          </section>
          <section className="card">
            <h2><BookMarked size={18} /> الأقسام</h2>
            <div className="chips">
              {ALL.map((c) => <button key={c.id} type="button" aria-pressed={cats.includes(c.id)} className={'chip' + (cats.includes(c.id) ? ' active' : '')} onClick={() => toggle(c.id)}>{c.title}</button>)}
            </div>
            <p className="small muted">{cats.length} قسم — {ALL.filter((c) => cats.includes(c.id)).reduce((a, c) => a + c.items.length, 0)} ذكرًا ودعاءً بمصادرها.</p>
          </section>
          <button className="btn btn-primary btn-block" disabled={busy} onClick={make}><FileDown size={18} /> {busy ? 'جارٍ إنشاء الكتيّب…' : 'إنشاء الكتيّب PDF ومشاركته'}</button>
        </div>
      </PlusGate>
    </>
  )
}
