// «دعاء لفقيدي» — مجاني للجميع: يكتب المستخدم اسم فقيده (يبقى على جهازه)، ويجد الأدعية المأثورة للميت
// من صحيح السنة ومن القرآن كما هي، ويشاركها مع أهله. لا نصوص من عندنا ولا فضائل غير موثقة.
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { HeartHandshake, Share2 } from 'lucide-react'
import { PageHead } from '../../components/Common'
import { kv } from '../../db/repos'
import { shareText } from '../../platform'
import { toast } from '../../hooks'

import { DECEASED_DUAS } from '../../content/deceased'
export { DECEASED_DUAS }
const HADITH = { text: 'إِذَا مَاتَ الْإِنْسَانُ انْقَطَعَ عَنْهُ عَمَلُهُ إِلَّا مِنْ ثَلَاثَةٍ: إِلَّا مِنْ صَدَقَةٍ جَارِيَةٍ، أَوْ عِلْمٍ يُنْتَفَعُ بِهِ، أَوْ وَلَدٍ صَالِحٍ يَدْعُو لَهُ', source: 'رواه مسلم (1631)' }

const KEY = 'deceased:names'

export function DeceasedPage() {
  const [names, setNames] = useState<string[]>([])
  const [name, setName] = useState('')
  useEffect(() => { kv.get<string[]>(KEY, []).then(setNames) }, [])
  const save = (l: string[]) => { setNames(l); kv.set(KEY, l) }
  const share = async (d: (typeof DECEASED_DUAS)[number]) => {
    const who = names.length ? `ادعوا لـ ${names.join(' و')} رحمهم الله:\n\n` : ''
    const r = await shareText('دعاء للميت', `${who}${d.text}\n\n${d.source}\n— من تطبيق رفيق المسلم`)
    toast(r === 'shared' ? 'تمت المشاركة' : r === 'copied' ? 'نُسخ الدعاء' : 'تعذرت المشاركة')
  }
  return (
    <>
      <PageHead title="دعاء لفقيدي" subtitle="الأدعية المأثورة للميت، لمن فقدنا من أحبتنا" />
      <div className="stack">
        <section className="card stack">
          <h2><HeartHandshake size={18} /> أحبتي الذين رحلوا</h2>
          <p className="muted small">تُحفظ الأسماء على جهازك فقط، لتتذكرهم بالدعاء وتشاركه مع أهلك.</p>
          {names.length > 0 && <div className="chips">{names.map((n, i) => <button key={i} className="chip" onClick={() => save(names.filter((_, k) => k !== i))} aria-label={`إزالة ${n}`}>{n} ✕</button>)}</div>}
          <div className="row gap">
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="الاسم" aria-label="اسم الفقيد" />
            <button className="btn btn-primary" disabled={!name.trim()} onClick={() => { save([...names, name.trim()]); setName('') }}>إضافة</button>
          </div>
        </section>
        <section className="card">
          <blockquote className="dhikr-text">«{HADITH.text}»</blockquote>
          <p className="muted small">{HADITH.source}</p>
        </section>
        {DECEASED_DUAS.map((d) => (
          <section className="card stack" key={d.id}>
            {names.length > 0 && <p className="muted small">{names.length === 1 ? `ادعُ لـ ${names[0]}` : `ادعُ لـ ${names.join(' و')}`}</p>}
            <p className="dhikr-text">«{d.text}»</p>
            <p className="muted small">{d.note} — {d.source}. ويُقال للمرأة بضمائر المؤنث.</p>
            <button className="btn btn-sm" onClick={() => share(d)}><Share2 size={14} /> مشاركة</button>
          </section>
        ))}
        <section className="card">
          <p>وفي القرآن الكريم أدعية للوالدين وللمؤمنين، مثل: ﴿رَبَّنَا اغْفِرْ لِي وَلِوَالِدَيَّ وَلِلْمُؤْمِنِينَ يَوْمَ يَقُومُ الْحِسَابُ﴾ [إبراهيم: 41].</p>
          <Link className="btn" to="/duas/parents">أدعية الوالدين والأموات كاملة</Link>
        </section>
      </div>
    </>
  )
}
