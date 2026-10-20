import { useMemo, useState } from 'react'
import { Eye, EyeOff, Headphones, Pause, Play, Plus, Trash2 } from 'lucide-react'
import { Empty, PageHead, ProgressBar, Spinner, Tabs } from '../../components/Common'
import { toast, useLive, useQuran } from '../../hooks'
import { kv, memo } from '../../db/repos'
import type { MemoLog, MemoSegment } from '../../db/db'
import { applyGrade, effectiveStatus, GRADE_LABELS, initialSrs, splitRange, STATUS_LABELS, type Grade } from '../../services/srs'
import { dayKey } from '../../lib/dates'
import { toArabicDigits } from '../../lib/arabic'
import { player } from '../../services/audio'
import { useSettings } from '../../state/SettingsContext'
import type { QuranData } from '../../services/quran'

type Tab = 'today' | 'add' | 'all'

export function MemorizePage() {
  const { data } = useQuran()
  const [tab, setTab] = useState<Tab>('today')
  const segs = useLive(() => memo.all(), ['memo'], [] as MemoSegment[])
  const dailyNew = useLive(() => kv.get<number>('memo:dailyNew', 1), ['kv:memo:dailyNew'], 1)
  const today = dayKey()

  const active = segs.filter((s) => !s.paused)
  const due = active.filter((s) => s.status !== 'new' && s.due <= today).sort((a, b) => a.due.localeCompare(b.due))
  const logs = useLive(() => memo.logs(), ['memoLog'], [] as MemoLog[])
  const learnedToday = new Set(logs.filter((l) => l.date === today && l.kind === 'learn').map((l) => l.segmentId)).size
  const fresh = active.filter((s) => s.status === 'new').sort((a, b) => (a.id ?? 0) - (b.id ?? 0)).slice(0, Math.max(0, dailyNew - learnedToday))
  const memorizedAyahs = segs.filter((s) => ['memorized', 'review'].includes(effectiveStatus(s, today))).reduce((n, s) => n + s.to - s.from + 1, 0)
  const totalAyahs = segs.reduce((n, s) => n + s.to - s.from + 1, 0)
  if (!data) return <Spinner />

  return (
    <>
      <PageHead title="الحفظ والمراجعة" subtitle="حفظ تدريجي بمقاطع صغيرة، ومراجعة متباعدة بحسب مستوى إتقانك" />
      <div className="grid grid-3" style={{ marginBottom: '1rem' }}>
        <div className="card stat"><b>{due.length}</b><span className="muted small">مراجعة مستحقة اليوم</span></div>
        <div className="card stat"><b>{fresh.length}</b><span className="muted small">مقاطع جديدة لليوم</span></div>
        <div className="card stat"><b>{memorizedAyahs} / {totalAyahs}</b><span className="muted small">آيات محفوظة من أهدافك</span><ProgressBar value={totalAyahs ? memorizedAyahs / totalAyahs : 0} label="نسبة الحفظ" /></div>
      </div>
      <Tabs value={tab} onChange={setTab} label="أقسام الحفظ" items={[{ id: 'today', label: 'جلسة اليوم' }, { id: 'add', label: 'هدف حفظ جديد' }, { id: 'all', label: 'كل المقاطع' }]} />
      {tab === 'today' && <TodaySession data={data} queue={[...due, ...fresh]} today={today} onAdd={() => setTab('add')} hasAny={segs.length > 0} />}
      {tab === 'add' && <AddGoal data={data} dailyNew={dailyNew} onDone={() => setTab('today')} />}
      {tab === 'all' && <AllSegments data={data} segs={segs} today={today} />}
    </>
  )
}

function TodaySession({ data, queue, today, onAdd, hasAny }: { data: QuranData; queue: MemoSegment[]; today: string; onAdd: () => void; hasAny: boolean }) {
  const [idx, setIdx] = useState(0)
  if (!hasAny) return <Empty><p>لم تحدد هدف حفظ بعد.</p><button className="btn btn-primary" onClick={onAdd}><Plus size={16} /> أضف هدف حفظ</button></Empty>
  if (!queue.length) return <Empty>أتممت حفظ اليوم ومراجعته. بارك الله فيك. يمكنك العودة غدًا، أو زيادة المقاطع الجديدة من «هدف حفظ جديد».</Empty>
  const seg = queue[Math.min(idx, queue.length - 1)]
  return (
    <>
      <p className="muted small">المقطع {Math.min(idx, queue.length - 1) + 1} من {queue.length}</p>
      <Practice key={seg.id} data={data} seg={seg} today={today} onGraded={() => setIdx((i) => i)} />
    </>
  )
}

function Practice({ data, seg, today, onGraded }: { data: QuranData; seg: MemoSegment; today: string; onGraded: () => void }) {
  const { settings } = useSettings()
  const [mode, setMode] = useState<'show' | 'hide' | 'hint'>(seg.status === 'new' ? 'show' : 'hide')
  const [revealed, setRevealed] = useState<Set<number>>(new Set())
  const [repeat, setRepeat] = useState(3)
  const [gap, setGap] = useState(2)
  const s = data.meta.surahs[seg.surah - 1]
  const ayahs = Array.from({ length: seg.to - seg.from + 1 }, (_, i) => seg.from + i)
  const isNew = seg.status === 'new'

  const grade = async (g: Grade) => {
    const next = applyGrade(seg, g, today)
    await memo.put({ ...seg, ...next, lastReviewed: Date.now() })
    await memo.log({ segmentId: seg.id!, date: today, grade: g, kind: isNew ? 'learn' : 'review', at: Date.now() })
    toast(`سُجّل التقييم: ${GRADE_LABELS[g]} — المراجعة القادمة بعد ${next.interval} يوم`)
    onGraded()
  }

  return (
    <section className="card">
      <div className="spread">
        <h2 style={{ margin: 0 }}>سورة {s.name} — الآيات {seg.from}–{seg.to}</h2>
        <span className="badge">{isNew ? 'حفظ جديد' : STATUS_LABELS[effectiveStatus(seg, today)]}</span>
      </div>
      <div className="row" style={{ margin: '0.75rem 0' }}>
        <div className="tabs" role="group" aria-label="طريقة العرض" style={{ border: 0, margin: 0 }}>
          <button className="btn btn-sm" aria-pressed={mode === 'show'} onClick={() => setMode('show')}><Eye size={14} /> إظهار النص</button>
          <button className="btn btn-sm" aria-pressed={mode === 'hint'} onClick={() => { setMode('hint'); setRevealed(new Set()) }}>أوائل الآيات</button>
          <button className="btn btn-sm" aria-pressed={mode === 'hide'} onClick={() => { setMode('hide'); setRevealed(new Set()) }}><EyeOff size={14} /> إخفاء للاختبار</button>
        </div>
        <span className="row small">
          <Headphones size={16} aria-hidden="true" />
          <label className="row">تكرار كل آية
            <select className="select" style={{ width: 70, minHeight: 32, padding: '0 0.4rem' }} value={repeat} onChange={(e) => setRepeat(Number(e.target.value))}>
              {[1, 2, 3, 5, 7, 10].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
          <label className="row">والفاصل
            <select className="select" style={{ width: 92, minHeight: 32, padding: '0 0.4rem' }} value={gap} onChange={(e) => setGap(Number(e.target.value))} aria-label="الفاصل بين التكرارات">
              {[0, 1, 2, 3, 5, 10].map((g) => <option key={g} value={g}>{g === 0 ? 'بلا فاصل' : `${g} ث`}</option>)}
            </select>
          </label>
          <button className="btn btn-sm" onClick={() => { player.setRepeat(repeat, false, gap); player.play({ reciterId: settings.reciterId, surah: seg.surah, surahName: s.name, from: seg.from, to: seg.to, repeatEach: repeat, repeatRange: false }) }}><Play size={14} /> استمع للمقطع</button>
          <button className="btn btn-sm btn-ghost" onClick={() => player.stop()} aria-label="إيقاف"><Pause size={14} /></button>
        </span>
      </div>
      <div>
        {ayahs.map((a) => {
          const text = data.verses[seg.surah - 1][a - 1]
          const hidden = mode !== 'show' && !revealed.has(a)
          const words = text.split(' ')
          return (
            <p key={a} className="quran-text" style={{ margin: '0 0 0.5rem', cursor: hidden ? 'pointer' : undefined }}
              onClick={() => hidden && setRevealed(new Set([...revealed, a]))}
              onKeyDown={(e) => { if (hidden && (e.key === 'Enter' || e.key === ' ')) setRevealed(new Set([...revealed, a])) }}
              tabIndex={hidden ? 0 : undefined} role={hidden ? 'button' : undefined} aria-label={hidden ? `إظهار الآية ${a}` : undefined}>
              {mode === 'hint' && hidden ? (
                <><span>{words.slice(0, 2).join(' ')}</span> <span className="hidden-text">{words.slice(2).join(' ')}</span></>
              ) : (
                <span className={hidden ? 'hidden-text' : ''}>{text}</span>
              )}{' '}
              <span className="ayah-num">{toArabicDigits(a)}</span>
            </p>
          )
        })}
      </div>
      {mode !== 'show' && <p className="small muted">اضغط على أي آية لإظهارها والتحقق من حفظك.</p>}
      <hr className="divider" />
      <p><strong>{isNew ? 'بعد حفظ المقطع، قيّم مستوى حفظك:' : 'كيف كان استظهارك؟'}</strong> <span className="small muted">(تقييمك الذاتي يحدد موعد المراجعة القادمة)</span></p>
      <div className="row">
        {([0, 1, 2, 3] as Grade[]).map((g) => (
          <button key={g} className={'btn' + (g === 0 ? ' btn-danger' : g === 3 ? ' btn-primary' : '')} onClick={() => grade(g)}>{GRADE_LABELS[g]}</button>
        ))}
      </div>
    </section>
  )
}

function AddGoal({ data, dailyNew, onDone }: { data: QuranData; dailyNew: number; onDone: () => void }) {
  const [surah, setSurah] = useState(114)
  const s = data.meta.surahs[surah - 1]
  const [from, setFrom] = useState(1)
  const [to, setTo] = useState(s.count)
  const [size, setSize] = useState(3)
  const [daily, setDaily] = useState(dailyNew)
  const valid = from >= 1 && to <= s.count && from <= to && size >= 1
  const chunks = valid ? splitRange(from, to, size) : []

  return (
    <section className="card stack" style={{ maxWidth: 720 }}>
      <div className="grid grid-2" style={{ gap: '0.75rem' }}>
        <label className="field"><span>السورة</span>
          <select className="select" value={surah} onChange={(e) => { const n = Number(e.target.value); setSurah(n); setFrom(1); setTo(data.meta.surahs[n - 1].count) }}>
            {data.meta.surahs.map((x) => <option key={x.n} value={x.n}>{x.n}. {x.name} ({x.count})</option>)}
          </select>
        </label>
        <label className="field"><span>عدد الآيات في كل مقطع</span>
          <input className="input" type="number" min={1} max={20} value={size} onChange={(e) => setSize(Number(e.target.value))} />
        </label>
        <label className="field"><span>من الآية</span><input className="input" type="number" min={1} max={s.count} value={from} onChange={(e) => setFrom(Number(e.target.value))} /></label>
        <label className="field"><span>إلى الآية</span><input className="input" type="number" min={1} max={s.count} value={to} onChange={(e) => setTo(Number(e.target.value))} /></label>
        <label className="field"><span>عدد المقاطع الجديدة يوميًا (هدف مرن)</span><input className="input" type="number" min={0} max={20} value={daily} onChange={(e) => setDaily(Number(e.target.value))} /></label>
      </div>
      {!valid && <p className="alert alert-error small">تحقق من نطاق الآيات (1–{s.count}).</p>}
      {valid && <p className="muted small">سيُقسَّم الهدف إلى {chunks.length} مقطعًا. بمعدل {daily || 0} مقطع يوميًا تنتهي من الحفظ الجديد خلال {daily ? Math.ceil(chunks.length / daily) : '—'} يومًا تقريبًا، مع المراجعة.</p>}
      <div className="row">
        <button className="btn btn-primary" disabled={!valid} onClick={async () => {
          const today = dayKey()
          await memo.add(chunks.map(([a, b]) => ({ surah, from: a, to: b, createdAt: Date.now(), ...initialSrs(today) })))
          await kv.set('memo:dailyNew', Math.max(0, daily))
          toast(`أضيف ${chunks.length} مقطعًا إلى خطة الحفظ`)
          onDone()
        }}><Plus size={16} /> إضافة إلى خطة الحفظ</button>
        <button className="btn" onClick={async () => { await kv.set('memo:dailyNew', Math.max(0, daily)); toast('حُفظ الهدف اليومي') }}>حفظ الهدف اليومي فقط</button>
      </div>
    </section>
  )
}

function AllSegments({ data, segs, today }: { data: QuranData; segs: MemoSegment[]; today: string }) {
  const grouped = useMemo(() => {
    const m = new Map<number, MemoSegment[]>()
    for (const s of [...segs].sort((a, b) => a.surah - b.surah || a.from - b.from)) m.set(s.surah, [...(m.get(s.surah) ?? []), s])
    return [...m]
  }, [segs])
  if (!segs.length) return <Empty>لا توجد مقاطع بعد.</Empty>
  return (
    <div className="stack">
      {grouped.map(([surah, list]) => (
        <section key={surah} className="card">
          <h2>سورة {data.meta.surahs[surah - 1].name}</h2>
          <div className="stack" style={{ gap: 6 }}>
            {list.map((s) => {
              const st = effectiveStatus(s, today)
              return (
                <div key={s.id} className="spread small" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 6 }}>
                  <span>الآيات {s.from}–{s.to}</span>
                  <span className={'badge ' + (st === 'memorized' ? 'badge-success' : st === 'review' ? 'badge-warn' : '')}>{s.paused ? 'موقوف' : STATUS_LABELS[st]}</span>
                  <span className="muted">{s.status === 'new' ? '' : `المراجعة: ${s.due}`}</span>
                  <span className="row">
                    <button className="btn btn-ghost btn-sm" onClick={() => memo.put({ ...s, paused: !s.paused })}>{s.paused ? 'استئناف' : 'إيقاف مؤقت'}</button>
                    <button className="btn btn-ghost btn-sm icon-btn" aria-label="حذف المقطع" onClick={() => { if (confirm('حذف هذا المقطع من خطة الحفظ؟')) memo.remove(s.id!) }}><Trash2 size={14} /></button>
                  </span>
                </div>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}
