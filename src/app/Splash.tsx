import { useEffect, useState } from 'react'
import { Crown } from 'lucide-react'
import { SADAQAH_LINE, SADAQAH_PRAYER } from '../content/dedication'

const KEY = 'rafiq:splash-shown'

function shouldShow(): boolean {
  try {
    // مرة واحدة لكل فتح للتطبيق، ولا تظهر لأدوات الاختبار الآلي
    if (typeof navigator !== 'undefined' && navigator.webdriver) return false
    return !sessionStorage.getItem(KEY)
  } catch {
    return false
  }
}

/** نجوم ثابتة المواضع (لا عشوائية بين التشغيلات) */
const STARS = Array.from({ length: 60 }, (_, i) => ({ x: (i * 37.7) % 100, y: (i * 53.3) % 70, s: i % 7 === 0 ? 2.4 : i % 3 === 0 ? 1.6 : 1, d: (i % 11) * 0.27 }))
const SPARKS = Array.from({ length: 22 }, (_, i) => ({ x: 20 + ((i * 29) % 60), d: 0.9 + (i % 9) * 0.18, dur: 2.2 + (i % 5) * 0.35, s: 2 + (i % 3) }))

/**
 * شاشة البداية عند كل فتح: سماء ليلية بنجوم، ثم يُرسم الشعار بخط ذهبي ويتوهج،
 * ثم يظهر اسم «رفيق المسلم» من اليمين بلمعة ذهبية تعبره، وتصعد شرارات ذهبية، ثم الإهداء.
 * تُتخطى بلمسة، وتختصر مع «تقليل الحركة».
 */
export function Splash() {
  const [show, setShow] = useState(shouldShow)
  const [leaving, setLeaving] = useState(false)
  useEffect(() => {
    if (!show) return
    try { sessionStorage.setItem(KEY, '1') } catch { /* اختياري */ }
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const t1 = setTimeout(() => setLeaving(true), reduce ? 900 : 3300)
    const t2 = setTimeout(() => setShow(false), reduce ? 1000 : 3800)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [show])
  if (!show) return null
  return (
    <div className={'splash2' + (leaving ? ' leaving' : '')} role="dialog" aria-label="رفيق المسلم" onClick={() => setShow(false)}>
      <div className="sp-sky" aria-hidden="true">
        {STARS.map((s, i) => <i key={i} style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.s, height: s.s, animationDelay: `${s.d}s` }} />)}
      </div>
      <div className="sp-rays" aria-hidden="true" />
      <div className="sp-sparks" aria-hidden="true">
        {SPARKS.map((s, i) => <i key={i} style={{ left: `${s.x}%`, width: s.s, height: s.s, animationDelay: `${s.d}s`, animationDuration: `${s.dur}s` }} />)}
      </div>
      <div className="sp-center">
        <svg className="sp-emblem" viewBox="0 0 120 140" aria-hidden="true">
          <defs>
            <linearGradient id="sp-gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FFF1C2" /><stop offset="0.5" stopColor="#E9C46A" /><stop offset="1" stopColor="#B8862F" /></linearGradient>
            <mask id="sp-moon"><rect width="120" height="140" fill="#fff" /><circle cx="64" cy="18" r="9" fill="#000" /></mask>
          </defs>
          <circle className="sp-moon" cx="60" cy="20" r="11" fill="url(#sp-gold)" mask="url(#sp-moon)" />
          <path className="sp-draw" pathLength={1} d="M18 132 V78 C18 54 36 40 60 30 C84 40 102 54 102 78 V132" />
          <path className="sp-draw thin" pathLength={1} d="M30 132 V82 C30 64 44 52 60 45 C76 52 90 64 90 82 V132" />
          <path className="sp-draw" pathLength={1} d="M60 118 C50 110 38 108 26 110 V92 C38 90 50 92 60 100 C70 92 82 90 94 92 V110 C82 108 70 110 60 118 Z" />
          <path className="sp-draw thin" pathLength={1} d="M60 100 V118" />
          <path className="sp-draw" pathLength={1} d="M10 134 H110" />
        </svg>
        <h1 className="sp-name"><span>رفيق المسلم</span></h1>
        <div className="sp-line" aria-hidden="true" />
        <p className="sp-tag">رفيقك في كل خطوة</p>
        <p className="sp-plus"><Crown size={14} aria-hidden="true" /> وفيه رفيق المسلم بلس</p>
      </div>
      <div className="sp-bottom">
        <p className="sp-sadaqah">{SADAQAH_LINE}</p>
        <p className="sp-prayer">{SADAQAH_PRAYER}</p>
      </div>
    </div>
  )
}
