import { useEffect, useState } from 'react'
import { LogoMark, MosqueScene } from '../components/Art'
import { SADAQAH_LINE, SADAQAH_PRAYER } from '../content/dedication'

const KEY = 'rafiq:splash-shown'

function shouldShow(): boolean {
  try {
    // مرة واحدة لكل تشغيل، ولا تظهر لأدوات الاختبار الآلي
    if (typeof navigator !== 'undefined' && navigator.webdriver) return false
    return !sessionStorage.getItem(KEY)
  } catch {
    return false
  }
}

/** شاشة البداية: تظهر لحظات عند فتح التطبيق، ويمكن تخطيها بلمسة */
export function Splash() {
  const [show, setShow] = useState(shouldShow)
  const [leaving, setLeaving] = useState(false)
  useEffect(() => {
    if (!show) return
    try { sessionStorage.setItem(KEY, '1') } catch { /* اختياري */ }
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const t1 = setTimeout(() => setLeaving(true), reduce ? 900 : 2200)
    const t2 = setTimeout(() => setShow(false), reduce ? 1000 : 2600)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [show])
  if (!show) return null
  return (
    <div className={'splash' + (leaving ? ' leaving' : '')} role="dialog" aria-label="رفيق المسلم" onClick={() => setShow(false)}>
      <MosqueScene tone="sunset" variant="tall" className="splash-art" />
      <div className="splash-veil" />
      <div className="splash-top">
        <LogoMark size={92} className="splash-logo" />
        <h1>رفيق المسلم</h1>
        <p>معك في كل خطوة نحو الله</p>
      </div>
      <div className="splash-bottom">
        <p className="splash-items">القرآن • الصلاة • الأذكار • وأكثر</p>
        <p className="splash-sadaqah">{SADAQAH_LINE}</p>
        <p className="splash-prayer">{SADAQAH_PRAYER}</p>
        <span className="splash-bar" aria-hidden="true"><span /></span>
      </div>
    </div>
  )
}
