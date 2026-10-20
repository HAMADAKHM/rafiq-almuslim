import { useState } from 'react'
import { toast, useLive } from '../../hooks'
import { notes } from '../../db/repos'
import type { Note } from '../../db/db'

/** ملاحظات المستخدم الشخصية على آية — تُحفظ على جهازه فقط */
export function NoteEditor({ surah, ayah, onClose }: { surah: number; ayah: number; onClose: () => void }) {
  const existing = useLive(() => notes.forAyah(surah, ayah), ['notes'], [] as Note[], [surah, ayah])
  const [text, setText] = useState('')
  const [editing, setEditing] = useState<Note | null>(null)
  return (
    <div className="stack" style={{ gap: 8 }}>
      {existing.map((n) => (
        <div key={n.id} className="spread small" style={{ borderBottom: '1px solid var(--border)', padding: '0.4rem 0' }}>
          <span style={{ whiteSpace: 'pre-wrap', flex: 1 }}>{n.text}</span>
          <span className="row">
            <button className="btn btn-ghost btn-sm" onClick={() => { setEditing(n); setText(n.text) }}>تعديل</button>
            <button className="btn btn-ghost btn-sm" onClick={() => n.id && notes.remove(n.id)}>حذف</button>
          </span>
        </div>
      ))}
      <label className="field">
        <span>{editing ? 'تعديل الملاحظة' : 'ملاحظة جديدة (تُحفظ على جهازك فقط)'}</span>
        <textarea className="input" rows={3} value={text} onChange={(e) => setText(e.target.value)} />
      </label>
      <div className="row">
        <button className="btn btn-primary btn-sm" disabled={!text.trim()} onClick={async () => {
          await notes.save({ id: editing?.id, surah, ayah, text: text.trim(), createdAt: editing?.createdAt })
          setText(''); setEditing(null); toast('حُفظت الملاحظة')
        }}>حفظ</button>
        <button className="btn btn-ghost btn-sm" onClick={onClose}>إغلاق</button>
      </div>
    </div>
  )
}
