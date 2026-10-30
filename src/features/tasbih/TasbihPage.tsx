import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Lock, RotateCcw, Vibrate, Volume2 } from 'lucide-react'
import { usePlus } from '../../billing/PlusContext'
import { PaintedScene } from '../../components/Scene'
import { Misbaha } from './Misbaha'
import { PageHead, Spinner } from '../../components/Common'
import { ConfirmSheet } from '../../components/Sheet'
import { toast } from '../../hooks'
import { dayKey, shiftDayKey } from '../../lib/dates'
import { BEADS, TASBIH_BGS, activeBead, activeTasbihBg, DEFAULT_TASBIH, dhikrText, increment, loadTasbih, saveTasbih, TASBIH_DHIKR, todayTotal, type TasbihState } from '../../services/tasbih'
import { vibrate } from '../../platform'

let audioCtx: AudioContext | null = null
function beep(goal: boolean) {
  try {
    audioCtx ??= new AudioContext()
    const o = audioCtx.createOscillator()
    const g = audioCtx.createGain()
    o.frequency.value = goal ? 880 : 520
    g.gain.value = 0.05
    o.connect(g).connect(audioCtx.destination)
    o.start()
    o.stop(audioCtx.currentTime + (goal ? 0.25 : 0.05))
  } catch {
    // الصوت اختياري
  }
}

export function TasbihPage() {
  const { entitled } = usePlus()
  const [s, setS] = useState<TasbihState | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)
  const [pulse, setPulse] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => { loadTasbih().then(setS).catch(() => setS(DEFAULT_TASBIH)) }, [])

  const persist = (next: TasbihState, immediate = false) => {
    setS(next)
    clearTimeout(saveTimer.current)
    // حفظ مؤجل قليلًا لتقليل الكتابة عند الضغط المتتالي، وفوري عند تغيير الإعدادات
    if (immediate) saveTasbih(next).catch(() => {})
    else saveTimer.current = setTimeout(() => saveTasbih(next).catch(() => {}), 400)
  }
  const latest = useRef<TasbihState | null>(null)
  latest.current = s
  // عند مغادرة الصفحة نحفظ آخر عدد فورًا
  useEffect(() => () => { clearTimeout(saveTimer.current); if (latest.current) saveTasbih(latest.current).catch(() => {}) }, [])

  if (!s) return <Spinner />
  const today = dayKey()
  const bead = activeBead(s, entitled)
  const bg = activeTasbihBg(s, entitled)
  const tap = () => {
    const { state, reachedTarget } = increment(s, today)
    persist(state)
    if (s.vibrate) vibrate(reachedTarget ? 'goal' : 'tap')
    if (s.sound) beep(reachedTarget)
    if (reachedTarget) { setPulse(true); setTimeout(() => setPulse(false), 700); toast(`أتممت ${s.target}`) }
  }
  const week = Array.from({ length: 7 }, (_, i) => shiftDayKey(today, i - 6))

  return (
    <>
      <PageHead title="المسبحة" subtitle="عدّاد للذكر يعمل دون إنترنت، ويُحفظ على جهازك فقط" />
      <div className="grid grid-2">
        <section className={'card tasbih-card tasbih-bg-' + bg.id} data-bead={bead.id}>
          {bg.id === 'mosque' && <PaintedScene tone="sunset" variant="card" className="tasbih-scene" />}
          <p className="classic-text tasbih-dhikr" style={{ textAlign: 'center', margin: 0 }}>{dhikrText(s)}</p>
          <div className={'tasbih-stage' + (bead.id === 'classic' ? '' : ' beads')}>
            {bead.id !== 'classic' && <Misbaha bead={bead} count={s.count} />}
            <button className={'tasbih-btn' + (pulse ? ' pulse' : '')} onClick={tap} aria-label={`سبّح — العدد الحالي ${s.count}${s.target ? ` من ${s.target}` : ''}`}>
              <span className="tasbih-count" aria-live="polite">{s.count}</span>
              {s.target > 0 && <span className="tasbih-target">الهدف {s.target} • الدورة {Math.floor(s.count / s.target) + (s.count % s.target === 0 && s.count > 0 ? 0 : 1)}</span>}
            </button>
          </div>
          <p className="small muted" style={{ textAlign: 'center' }}>اضغط الدائرة أو مفتاح المسافة للعد</p>
          <div className="row" style={{ justifyContent: 'center' }}>
            <button className="btn btn-sm" onClick={() => setConfirmReset(true)} disabled={s.count === 0}><RotateCcw size={14} /> تصفير العداد</button>
          </div>
        </section>
        <section className="card stack">
          <div>
            <div className="small muted" style={{ marginBottom: 4 }}>تصميم المسبحة{!entitled && ' — التصاميم الإضافية لمشتركي بلس'}</div>
            <div className="chips" role="radiogroup" aria-label="تصميم المسبحة">
              {BEADS.map((b) => {
                const locked = b.plus && !entitled
                return (
                  <button key={b.id} type="button" role="radio" aria-checked={bead.id === b.id} className={'chip bead-chip' + (bead.id === b.id ? ' active' : '')}
                    onClick={() => (locked ? toast('تصاميم المسبحة من مزايا رفيق المسلم بلس') : persist({ ...s, bead: b.id }, true))}>
                    <span className="bead-dot" style={{ background: `radial-gradient(circle at 35% 30%, ${b.c[0]}, ${b.c[1]} 55%, ${b.c[2]})` }} />{b.name}{locked && <Lock size={11} aria-label="مقفل" />}
                  </button>
                )
              })}
            </div>
          </div>
          <div>
            <div className="small muted" style={{ marginBottom: 4 }}>الخلفية</div>
            <div className="chips" role="radiogroup" aria-label="خلفية المسبحة">
              {TASBIH_BGS.map((b) => {
                const locked = b.plus && !entitled
                return (
                  <button key={b.id} type="button" role="radio" aria-checked={bg.id === b.id} className={'chip' + (bg.id === b.id ? ' active' : '')}
                    onClick={() => (locked ? toast('خلفيات المسبحة من مزايا رفيق المسلم بلس') : persist({ ...s, bg: b.id }, true))}>
                    {b.name}{locked && <Lock size={11} aria-label="مقفل" />}
                  </button>
                )
              })}
            </div>
            {!entitled && <Link className="small" to="/plus">اشترك في بلس لفتح تصاميم المسبحة وخلفياتها</Link>}
          </div>
          <label className="field"><span>الذكر</span>
            <select className="select" value={s.dhikrId} onChange={(e) => persist({ ...s, dhikrId: e.target.value, count: 0 }, true)}>
              {TASBIH_DHIKR.map((d) => <option key={d.id} value={d.id}>{d.text}</option>)}
              <option value="custom">ذكر آخر أكتبه بنفسي</option>
            </select>
          </label>
          {s.dhikrId === 'custom' && <label className="field"><span>نص الذكر</span><input className="input" value={s.customText} onChange={(e) => persist({ ...s, customText: e.target.value }, true)} /></label>}
          <label className="field"><span>الهدف العددي</span>
            <select className="select" value={s.target} onChange={(e) => persist({ ...s, target: Number(e.target.value) }, true)}>
              {[0, 7, 10, 33, 34, 99, 100, 1000].map((n) => <option key={n} value={n}>{n === 0 ? 'بدون هدف' : n}</option>)}
            </select>
          </label>
          <label className="check"><input type="checkbox" checked={s.vibrate} onChange={(e) => persist({ ...s, vibrate: e.target.checked }, true)} /> <Vibrate size={16} /> اهتزاز عند الضغط (إن دعمه الجهاز)</label>
          <label className="check"><input type="checkbox" checked={s.sound} onChange={(e) => persist({ ...s, sound: e.target.checked }, true)} /> <Volume2 size={16} /> صوت خفيف</label>
          <label className="check"><input type="checkbox" checked={s.keepLog} onChange={(e) => persist({ ...s, keepLog: e.target.checked }, true)} /> حفظ سجل يومي (على جهازك فقط)</label>
          {s.keepLog && (
            <div>
              <div className="small muted">آخر 7 أيام — اليوم: {todayTotal(s, today)}</div>
              <div className="bars" style={{ height: 70 }} role="img" aria-label={'سجل التسبيح: ' + week.map((d) => `${d} ${todayTotal(s, d)}`).join('، ')}>
                {week.map((d) => { const v = todayTotal(s, d); const max = Math.max(1, ...week.map((x) => todayTotal(s, x))); return <div key={d} className={'bar' + (v ? '' : ' zero')} style={{ height: `${(v / max) * 100}%` }} title={`${d}: ${v}`} /> })}
              </div>
            </div>
          )}
        </section>
      </div>
      <SpaceKey onPress={tap} />
      <ConfirmSheet open={confirmReset} onClose={() => setConfirmReset(false)} title="تصفير العداد" message={`سيعود العداد من ${s.count} إلى صفر. السجل اليومي لا يتأثر.`} confirmLabel="تصفير" onConfirm={() => persist({ ...s, count: 0 }, true)} />
    </>
  )
}

function SpaceKey({ onPress }: { onPress: () => void }) {
  const ref = useRef(onPress)
  ref.current = onPress
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || (e.target as HTMLElement)?.closest('input,select,textarea,button,[role="dialog"]')) return
      e.preventDefault()
      ref.current()
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])
  return null
}
