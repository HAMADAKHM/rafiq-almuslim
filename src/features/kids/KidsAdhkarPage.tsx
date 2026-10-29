// «أذكار الصغار»: أذكار قصيرة من المكتبة الموثقة (نصها ومصدرها كما هما) بخط كبير وألوان وعداد نجوم،
// ذكر واحد في الشاشة مع التالي والسابق والاستماع. بلا إعلانات.
import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Volume2, Square } from 'lucide-react'
import { PageHead } from '../../components/Common'
import { findItem } from '../../content/itemText'
import { dhikrAudio, playDhikrAudio } from '../../services/dhikrVoice'
import { vibrate } from '../../platform'

export const KIDS: { id: string; when: string; emoji: string; color: string }[] = [
  { id: 'w-ahyana', when: 'عندما أستيقظ', emoji: '☀️', color: '#f4a62a' },
  { id: 'f-cloth', when: 'عندما ألبس ثوبي', emoji: '👕', color: '#3a9bd9' },
  { id: 'f-before', when: 'قبل الأكل', emoji: '🍽️', color: '#2eae6b' },
  { id: 'f-forgot', when: 'إذا نسيت التسمية', emoji: '🤲', color: '#28a5a0' },
  { id: 'f-after', when: 'بعد الأكل', emoji: '😋', color: '#e0813a' },
  { id: 'h-exit', when: 'عندما أخرج من البيت', emoji: '🚪', color: '#8a5cd6' },
  { id: 'h-enter', when: 'عندما أدخل البيت', emoji: '🏠', color: '#d65a6f' },
  { id: 'q-enter', when: 'عندما أدخل المسجد', emoji: '🕌', color: '#0f7a62' },
  { id: 'q-khala', when: 'قبل دخول الخلاء', emoji: '🚿', color: '#5a7fd6' },
  { id: 'q-khala-out', when: 'بعد الخروج من الخلاء', emoji: '✨', color: '#3fae9a' },
  { id: 'x-sneeze', when: 'عندما أعطس', emoji: '🤧', color: '#d68a2e' },
  { id: 'x-anger', when: 'عندما أغضب', emoji: '😤', color: '#c2453f' },
  { id: 'x-rain', when: 'عندما ينزل المطر', emoji: '🌧️', color: '#4a8fd6' },
  { id: 'm-subhan', when: 'في كل وقت', emoji: '🌟', color: '#c99a2e' },
  { id: 's-short', when: 'الصلاة على النبي ﷺ', emoji: '💚', color: '#2e9e6b' },
  { id: 's-amut', when: 'قبل النوم', emoji: '🌙', color: '#5b4bb5' },
]

export function KidsAdhkarPage() {
  const [i, setI] = useState(0)
  const [stars, setStars] = useState<Record<string, number>>({})
  const [playing, setPlaying] = useState(false)
  const audio = useRef<HTMLAudioElement | null>(null)
  const k = KIDS[i]
  const item = findItem(k.id)
  const text = (item?.text ?? '').replace(/\s*\([^)]*\)/g, '')
  const stop = () => { audio.current?.pause(); audio.current = null; try { speechSynthesis.cancel() } catch { /* لا شيء */ } setPlaying(false) }
  useEffect(() => stop, [i]) // eslint-disable-line react-hooks/exhaustive-deps
  const listen = async () => {
    if (playing) { stop(); return }
    setPlaying(true)
    const a = await dhikrAudio(k.id).catch(() => null)
    if (a && (await playDhikrAudio(a, audio, () => true))) { setPlaying(false); return }
    try { const u = new SpeechSynthesisUtterance(text); u.lang = 'ar'; u.rate = 0.8; u.onend = () => setPlaying(false); speechSynthesis.speak(u) } catch { setPlaying(false) }
  }
  const tap = () => { setStars((s) => ({ ...s, [k.id]: Math.min(10, (s[k.id] ?? 0) + 1) })); vibrate('tap').catch(() => {}) }
  const n = stars[k.id] ?? 0
  return (
    <>
      <PageHead title="أذكار الصغار" subtitle="أذكار قصيرة لكل وقت — اضغط البطاقة لتجمع النجوم" />
      <div className="kids" style={{ ['--kid' as string]: k.color }}>
        <button className="kids-card" onClick={tap} aria-label={`${k.when}: ${text}. اضغط لتجمع نجمة`}>
          <span className="kids-emoji" aria-hidden="true">{k.emoji}</span>
          <span className="kids-when">{k.when}</span>
          <span className="kids-text">{text}</span>
          <span className="kids-stars" aria-label={`${n} نجوم`}>{Array.from({ length: Math.max(3, n) }, (_, s) => <span key={s} className={s < n ? 'on' : ''}>★</span>)}</span>
        </button>
        <p className="small muted" style={{ textAlign: 'center', margin: '0.3rem 0 0' }}>{item?.source}</p>
        <div className="kids-nav">
          <button className="btn" disabled={i === 0} onClick={() => setI(i - 1)} aria-label="السابق"><ChevronRight size={22} /></button>
          <button className="btn btn-primary" onClick={listen}>{playing ? <><Square size={18} /> إيقاف</> : <><Volume2 size={18} /> استمع</>}</button>
          <button className="btn" disabled={i === KIDS.length - 1} onClick={() => setI(i + 1)} aria-label="التالي"><ChevronLeft size={22} /></button>
        </div>
        <div className="kids-dots" aria-hidden="true">{KIDS.map((x, j) => <span key={x.id} className={j === i ? 'on' : ''} />)}</div>
      </div>
    </>
  )
}
