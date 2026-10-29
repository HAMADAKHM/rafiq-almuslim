// «أذكار الأحبة» (رفيق بلس): ملف لكل عزيز بأدعيته المختارة من المكتبة الموثقة بحسب صلته، وأدعية تكتبها،
// مع تصدير الملف PDF للمشاركة، وتذكير يومي اختياري. كل شيء على الجهاز فقط.
import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Bell, FileDown, Plus, Trash2, Users } from 'lucide-react'
import { PageHead } from '../../components/Common'
import { PlusGate } from '../../billing/PlusGate'
import { useQuran, toast } from '../../hooks'
import { useSettings } from '../../state/SettingsContext'
import { findItem, itemText } from '../../content/itemText'
import { loadBeloved, MAX_PROFILES, newProfile, RELATIONS, relationLabel, saveBeloved, type BelovedProfile, type Relation } from '../../services/beloved'
import { buildPdf, type PdfBlock } from '../../services/pdf'
import { shareImage } from '../../platform'
import { MAX_CUSTOM } from '../../services/reminders'

export function belovedBlocks(p: BelovedProfile, text: (id: string) => { text: string; source: string; quran: boolean } | null): PdfBlock[] {
  const blocks: PdfBlock[] = [
    { type: 'title', text: `أدعية لـ${p.name}` },
    { type: 'subtitle', text: relationLabel(p.relation) },
    { type: 'divider' },
  ]
  for (const id of p.items) {
    const t = text(id)
    if (!t) continue
    blocks.push({ type: 'text', text: t.text, arabic: true }, { type: 'note', text: t.source }, { type: 'divider' })
  }
  for (const c of p.custom) blocks.push({ type: 'text', text: c }, { type: 'note', text: 'دعاء كتبته بنفسي' }, { type: 'divider' })
  return blocks
}

export function BelovedPage() {
  const [list, setList] = useState<BelovedProfile[] | null>(null)
  const [params, setParams] = useSearchParams()
  const sel = params.get('p')
  const [name, setName] = useState('')
  const [rel, setRel] = useState<Relation>('parents')
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const { data } = useQuran()
  const { settings, update } = useSettings()
  useEffect(() => { loadBeloved().then(setList) }, [])
  const persist = async (next: BelovedProfile[]) => { setList(next); await saveBeloved(next) }
  const cur = list?.find((x) => x.id === sel) ?? null
  const text = useMemo(() => (id: string) => {
    const it = findItem(id)
    if (!it) return null
    const t = itemText(data, it)
    return t ? { text: t, source: it.source, quran: it.kind === 'quran' } : null
  }, [data])

  const add = async () => {
    if (!name.trim()) { toast('اكتب الاسم أولًا'); return }
    if ((list?.length ?? 0) >= MAX_PROFILES) { toast(`الحد ${MAX_PROFILES} ملفًا`); return }
    const p = newProfile(name, rel)
    await persist([...(list ?? []), p])
    setName('')
    setParams({ p: p.id })
  }
  const patch = (fn: (p: BelovedProfile) => BelovedProfile) => cur && persist(list!.map((x) => (x.id === cur.id ? fn(x) : x)))
  const pdf = async () => {
    if (!cur) return
    setBusy(true)
    try {
      const blob = await buildPdf(belovedBlocks(cur, text), `أدعية لـ${cur.name}`)
      const r = await shareImage(blob, `adiyah-${cur.id}.pdf`, `أدعية لـ${cur.name}`)
      toast(r === 'failed' ? 'تعذر حفظ الملف' : r === 'downloaded' ? 'نُزّل ملف PDF' : 'أُنشئ ملف PDF')
    } catch { toast('تعذر إنشاء الملف') }
    setBusy(false)
  }
  const remind = () => {
    if (!cur) return
    if (settings.customReminders.length >= MAX_CUSTOM) { toast(`الحد ${MAX_CUSTOM} تذكيرات خاصة`); return }
    update((s) => ({ customReminders: [...s.customReminders, { id: `bl-${cur.id}-${Date.now().toString(36)}`, title: `ادعُ لـ${cur.name} 🤍`, time: '21:00', days: [0, 1, 2, 3, 4, 5, 6], route: `/beloved?p=${cur.id}`, enabled: true }] }))
    toast('أُضيف تذكير يومي الساعة 9 مساءً — عدّله من «تذكيرات خاصة»')
  }

  return (
    <>
      <PageHead title="أذكار الأحبة" subtitle="ملف لكل عزيز عليك: أدعيته في مكان واحد، تدعو له متى شئت" />
      <PlusGate feature="beloved" title="أذكار الأحبة">
        {!list ? null : cur ? (
          <div className="stack">
            <section className="card stack" style={{ gap: 8 }}>
              <div className="spread">
                <h2 style={{ margin: 0 }}>{cur.name} <span className="small muted">— {relationLabel(cur.relation)}</span></h2>
                <button className="btn btn-sm" onClick={() => setParams({})}>كل الأحبة</button>
              </div>
              <div className="row" style={{ flexWrap: 'wrap' }}>
                <button className="btn btn-sm btn-primary" disabled={busy} onClick={pdf}><FileDown size={14} /> {busy ? 'جارٍ إنشاء الملف…' : 'ملف PDF للمشاركة'}</button>
                <button className="btn btn-sm" onClick={remind}><Bell size={14} /> ذكّرني يوميًا بالدعاء</button>
                <button className="btn btn-sm btn-ghost" onClick={async () => { if (confirm(`حذف ملف ${cur.name}؟`)) { await persist(list.filter((x) => x.id !== cur.id)); setParams({}) } }}><Trash2 size={14} /> حذف الملف</button>
              </div>
            </section>
            {cur.items.map((id) => {
              const t = text(id)
              if (!t) return null
              return (
                <article key={id} className="card">
                  <p className={t.quran ? 'quran-text' : 'dhikr-text'} style={{ margin: 0 }}>{t.text}</p>
                  <div className="spread" style={{ marginTop: 6 }}>
                    <span className="small muted">{t.source}</span>
                    <button className="btn btn-ghost btn-sm icon-btn" aria-label="إزالة الدعاء من الملف" onClick={() => patch((p) => ({ ...p, items: p.items.filter((x) => x !== id) }))}><Trash2 size={14} /></button>
                  </div>
                </article>
              )
            })}
            {cur.custom.map((c, i) => (
              <article key={`c${i}`} className="card">
                <p className="dhikr-text" style={{ margin: 0 }}>{c}</p>
                <div className="spread" style={{ marginTop: 6 }}>
                  <span className="small muted">دعاء كتبته بنفسك — لا يُنسب إلى السنة</span>
                  <button className="btn btn-ghost btn-sm icon-btn" aria-label="حذف الدعاء" onClick={() => patch((p) => ({ ...p, custom: p.custom.filter((_, k) => k !== i) }))}><Trash2 size={14} /></button>
                </div>
              </article>
            ))}
            <section className="card stack" style={{ gap: 8 }}>
              <h3 style={{ margin: 0 }}>أضف دعاءً</h3>
              <textarea className="input" rows={3} value={draft} maxLength={600} onChange={(e) => setDraft(e.target.value)} placeholder={`اللهم احفظ ${cur.name}…`} aria-label="دعاء جديد" />
              <button className="btn btn-sm" style={{ alignSelf: 'start' }} disabled={!draft.trim()} onClick={async () => { await patch((p) => ({ ...p, custom: [...p.custom, draft.trim()] })); setDraft('') }}><Plus size={14} /> إضافة</button>
              <div className="small muted">أو من المكتبة الموثقة:</div>
              <div className="chips">
                {RELATIONS.flatMap((r) => r.suggest).filter((id, i, a) => a.indexOf(id) === i && !cur.items.includes(id)).slice(0, 10).map((id) => {
                  const it = findItem(id)
                  return it ? <button key={id} className="chip" onClick={() => patch((p) => ({ ...p, items: [...p.items, id] }))}>+ {it.source}</button> : null
                })}
              </div>
            </section>
          </div>
        ) : (
          <div className="stack">
            {list.length > 0 && (
              <ul className="plain stack" style={{ gap: 6 }}>
                {list.map((p) => (
                  <li key={p.id}><button className="list-card" style={{ width: '100%' }} onClick={() => setParams({ p: p.id })}>
                    <span className="icon-chip"><Users size={20} /></span><span className="lc-body"><strong>{p.name}</strong><small>{relationLabel(p.relation)} • {p.items.length + p.custom.length} دعاء</small></span>
                  </button></li>
                ))}
              </ul>
            )}
            <section className="card stack" style={{ gap: 8 }}>
              <h2 style={{ margin: 0 }}>ملف جديد</h2>
              <input className="input" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} placeholder="الاسم، مثل: أمي" aria-label="الاسم" />
              <div className="chips" role="radiogroup" aria-label="الصلة">
                {RELATIONS.map((r) => <button key={r.id} role="radio" aria-checked={rel === r.id} className={'chip' + (rel === r.id ? ' active' : '')} onClick={() => setRel(r.id)}>{r.label}</button>)}
              </div>
              <button className="btn btn-primary" style={{ alignSelf: 'start' }} onClick={add}><Plus size={16} /> إنشاء الملف</button>
              <p className="small muted" style={{ margin: 0 }}>نضع لك أدعية مناسبة من القرآن والسنة بمصادرها، وتضيف ما شئت. للميت أيضًا: <Link to="/for-the-deceased">دعاء لفقيدي</Link>.</p>
            </section>
          </div>
        )}
      </PlusGate>
    </>
  )
}
