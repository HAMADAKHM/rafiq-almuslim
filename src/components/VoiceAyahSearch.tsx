import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mic, MicOff, Square } from 'lucide-react'
import { Sheet } from './Sheet'
import { useQuran } from '../hooks'
import { listenOnce, speechSupported, stopListening } from '../platform/speech'
import { matchSpokenAyah, type VoiceMatch } from '../services/voiceSearch'
import { toArabicDigits } from '../lib/arabic'

type State =
  | { phase: 'idle' }
  | { phase: 'listening' }
  | { phase: 'done'; heard: string; matches: VoiceMatch[] }
  | { phase: 'error'; message: string }

/** زر البحث عن آية بالصوت: يقرأ المستخدم الآية أو جزءًا منها فتظهر الآيات المطابقة */
export function VoiceAyahSearch({ compact }: { compact?: boolean }) {
  const { data } = useQuran()
  const [open, setOpen] = useState(false)
  const [state, setState] = useState<State>({ phase: 'idle' })

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
            {state.matches.map((m, i) => {
              const s = data.meta.surahs[m.surah - 1]
              return (
                <Link key={`${m.surah}:${m.ayah}`} to={`/quran/${m.surah}?ayah=${m.ayah}`} className={'voice-hit' + (i === 0 ? ' best' : '')} onClick={() => setOpen(false)}>
                  <span className="small"><strong>سورة {s.name}</strong> — الآية {toArabicDigits(m.ayah)}{i === 0 && m.exact ? ' • مطابقة' : !m.exact ? ' • تقريبية' : ''}</span>
                  <span className="quran-text voice-hit-text">{data.verses[m.surah - 1][m.ayah - 1]}</span>
                </Link>
              )
            })}
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
