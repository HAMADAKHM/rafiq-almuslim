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
        <img className="sp-emblem sp-logo" src={`${import.meta.env.BASE_URL}golden/logo-night.png`} alt="" />
        <h1 className="sp-name"><span>رفيق المسلم</span></h1>
        <div className="sp-line" aria-hidden="true" />
        <p className="sp-tag">معاً .. نحو حياة أرقى بالإيمان</p>
        <p className="sp-plus"><Crown size={14} aria-hidden="true" /> وفيه رفيق المسلم بلس</p>
      </div>
      <div className="sp-bottom">
        <p className="sp-sadaqah">{SADAQAH_LINE}</p>
        <p className="sp-prayer">{SADAQAH_PRAYER}</p>
      </div>
    </div>
  )
}
