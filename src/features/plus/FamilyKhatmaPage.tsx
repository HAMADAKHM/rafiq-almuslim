// ختمة العائلة (رفيق بلس): توزيع الأجزاء ومتابعتها ومشاركتها برسالة.
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Users, Share2, Plus, Trash2 } from 'lucide-react'
import { PageHead, ProgressBar, Spinner } from '../../components/Common'
import { PlusGate } from '../../billing/PlusGate'
import { useQuran, toast } from '../../hooks'
import { kv } from '../../db/repos'
import { firstAyahOf } from '../../services/quran'
import { juzOf, newFamilyKhatma, shareMessage, type FamilyKhatma } from '../../services/familyKhatma'
import { shareText } from '../../platform'
import { dayKey } from '../../lib/dates'
import { toArabicDigits } from '../../lib/arabic'

const KEY = 'family:khatmas'

export function FamilyKhatmaPage() {
  const { data } = useQuran()
  const [list, setList] = useState<FamilyKhatma[] | null>(null)
  const [name, setName] = useState('ختمة العائلة')
  const [ded, setDed] = useState('')
  const [members, setMembers] = useState<string[]>(['', '', ''])
  useEffect(() => { kv.get<FamilyKhatma[]>(KEY, []).then(setList) }, [])
  if (!data || !list) return <Spinner />
  const save = (l: FamilyKhatma[]) => { setList(l); kv.set(KEY, l) }
  const juzStart = (j: number) => { const r = firstAyahOf(data.meta, 'juz', j); return r ? `سورة ${data.meta.surahs[r.surah - 1].name} ${toArabicDigits(r.ayah)}` : '' }
  const valid = members.filter((m) => m.trim()).length

  return (
    <div className="page">
      <PageHead title="ختمة العائلة" subtitle="وزّع الأجزاء على الأهل والأصدقاء وتابع إتمامها" />
      <PlusGate feature="family" title="ختمة العائلة">
        {list.map((k) => {
          const done = k.done.filter(Boolean).length
          return (
            <section className="card stack" key={k.id}>
              <h2><Users size={18} /> {k.name}</h2>
              {k.dedication && <p className="muted">{k.dedication}</p>}
              <ProgressBar value={done / 30} label="تقدم الختمة" />
              <p className="small muted">تمّ {toArabicDigits(done)} من ٣٠ جزءًا</p>
              {k.members.map((m, i) => (
                <div key={i} className="family-member">
                  <b>{m}</b>
                  <div className="chips">
                    {juzOf(k, i).map((j) => (
                      <button key={j} className={'chip' + (k.done[j - 1] ? ' active' : '')} aria-pressed={k.done[j - 1]} title={juzStart(j)}
                        onClick={() => save(list.map((x) => (x.id === k.id ? { ...x, done: x.done.map((d, n) => (n === j - 1 ? !d : d)) } : x)))}>
                        {k.done[j - 1] ? '✓ ' : ''}الجزء {toArabicDigits(j)}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              <div className="row wrap gap">
                <button className="btn btn-gold" onClick={async () => { const r = await shareText(k.name, shareMessage(k, juzStart)); toast(r === 'shared' ? 'تمت المشاركة' : r === 'copied' ? 'نُسخت الرسالة — الصقها في واتساب' : 'تعذرت المشاركة') }}><Share2 size={16} /> مشاركة التوزيع</button>
                {k.done.includes(false) && <Link className="btn" to={`/mushaf/${data.meta.page[data.meta.juz.indexOf(k.done.indexOf(false) + 1)] ?? 1}`}>افتح أول جزء لم يتم</Link>}
                <button className="btn btn-danger" onClick={() => { if (confirm('حذف هذه الختمة؟')) save(list.filter((x) => x.id !== k.id)) }}><Trash2 size={16} /> حذف</button>
              </div>
            </section>
          )
        })}
        <section className="card stack">
          <h2>ختمة جديدة</h2>
          <label className="field"><span>الاسم</span><input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} /></label>
          <label className="field"><span>إهداء (اختياري)</span><input value={ded} onChange={(e) => setDed(e.target.value)} maxLength={120} placeholder="مثال: عن روح الوالد رحمه الله" /></label>
          <div className="stack" style={{ gap: '0.4rem' }}>
            <span className="small muted">المشاركون (حتى ٣٠)</span>
            {members.map((m, i) => (
              <div className="row gap" key={i}>
                <input value={m} aria-label={`المشارك ${i + 1}`} placeholder={`اسم المشارك ${toArabicDigits(i + 1)}`} onChange={(e) => setMembers(members.map((x, k) => (k === i ? e.target.value : x)))} />
                {members.length > 1 && <button className="icon-btn" aria-label="حذف" onClick={() => setMembers(members.filter((_, k) => k !== i))}><Trash2 size={16} /></button>}
              </div>
            ))}
            {members.length < 30 && <button className="btn btn-sm" onClick={() => setMembers([...members, ''])}><Plus size={14} /> مشارك آخر</button>}
          </div>
          <p className="small muted">{valid ? `كل مشارك يقرأ نحو ${toArabicDigits(Math.ceil(30 / valid))} ${Math.ceil(30 / valid) > 10 ? 'جزءًا' : 'أجزاء'}.` : 'اكتب أسماء المشاركين.'} تُشارَك الرسالة بالأسماء والأجزاء، ويتابع المنظّم الإتمام هنا.</p>
          <button className="btn btn-primary" disabled={!valid} onClick={() => { save([newFamilyKhatma(name, ded, members, dayKey(new Date())), ...list]); setMembers(['', '', '']); setDed('') }}>إنشاء الختمة وتوزيع الأجزاء</button>
        </section>
      </PlusGate>
    </div>
  )
}
