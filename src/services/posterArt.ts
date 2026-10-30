// لوحات البطاقات المصوّرة (بقياس القصص 1080×1920): مشاهد مرسومة بالكود بالكامل — سوق قديم بالفوانيس،
// صحراء وهلال، بيت طين عند الغروب، نافذة مسجد، فوانيس ليلية، سفرة تمر وقهوة… بلا صور خارجية ولا حقوق لطرف آخر.

export type PosterScene = 'alley' | 'desert' | 'mudhouse' | 'archway' | 'dusk' | 'crimson' | 'lanterns' | 'sufra' | 'emerald'

export const POSTER_SCENES: { id: PosterScene; name: string }[] = [
  { id: 'alley', name: 'سوق الفوانيس' },
  { id: 'desert', name: 'صحراء وهلال' },
  { id: 'mudhouse', name: 'بيت الطين' },
  { id: 'archway', name: 'نافذة المسجد' },
  { id: 'dusk', name: 'غروب المآذن' },
  { id: 'crimson', name: 'أحمر ذهبي' },
  { id: 'lanterns', name: 'فوانيس الليل' },
  { id: 'sufra', name: 'سفرة الإفطار' },
  { id: 'emerald', name: 'زمردي مزخرف' },
]

type Ctx = CanvasRenderingContext2D

/** مولّد أرقام ثابت (المشهد نفسه في كل مرة) */
function rng(seed: number) {
  return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
}

function vgrad(ctx: Ctx, y0: number, y1: number, stops: [number, string][]) {
  const g = ctx.createLinearGradient(0, y0, 0, y1)
  for (const [o, c] of stops) g.addColorStop(o, c)
  return g
}

function glow(ctx: Ctx, x: number, y: number, r: number, color: string, alpha = 1) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r)
  g.addColorStop(0, color)
  g.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.restore()
}

function stars(ctx: Ctx, W: number, H: number, n: number, seed: number, maxY = 0.6) {
  const r = rng(seed)
  ctx.save()
  for (let i = 0; i < n; i++) {
    const x = r() * W, y = r() * H * maxY, s = r() < 0.1 ? 2.6 : r() * 1.6 + 0.4
    ctx.globalAlpha = 0.3 + r() * 0.7
    ctx.fillStyle = '#fff'
    ctx.beginPath(); ctx.arc(x, y, s, 0, Math.PI * 2); ctx.fill()
  }
  ctx.restore()
}

/** هلال يُرسم في طبقة مستقلة ثم يُلصق (القصّ داخل اللوحة نفسها يمحو ما تحته) */
export function crescentShape(ctx: Ctx, x: number, y: number, r: number, color: string) {
  const c = document.createElement('canvas')
  c.width = c.height = Math.ceil(r * 2 + 4)
  const o = c.getContext('2d')!
  o.fillStyle = color
  o.beginPath(); o.arc(r + 2, r + 2, r, 0, Math.PI * 2); o.fill()
  o.globalCompositeOperation = 'destination-out'
  o.beginPath(); o.arc(r + 2 + r * 0.42, r + 2 - r * 0.22, r * 0.86, 0, Math.PI * 2); o.fill()
  ctx.drawImage(c, x - r - 2, y - r - 2)
}

function crescent(ctx: Ctx, x: number, y: number, r: number, color = '#fdf3d0', glowColor = 'rgba(255,240,200,0.55)') {
  glow(ctx, x, y, r * 4, glowColor, 0.8)
  crescentShape(ctx, x, y, r, color)
}

/** فانوس رمضاني بزجاج ملوّن يتوهج */
function lantern(ctx: Ctx, x: number, y: number, s: number, glass: string, metal = '#d9a441', chain = 0) {
  if (chain > 0) {
    ctx.save(); ctx.strokeStyle = metal; ctx.globalAlpha = 0.7; ctx.lineWidth = Math.max(1, s * 0.04)
    ctx.beginPath(); ctx.moveTo(x, y - chain); ctx.lineTo(x, y); ctx.stroke(); ctx.restore()
  }
  glow(ctx, x, y + s * 1.1, s * 2.6, glass, 0.55)
  ctx.save()
  ctx.translate(x, y)
  ctx.fillStyle = metal
  // الحلقة والقبة
  ctx.beginPath(); ctx.arc(0, -s * 0.05, s * 0.12, 0, Math.PI * 2); ctx.fill()
  ctx.beginPath(); ctx.moveTo(-s * 0.32, s * 0.38); ctx.quadraticCurveTo(0, -s * 0.12, s * 0.32, s * 0.38); ctx.closePath(); ctx.fill()
  ctx.fillRect(-s * 0.4, s * 0.36, s * 0.8, s * 0.1)
  // الجسم الزجاجي
  const body = new Path2D()
  body.moveTo(-s * 0.36, s * 0.46); body.lineTo(s * 0.36, s * 0.46); body.lineTo(s * 0.46, s * 1.25); body.lineTo(s * 0.3, s * 1.75); body.lineTo(-s * 0.3, s * 1.75); body.lineTo(-s * 0.46, s * 1.25); body.closePath()
  const g = ctx.createRadialGradient(0, s * 1.1, s * 0.05, 0, s * 1.1, s * 0.7)
  g.addColorStop(0, '#fff6d8'); g.addColorStop(0.35, glass); g.addColorStop(1, 'rgba(60,20,0,0.9)')
  ctx.fillStyle = g; ctx.fill(body)
  ctx.strokeStyle = metal; ctx.lineWidth = s * 0.05; ctx.stroke(body)
  // أضلاع الزجاج والنقش
  ctx.lineWidth = s * 0.03
  ctx.beginPath(); ctx.moveTo(0, s * 0.46); ctx.lineTo(0, s * 1.75); ctx.moveTo(-s * 0.46, s * 1.25); ctx.lineTo(s * 0.46, s * 1.25); ctx.stroke()
  ctx.beginPath(); ctx.arc(0, s * 0.88, s * 0.13, 0, Math.PI * 2); ctx.stroke()
  // القاعدة
  ctx.fillStyle = metal
  ctx.fillRect(-s * 0.32, s * 1.75, s * 0.64, s * 0.1)
  ctx.beginPath(); ctx.moveTo(-s * 0.18, s * 1.85); ctx.lineTo(s * 0.18, s * 1.85); ctx.lineTo(0, s * 2.1); ctx.closePath(); ctx.fill()
  ctx.restore()
}

function mosqueSkyline(ctx: Ctx, W: number, base: number, scale: number, color: string, windows?: string) {
  ctx.save()
  ctx.fillStyle = color
  const domes = [[0.5, 1.0], [0.28, 0.62], [0.72, 0.62], [0.12, 0.45], [0.88, 0.45]]
  for (const [cx, k] of domes) {
    const x = W * cx, r = 120 * scale * k
    ctx.beginPath()
    ctx.moveTo(x - r, base - r * 0.6)
    ctx.bezierCurveTo(x - r, base - r * 1.9, x - r * 0.15, base - r * 2.2, x, base - r * 2.55)
    ctx.bezierCurveTo(x + r * 0.15, base - r * 2.2, x + r, base - r * 1.9, x + r, base - r * 0.6)
    ctx.lineTo(x + r * 1.1, base); ctx.lineTo(x - r * 1.1, base); ctx.closePath(); ctx.fill()
    ctx.fillRect(x - 3 * scale, base - r * 2.95, 6 * scale, r * 0.45)
    ctx.fillRect(x - r * 1.25, base - r * 0.6, r * 2.5, r * 0.6)
  }
  for (const mx of [0.36, 0.64, 0.04, 0.96]) {
    const x = W * mx, h = 520 * scale * (mx === 0.36 || mx === 0.64 ? 1 : 0.7)
    ctx.fillRect(x - 13 * scale, base - h, 26 * scale, h)
    ctx.beginPath(); ctx.moveTo(x - 17 * scale, base - h); ctx.lineTo(x, base - h - 70 * scale); ctx.lineTo(x + 17 * scale, base - h); ctx.closePath(); ctx.fill()
    ctx.fillRect(x - 22 * scale, base - h * 0.72, 44 * scale, 12 * scale)
  }
  ctx.fillRect(0, base, W, 4000)
  if (windows) {
    ctx.fillStyle = windows
    for (let i = 0; i < 14; i++) { const x = W * (0.2 + i * 0.045); ctx.globalAlpha = 0.85; ctx.beginPath(); ctx.arc(x, base - 40 * scale, 6 * scale, Math.PI, 0); ctx.rect(x - 6 * scale, base - 40 * scale, 12 * scale, 22 * scale); ctx.fill() }
  }
  ctx.restore()
}

function bokeh(ctx: Ctx, W: number, H: number, n: number, seed: number, colors: string[], y0 = 0, y1 = 1) {
  const r = rng(seed)
  for (let i = 0; i < n; i++) glow(ctx, r() * W, H * (y0 + r() * (y1 - y0)), 18 + r() * 70, colors[i % colors.length], 0.25 + r() * 0.45)
}

function rug(ctx: Ctx, x: number, y: number, w: number, h: number) {
  ctx.save()
  ctx.translate(x, y)
  ctx.transform(1, 0, -0.35, 1, 0, 0)
  ctx.fillStyle = '#8f1d1d'; ctx.fillRect(0, 0, w, h)
  const cols = ['#c23b2f', '#1f2f5a', '#e2b04a', '#f2e6c8', '#c23b2f']
  for (let i = 0; i < 9; i++) { ctx.fillStyle = cols[i % cols.length]; ctx.fillRect(0, (h / 9) * i + h * 0.03, w, h / 22) }
  ctx.strokeStyle = '#e2b04a'; ctx.lineWidth = 3; ctx.strokeRect(6, 6, w - 12, h - 12)
  ctx.restore()
}

function datesBowl(ctx: Ctx, x: number, y: number, s: number) {
  ctx.save()
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(x, y + s * 0.35, s * 1.1, s * 0.22, 0, 0, Math.PI * 2); ctx.fill()
  const g = ctx.createLinearGradient(x - s, 0, x + s, 0); g.addColorStop(0, '#5a3418'); g.addColorStop(0.5, '#8a5a30'); g.addColorStop(1, '#4a2a12')
  ctx.fillStyle = g
  ctx.beginPath(); ctx.ellipse(x, y, s, s * 0.28, 0, 0, Math.PI); ctx.lineTo(x - s * 0.62, y + s * 0.32); ctx.quadraticCurveTo(x, y + s * 0.5, x + s * 0.62, y + s * 0.32); ctx.closePath(); ctx.fill()
  const r = rng(7)
  for (let i = 0; i < 22; i++) {
    const a = r() * Math.PI, d = r() * 0.8
    const dx = Math.cos(a) * s * d, dy = -Math.abs(Math.sin(a)) * s * 0.28 * d - s * 0.04
    const dg = ctx.createRadialGradient(x + dx - 3, y + dy - 3, 1, x + dx, y + dy, s * 0.13)
    dg.addColorStop(0, '#b0602a'); dg.addColorStop(1, '#3a1606')
    ctx.fillStyle = dg
    ctx.beginPath(); ctx.ellipse(x + dx, y + dy, s * 0.13, s * 0.075, r() * Math.PI, 0, Math.PI * 2); ctx.fill()
  }
  ctx.restore()
}

function dallah(ctx: Ctx, x: number, y: number, s: number) {
  ctx.save()
  const g = ctx.createLinearGradient(x - s * 0.5, 0, x + s * 0.5, 0)
  g.addColorStop(0, '#8a6420'); g.addColorStop(0.45, '#ffe39a'); g.addColorStop(0.6, '#d9a441'); g.addColorStop(1, '#6a4a12')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.moveTo(x - s * 0.42, y); ctx.quadraticCurveTo(x - s * 0.5, y - s * 0.5, x - s * 0.2, y - s * 0.7)
  ctx.lineTo(x - s * 0.14, y - s * 1.1); ctx.quadraticCurveTo(x - s * 0.3, y - s * 1.25, x, y - s * 1.45); ctx.quadraticCurveTo(x + s * 0.3, y - s * 1.25, x + s * 0.14, y - s * 1.1)
  ctx.lineTo(x + s * 0.2, y - s * 0.7); ctx.quadraticCurveTo(x + s * 0.5, y - s * 0.5, x + s * 0.42, y); ctx.closePath(); ctx.fill()
  ctx.strokeStyle = g; ctx.lineWidth = s * 0.07
  ctx.beginPath(); ctx.moveTo(x + s * 0.3, y - s * 0.5); ctx.quadraticCurveTo(x + s * 0.9, y - s * 0.8, x + s * 0.95, y - s * 1.2); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(x - s * 0.3, y - s * 0.4); ctx.quadraticCurveTo(x - s * 0.75, y - s * 0.6, x - s * 0.55, y - s * 1.0); ctx.stroke()
  ctx.restore()
}

function cup(ctx: Ctx, x: number, y: number, s: number) {
  ctx.save()
  ctx.fillStyle = '#f4efe6'
  ctx.beginPath(); ctx.moveTo(x - s * 0.5, y - s * 0.6); ctx.lineTo(x + s * 0.5, y - s * 0.6); ctx.lineTo(x + s * 0.35, y); ctx.lineTo(x - s * 0.35, y); ctx.closePath(); ctx.fill()
  ctx.strokeStyle = '#d9a441'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x - s * 0.47, y - s * 0.45); ctx.lineTo(x + s * 0.47, y - s * 0.45); ctx.stroke()
  ctx.restore()
}

/** يرسم المشهد على اللوحة كاملة */
export function drawPosterScene(ctx: Ctx, W: number, H: number, scene: PosterScene) {
  ctx.save()
  switch (scene) {
    case 'alley': {
      ctx.fillStyle = vgrad(ctx, 0, H, [[0, '#0d0907'], [0.45, '#2a170b'], [1, '#100905']]); ctx.fillRect(0, 0, W, H)
      glow(ctx, W / 2, H * 0.47, W * 0.7, 'rgba(255,170,80,0.55)')
      ctx.fillStyle = vgrad(ctx, 0, H * 0.4, [[0, '#091020'], [1, '#2a1f30']]); ctx.fillRect(W * 0.38, 0, W * 0.24, H * 0.36)
      stars(ctx, W, H, 25, 3, 0.3)
      // الجداران بمنظور
      for (const side of [-1, 1]) {
        ctx.save(); if (side === 1) { ctx.translate(W, 0); ctx.scale(-1, 1) }
        ctx.fillStyle = vgrad(ctx, 0, H, [[0, '#1c120b'], [0.5, '#3a2414'], [1, '#120b06']])
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(W * 0.4, H * 0.3); ctx.lineTo(W * 0.4, H * 0.62); ctx.lineTo(0, H); ctx.closePath(); ctx.fill()
        // مشربيات مضاءة
        for (let i = 0; i < 4; i++) {
          const t = i / 4, x = W * (0.03 + t * 0.3), w = W * (0.14 - t * 0.09), y = H * (0.12 + t * 0.2), h = H * (0.16 - t * 0.1)
          ctx.fillStyle = 'rgba(255,170,90,0.35)'; ctx.fillRect(x, y, w, h)
          ctx.strokeStyle = 'rgba(30,15,5,0.55)'; ctx.lineWidth = 1.5
          for (let k = 1; k < 6; k++) { ctx.beginPath(); ctx.moveTo(x + (w / 6) * k, y); ctx.lineTo(x + (w / 6) * k, y + h); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x, y + (h / 6) * k); ctx.lineTo(x + w, y + (h / 6) * k); ctx.stroke() }
          glow(ctx, x + w / 2, y + h / 2, w, 'rgba(255,160,70,0.35)')
        }
        ctx.restore()
      }
      // حبال الأضواء
      const r = rng(11)
      for (let row = 0; row < 7; row++) {
        const y = H * (0.22 + row * 0.055), sag = 60 + row * 20, x0 = W * (0.05 + row * 0.04), x1 = W - x0
        ctx.strokeStyle = 'rgba(40,25,10,0.8)'; ctx.lineWidth = 2
        ctx.beginPath(); ctx.moveTo(x0, y); ctx.quadraticCurveTo(W / 2, y + sag, x1, y); ctx.stroke()
        for (let k = 0; k <= 18; k++) {
          const t = k / 18, bx = (1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * (W / 2) + t * t * x1, by = (1 - t) * (1 - t) * y + 2 * (1 - t) * t * (y + sag) + t * t * y
          glow(ctx, bx, by, 16 - row, 'rgba(255,215,140,0.95)', 0.9)
          ctx.fillStyle = '#fff3c8'; ctx.beginPath(); ctx.arc(bx, by, 2.5, 0, Math.PI * 2); ctx.fill()
        }
      }
      const colors = ['#e2483a', '#f2a83a', '#3aa86b', '#e2483a', '#f2c94a', '#3a7ad9']
      for (let i = 0; i < 10; i++) { const d = r(); lantern(ctx, W * (0.12 + r() * 0.76), H * (0.3 + d * 0.22), 26 + (1 - d) * 40, colors[i % colors.length], '#c9963a', 30 + r() * 60) }
      bokeh(ctx, W, H, 26, 5, ['rgba(255,190,110,0.8)', 'rgba(255,120,80,0.7)', 'rgba(255,230,160,0.8)'], 0.25, 0.8)
      // الأرض والناس (ظلال ضبابية)
      ctx.fillStyle = vgrad(ctx, H * 0.62, H, [[0, 'rgba(40,24,12,0)'], [1, '#0b0704']]); ctx.fillRect(0, H * 0.62, W, H * 0.38)
      glow(ctx, W / 2, H * 0.78, W * 0.5, 'rgba(255,170,90,0.18)')
      break
    }
    case 'desert': {
      ctx.fillStyle = vgrad(ctx, 0, H * 0.65, [[0, '#1e2245'], [0.45, '#5b4a72'], [0.8, '#c47d6a'], [1, '#eaa86c']]); ctx.fillRect(0, 0, W, H)
      stars(ctx, W, H, 120, 21, 0.4)
      crescent(ctx, W * 0.66, H * 0.13, 52)
      // جرف بعيد
      ctx.fillStyle = vgrad(ctx, H * 0.45, H * 0.7, [[0, '#7a4a3a'], [1, '#3a2018']])
      ctx.beginPath(); ctx.moveTo(W * 0.45, H * 0.66); ctx.lineTo(W * 0.52, H * 0.5); ctx.lineTo(W * 0.62, H * 0.48); ctx.lineTo(W * 0.7, H * 0.46); ctx.lineTo(W, H * 0.47); ctx.lineTo(W, H * 0.68); ctx.closePath(); ctx.fill()
      ctx.fillStyle = 'rgba(255,190,130,0.25)'; ctx.fillRect(W * 0.52, H * 0.5, W * 0.48, 6)
      glow(ctx, W * 0.3, H * 0.63, W * 0.6, 'rgba(255,190,120,0.45)')
      // كثبان
      const dune = (y: number, amp: number, c0: string, c1: string, ph: number) => {
        ctx.fillStyle = vgrad(ctx, y - amp, H, [[0, c0], [1, c1]])
        ctx.beginPath(); ctx.moveTo(0, y)
        for (let x = 0; x <= W; x += 20) ctx.lineTo(x, y - Math.sin(x / W * Math.PI * 1.3 + ph) * amp)
        ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath(); ctx.fill()
      }
      dune(H * 0.66, 40, '#b8784a', '#6a3c20', 0.4)
      dune(H * 0.74, 70, '#d99a5e', '#8a5230', 2.1)
      dune(H * 0.84, 60, '#e7ad6e', '#9a5c32', 4.0)
      // مصلٍّ على سجادته
      rug(ctx, W * 0.5, H * 0.79, 150, 70)
      ctx.save(); ctx.fillStyle = '#f4efe6'
      ctx.beginPath(); ctx.ellipse(W * 0.53, H * 0.785, 34, 46, 0, 0, Math.PI * 2); ctx.fill()
      ctx.beginPath(); ctx.arc(W * 0.53, H * 0.755, 16, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = '#c23b2f'; ctx.beginPath(); ctx.arc(W * 0.53, H * 0.75, 17, Math.PI * 1.05, Math.PI * 1.95); ctx.fill()
      ctx.restore()
      break
    }
    case 'mudhouse': {
      ctx.fillStyle = vgrad(ctx, 0, H * 0.6, [[0, '#3b3256'], [0.5, '#c06d4a'], [1, '#f2b46a']]); ctx.fillRect(0, 0, W, H)
      glow(ctx, W * 0.75, H * 0.5, W * 0.6, 'rgba(255,210,140,0.6)')
      // نخيل
      const palm = (x: number, y: number, s: number) => {
        ctx.save(); ctx.strokeStyle = '#2a1a12'; ctx.fillStyle = '#2a1a12'; ctx.lineWidth = s * 0.08
        ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + s * 0.1, y - s * 0.6, x, y - s * 1.2); ctx.stroke()
        for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; ctx.beginPath(); ctx.moveTo(x, y - s * 1.2); ctx.quadraticCurveTo(x + Math.cos(a) * s * 0.5, y - s * 1.2 - s * 0.3, x + Math.cos(a) * s * 0.8, y - s * 1.2 + Math.abs(Math.sin(a)) * s * 0.3); ctx.lineWidth = s * 0.05; ctx.stroke() }
        ctx.restore()
      }
      palm(W * 0.88, H * 0.58, 220); palm(W * 0.1, H * 0.6, 170)
      // البرج الطيني
      const tx = W * 0.2, tw = W * 0.6, ty = H * 0.2, th = H * 0.42
      ctx.fillStyle = vgrad(ctx, ty, ty + th, [[0, '#c98d5a'], [1, '#8a5a34']]); ctx.fillRect(tx, ty, tw, th)
      ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(tx + tw * 0.62, ty, tw * 0.38, th)
      ctx.fillStyle = '#c98d5a'
      for (let i = 0; i < 9; i++) { const x = tx + (tw / 9) * i; ctx.beginPath(); ctx.moveTo(x + 4, ty); ctx.lineTo(x + tw / 18, ty - 40); ctx.lineTo(x + tw / 9 - 4, ty); ctx.closePath(); ctx.fill() }
      for (let row = 0; row < 3; row++) for (let i = 0; i < 4; i++) {
        const x = tx + tw * (0.14 + i * 0.22), y = ty + th * (0.15 + row * 0.27)
        glow(ctx, x, y, 60, 'rgba(255,200,90,0.5)')
        ctx.fillStyle = '#ffd36a'; ctx.beginPath(); ctx.moveTo(x - 26, y + 22); ctx.lineTo(x, y - 26); ctx.lineTo(x + 26, y + 22); ctx.closePath(); ctx.fill()
      }
      ctx.fillStyle = '#3a2210'; ctx.fillRect(tx + tw * 0.44, ty + th * 0.78, tw * 0.12, th * 0.22)
      // الأرض والسفرة
      ctx.fillStyle = vgrad(ctx, H * 0.6, H, [[0, '#b07a4a'], [1, '#5a3a20']]); ctx.fillRect(0, H * 0.62, W, H * 0.38)
      rug(ctx, W * 0.2, H * 0.8, W * 0.75, H * 0.14)
      datesBowl(ctx, W * 0.36, H * 0.84, 120)
      dallah(ctx, W * 0.66, H * 0.86, 150)
      cup(ctx, W * 0.5, H * 0.86, 50); cup(ctx, W * 0.56, H * 0.875, 50)
      break
    }
    case 'archway': {
      ctx.fillStyle = '#05070f'; ctx.fillRect(0, 0, W, H)
      const arch = new Path2D()
      const ax = W * 0.14, aw = W * 0.72, ay = H * 0.16, ah = H * 0.66
      arch.moveTo(ax, ay + ah); arch.lineTo(ax, ay + ah * 0.35)
      arch.bezierCurveTo(ax, ay + ah * 0.12, ax + aw * 0.3, ay + ah * 0.05, ax + aw / 2, ay)
      arch.bezierCurveTo(ax + aw * 0.7, ay + ah * 0.05, ax + aw, ay + ah * 0.12, ax + aw, ay + ah * 0.35)
      arch.lineTo(ax + aw, ay + ah); arch.closePath()
      ctx.save(); ctx.clip(arch)
      ctx.fillStyle = vgrad(ctx, ay, ay + ah, [[0, '#0a1838'], [0.6, '#1d3a72'], [1, '#2a4a8a']]); ctx.fillRect(0, 0, W, H)
      stars(ctx, W, H, 90, 31, 0.6)
      glow(ctx, W * 0.6, H * 0.36, 300, 'rgba(160,190,255,0.35)')
      ctx.fillStyle = 'rgba(200,210,255,0.12)'
      for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.ellipse(W * (0.3 + i * 0.12), H * (0.4 + (i % 2) * 0.05), 160, 40, 0, 0, Math.PI * 2); ctx.fill() }
      crescent(ctx, W * 0.42, H * 0.32, 60, '#f4f6ff', 'rgba(200,220,255,0.6)')
      mosqueSkyline(ctx, W, ay + ah * 0.98, 0.95, '#0a1430', '#ffcf6a')
      ctx.restore()
      // إطار مزخرف
      ctx.strokeStyle = 'rgba(217,164,65,0.85)'; ctx.lineWidth = 6; ctx.stroke(arch)
      ctx.save(); ctx.translate(W / 2, (ay + ah) / 2 + ay / 2); ctx.scale(1.05, 1.04); ctx.translate(-W / 2, -((ay + ah) / 2 + ay / 2)); ctx.strokeStyle = 'rgba(217,164,65,0.4)'; ctx.lineWidth = 2; ctx.stroke(arch); ctx.restore()
      const r = rng(9)
      ctx.strokeStyle = 'rgba(217,164,65,0.18)'; ctx.lineWidth = 1.5
      for (let i = 0; i < 40; i++) { const x = r() * W, y = r() * H; if (ctx.isPointInPath(arch, x, y)) continue; ctx.beginPath(); ctx.arc(x, y, 20 + r() * 40, r() * 6, r() * 6 + 2.4); ctx.stroke() }
      glow(ctx, W / 2, ay + ah, 420, 'rgba(255,190,90,0.35)')
      ctx.fillStyle = vgrad(ctx, ay + ah, H, [[0, '#1a1208'], [1, '#05070f']]); ctx.fillRect(0, ay + ah, W, H - ay - ah)
      break
    }
    case 'dusk': {
      ctx.fillStyle = vgrad(ctx, 0, H, [[0, '#f39a3a'], [0.45, '#d4607a'], [0.75, '#6a2f8a'], [1, '#2a1240']]); ctx.fillRect(0, 0, W, H)
      crescent(ctx, W / 2, H * 0.22, 110, '#ffffff', 'rgba(255,240,220,0.5)')
      mosqueSkyline(ctx, W, H * 0.9, 1.3, '#120820')
      break
    }
    case 'crimson': {
      ctx.fillStyle = vgrad(ctx, 0, H, [[0, '#e0504a'], [1, '#a92a33']]); ctx.fillRect(0, 0, W, H)
      glow(ctx, W / 2, H * 0.42, W * 0.6, 'rgba(255,200,150,0.25)')
      ctx.save(); ctx.globalAlpha = 0.9
      mosqueSkyline(ctx, W, H * 0.36, 0.45, 'rgba(242,196,90,0.95)')
      ctx.restore()
      ctx.fillStyle = vgrad(ctx, H * 0.36, H, [[0, '#e0504a'], [1, '#a92a33']]); ctx.fillRect(0, H * 0.36, W, H)
      crescent(ctx, W * 0.66, H * 0.24, 34, '#f2c45a', 'rgba(242,196,90,0.3)')
      const r = rng(4); ctx.fillStyle = '#f2c45a'
      for (let i = 0; i < 14; i++) { const x = W * (0.2 + r() * 0.6), y = H * (0.12 + r() * 0.2), s = 4 + r() * 6; ctx.beginPath(); ctx.moveTo(x, y - s * 2); ctx.lineTo(x + s * 0.5, y); ctx.lineTo(x, y + s * 2); ctx.lineTo(x - s * 0.5, y); ctx.closePath(); ctx.fill() }
      break
    }
    case 'lanterns': {
      ctx.fillStyle = vgrad(ctx, 0, H, [[0, '#060a1c'], [0.6, '#121a3a'], [1, '#05060f']]); ctx.fillRect(0, 0, W, H)
      stars(ctx, W, H, 140, 41, 0.9)
      crescent(ctx, W * 0.78, H * 0.16, 70)
      bokeh(ctx, W, H, 24, 8, ['rgba(255,190,90,0.6)', 'rgba(255,140,60,0.5)'], 0.4, 1)
      const L: [number, number, number, string][] = [[0.18, 0.2, 70, '#f2a83a'], [0.38, 0.32, 95, '#e2483a'], [0.6, 0.18, 60, '#3aa86b'], [0.8, 0.38, 80, '#f2c94a'], [0.5, 0.52, 55, '#f2a83a']]
      for (const [x, y, s, c] of L) lantern(ctx, W * x, H * y, s, c, '#d9a441', H * y)
      break
    }
    case 'sufra': {
      ctx.fillStyle = vgrad(ctx, 0, H, [[0, '#1a0e06'], [0.6, '#2e1a0c'], [1, '#120904']]); ctx.fillRect(0, 0, W, H)
      bokeh(ctx, W, H, 40, 13, ['rgba(255,190,100,0.7)', 'rgba(255,150,70,0.6)', 'rgba(255,225,160,0.6)'], 0, 0.6)
      lantern(ctx, W * 0.82, H * 0.52, 80, '#f2a83a', '#d9a441', 0)
      ctx.fillStyle = vgrad(ctx, H * 0.68, H, [[0, '#6a3a1a'], [0.2, '#4a2810'], [1, '#1a0c04']]); ctx.fillRect(0, H * 0.7, W, H * 0.3)
      ctx.fillStyle = 'rgba(255,200,130,0.25)'; ctx.fillRect(0, H * 0.7, W, 4)
      datesBowl(ctx, W * 0.32, H * 0.76, 170)
      dallah(ctx, W * 0.62, H * 0.8, 190)
      cup(ctx, W * 0.82, H * 0.79, 60)
      crescent(ctx, W * 0.2, H * 0.14, 48)
      break
    }
    case 'emerald': {
      ctx.fillStyle = vgrad(ctx, 0, H, [[0, '#0b3b30'], [0.5, '#0f5040'], [1, '#062a22']]); ctx.fillRect(0, 0, W, H)
      ctx.strokeStyle = 'rgba(226,194,126,0.22)'; ctx.lineWidth = 2
      for (let y = 0; y < H; y += 140) for (let x = 0; x < W; x += 140) { ctx.save(); ctx.translate(x + 70, y + 70); for (const a of [0, Math.PI / 4]) { ctx.save(); ctx.rotate(a); ctx.strokeRect(-36, -36, 72, 72); ctx.restore() } ctx.beginPath(); ctx.arc(0, 0, 14, 0, Math.PI * 2); ctx.stroke(); ctx.restore() }
      glow(ctx, W / 2, H * 0.45, W * 0.6, 'rgba(255,215,140,0.25)')
      ctx.strokeStyle = 'rgba(226,194,126,0.9)'; ctx.lineWidth = 6; ctx.strokeRect(50, 50, W - 100, H - 100)
      ctx.lineWidth = 2; ctx.strokeRect(70, 70, W - 140, H - 140)
      lantern(ctx, W * 0.28, 70, 55, '#f2c94a', '#e2c27e', 70)
      lantern(ctx, W * 0.72, 70, 55, '#f2c94a', '#e2c27e', 120)
      break
    }
  }
  ctx.restore()
}

export interface PosterText {
  headline: string
  sub?: string
  source?: string
  /** «رقعة» للتهاني، و«نسخ» للنصوص الطويلة */
  style?: 'ruqaa' | 'kufi' | 'naskh'
}

const HEAD_FONT = { ruqaa: '"Aref Ruqaa", "Amiri", serif', kufi: '"Reem Kufi Ink", "Amiri", serif', naskh: '"Amiri", serif' }

/** موضع النص لكل مشهد (نسبة من الارتفاع) حتى لا يغطي عناصر المشهد الرئيسية */
const TEXT_Y: Record<PosterScene, number> = { alley: 0.62, desert: 0.4, mudhouse: 0.1, archway: 0.5, dusk: 0.47, crimson: 0.52, lanterns: 0.7, sufra: 0.42, emerald: 0.52 }

function wrap(ctx: Ctx, text: string, maxW: number): string[] {
  const out: string[] = []
  for (const para of text.split('\n')) {
    let line = ''
    for (const w of para.split(/\s+/)) {
      const t = line ? `${line} ${w}` : w
      if (ctx.measureText(t).width > maxW && line) { out.push(line); line = w } else line = t
    }
    if (line) out.push(line)
  }
  return out
}

/** النص فوق المشهد: عنوان بخط الرقعة أو الكوفي، ثم سطر صغير، ثم المصدر، والعلامة أسفلها */
export function drawPosterText(ctx: Ctx, W: number, H: number, scene: PosterScene, t: PosterText, brand = 'رفيق المسلم') {
  const style = t.style ?? 'ruqaa'
  ctx.save()
  ctx.direction = 'rtl'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  const maxW = W * 0.8
  let size = style === 'naskh' ? 64 : 150
  ctx.font = `700 ${size}px ${HEAD_FONT[style]}`
  let lines = wrap(ctx, t.headline, maxW)
  while ((lines.length * size * 1.35 > H * 0.42 || lines.some((l) => ctx.measureText(l).width > maxW)) && size > 40) { size -= 4; ctx.font = `700 ${size}px ${HEAD_FONT[style]}`; lines = wrap(ctx, t.headline, maxW) }
  const lh = size * (style === 'naskh' ? 1.7 : 1.35)
  const subSize = 46
  const block = lines.length * lh + (t.sub ? subSize * 2 : 0) + (t.source ? 40 : 0)
  let y = H * TEXT_Y[scene] - block / 2 + lh / 2
  ctx.fillStyle = '#ffffff'
  ctx.shadowColor = 'rgba(0,0,0,0.65)'; ctx.shadowBlur = size * 0.25; ctx.shadowOffsetY = 4
  for (const l of lines) { ctx.fillText(l, W / 2, y); y += lh }
  if (t.sub) {
    ctx.font = `600 ${subSize}px "Amiri", serif`
    ctx.fillStyle = 'rgba(255,245,220,0.95)'
    y += subSize * 0.2
    for (const l of wrap(ctx, t.sub, maxW)) { ctx.fillText(l, W / 2, y); y += subSize * 1.5 }
  }
  if (t.source) {
    ctx.font = `600 32px "IBM Plex Sans Arabic", sans-serif`
    ctx.fillStyle = 'rgba(242,214,143,0.95)'
    ctx.fillText(t.source, W / 2, y + 10)
  }
  // العلامة: شعار صغير واسم التطبيق
  ctx.shadowBlur = 8
  const by = H - 150
  ctx.fillStyle = '#0f5a48'
  ctx.beginPath(); ctx.roundRect(W / 2 - 34, by - 34, 68, 68, 18); ctx.fill()
  crescentShape(ctx, W / 2, by, 18, '#e9cf8e')
  ctx.fillStyle = '#ffffff'; ctx.font = `700 34px "IBM Plex Sans Arabic", sans-serif`
  ctx.fillText(brand, W / 2, by + 70)
  ctx.restore()
}

export async function loadPosterFonts(text: string) {
  if (!document.fonts) return
  await Promise.all([
    document.fonts.load(`700 120px ${HEAD_FONT.ruqaa}`, text),
    document.fonts.load(`400 120px ${HEAD_FONT.kufi}`, text),
    document.fonts.load(`700 60px ${HEAD_FONT.naskh}`, text),
    document.fonts.load(`700 34px "IBM Plex Sans Arabic"`, 'رفيق المسلم ' + text),
  ]).catch(() => {})
}
