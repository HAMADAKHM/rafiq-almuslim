// مشاهد متحركة تعبّر عن كلمات الآية (بحر، مطر، سماء ونجوم، جبال، جنات وأنهار، فجر).
// تُرسم بالشيفرة على اللوحة دون صور خارجية ودون ذكاء اصطناعي توليدي، ولا تصوّر إنسانًا أو كائنًا حيًا.
// الاختيار التلقائي مبني على كلمات وردت في نص الآية فقط، ويبقى للمستخدم تغييره.
import { searchSkeleton } from '../lib/arabic'

export type ThemeId = 'sea' | 'rain' | 'stars' | 'mountains' | 'garden' | 'dawn'

export const THEMES: { id: ThemeId; label: string; swatch: string }[] = [
  { id: 'sea', label: 'بحر', swatch: 'linear-gradient(#24465a,#0d2a3a)' },
  { id: 'rain', label: 'مطر وسحاب', swatch: 'linear-gradient(#3c4a55,#1a242b)' },
  { id: 'stars', label: 'سماء ونجوم', swatch: 'linear-gradient(#050b18,#13284a)' },
  { id: 'mountains', label: 'جبال', swatch: 'linear-gradient(#e8b78a,#35485a)' },
  { id: 'garden', label: 'جنات وأنهار', swatch: 'linear-gradient(#bfe0c4,#1e5a3a)' },
  { id: 'dawn', label: 'فجر وشروق', swatch: 'linear-gradient(#2a2f55,#f2b37a)' },
]

/** جذور الكلمات بعد التطبيع (بلا ألف ولا همزة ولا تشكيل) — كلمات حسية واضحة فقط */
const ROOTS: Record<ThemeId, string[]> = {
  sea: ['بحر', 'موج', 'سفين', 'جوري'],
  rain: ['مطر', 'غيث', 'سحب', 'ودق', 'رعد', 'برق', 'ريح'],
  stars: ['ليل', 'نجم', 'قمر', 'كوكب', 'بروج', 'مصبيح', 'سموت', 'شهب'],
  mountains: ['جبل', 'جبال', 'روسي', 'طور'],
  garden: ['جنه', 'جنت', 'نهر', 'شجر', 'نخل', 'زرع', 'ثمرت', 'عنب', 'حديق', 'فكهه', 'زيتون'],
  dawn: ['فجر', 'صبح', 'شمس', 'ضحي', 'شرق', 'غدو'],
}
const PREFIXES = ['', 'و', 'ف', 'ب', 'ك', 'ل', 'وب', 'ول', 'فب', 'فل']
const ARTICLE = ['', 'ل', 'لل']

function tokens(text: string): string[] {
  const out: string[] = []
  for (const t of searchSkeleton(text).split(' ')) {
    for (const p of PREFIXES) for (const a of ARTICLE) if (t.startsWith(p + a)) out.push(t.slice((p + a).length))
  }
  return out
}

/** المشهد الأنسب لكلمات الآيات، مع الكلمة التي دلّت عليه؛ أو null إن لم توجد كلمة حسية واضحة */
export function suggestTheme(text: string): { theme: ThemeId; word: string } | null {
  const toks = tokens(text)
  let best: { theme: ThemeId; word: string; n: number } | null = null
  for (const [theme, roots] of Object.entries(ROOTS) as [ThemeId, string[]][]) {
    let n = 0, word = ''
    for (const r of roots) {
      const hits = toks.filter((t) => t.startsWith(r) && t.length <= r.length + 3).length
      if (hits && !word) word = r
      n += hits
    }
    if (n && (!best || n > best.n)) best = { theme, word, n }
  }
  return best ? { theme: best.theme, word: best.word } : null
}

// ---------- الرسم ----------
const rand = (i: number) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x) }

function sky(ctx: CanvasRenderingContext2D, W: number, H: number, stops: [number, string][]) {
  const g = ctx.createLinearGradient(0, 0, 0, H)
  for (const [o, c] of stops) g.addColorStop(o, c)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)
}
function glow(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r)
  g.addColorStop(0, color); g.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = g
  ctx.fillRect(x - r, y - r, r * 2, r * 2)
}
function ridge(ctx: CanvasRenderingContext2D, W: number, H: number, base: number, amp: number, seed: number, color: string, shift = 0) {
  ctx.beginPath()
  ctx.moveTo(0, H)
  for (let x = 0; x <= W + 20; x += 20) {
    const k = (x + shift) / W
    const y = base - amp * (0.55 * Math.sin(k * 6 + seed) + 0.3 * Math.sin(k * 13 + seed * 2) + 0.15 * Math.sin(k * 29 + seed * 3))
    ctx.lineTo(x, y)
  }
  ctx.lineTo(W, H)
  ctx.closePath()
  ctx.fillStyle = color
  ctx.fill()
}
function stars(ctx: CanvasRenderingContext2D, W: number, n: number, t: number, maxY: number) {
  for (let i = 0; i < n; i++) {
    const x = rand(i) * W, y = rand(i + 500) * maxY, r = 0.6 + rand(i + 900) * 1.8
    const a = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * (0.8 + rand(i + 77) * 2) + i))
    ctx.globalAlpha = a
    ctx.fillStyle = '#fff6dc'
    ctx.beginPath(); ctx.arc(x, y, r * (W / 1080), 0, Math.PI * 2); ctx.fill()
  }
  ctx.globalAlpha = 1
}
function crescent(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, bg: string) {
  ctx.fillStyle = color
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = bg
  ctx.beginPath(); ctx.arc(x + r * 0.45, y - r * 0.2, r * 0.85, 0, Math.PI * 2); ctx.fill()
}
function palm(ctx: CanvasRenderingContext2D, x: number, base: number, h: number, color: string, sway: number) {
  ctx.strokeStyle = color; ctx.fillStyle = color
  ctx.lineWidth = h * 0.045
  ctx.beginPath(); ctx.moveTo(x, base); ctx.quadraticCurveTo(x + h * 0.08, base - h * 0.5, x + h * 0.04 + sway, base - h); ctx.stroke()
  const tx = x + h * 0.04 + sway, ty = base - h
  for (let i = 0; i < 7; i++) {
    const ang = -Math.PI / 2 + (i - 3) * 0.48 + sway * 0.01
    ctx.lineWidth = h * 0.025
    ctx.beginPath(); ctx.moveTo(tx, ty)
    ctx.quadraticCurveTo(tx + Math.cos(ang) * h * 0.3, ty + Math.sin(ang) * h * 0.18, tx + Math.cos(ang) * h * 0.42, ty + Math.sin(ang) * h * 0.1 + h * 0.12)
    ctx.stroke()
  }
}

/** يرسم المشهد في اللحظة t (ثوانٍ). الصورة الثابتة تستخدم t = 0 */
export function drawTheme(ctx: CanvasRenderingContext2D, W: number, H: number, theme: ThemeId, t = 0) {
  const u = Math.min(W, H) / 1080
  ctx.save()
  switch (theme) {
    case 'sea': {
      sky(ctx, W, H, [[0, '#14283a'], [0.45, '#36607a'], [0.62, '#e2a874'], [0.63, '#1d4a62'], [1, '#08202e']])
      glow(ctx, W * 0.62, H * 0.6, 260 * u, 'rgba(255,214,150,0.55)')
      ctx.fillStyle = '#ffe2b0'; ctx.beginPath(); ctx.arc(W * 0.62, H * 0.6, 48 * u, Math.PI, 0); ctx.fill()
      for (let l = 0; l < 6; l++) {
        const base = H * (0.63 + l * 0.065), amp = (6 + l * 5) * u, sp = 0.4 + l * 0.25
        ctx.beginPath(); ctx.moveTo(0, H)
        for (let x = 0; x <= W + 10; x += 10) ctx.lineTo(x, base + Math.sin(x / (90 + l * 40) / u + t * sp + l) * amp)
        ctx.lineTo(W, H); ctx.closePath()
        ctx.fillStyle = `rgba(${10 + l * 4},${40 + l * 6},${60 + l * 6},${0.55 + l * 0.08})`
        ctx.fill()
      }
      for (let i = 0; i < 40; i++) {
        const x = W * 0.62 + (rand(i) - 0.5) * W * 0.35, y = H * (0.64 + rand(i + 50) * 0.12)
        ctx.globalAlpha = 0.3 + 0.7 * Math.max(0, Math.sin(t * 2 + i * 1.7))
        ctx.fillStyle = '#ffe9c4'; ctx.fillRect(x, y, 14 * u, 2 * u)
      }
      break
    }
    case 'rain': {
      sky(ctx, W, H, [[0, '#2a343c'], [0.6, '#46545e'], [1, '#1b2328']])
      for (let i = 0; i < 9; i++) {
        const cx = ((rand(i) * 1.4 - 0.2) * W + t * 12 * u * (1 + rand(i + 3))) % (W * 1.3) - W * 0.15, cy = H * (0.08 + rand(i + 20) * 0.3)
        ctx.fillStyle = `rgba(${150 + i * 6},${160 + i * 6},${170 + i * 5},0.18)`
        for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.ellipse(cx + k * 90 * u, cy + Math.sin(k) * 20 * u, 160 * u, 60 * u, 0, 0, Math.PI * 2); ctx.fill() }
      }
      ridge(ctx, W, H, H * 0.86, 40 * u, 2, '#141b1f')
      ctx.strokeStyle = 'rgba(200,215,225,0.45)'; ctx.lineWidth = 2 * u
      for (let i = 0; i < 170; i++) {
        const sp = 700 + rand(i) * 500, x = (rand(i + 1) * W + t * 60) % W, y = ((rand(i + 2) * H + t * sp * u) % (H * 1.1)) - H * 0.05
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 6 * u, y + 28 * u); ctx.stroke()
      }
      break
    }
    case 'stars': {
      sky(ctx, W, H, [[0, '#030814'], [0.6, '#0d1f3c'], [1, '#1b3358']])
      ctx.save(); ctx.translate(W / 2, H / 2); ctx.rotate(-0.5); glow(ctx, 0, 0, Math.max(W, H) * 0.6, 'rgba(120,150,210,0.10)'); ctx.restore()
      stars(ctx, W, 260, t, H * 0.85)
      // الهلال قرب الأفق حتى لا يتداخل مع النص في أعلى التصميم
      glow(ctx, W * 0.8, H * 0.7, 170 * u, 'rgba(240,226,180,0.35)')
      crescent(ctx, W * 0.8, H * 0.7, 40 * u, '#f3e7c0', '#12264a')
      ridge(ctx, W, H, H * 0.9, 50 * u, 5, '#050b16')
      break
    }
    case 'mountains': {
      sky(ctx, W, H, [[0, '#2c3e58'], [0.45, '#c98f6b'], [0.7, '#f0c69a'], [1, '#f6dcb8']])
      glow(ctx, W * 0.3, H * 0.52, 260 * u, 'rgba(255,220,170,0.6)')
      ridge(ctx, W, H, H * 0.6, 150 * u, 1, 'rgba(86,96,122,0.75)', t * 4)
      ridge(ctx, W, H, H * 0.7, 120 * u, 3, 'rgba(58,70,92,0.88)', t * 8)
      ctx.fillStyle = 'rgba(255,240,225,0.18)'; ctx.fillRect(0, H * 0.72 + Math.sin(t * 0.5) * 6 * u, W, 36 * u)
      ridge(ctx, W, H, H * 0.82, 90 * u, 7, '#283444', t * 14)
      ridge(ctx, W, H, H * 0.93, 50 * u, 11, '#161e28', t * 22)
      break
    }
    case 'garden': {
      sky(ctx, W, H, [[0, '#8fc6d6'], [0.5, '#d9ecd8'], [0.6, '#bfdcae'], [1, '#2c6b45']])
      glow(ctx, W * 0.7, H * 0.25, 220 * u, 'rgba(255,250,220,0.7)')
      ridge(ctx, W, H, H * 0.62, 60 * u, 2, '#7fb27f')
      ridge(ctx, W, H, H * 0.72, 50 * u, 4, '#4f8f5e')
      // نهر يجري
      ctx.fillStyle = '#9fd0e0'
      ctx.beginPath(); ctx.moveTo(W * 0.42, H * 0.7); ctx.bezierCurveTo(W * 0.3, H * 0.8, W * 0.7, H * 0.85, W * 0.35, H); ctx.lineTo(W * 0.75, H); ctx.bezierCurveTo(W * 0.95, H * 0.85, W * 0.45, H * 0.8, W * 0.5, H * 0.7); ctx.closePath(); ctx.fill()
      ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 2 * u
      for (let i = 0; i < 18; i++) { const y = H * 0.72 + ((rand(i) * H * 0.28 + t * 40 * u) % (H * 0.28)); const x = W * (0.45 + (y / H - 0.72) * 0.6) + (rand(i + 9) - 0.5) * 60 * u; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 26 * u, y); ctx.stroke() }
      for (const [x, h, s] of [[0.08, 0.36, 1], [0.2, 0.28, 2], [0.86, 0.34, 3], [0.95, 0.24, 4]] as const) palm(ctx, W * x, H * 0.86, H * h, '#1f4a33', Math.sin(t * 0.8 + s) * 6 * u)
      ridge(ctx, W, H, H * 0.9, 30 * u, 9, '#1d4a30')
      break
    }
    case 'dawn': {
      const rise = Math.min(1, t / 20)
      sky(ctx, W, H, [[0, '#141a3a'], [0.4, '#3a3f6e'], [0.68, '#e48f6a'], [0.8, '#f6c98e'], [1, '#f6c98e']])
      stars(ctx, W, 80, t, H * 0.35)
      const sy = H * (0.8 - 0.06 * rise)
      glow(ctx, W * 0.5, sy, 320 * u, 'rgba(255,200,140,0.65)')
      ctx.fillStyle = '#ffe6bf'; ctx.beginPath(); ctx.arc(W * 0.5, sy, 60 * u, Math.PI, 0); ctx.fill()
      ridge(ctx, W, H, H * 0.82, 40 * u, 6, '#2a2440')
      ridge(ctx, W, H, H * 0.9, 30 * u, 8, '#17142a')
      break
    }
  }
  ctx.restore()
}
