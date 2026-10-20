import { useEffect, useMemo, useState } from 'react'
import { Pencil, Plus, Trash2, Play } from 'lucide-react'
import { Empty, PageHead } from '../../components/Common'
import { ConfirmSheet, Sheet } from '../../components/Sheet'
import { kv } from '../../db/repos'
import { toast, useLive } from '../../hooks'
import { dayKey } from '../../lib/dates'
import type { DhikrItem } from '../../content/types'
import { AdhkarSession } from './AdhkarSession'
import { LibraryTabs } from './AdhkarPage'

export interface MyDhikr { id: string; text: string; count?: number; note?: string; createdAt: string }

export const MY_ADHKAR_KEY = 'myAdhkar'
export const MY_TEXT_MAX = 600

/** تحويل الذكر الشخصي إلى عنصر عرض موحد، مع تمييزه بنوع «شخصي» وعدم نسبته إلى السنة */
export function toItem(d: MyDhikr): DhikrItem {
  return { id: d.id, text: d.text, count: d.count, note: d.note, kind: 'personal', source: 'ذكر شخصي أضافه المستخدم' }
}

export function validateDhikr(text: string, count: string): string | null {
  const t = text.trim()
  if (!t) return 'اكتب نص الذكر'
  if (t.length > MY_TEXT_MAX) return `النص أطول من ${MY_TEXT_MAX} حرف`
  if (count && (!Number.isInteger(Number(count)) || Number(count) < 1 || Number(count) > 10000)) return 'العدد بين 1 و10000'
  return null
}

function Editor({ initial, onSave, onClose }: { initial?: MyDhikr; onSave: (d: Omit<MyDhikr, 'id' | 'createdAt'>) => void; onClose: () => void }) {
  const [text, setText] = useState(initial?.text ?? '')
  const [count, setCount] = useState(initial?.count ? String(initial.count) : '')
  const [note, setNote] = useState(initial?.note ?? '')
  const err = validateDhikr(text, count)
  return (
    <form className="stack" onSubmit={(e) => { e.preventDefault(); if (!err) onSave({ text: text.trim(), count: count ? Number(count) : undefined, note: note.trim() || undefined }) }}>
      <label className="field"><span>نص الذكر</span>
        <textarea className="input" rows={4} value={text} maxLength={MY_TEXT_MAX} onChange={(e) => setText(e.target.value)} placeholder="مثال: اللهم اغفر لوالديّ" />
      </label>
      <div className="grid grid-2" style={{ gap: '0.75rem' }}>
        <label className="field"><span>عدد التكرار (اختياري)</span><input className="input" type="number" min={1} max={10000} value={count} onChange={(e) => setCount(e.target.value)} /></label>
        <label className="field"><span>ملاحظة (اختيارية)</span><input className="input" value={note} maxLength={120} onChange={(e) => setNote(e.target.value)} /></label>
      </div>
      <p className="small muted" style={{ margin: 0 }}>يُحفظ على جهازك فقط، ويظهر بوسم «ذكر شخصي» ولا يُنسب إلى السنة.</p>
      {text && err && <p className="small" style={{ color: 'var(--danger)', margin: 0 }} role="alert">{err}</p>}
      <div className="row"><button className="btn btn-primary" disabled={!!err}>حفظ الذكر</button><button type="button" className="btn btn-ghost" onClick={onClose}>إلغاء</button></div>
    </form>
  )
}

export function MyAdhkarPage() {
  const list = useLive(() => kv.get<MyDhikr[]>(MY_ADHKAR_KEY, []), ['kv:' + MY_ADHKAR_KEY], [] as MyDhikr[])
  const [editing, setEditing] = useState<MyDhikr | 'new' | null>(null)
  const [del, setDel] = useState<MyDhikr | null>(null)
  const [session, setSession] = useState(false)
  const today = dayKey()
  const progressKey = `myadhkar:progress:${today}`
  const saved = useLive(() => kv.get<Record<string, number>>(progressKey, {}), ['kv:' + progressKey], {} as Record<string, number>, [progressKey])
  const [counts, setCounts] = useState<Record<string, number>>({})
  useEffect(() => setCounts(saved), [saved])
  const setCount = (id: string, n: number) => setCounts((prev) => { const next = { ...prev, [id]: n }; kv.set(progressKey, next).catch(() => {}); return next })
  const items = useMemo(() => list.map(toItem), [list])

  const save = async (d: Omit<MyDhikr, 'id' | 'createdAt'>) => {
    const next = editing && editing !== 'new'
      ? list.map((x) => (x.id === editing.id ? { ...x, ...d } : x))
      : [...list, { ...d, id: 'my-' + Date.now().toString(36), createdAt: today }]
    await kv.set(MY_ADHKAR_KEY, next)
    toast('حُفظ الذكر')
    setEditing(null)
  }

  return (
    <>
      <PageHead title="أذكاري الشخصية" subtitle="أضف أذكارًا وأدعية خاصة بك، مع عدّاد وحفظ للتقدم" />
      <LibraryTabs />
      <p className="alert alert-gold small">هذه أذكار تضيفها بنفسك، وتظهر بوسم «ذكر شخصي — ليس من المأثور» حتى لا تختلط بالأذكار الثابتة في السنة.</p>
      <div className="row" style={{ marginBottom: '1rem' }}>
        <button className="btn btn-primary" onClick={() => setEditing('new')}><Plus size={16} /> إضافة ذكر</button>
        {items.length > 0 && <button className="btn" aria-pressed={session} onClick={() => setSession((s) => !s)}><Play size={16} /> {session ? 'عرض القائمة' : 'ابدأ الجلسة'}</button>}
      </div>
      {items.length === 0 && <Empty>لم تضف أذكارًا شخصية بعد.</Empty>}
      {session && items.length > 0 ? (
        <AdhkarSession items={items} counts={counts} onCount={setCount} doneLabel="أتممت أذكارك" />
      ) : (
        <div className="list-stack">
          {list.map((d) => (
            <article key={d.id} className="card my-dhikr">
              <span className="badge badge-personal">ذكر شخصي — ليس من المأثور</span>
              <p className="classic-text" style={{ margin: '0.4rem 0' }}>{d.text}</p>
              <div className="spread small muted">
                <span>{d.count ? `${d.count} مرة` : 'بلا عدد محدد'}{d.note ? ` • ${d.note}` : ''}</span>
                <span className="row">
                  <button className="btn btn-ghost btn-sm icon-btn" aria-label="تعديل الذكر" onClick={() => setEditing(d)}><Pencil size={15} /></button>
                  <button className="btn btn-ghost btn-sm icon-btn" aria-label="حذف الذكر" onClick={() => setDel(d)}><Trash2 size={15} /></button>
                </span>
              </div>
            </article>
          ))}
        </div>
      )}
      <Sheet open={!!editing} onClose={() => setEditing(null)} title={editing === 'new' ? 'ذكر جديد' : 'تعديل الذكر'}>
        {editing && <Editor initial={editing === 'new' ? undefined : editing} onSave={save} onClose={() => setEditing(null)} />}
      </Sheet>
      <ConfirmSheet open={!!del} onClose={() => setDel(null)} title="حذف الذكر" message="سيُحذف هذا الذكر الشخصي من جهازك." confirmLabel="حذف" danger
        onConfirm={async () => { if (del) { await kv.set(MY_ADHKAR_KEY, list.filter((x) => x.id !== del.id)); toast('حُذف') } }} />
    </>
  )
}
