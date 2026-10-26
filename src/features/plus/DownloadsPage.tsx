// تنزيلات رفيق بلس: أجزاء كاملة أو المصحف كله بصوت القارئ دفعة واحدة، للاستماع دون إنترنت.
// تنزيل السورة الواحدة يبقى مجانيًا في صفحة الاستماع كما هو.
import { useEffect, useRef, useState } from 'react'
import { Download, Trash2, Check, X } from 'lucide-react'
import { PageHead, ProgressBar, Spinner } from '../../components/Common'
import { PlusGate } from '../../billing/PlusGate'
import { useQuran } from '../../hooks'
import { useSettings } from '../../state/SettingsContext'
import { RECITERS, reciterById } from '../../content/reciters'
import { downloadSurah, isSurahDownloaded, removeSurahDownload } from '../../services/audio'
import { toArabicDigits } from '../../lib/arabic'

const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i)
export const COLLECTIONS: { id: string; label: string; surahs: number[] }[] = [
  { id: 'amma', label: 'جزء عمّ (النبأ – الناس)', surahs: range(78, 114) },
  { id: 'tabarak', label: 'جزء تبارك (الملك – المرسلات)', surahs: range(67, 77) },
  { id: 'daily', label: 'سور يومية: الكهف، يس، السجدة، الواقعة، الملك، الرحمن', surahs: [18, 36, 32, 56, 67, 55] },
  { id: 'long', label: 'السبع الطوال (البقرة – التوبة)', surahs: range(2, 9) },
  { id: 'all', label: 'المصحف كاملًا (114 سورة)', surahs: range(1, 114) },
]

export function DownloadsPage() {
  const { data } = useQuran()
  const { settings, update } = useSettings()
  const [have, setHave] = useState<Set<number>>(new Set())
  const [job, setJob] = useState<{ id: string; done: number; total: number; surah: number } | null>(null)
  const [msg, setMsg] = useState('')
  const abort = useRef<AbortController | null>(null)
  const rec = reciterById(settings.reciterId)

  const refresh = async () => {
    const s = new Set<number>()
    for (let i = 1; i <= 114; i++) if (await isSurahDownloaded(settings.reciterId, i)) s.add(i)
    setHave(s)
  }
  useEffect(() => { refresh() }, [settings.reciterId]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => abort.current?.abort(), [])
  if (!data) return <Spinner />
  const count = (ss: number[]) => ss.reduce((n, x) => n + data.meta.surahs[x - 1].count, 0)

  const run = async (c: (typeof COLLECTIONS)[number]) => {
    abort.current?.abort()
    const ctrl = new AbortController()
    abort.current = ctrl
    const todo = c.surahs.filter((x) => !have.has(x))
    const total = count(todo)
    let base = 0
    setMsg('')
    try {
      for (const x of todo) {
        const n = data.meta.surahs[x - 1].count
        setJob({ id: c.id, done: base, total, surah: x })
        await downloadSurah(settings.reciterId, x, n, (d) => setJob({ id: c.id, done: base + d, total, surah: x }), ctrl.signal)
        base += n
        setHave((h) => new Set(h).add(x))
      }
      setMsg(`اكتمل تنزيل «${c.label}» بصوت ${rec.name}. يعمل الآن دون إنترنت.`)
    } catch (e) {
      setMsg(ctrl.signal.aborted ? 'أُوقف التنزيل. ما اكتمل من السور يبقى محفوظًا.' : (e as Error).message || 'تعذر التنزيل — تحقق من الإنترنت ثم أعد المحاولة لإكمال الباقي.')
    } finally { setJob(null) }
  }

  const removeAll = async () => {
    for (const x of [...have]) await removeSurahDownload(settings.reciterId, x, data.meta.surahs[x - 1].count)
    setHave(new Set())
    setMsg('حُذفت تنزيلات هذا القارئ.')
  }

  return (
    <div className="page">
      <PageHead title="تنزيلات بلس" subtitle="أجزاء كاملة أو المصحف كله للاستماع دون إنترنت" />
      <PlusGate feature="downloads" title="تنزيل الأجزاء والمصحف كاملًا">
        <section className="card">
          <label className="field"><span>القارئ</span>
            <select className="select" value={settings.reciterId} disabled={!!job} onChange={(e) => update({ reciterId: e.target.value })}>{RECITERS.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select>
          </label>
          <p className="muted small">المنزّل: {toArabicDigits(have.size)} من ١١٤ سورة بصوت {rec.name}. المصحف كاملًا قد يقارب نصف جيجابايت أو أكثر بحسب القارئ، فيُفضّل التنزيل عبر Wi-Fi.</p>
        </section>
        {COLLECTIONS.map((c) => {
          const missing = c.surahs.filter((x) => !have.has(x))
          const running = job?.id === c.id
          return (
            <section className="card dl-row" key={c.id}>
              <div><b>{c.label}</b><small className="muted">{toArabicDigits(c.surahs.length)} سورة • {toArabicDigits(count(c.surahs))} آية</small></div>
              {running ? (
                <div className="dl-progress">
                  <ProgressBar value={job!.total ? job!.done / job!.total : 0} label="تقدم التنزيل" />
                  <small>سورة {data.meta.surahs[job!.surah - 1].name} — {toArabicDigits(Math.round((job!.done / Math.max(1, job!.total)) * 100))}٪</small>
                  <button className="btn btn-sm" onClick={() => abort.current?.abort()}><X size={14} /> إيقاف</button>
                </div>
              ) : missing.length === 0 ? <span className="badge"><Check size={14} /> منزّل كاملًا</span>
                : <button className="btn btn-primary" disabled={!!job} onClick={() => run(c)}><Download size={16} /> {missing.length < c.surahs.length ? `إكمال (${toArabicDigits(missing.length)} سورة)` : 'تنزيل'}</button>}
            </section>
          )
        })}
        {msg && <p className="notice" role="status">{msg}</p>}
        {have.size > 0 && !job && <button className="btn btn-danger" onClick={removeAll}><Trash2 size={16} /> حذف كل تنزيلات هذا القارئ</button>}
      </PlusGate>
    </div>
  )
}
