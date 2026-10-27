// «تسجيلات الأذكار»: إضافة تسجيل بشري لكل ذكر مع بيانات ترخيصه (يحفظ على الجهاز فقط).
import { useMemo, useRef, useState } from 'react'
import { Pause, Play, Trash2, Upload } from 'lucide-react'
import { PageHead } from '../../components/Common'
import { ADHKAR } from '../../content/adhkar'
import { DUAS } from '../../content/duas'
import { searchSkeleton } from '../../lib/arabic'
import { toast, useLive } from '../../hooks'
import { getRecording, recordedIds, removeRecording, saveRecording, validateRecording, type DhikrRecording } from '../../services/dhikrAudio'

const ALL = [...ADHKAR, ...DUAS].flatMap((c) => c.items.filter((it) => it.text).map((it) => ({ id: it.id, cat: c.title, text: it.text!, source: it.source, sk: searchSkeleton(`${it.text} ${c.title}`) })))

export function AdhkarAudioPage() {
  const ids = useLive(() => recordedIds(), ['kv:dhikrAudio:list'], [] as string[])
  const [q, setQ] = useState('')
  const [pick, setPick] = useState<string>('')
  const [meta, setMeta] = useState({ reciter: '', source: '', license: '', rights: false })
  const [file, setFile] = useState<File | null>(null)
  const [playing, setPlaying] = useState<string | null>(null)
  const audio = useRef<HTMLAudioElement | null>(null)
  const hits = useMemo(() => { const sk = searchSkeleton(q); return sk.length < 2 ? [] : ALL.filter((x) => x.sk.includes(sk)).slice(0, 12) }, [q])
  const chosen = ALL.find((x) => x.id === pick)
  const recs = useLive(async () => (await Promise.all(ids.map((id) => getRecording(id)))).filter((r): r is DhikrRecording => !!r), ['kv:dhikrAudio:list'], [] as DhikrRecording[], [ids.join(',')])

  const play = (r: DhikrRecording) => {
    audio.current?.pause()
    if (playing === r.itemId) { setPlaying(null); return }
    const url = URL.createObjectURL(r.blob)
    const el = new Audio(url)
    audio.current = el
    el.onended = () => { setPlaying(null); URL.revokeObjectURL(url) }
    el.play().then(() => setPlaying(r.itemId)).catch(() => toast('تعذر تشغيل الملف'))
  }

  const save = async () => {
    if (!chosen || !file) return
    const err = validateRecording(file, meta)
    if (err) { toast(err); return }
    await saveRecording({ itemId: chosen.id, blob: file, reciter: meta.reciter.trim(), source: meta.source.trim(), license: meta.license.trim(), addedAt: Date.now() })
    toast('حُفظ التسجيل لهذا الذكر')
    setPick(''); setFile(null); setQ('')
  }

  return (
    <div className="page">
      <PageHead title="تسجيلات الأذكار" subtitle="أضف تسجيلًا بشريًا لذكر تملك حق استخدامه، فيُسمع بدل الصوت الآلي في تنبيهات الأذكار" />
      <section className="card">
        <p className="small" style={{ marginTop: 0 }}>لا نضع في التطبيق تسجيلات لا نملك ترخيصها. إن كان لديك تسجيل بصوت شيخ أو قارئ مع إذنه (أو بترخيص يسمح بذلك)، أضفه هنا مع بياناته. يبقى على جهازك فقط.</p>
        <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث عن الذكر بكلمة منه…" aria-label="البحث عن ذكر" />
        {hits.length > 0 && !chosen && (
          <ul className="plain stack" style={{ gap: 4, marginTop: 6 }}>
            {hits.map((h) => <li key={h.id}><button className="list-card" style={{ width: '100%' }} onClick={() => setPick(h.id)}><span className="lc-body"><strong style={{ fontWeight: 500 }}>{h.text.length > 90 ? h.text.slice(0, 90) + '…' : h.text}</strong><small>{h.cat}</small></span></button></li>)}
          </ul>
        )}
        {chosen && (
          <div className="stack" style={{ gap: 8, marginTop: 8 }}>
            <p style={{ margin: 0 }}><b>{chosen.cat}:</b> {chosen.text.length > 140 ? chosen.text.slice(0, 140) + '…' : chosen.text}</p>
            <label className="btn btn-sm" style={{ alignSelf: 'start' }}><Upload size={14} /> {file ? file.name : 'اختيار الملف الصوتي'}
              <input type="file" accept="audio/*,.mp3,.m4a,.wav,.ogg" hidden onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></label>
            <label className="field"><span>القارئ</span><input className="input" value={meta.reciter} onChange={(e) => setMeta({ ...meta, reciter: e.target.value })} /></label>
            <label className="field"><span>المصدر (موقع أو جهة)</span><input className="input" value={meta.source} onChange={(e) => setMeta({ ...meta, source: e.target.value })} /></label>
            <label className="field"><span>الترخيص أو الإذن</span><input className="input" value={meta.license} placeholder="مثال: إذن كتابي من القارئ بتاريخ…" onChange={(e) => setMeta({ ...meta, license: e.target.value })} /></label>
            <label className="check"><input type="checkbox" className="switch-input" checked={meta.rights} onChange={(e) => setMeta({ ...meta, rights: e.target.checked })} /> أؤكد أنني أملك حق استخدام هذا التسجيل</label>
            <div className="row"><button className="btn btn-primary" disabled={!file} onClick={save}>حفظ</button><button className="btn" onClick={() => { setPick(''); setFile(null) }}>إلغاء</button></div>
          </div>
        )}
      </section>
      <section className="card">
        <h2>التسجيلات المضافة ({recs.length})</h2>
        {recs.length ? (
          <ul className="plain stack" style={{ gap: 6 }}>
            {recs.map((r) => {
              const x = ALL.find((a) => a.id === r.itemId)
              return (
                <li key={r.itemId} className="card-inset">
                  <div className="small">{x ? (x.text.length > 80 ? x.text.slice(0, 80) + '…' : x.text) : r.itemId}</div>
                  <div className="small muted">بصوت {r.reciter} — {r.source} — {r.license}</div>
                  <div className="row" style={{ marginTop: 4 }}>
                    <button className="btn btn-sm" onClick={() => play(r)}>{playing === r.itemId ? <><Pause size={14} /> إيقاف</> : <><Play size={14} /> استمع</>}</button>
                    <button className="btn btn-ghost btn-sm" onClick={async () => { await removeRecording(r.itemId); toast('حُذف التسجيل') }}><Trash2 size={14} /> حذف</button>
                  </div>
                </li>
              )
            })}
          </ul>
        ) : <p className="small muted">لا توجد تسجيلات بعد.</p>}
      </section>
    </div>
  )
}
