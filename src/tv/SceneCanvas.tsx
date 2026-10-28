// مشغّل مشاهد التلفاز: يرسم المشهد على Canvas، وينتقل بين مشاهد القائمة بتلاشٍ ناعم (بلا شاشة سوداء)،
// ويتوقف عند إخفاء الشاشة، ويخفض الدقة والإطارات في الوضع الاقتصادي.
import { useEffect, useRef } from 'react'
import { createScene, nextScene, type SceneId } from './scenes'

export interface SceneCanvasProps {
  /** المشهد الثابت، أو null للتنقل في القائمة */
  scene: SceneId | null
  playlist: SceneId[]
  /** دقائق كل مشهد في القائمة (0 = لا تنقل) */
  rotateMin: number
  shuffle: boolean
  quality: 'auto' | 'eco' | 'high'
  className?: string
  /** يُبلغ باسم المشهد الحالي (للإعدادات) */
  onScene?: (id: SceneId) => void
}

const FADE_MS = 2500

function sizeFor(quality: SceneCanvasProps['quality'], el: HTMLElement) {
  const cssW = Math.max(320, el.clientWidth || window.innerWidth)
  const cssH = Math.max(180, el.clientHeight || window.innerHeight)
  const dpr = quality === 'high' ? Math.min(2, window.devicePixelRatio || 1) : 1
  const scale = quality === 'eco' ? 0.6 : dpr
  // سقف 1920 عرضًا (4K يُعرض بتكبير ناعم): يحافظ على السلاسة في أجهزة التلفاز
  const w = Math.min(Math.round(cssW * scale), quality === 'high' ? 3840 : 1920)
  return { w, h: Math.round((w * cssH) / cssW) }
}

export function SceneCanvas({ scene, playlist, rotateMin, shuffle, quality, className, onScene }: SceneCanvasProps) {
  const wrap = useRef<HTMLDivElement>(null)
  const props = useRef({ scene, playlist, rotateMin, shuffle, quality, onScene })
  props.current = { scene, playlist, rotateMin, shuffle, quality, onScene }

  useEffect(() => {
    const el = wrap.current
    if (!el) return
    const front = document.createElement('canvas')
    const back = document.createElement('canvas')
    for (const c of [back, front]) { c.style.cssText = 'position:absolute;top:0;left:0;right:0;bottom:0;width:100%;height:100%;transition:opacity 2.5s ease'; el.appendChild(c) }
    let { w, h } = sizeFor(quality, el)
    front.width = back.width = w; front.height = back.height = h
    const fctx = front.getContext('2d')!, bctx = back.getContext('2d')!
    let current: SceneId = scene ?? nextScene(playlist, null, shuffle)
    let painter = createScene(current, w, h)
    let incoming: { id: SceneId; p: ReturnType<typeof createScene>; at: number } | null = null
    let switchAt = performance.now() + Math.max(1, rotateMin) * 60_000
    let raf = 0, last = 0, stopped = false
    const t0 = performance.now()
    const minFrame = quality === 'eco' ? 1000 / 24 : 1000 / 45
    props.current.onScene?.(current)

    const tick = (now: number) => {
      if (stopped) return
      raf = requestAnimationFrame(tick)
      if (now - last < minFrame) return
      last = now
      const t = (now - t0) / 1000
      const pr = props.current
      // تنقل تلقائي في القائمة
      if (!pr.scene && (pr.rotateMin > 0 || switchAt === 0) && !incoming && now >= switchAt) {
        const id = nextScene(pr.playlist, current, pr.shuffle)
        if (id !== current) { incoming = { id, p: createScene(id, w, h), at: now }; back.style.opacity = '1'; front.style.opacity = '0' }
        switchAt = now + Math.max(1, pr.rotateMin) * 60_000
      }
      try { painter.frame(fctx, t) } catch { /* مشهد فشل: يبقى آخر إطار */ }
      if (incoming) {
        try { incoming.p.frame(bctx, t) } catch { /* لا شيء */ }
        if (now - incoming.at > FADE_MS) {
          // تبديل الطبقتين بعد اكتمال التلاشي
          painter = incoming.p; current = incoming.id; incoming = null
          fctx.drawImage(back, 0, 0)
          front.style.transition = 'none'; front.style.opacity = '1'; back.style.opacity = '0'
          void front.offsetWidth; front.style.transition = 'opacity 2.5s ease'
          pr.onScene?.(current)
        }
      }
    }
    back.style.opacity = '0'
    raf = requestAnimationFrame(tick)

    const vis = () => {
      if (document.visibilityState === 'hidden') { stopped = true; cancelAnimationFrame(raf) }
      else if (stopped) { stopped = false; last = 0; raf = requestAnimationFrame(tick) }
    }
    document.addEventListener('visibilitychange', vis)
    const onResize = () => {
      const s = sizeFor(quality, el)
      if (s.w === w && s.h === h) return
      w = s.w; h = s.h
      front.width = back.width = w; front.height = back.height = h
      painter = createScene(current, w, h)
    }
    window.addEventListener('resize', onResize)
    // «المشهد التالي» من الجوال: في وضع التنقل ينتقل فورًا
    const onNext = () => { if (!props.current.scene) switchAt = 0 }
    window.addEventListener('rafiq-next-scene', onNext)
    return () => {
      window.removeEventListener('rafiq-next-scene', onNext)
      stopped = true
      cancelAnimationFrame(raf)
      document.removeEventListener('visibilitychange', vis)
      window.removeEventListener('resize', onResize)
      // تحرير الذاكرة
      front.width = back.width = 0
      el.innerHTML = ''
    }
    // يُعاد إنشاء المشغل عند تغيير المشهد أو الجودة فقط
  }, [scene, quality]) // eslint-disable-line react-hooks/exhaustive-deps

  return <div ref={wrap} className={className} aria-hidden="true" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden' }} />
}

/** معاينة صغيرة لمشهد (إطار متحرك منخفض الدقة لشبكة الاختيار) */
export function ScenePreview({ id, live }: { id: SceneId; live: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const c = ref.current
    if (!c) return
    c.width = 384; c.height = 216
    const ctx = c.getContext('2d')!
    const p = createScene(id, 384, 216)
    let raf = 0
    const t0 = performance.now()
    // إطار ثابت عند ثانية 6، والحركة فقط للبطاقة المحددة
    try { p.frame(ctx, 6) } catch { /* لا شيء */ }
    const tick = (now: number) => { try { p.frame(ctx, 6 + (now - t0) / 1000) } catch { /* لا شيء */ } raf = requestAnimationFrame(tick) }
    if (live) raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [id, live])
  return <canvas ref={ref} className="tv-scene-thumb" aria-hidden="true" />
}

/** إطار واحد ثابت بملء الشاشة (وضع «مشهد ثابت» لتوفير البطارية) */
export function StillScene({ id }: { id: SceneId }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const c = ref.current
    if (!c) return
    const w = Math.min(1280, Math.round(window.innerWidth)), h = Math.round((w * window.innerHeight) / Math.max(1, window.innerWidth))
    c.width = w; c.height = h
    try { createScene(id, w, h).frame(c.getContext('2d')!, 8) } catch { /* لا شيء */ }
  }, [id])
  return <canvas ref={ref} aria-hidden="true" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }} />
}
