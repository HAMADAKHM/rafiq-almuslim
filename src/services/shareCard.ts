// بطاقات المشاركة: رسم الآية أو الذكر على صورة بخط واضح، دون زخارف فوق النص ودون علامة مائية مزعجة.
// النص يُرسم كاملًا كما هو (لا اقتطاع)، ويُصغَّر الخط تلقائيًا ليتسع النص.

export interface CardInput {
  /** نوع البطاقة يحدد الخط: القرآن بخط المصحف، والذكر بخط النسخ */
  kind: 'ayah' | 'dhikr' | 'prayer'
  heading: string
  text: string
  reference: string
  theme: 'emerald' | 'ivory' | 'night'
}

const THEMES = {
  emerald: { bg1: '#0d4d3a', bg2: '#0a3b2d', text: '#fdfaf2', accent: '#e8cf8a', muted: 'rgba(253,250,242,0.75)' },
  ivory: { bg1: '#fbf7ec', bg2: '#f1e9d4', text: '#1f2a24', accent: '#0d4d3a', muted: '#5f6b63' },
  night: { bg1: '#121a17', bg2: '#0b100e', text: '#ece7da', accent: '#d6b764', muted: '#a4ada6' },
} as const

/** تقسيم النص إلى أسطر بحسب العرض المتاح (الكلمات لا تُقطع) */
export function wrapLines(ctx: Pick<CanvasRenderingContext2D, 'measureText'>, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let line = ''
  for (const w of words) {
    const candidate = line ? line + ' ' + w : w
    if (ctx.measureText(candidate).width > maxWidth && line) {
      lines.push(line)
      line = w
    } else line = candidate
  }
  if (line) lines.push(line)
  return lines
}

export async function renderCard(input: CardInput, size = 1080): Promise<Blob> {
  const font = input.kind === 'ayah' ? '"Amiri Quran", "Amiri", serif' : '"Amiri", serif'
  await Promise.all([document.fonts?.load(`48px ${font}`), document.fonts?.load('32px "IBM Plex Sans Arabic"')].filter(Boolean))
  const t = THEMES[input.theme]
  const W = size, H = size
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!
  const g = ctx.createLinearGradient(0, 0, W, H)
  g.addColorStop(0, t.bg1)
  g.addColorStop(1, t.bg2)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)
  // إطار رفيع بعيد عن النص
  ctx.strokeStyle = t.accent
  ctx.globalAlpha = 0.5
  ctx.lineWidth = 3
  ctx.strokeRect(40, 40, W - 80, H - 80)
  ctx.globalAlpha = 1

  ctx.direction = 'rtl'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  ctx.fillStyle = t.accent
  ctx.font = `600 38px "IBM Plex Sans Arabic", sans-serif`
  ctx.fillText(input.heading, W / 2, 120)

  // أكبر خط يتسع للنص كاملًا داخل المساحة
  const maxW = W - 200
  const top = 190, bottom = H - 230
  let fs = input.kind === 'ayah' ? 64 : 54
  let lines: string[] = []
  let lh = 0
  for (; fs >= 22; fs -= 2) {
    ctx.font = `${fs}px ${font}`
    lines = wrapLines(ctx, input.text, maxW)
    lh = fs * (input.kind === 'ayah' ? 2.0 : 1.75)
    if (lines.length * lh <= bottom - top) break
  }
  ctx.fillStyle = t.text
  ctx.font = `${fs}px ${font}`
  const startY = top + (bottom - top - lines.length * lh) / 2 + lh / 2
  lines.forEach((l, i) => ctx.fillText(l, W / 2, startY + i * lh))

  ctx.fillStyle = t.accent
  ctx.font = `600 34px "IBM Plex Sans Arabic", sans-serif`
  ctx.fillText(input.reference, W / 2, H - 170)
  ctx.fillStyle = t.muted
  ctx.font = `28px "IBM Plex Sans Arabic", sans-serif`
  ctx.fillText('رفيق المسلم', W / 2, H - 100)

  return new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('تعذر إنشاء الصورة'))), 'image/png'))
}
