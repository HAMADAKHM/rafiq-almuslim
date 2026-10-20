// استوديو التصاميم: رسم الآيات على صور وفيديوهات للمشاركة.
// النص القرآني يؤخذ دائمًا من ملف المصحف المعتمد (لا يُكتب ولا يُعدَّل)، ويُعرض كاملًا دون اقتطاع:
// إن لم يتسع النص بأصغر خط مقبول يُطلب من المستخدم تقليل عدد الآيات بدل قصّ النص.
import { toArabicDigits } from '../lib/arabic'
import { THEMES, drawTheme, type ThemeId } from './sceneThemes'

export type StudioFormat = 'square' | 'story' | 'landscape'
export const FORMATS: Record<StudioFormat, { w: number; h: number; label: string }> = {
  square: { w: 1080, h: 1080, label: 'مربع — منشور' },
  story: { w: 1080, h: 1920, label: 'طولي — قصة وريلز' },
  landscape: { w: 1920, h: 1080, label: 'عرضي — يوتيوب' },
}

export type StudioBg = 'scene-sunset' | 'scene-night' | 'scene-dawn' | 'scene-day' | `theme-${ThemeId}` | 'emerald' | 'night' | 'gold' | 'ivory' | 'parchment' | 'photo' | 'video'
export const BACKGROUNDS: { id: StudioBg; label: string; swatch: string }[] = [
  { id: 'scene-sunset', label: 'غروب', swatch: 'linear-gradient(#2f6656,#f3c676)' },
  { id: 'scene-night', label: 'ليل', swatch: 'linear-gradient(#06161a,#1d4a40)' },
  { id: 'scene-dawn', label: 'فجر', swatch: 'linear-gradient(#1d3b4a,#f4d0a4)' },
  { id: 'scene-day', label: 'نهار', swatch: 'linear-gradient(#5d9bb0,#f1ecd9)' },
  ...THEMES.map((t) => ({ id: `theme-${t.id}` as StudioBg, label: t.label, swatch: t.swatch })),
  { id: 'emerald', label: 'زمردي', swatch: 'linear-gradient(135deg,#0f5a44,#0a3f30)' },
  { id: 'night', label: 'كحلي', swatch: 'linear-gradient(135deg,#0f1f33,#07111d)' },
  { id: 'gold', label: 'أسود وذهبي', swatch: 'linear-gradient(135deg,#1d1b17,#050505)' },
  { id: 'ivory', label: 'عاجي', swatch: 'linear-gradient(135deg,#fbf7ec,#efe6cf)' },
  { id: 'parchment', label: 'ورق المصحف', swatch: 'linear-gradient(135deg,#f7f0de,#e9dcbc)' },
  { id: 'photo', label: 'صورتي', swatch: 'repeating-linear-gradient(45deg,#ccc 0 6px,#eee 6px 12px)' },
  { id: 'video', label: 'فيديو من جهازي', swatch: 'repeating-linear-gradient(90deg,#222 0 8px,#555 8px 10px)' },
]
export const isScene = (b: StudioBg) => b.startsWith('scene-')
/** المشاهد المتحركة المرسومة بالشيفرة */
export const isTheme = (b: StudioBg) => b.startsWith('theme-')
/** خلفيات المشاهد (مساجد أو طبيعة): النص في الجزء العلوي فوق الأفق */
const isLandscape = (b: StudioBg) => isScene(b) || isTheme(b)
export const sceneTone = (b: StudioBg) => b.replace('scene-', '') as 'sunset' | 'night' | 'dawn' | 'day'
const isLight = (b: StudioBg) => b === 'ivory' || b === 'parchment'

export interface StudioStyle {
  format: StudioFormat
  bg: StudioBg
  /** تكبير/تصغير يدوي للخط (يُطبق على الحجم المحسوب تلقائيًا) */
  textScale: number
  showRef: boolean
  showBrand: boolean
}

export interface Verse { surah: number; ayah: number; text: string }

const QURAN_FONT = '"Amiri Quran", "Amiri", serif'
const UI_FONT = '"IBM Plex Sans Arabic", sans-serif'

/**
 * تحميل الخطوط لكل حروف النص قبل الرسم. ملفات الخطوط مقسّمة حسب نطاقات الحروف،
 * وتحميلها دون النص الفعلي قد يترك حروفًا قرآنية بلا رسم في الصورة.
 */
export async function loadStudioFonts(...texts: string[]) {
  if (!document.fonts) return
  const sample = texts.join(' ') || 'بسم الله'
  await Promise.all([
    document.fonts.load(`64px ${QURAN_FONT}`, sample),
    document.fonts.load(`32px ${UI_FONT}`, sample + ' سورة الآيات رفيق المسلم ٠١٢٣٤٥٦٧٨٩'),
    document.fonts.load(`700 32px ${UI_FONT}`, 'سورة الآيات ٠١٢٣٤٥٦٧٨٩ ' + sample),
  ])
  await document.fonts.ready
}

/** نص الآيات مع علامة نهاية الآية ورقمها */
export function versesText(verses: Verse[]): string {
  return verses.map((v) => `${v.text} ۝${toArabicDigits(v.ayah)}`).join(' ')
}

export function referenceText(surahName: string, verses: Verse[]): string {
  if (!verses.length) return ''
  const a = verses[0].ayah, b = verses[verses.length - 1].ayah
  return `سورة ${surahName} • ${a === b ? `الآية ${toArabicDigits(a)}` : `الآيات ${toArabicDigits(a)}–${toArabicDigits(b)}`}`
}

/** تقسيم النص إلى أسطر دون قطع الكلمات */
export function wrap(ctx: Pick<CanvasRenderingContext2D, 'measureText'>, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let line = ''
  for (const w of words) {
    const c = line ? line + ' ' + w : w
    if (line && ctx.measureText(c).width > maxWidth) { lines.push(line); line = w } else line = c
  }
  if (line) lines.push(line)
  return lines
}

/** أكبر خط يتسع فيه النص كاملًا داخل المربع، أو null إن لم يتسع حتى بأصغر خط مقبول */
export function fitText(ctx: CanvasRenderingContext2D, text: string, boxW: number, boxH: number, maxPx: number, minPx: number): { size: number; lines: string[]; lineH: number } | null {
  let lo = minPx, hi = maxPx, best: { size: number; lines: string[]; lineH: number } | null = null
  for (let i = 0; i < 14; i++) {
    const size = (lo + hi) / 2
    ctx.font = `${size}px ${QURAN_FONT}`
    const lines = wrap(ctx, text, boxW)
    const lineH = size * 1.9
    if (lines.length * lineH <= boxH && lines.every((l) => ctx.measureText(l).width <= boxW * 1.02)) { best = { size, lines, lineH }; lo = size } else hi = size
  }
  if (best) return best
  ctx.font = `${minPx}px ${QURAN_FONT}`
  const lines = wrap(ctx, text, boxW)
  return lines.length * minPx * 1.9 <= boxH ? { size: minPx, lines, lineH: minPx * 1.9 } : null
}

/** خلفية قابلة للرسم: صورة أو مشهد أو فيديو (إطاره الحالي) */
export type BgSource = CanvasImageSource & ({ width: number; height: number } | { videoWidth: number; videoHeight: number })

function dims(img: BgSource): [number, number] {
  const v = img as { videoWidth?: number; videoHeight?: number }
  if (v.videoWidth) return [v.videoWidth, v.videoHeight!]
  const i = img as { width: number; height: number }
  return [i.width, i.height]
}

function cover(ctx: CanvasRenderingContext2D, img: BgSource, W: number, H: number, zoom = 1, anchorY = 0.5) {
  const [iw, ih] = dims(img)
  if (!iw || !ih) return
  const s = Math.max(W / iw, H / ih) * zoom
  const w = iw * s, h = ih * s
  ctx.drawImage(img, (W - w) / 2, (H - h) * anchorY, w, h)
}

/** نقش هندسي خفيف (نجمة ثمانية) للخلفيات السادة */
function pattern(ctx: CanvasRenderingContext2D, W: number, H: number, color: string) {
  ctx.save()
  ctx.strokeStyle = color
  ctx.lineWidth = 1.5
  const step = 120
  for (let y = 0; y < H + step; y += step) {
    for (let x = 0; x < W + step; x += step) {
      ctx.save()
      ctx.translate(x, y)
      for (const r of [0, Math.PI / 4]) { ctx.save(); ctx.rotate(r); ctx.strokeRect(-26, -26, 52, 52); ctx.restore() }
      ctx.restore()
    }
  }
  ctx.restore()
}

export interface DrawOptions {
  style: StudioStyle
  text: string
  reference: string
  /** صورة المشهد أو صورة المستخدم */
  bgImage?: BgSource | null
  /** للفيديو: تكبير بطيء للخلفية وشفافية النص وشريط التقدم */
  zoom?: number
  textAlpha?: number
  progress?: number
  subtitle?: string
  /** زمن الإطار بالثواني (لحركة المشاهد في الفيديو) */
  time?: number
}

/** يرسم إطارًا كاملًا. يعيد false إن لم يتسع النص */
export function drawStudioFrame(ctx: CanvasRenderingContext2D, W: number, H: number, o: DrawOptions): boolean {
  const { style } = o
  const light = isLight(style.bg)
  ctx.save()
  ctx.clearRect(0, 0, W, H)
  // ---------- الخلفية ----------
  if (isTheme(style.bg)) {
    const z = o.zoom ?? 1
    ctx.save()
    ctx.translate(W / 2, H); ctx.scale(z, z); ctx.translate(-W / 2, -H)
    drawTheme(ctx, W, H, style.bg.slice(6) as ThemeId, o.time ?? 0)
    ctx.restore()
    const g = ctx.createLinearGradient(0, 0, 0, H)
    g.addColorStop(0, 'rgba(4,14,20,0.6)'); g.addColorStop(0.55, 'rgba(4,14,20,0.28)'); g.addColorStop(1, 'rgba(4,14,20,0.1)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, W, H)
  } else if ((isScene(style.bg) || style.bg === 'photo' || style.bg === 'video') && o.bgImage) {
    // الفيديو لا يُكبَّر تدريجيًا (حركته من نفسه)
    cover(ctx, o.bgImage, W, H, style.bg === 'video' ? 1 : o.zoom ?? 1, isScene(style.bg) ? 1 : 0.5)
    const g = ctx.createLinearGradient(0, 0, 0, H)
    if (style.bg === 'photo' || style.bg === 'video') { g.addColorStop(0, 'rgba(0,0,0,0.55)'); g.addColorStop(1, 'rgba(0,0,0,0.55)') } else { g.addColorStop(0, 'rgba(4,20,16,0.62)'); g.addColorStop(0.55, 'rgba(4,20,16,0.25)'); g.addColorStop(1, 'rgba(4,20,16,0.1)') }
    ctx.fillStyle = g
    ctx.fillRect(0, 0, W, H)
  } else {
    const colors: Record<string, [string, string]> = { emerald: ['#0f5a44', '#0a3f30'], night: ['#0f1f33', '#07111d'], gold: ['#1d1b17', '#050505'], ivory: ['#fbf7ec', '#efe6cf'], parchment: ['#f7f0de', '#e9dcbc'] }
    const [a, b] = colors[style.bg] ?? colors.emerald
    const g = ctx.createLinearGradient(0, 0, W, H)
    g.addColorStop(0, a); g.addColorStop(1, b)
    ctx.fillStyle = g
    ctx.fillRect(0, 0, W, H)
    pattern(ctx, W, H, light ? 'rgba(15,90,68,0.06)' : 'rgba(240,214,143,0.07)')
  }
  const ink = light ? '#1c241f' : style.bg === 'gold' ? '#f3e7c4' : '#fdfaf2'
  const gold = light ? '#8a6a1f' : style.bg === 'gold' ? '#d4af37' : '#f0d68f'
  // ---------- الإطار ----------
  const m = Math.round(Math.min(W, H) * 0.04)
  ctx.strokeStyle = gold
  ctx.globalAlpha = 0.55
  ctx.lineWidth = 3
  ctx.strokeRect(m, m, W - 2 * m, H - 2 * m)
  ctx.lineWidth = 1.2
  ctx.strokeRect(m + 12, m + 12, W - 2 * m - 24, H - 2 * m - 24)
  ctx.globalAlpha = 1

  // ---------- النص ----------
  const pad = Math.round(Math.min(W, H) * 0.11)
  const bottomReserve = (style.showRef ? H * 0.08 : 0) + (style.showBrand ? H * 0.05 : 0) + (o.progress != null ? H * 0.02 : 0)
  const sceneTop = isLandscape(style.bg) ? (style.format === 'landscape' ? 0.6 : 0.62) : 1
  const boxW = W - 2 * pad
  const boxTop = pad
  const boxH = Math.max(100, H * sceneTop - pad - bottomReserve * (isLandscape(style.bg) ? 0.2 : 1) - boxTop)
  const maxPx = Math.min(W, H) * 0.085 * style.textScale
  const minPx = Math.min(W, H) * 0.028
  const fit = fitText(ctx, o.text, boxW, boxH, Math.max(maxPx, minPx), minPx)
  ctx.direction = 'rtl'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  if (!fit) { ctx.restore(); return false }
  ctx.globalAlpha = o.textAlpha ?? 1
  ctx.font = `${fit.size}px ${QURAN_FONT}`
  ctx.fillStyle = ink
  if (!light) { ctx.shadowColor = 'rgba(0,0,0,0.55)'; ctx.shadowBlur = fit.size * 0.25 }
  const total = fit.lines.length * fit.lineH
  let y = boxTop + (boxH - total) / 2 + fit.lineH / 2
  for (const line of fit.lines) { ctx.fillText(line, W / 2, y); y += fit.lineH }
  ctx.shadowBlur = 0
  // ---------- المرجع والعلامة ----------
  let by = H - m - 30
  if (style.showBrand) {
    ctx.globalAlpha = 0.75
    ctx.font = `600 ${Math.round(Math.min(W, H) * 0.024)}px ${UI_FONT}`
    ctx.fillStyle = isLandscape(style.bg) ? '#fdfaf2' : ink
    ctx.fillText('رفيق المسلم', W / 2, by)
    by -= Math.min(W, H) * 0.05
  }
  ctx.globalAlpha = o.textAlpha ?? 1
  if (style.showRef && o.reference) {
    const sz = Math.round(Math.min(W, H) * 0.034)
    ctx.font = `700 ${sz}px ${UI_FONT}`
    ctx.fillStyle = gold
    const refY = isLandscape(style.bg) ? Math.min(y + sz, H * sceneTop) : by
    ctx.fillText(o.reference, W / 2, refY)
    if (o.subtitle) {
      ctx.font = `${Math.round(sz * 0.72)}px ${UI_FONT}`
      ctx.fillStyle = isLandscape(style.bg) || !light ? 'rgba(253,250,242,0.85)' : '#5f6b63'
      ctx.fillText(o.subtitle, W / 2, refY + sz * 1.3)
    }
  }
  if (o.progress != null) {
    ctx.globalAlpha = 0.9
    ctx.fillStyle = 'rgba(255,255,255,0.18)'
    ctx.fillRect(m + 24, H - m - 10, W - 2 * m - 48, 4)
    ctx.fillStyle = gold
    ctx.fillRect(W - m - 24 - (W - 2 * m - 48) * o.progress, H - m - 10, (W - 2 * m - 48) * o.progress, 4)
  }
  ctx.restore()
  return true
}

/** تحويل عنصر SVG معروض إلى صورة قابلة للرسم على اللوحة */
export function svgToImage(svg: SVGSVGElement, w: number, h: number): Promise<HTMLImageElement> {
  const clone = svg.cloneNode(true) as SVGSVGElement
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  clone.setAttribute('width', String(w))
  clone.setAttribute('height', String(h))
  const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(clone)], { type: 'image/svg+xml' }))
  return new Promise((res, rej) => {
    const img = new Image()
    img.onload = () => { URL.revokeObjectURL(url); res(img) }
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('تعذر تجهيز الخلفية')) }
    img.src = url
  })
}

export function canvasToBlob(c: HTMLCanvasElement, type = 'image/png'): Promise<Blob> {
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('تعذر إنشاء الصورة'))), type, 0.95))
}
