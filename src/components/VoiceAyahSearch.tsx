import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Mic, MicOff, Square } from 'lucide-react'
import { Sheet } from './Sheet'
import { useQuran } from '../hooks'
import { listenOnce, speechSupported, stopListening } from '../platform/speech'
import { matchSpokenAyah, type VoiceMatch } from '../services/voiceSearch'
import { searchSkeleton } from '../lib/arabic'
import { toArabicDigits } from '../lib/arabic'

type State =
  | { phase: 'idle' }
  | { phase: 'listening' }
  | { phase: 'done'; heard: string; matches: VoiceMatch[] }
  | { phase: 'error'; message: string }

/** زر البحث عن آية بالصوت: يقرأ المستخدم الآية أو جزءًا منها فتظهر الآيات المطابقة */
export function VoiceAyahSearch({ compact, onPick }: { compact?: boolean; onPick?: (surah: number, ayah: number) => void }) {
  const { data } = useQuran()
  const [open, setOpen] = useState(false)
  const [state, setState] = useState<State>({ phase: 'idle' })
  const [typed, setTyped] = useState('')
  // بديل مكتوب: نفس المطابقة على نص المصحف
  const typedMatches = useMemo(() => (data && searchSkeleton(typed).length >= 3 ? matchSpokenAyah(data, typed, 6) : []), [data, typed])

  const listen = async () => {
    setOpen(true)
    setState({ phase: 'listening' })
    try {
      const alts = await listenOnce('ar-SA')
      if (!alts.length) { setState({ phase: 'error', message: 'لم يُسمع شيء. اضغط «استمع مجددًا» واقرأ الآية بوضوح.' }); return }
      setState({ phase: 'done', heard: alts[0], matches: data ? matchSpokenAyah(data, alts) : [] })
    } catch (e) {
      setState({ phase: 'error', message: (e as Error).message })
    }
  }

  const supported = speechSupported()
  const Hit = ({ m, best }: { m: VoiceMatch; best: boolean }) => {
    const s = data!.meta.surahs[m.surah - 1]
    const body = (
      <>
        <span className="small"><strong>سورة {s.name}</strong> — الآية {toArabicDigits(m.ayah)}{best && m.exact ? ' • مطابقة' : !m.exact ? ' • تقريبية' : ''}</span>
        <span className="quran-text voice-hit-text">{data!.verses[m.surah - 1][m.ayah - 1]}</span>
      </>
    )
    return onPick
      ? <button type="button" className={'voice-hit' + (best ? ' best' : '')} onClick={() => { onPick(m.surah, m.ayah); setOpen(false) }}>{body}</button>
      : <Link to={`/quran/${m.surah}?ayah=${m.ayah}`} className={'voice-hit' + (best ? ' best' : '')} onClick={() => setOpen(false)}>{body}</Link>
  }
  return (
    <>
      <button className={compact ? 'btn icon-btn' : 'btn'} onClick={supported ? listen : () => { setOpen(true); setState({ phase: 'error', message: 'هذا المتصفح لا يدعم البحث بالصوت. جرّب Chrome أو تطبيق الجوال.' }) }}
        aria-label="البحث عن آية بالصوت" disabled={!data}>
        {supported ? <Mic size={18} /> : <MicOff size={18} />}{!compact && ' بحث بالصوت'}
      </button>
      <Sheet open={open} onClose={() => { stopListening(); setOpen(false) }} title="البحث عن آية بالصوت">
        {state.phase === 'listening' && (
          <div className="voice-listening" aria-live="polite">
            <span className="mic-pulse"><Mic size={30} /></span>
            <p>أستمع… اقرأ الآية أو جزءًا منها</p>
            <button className="btn btn-sm" onClick={() => stopListening()}><Square size={14} /> إيقاف</button>
          </div>
        )}
        {state.phase === 'error' && <p className="alert alert-error small" role="alert">{state.message}</p>}
        {state.phase === 'done' && data && (
          <div className="stack" aria-live="polite">
            <p className="small muted" style={{ margin: 0 }}>سمعتُ: «{state.heard}»</p>
            {state.matches.length === 0 && <p className="alert alert-gold small">لم أجد آية مطابقة. حاول قراءة جزء أطول بوضوح.</p>}
            {state.matches.map((m, i) => <Hit key={`${m.surah}:${m.ayah}`} m={m} best={i === 0} />)}
          </div>
        )}
        {state.phase !== 'listening' && data && (
          <div className="stack" style={{ marginTop: 12 }}>
            <label className="field"><span>أو اكتب جزءًا من الآية</span>
              <input className="input" value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="مثال: الله لا اله الا هو الحي القيوم" aria-label="اكتب جزءًا من الآية" />
            </label>
            {typed && typedMatches.length === 0 && searchSkeleton(typed).length >= 3 && <p className="small muted" style={{ margin: 0 }}>لا نتائج بعد — أكمل الكتابة.</p>}
            {typedMatches.map((m, i) => <Hit key={'t' + m.surah + ':' + m.ayah} m={m} best={i === 0} />)}
          </div>
        )}
        {state.phase !== 'listening' && (
          <div className="row" style={{ marginTop: 10 }}>
            <button className="btn btn-primary" onClick={listen} disabled={!supported}><Mic size={16} /> استمع مجددًا</button>
          </div>
        )}
        <p className="small muted" style={{ marginTop: 10 }}>يحوّل نظام جهازك أو متصفحك الكلام إلى نص (وقد يستخدم خدمة Google أو Apple)، ثم تتم المطابقة مع نص المصحف على جهازك. لا يحفظ التطبيق صوتك.</p>
      </Sheet>
    </>
  )
}
