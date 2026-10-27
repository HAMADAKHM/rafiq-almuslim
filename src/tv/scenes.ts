// مكتبة مشاهد شاشة التلفاز: مشاهد حيّة مرسومة بالكود على Canvas (لا صور ولا فيديو خارجي — ملك للتطبيق
// وتعمل دون إنترنت على Android TV وسامسونج). كل مشهد: طبقات ثابتة تُرسم مرة واحدة + عناصر متحركة في كل إطار.

export type SceneId = 'night-mosque' | 'ocean-sunset' | 'desert' | 'aurora' | 'rain-window' | 'galaxy' | 'geometry' | 'forest'

export interface SceneInfo { id: SceneId; name: string; category: string; note: string }

export const SCENES: SceneInfo[] = [
  { id: 'night-mosque', name: 'ليلة هادئة', category: 'مشاهد إسلامية', note: 'سماء مرصعة بالنجوم ودرب التبانة، وهلال، وقباب تتلألأ نوافذها، وشهب عابرة' },
  { id: 'geometry', name: 'زخارف ذهبية', category: 'مشاهد إسلامية', note: 'نقوش هندسية إسلامية تدور وتتفتح ببطء بخطوط من نور' },
  { id: 'ocean-sunset', name: 'غروب البحر', category: 'الطبيعة', note: 'شمس تغيب، وأمواج متتابعة، وبريق يتراقص على الماء، وطيور بعيدة' },
  { id: 'desert', name: 'كثبان الصحراء', category: 'الطبيعة', note: 'غسق فوق الكثبان، وقافلة تمضي، ورمال تحملها الريح، ونجوم تبدأ بالظهور' },
  { id: 'forest', name: 'غابة اليراعات', category: 'الطبيعة', note: 'غابة ضبابية في الليل تطير فيها اليراعات المضيئة' },
  { id: 'aurora', name: 'الشفق القطبي', category: 'السماء والفضاء', note: 'ستائر ضوء خضراء وبنفسجية تتموج فوق الجبال وتنعكس على البحيرة' },
  { id: 'galaxy', name: 'رحلة بين المجرات', category: 'السماء والفضاء', note: 'مجرة حلزونية تدور ببطء وسدم ملونة ونجوم تقترب' },
  { id: 'rain-window', name: 'مطر على النافذة', category: 'المدن والأجواء', note: 'قطرات تنساب على الزجاج وأضواء مدينة ليلية خلفه' },
]

export const sceneInfo = (id: string) => SCENES.find((s) => s.id === id) ?? null

/** مولد أرقام شبه عشوائية ثابت (المشهد نفسه في كل تشغيل) */
export function rng(seed: number) {
  let s = seed >>> 0
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 }
}

type Ctx = CanvasRenderingContext2D
interface Painter { frame(ctx: Ctx, t: number): void }

function layer(w: number, h: number, draw: (c: Ctx) => void): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = w; c.height = h
  const x = c.getContext('2d')
  if (x) draw(x)
  return c
}

function vgrad(c: Ctx, h: number, stops: [number, string][], y0 = 0) {
  const g = c.createLinearGradient(0, y0, 0, h)
  for (const [o, col] of stops) g.addColorStop(o, col)
  return g
}

function glow(c: Ctx, x: number, y: number, r: number, color: string, alpha: number) {
  const g = c.createRadialGradient(x, y, 0, x, y, r)
  g.addColorStop(0, color.replace('A', String(alpha)))
  g.addColorStop(1, color.replace('A', '0'))
  c.fillStyle = g
  c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill()
}

// ---------- عناصر مشتركة ----------
function starsLayer(c: Ctx, w: number, h: number, n: number, r: () => number, maxY = 1) {
  for (let i = 0; i < n; i++) {
    const x = r() * w, y = r() * h * maxY, s = r()
    c.fillStyle = `rgba(255,255,255,${0.25 + s * 0.6})`
    c.fillRect(x, y, s > 0.92 ? 2 : 1, s > 0.92 ? 2 : 1)
  }
}

interface Twinkle { x: number; y: number; r: number; p: number; sp: number }
function makeTwinkles(w: number, h: number, n: number, r: () => number, maxY = 0.75): Twinkle[] {
  return Array.from({ length: n }, () => ({ x: r() * w, y: r() * h * maxY, r: 0.8 + r() * 1.6, p: r() * 6.28, sp: 0.6 + r() * 1.8 }))
}
function drawTwinkles(c: Ctx, list: Twinkle[], t: number) {
  for (const s of list) {
    const a = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * s.sp + s.p))
    c.fillStyle = `rgba(255,250,235,${a.toFixed(3)})`
    c.beginPath(); c.arc(s.x, s.y, s.r, 0, Math.PI * 2); c.fill()
  }
}

/** هلال مرسوم مرة واحدة على طبقة مستقلة (القص لا يمس السماء خلفه) */
const crescentCache = new Map<string, HTMLCanvasElement>()
function crescent(c: Ctx, x: number, y: number, r: number, color: string) {
  glow(c, x, y, r * 4, 'rgba(255,240,200,A)', 0.22)
  const key = `${Math.round(r)}:${color}`
  let img = crescentCache.get(key)
  if (!img) {
    const size = Math.ceil(r * 2 + 4)
    img = layer(size, size, (k) => {
      k.fillStyle = color
      k.beginPath(); k.arc(size / 2, size / 2, r, 0, Math.PI * 2); k.fill()
      k.globalCompositeOperation = 'destination-out'
      k.beginPath(); k.arc(size / 2 + r * 0.42, size / 2 - r * 0.24, r * 0.86, 0, Math.PI * 2); k.fill()
    })
    crescentCache.set(key, img)
  }
  c.drawImage(img, x - img.width / 2, y - img.height / 2)
}

/** صف قباب ومآذن (للطبقة الثابتة) ونوافذها */
function mosqueSkyline(c: Ctx, w: number, h: number, base: number, color: string, r: () => number): { x: number; y: number }[] {
  const windows: { x: number; y: number }[] = []
  c.fillStyle = color
  c.fillRect(0, base, w, h - base)
  let x = -20
  while (x < w + 40) {
    const kind = r()
    if (kind < 0.35) {
      // قبة كبيرة على بناء
      const bw = 140 + r() * 120, bh = 60 + r() * 50, dome = bw * 0.36
      c.fillRect(x, base - bh, bw, bh)
      c.beginPath(); c.ellipse(x + bw / 2, base - bh, dome, dome * 1.05, 0, Math.PI, 0); c.fill()
      c.fillRect(x + bw / 2 - 2, base - bh - dome * 1.05 - 18, 4, 18)
      c.beginPath(); c.arc(x + bw / 2, base - bh - dome * 1.05 - 22, 5, 0, Math.PI * 2); c.fill()
      for (let i = 0; i < 4; i++) windows.push({ x: x + bw * (0.2 + i * 0.2), y: base - bh * 0.55 })
      x += bw + 10 + r() * 30
    } else if (kind < 0.6) {
      // مئذنة
      const mh = 160 + r() * 140, mw = 16 + r() * 8
      c.fillRect(x, base - mh, mw, mh)
      c.fillRect(x - 5, base - mh * 0.7, mw + 10, 6)
      c.beginPath(); c.moveTo(x - 2, base - mh); c.lineTo(x + mw / 2, base - mh - 34); c.lineTo(x + mw + 2, base - mh); c.fill()
      windows.push({ x: x + mw / 2 - 2, y: base - mh * 0.85 })
      x += mw + 30 + r() * 50
    } else {
      // بيوت منخفضة
      const bw = 60 + r() * 90, bh = 30 + r() * 45
      c.fillRect(x, base - bh, bw, bh)
      if (r() > 0.4) windows.push({ x: x + bw * 0.3, y: base - bh * 0.6 })
      if (r() > 0.5) windows.push({ x: x + bw * 0.65, y: base - bh * 0.6 })
      x += bw + r() * 20
    }
  }
  return windows
}

// ---------- المشاهد ----------
function nightMosque(w: number, h: number): Painter {
  const r = rng(11)
  const base = h * 0.82
  let windows: { x: number; y: number; p: number }[] = []
  const sky = layer(w, h, (c) => {
    c.fillStyle = vgrad(c, h, [[0, '#040818'], [0.45, '#0c1840'], [0.78, '#24306a'], [1, '#3a3f7a']]); c.fillRect(0, 0, w, h)
    // درب التبانة: سحابة نجوم مائلة
    c.save(); c.translate(w * 0.5, h * 0.35); c.rotate(-0.5)
    for (let i = 0; i < 260; i++) glow(c, (r() - 0.5) * w * 1.4, (r() - 0.5) * h * 0.18, 30 + r() * 70, 'rgba(170,180,255,A)', 0.035)
    c.restore()
    starsLayer(c, w, h, 900, r, 0.8)
  })
  const city = layer(w, h, (c) => {
    // توهج الأفق ثم الصورة الظلية
    c.fillStyle = vgrad(c, h, [[0, 'rgba(120,110,200,0)'], [1, 'rgba(255,170,110,0.28)']], h * 0.55); c.fillRect(0, h * 0.55, w, h * 0.45)
    windows = mosqueSkyline(c, w, h, base, '#04060f', r).map((p) => ({ ...p, p: r() * 6.28 }))
  })
  const tw = makeTwinkles(w, h, 140, r)
  let meteor = { t0: 4, x: 0, y: 0 }
  return {
    frame(c, t) {
      c.drawImage(sky, 0, 0)
      drawTwinkles(c, tw, t)
      crescent(c, w * 0.78, h * 0.2, h * 0.055, '#fbefc6')
      const mt = t - meteor.t0
      if (mt > 0 && mt < 1.1) {
        const x = meteor.x + mt * w * 0.35, y = meteor.y + mt * h * 0.18
        const g = c.createLinearGradient(x - 160, y - 80, x, y)
        g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(255,255,255,0.9)')
        c.strokeStyle = g; c.lineWidth = 2; c.beginPath(); c.moveTo(x - 160, y - 80); c.lineTo(x, y); c.stroke()
      } else if (mt >= 1.1) meteor = { t0: t + 7 + (t % 9), x: (t * 97) % (w * 0.6), y: (t * 53) % (h * 0.25) }
      c.drawImage(city, 0, 0)
      for (const win of windows) {
        const a = 0.75 + 0.25 * Math.sin(t * 1.3 + win.p)
        c.fillStyle = `rgba(255,205,120,${a.toFixed(2)})`
        c.fillRect(win.x, win.y, 6, 10)
        glow(c, win.x + 3, win.y + 5, 16, 'rgba(255,190,100,A)', 0.18 * a)
      }
    },
  }
}

function oceanSunset(w: number, h: number): Painter {
  const r = rng(5)
  const horizon = h * 0.58
  const sky = layer(w, h, (c) => {
    c.fillStyle = vgrad(c, horizon, [[0, '#1b1640'], [0.35, '#5a2a5a'], [0.7, '#e0684a'], [1, '#ffb070']]); c.fillRect(0, 0, w, horizon)
    glow(c, w * 0.5, horizon, h * 0.5, 'rgba(255,170,90,A)', 0.55)
    c.fillStyle = '#ffd98f'; c.beginPath(); c.arc(w * 0.5, horizon - h * 0.04, h * 0.07, 0, Math.PI * 2); c.fill()
    for (let i = 0; i < 9; i++) { // سحب رقيقة
      const y = h * (0.12 + r() * 0.3), x = r() * w
      c.fillStyle = `rgba(255,${150 + r() * 60},${120 + r() * 40},0.18)`
      c.beginPath(); c.ellipse(x, y, 160 + r() * 260, 8 + r() * 12, 0, 0, Math.PI * 2); c.fill()
    }
  })
  const birds = Array.from({ length: 5 }, (_, i) => ({ x: r() * w, y: h * (0.18 + r() * 0.2), s: 0.6 + r() * 0.6, p: i }))
  return {
    frame(c, t) {
      c.drawImage(sky, 0, 0)
      // البحر: طبقات أمواج تتحرك
      for (let k = 0; k < 7; k++) {
        const y0 = horizon + k * k * (h - horizon) / 40
        const amp = 2 + k * 2.2, len = 120 + k * 60, sp = 0.4 + k * 0.15
        c.fillStyle = `rgb(${Math.round(150 - k * 18)},${Math.round(70 - k * 5)},${Math.round(90 - k * 4)})`
        c.beginPath(); c.moveTo(0, h)
        for (let x = 0; x <= w; x += 16) c.lineTo(x, y0 + Math.sin(x / len + t * sp + k) * amp + Math.sin(x / (len * 0.37) - t * sp * 1.7) * amp * 0.4)
        c.lineTo(w, h); c.fill()
      }
      // درب الشمس على الماء
      for (let i = 0; i < 70; i++) {
        const yy = horizon + 6 + (i / 70) * (h - horizon)
        const spread = 30 + (i / 70) * w * 0.22
        const xx = w * 0.5 + Math.sin(i * 12.9 + t * 1.7) * spread
        const a = (0.5 + 0.5 * Math.sin(t * 3 + i)) * 0.55
        c.fillStyle = `rgba(255,214,150,${a.toFixed(2)})`
        c.fillRect(xx, yy, 14 + (i % 5) * 4, 2)
      }
      // طيور بعيدة
      c.strokeStyle = 'rgba(30,15,30,0.8)'; c.lineWidth = 2
      for (const b of birds) {
        const x = (b.x + t * 25 * b.s) % (w + 100) - 50, y = b.y + Math.sin(t * 0.5 + b.p) * 10, f = Math.sin(t * 6 + b.p) * 6
        c.beginPath(); c.moveTo(x - 12 * b.s, y - f * b.s); c.quadraticCurveTo(x - 5 * b.s, y - 3, x, y); c.quadraticCurveTo(x + 5 * b.s, y - 3, x + 12 * b.s, y - f * b.s); c.stroke()
      }
    },
  }
}

function desert(w: number, h: number): Painter {
  const r = rng(23)
  const sky = layer(w, h, (c) => {
    c.fillStyle = vgrad(c, h, [[0, '#120d2e'], [0.4, '#4a2a5e'], [0.62, '#c45a4e'], [0.75, '#f39a5e']]); c.fillRect(0, 0, w, h)
    starsLayer(c, w, h, 350, r, 0.4)
    glow(c, w * 0.3, h * 0.66, h * 0.4, 'rgba(255,160,90,A)', 0.5)
  })
  const tw = makeTwinkles(w, h, 60, r, 0.35)
  const dune = (k: number, col: string, y: number, amp: number, len: number) => ({ k, col, y, amp, len })
  const dunes = [dune(0, '#b8603f', 0.66, 30, 520), dune(1, '#8a4234', 0.74, 40, 420), dune(2, '#5a2a30', 0.84, 46, 360), dune(3, '#2e1424', 0.94, 30, 300)]
  const sand = Array.from({ length: 120 }, () => ({ x: r() * w, y: h * (0.6 + r() * 0.4), s: 0.5 + r() }))
  return {
    frame(c, t) {
      c.drawImage(sky, 0, 0)
      drawTwinkles(c, tw, t)
      dunes.forEach((d, i) => {
        const off = t * (4 + i * 5)
        c.fillStyle = d.col
        c.beginPath(); c.moveTo(0, h)
        for (let x = 0; x <= w; x += 12) c.lineTo(x, h * d.y + Math.sin((x + off) / d.len) * d.amp + Math.sin((x + off) / (d.len * 0.43)) * d.amp * 0.35)
        c.lineTo(w, h); c.fill()
        if (i === 1) { // القافلة على الكثيب الثاني
          const cx = w - ((t * 18) % (w + 300)) , baseY = h * d.y + Math.sin((cx + off) / d.len) * d.amp - 2
          c.fillStyle = '#2a1220'
          for (let j = 0; j < 4; j++) {
            const x = cx + j * 46, step = Math.sin(t * 4 + j) * 2
            c.beginPath(); c.ellipse(x, baseY - 22, 16, 9, 0, 0, Math.PI * 2); c.fill()
            c.beginPath(); c.ellipse(x - 4, baseY - 30, 7, 6, 0, 0, Math.PI * 2); c.fill()
            c.fillRect(x + 12, baseY - 38, 4, 16); c.beginPath(); c.ellipse(x + 17, baseY - 39, 6, 3.5, 0, 0, Math.PI * 2); c.fill()
            c.fillRect(x - 12 + step, baseY - 16, 3, 16); c.fillRect(x + 8 - step, baseY - 16, 3, 16)
          }
        }
      })
      c.fillStyle = 'rgba(255,215,160,0.35)'
      for (const p of sand) {
        const x = (p.x - t * 60 * p.s) % w, xx = x < 0 ? x + w : x
        c.fillRect(xx, p.y + Math.sin(t + p.x) * 6, 2.2 * p.s, 1.2)
      }
    },
  }
}

function aurora(w: number, h: number): Painter {
  const r = rng(31)
  const lake = h * 0.74
  const sky = layer(w, h, (c) => {
    c.fillStyle = vgrad(c, lake, [[0, '#020611'], [0.7, '#07182a'], [1, '#0c2536']]); c.fillRect(0, 0, w, lake)
    starsLayer(c, w, lake, 700, r, 0.95)
  })
  const mountains = layer(w, h, (c) => {
    const ridge = (y: number, col: string, amp: number, seed: number) => {
      const rr = rng(seed)
      c.fillStyle = col; c.beginPath(); c.moveTo(0, lake)
      let x = 0
      while (x <= w) { c.lineTo(x, y - rr() * amp); x += 40 + rr() * 80 }
      c.lineTo(w, lake); c.fill()
    }
    ridge(lake - 40, '#13293b', 160, 3)
    ridge(lake - 10, '#0a1724', 90, 9)
    c.fillStyle = vgrad(c, h, [[0, '#06121c'], [1, '#02070c']], lake); c.fillRect(0, lake, w, h - lake)
  })
  const tw = makeTwinkles(w, h, 90, r, 0.6)
  // ستارة الشفق: أشرطة رأسية متصلة على مسار متموج، طولها وإضاءتها يتغيران بنعومة (لا بقع منفصلة)
  const curtain = (c: Ctx, t: number, hue: number, yBase: number, amp: number, sp: number, alpha: number) => {
    const S = h / 1080
    for (let x = -20; x <= w + 20; x += 4) {
      const y = yBase + Math.sin(x / (420 * S) + t * sp) * amp * S + Math.sin(x / (170 * S) - t * sp * 1.4) * amp * 0.35 * S
      const len = (180 + 160 * (0.5 + 0.5 * Math.sin(x / (380 * S) + t * sp * 0.9))) * S
      const a = alpha * (0.55 + 0.45 * Math.sin(x / (520 * S) - t * sp * 0.7)) * (0.85 + 0.15 * Math.sin(x / (23 * S) + t * 3))
      const g = c.createLinearGradient(0, y - len, 0, y + 12 * S)
      g.addColorStop(0, `hsla(${hue + 40},85%,60%,0)`)
      g.addColorStop(0.55, `hsla(${hue + 20},90%,60%,${(a * 0.5).toFixed(3)})`)
      g.addColorStop(0.9, `hsla(${hue},95%,62%,${a.toFixed(3)})`)
      g.addColorStop(1, `hsla(${hue},95%,70%,0)`)
      c.fillStyle = g; c.fillRect(x, y - len, 5, len + 12 * S)
    }
  }
  return {
    frame(c, t) {
      c.drawImage(sky, 0, 0)
      drawTwinkles(c, tw, t)
      c.globalCompositeOperation = 'lighter'
      curtain(c, t, 145, h * 0.46, 70, 0.16, 0.34)
      curtain(c, t + 40, 285, h * 0.36, 55, 0.11, 0.18)
      c.globalCompositeOperation = 'source-over'
      c.drawImage(mountains, 0, 0)
      // انعكاس في البحيرة
      c.save(); c.globalAlpha = 0.28; c.translate(0, lake * 2); c.scale(1, -1)
      c.drawImage(sky, 0, 0, w, lake, 0, 0, w, lake)
      c.globalCompositeOperation = 'lighter'
      curtain(c, t, 145, h * 0.46, 70, 0.16, 0.3)
      c.restore()
      c.fillStyle = 'rgba(2,7,12,0.35)'; c.fillRect(0, lake, w, h - lake)
      for (let i = 0; i < 6; i++) { c.fillStyle = 'rgba(160,230,220,0.05)'; c.fillRect(0, lake + 10 + i * 22 + Math.sin(t + i) * 3, w, 1) }
    },
  }
}

function rainWindow(w: number, h: number): Painter {
  const r = rng(41)
  const bokeh = layer(w, h, (c) => {
    c.fillStyle = vgrad(c, h, [[0, '#0b0f1c'], [0.6, '#141a2e'], [1, '#1d1a26']]); c.fillRect(0, 0, w, h)
    const cols = ['255,190,110', '255,140,90', '120,170,255', '255,230,170', '200,120,255']
    for (let i = 0; i < 90; i++) glow(c, r() * w, h * (0.35 + r() * 0.6), 20 + r() * 60, `rgba(${cols[i % cols.length]},A)`, 0.25 + r() * 0.3)
  })
  const drops = Array.from({ length: 160 }, () => ({ x: r() * w, y: r() * h, v: 0, s: 2 + r() * 5, stick: r() * 6 }))
  const still = Array.from({ length: 420 }, () => ({ x: r() * w, y: r() * h, s: 0.8 + r() * 2.2 }))
  return {
    frame(c, t) {
      c.drawImage(bokeh, 0, 0)
      c.fillStyle = 'rgba(10,14,26,0.18)'; c.fillRect(0, 0, w, h)
      // قطرات صغيرة ثابتة على الزجاج
      for (const d of still) { c.fillStyle = 'rgba(200,220,255,0.18)'; c.beginPath(); c.arc(d.x, d.y, d.s, 0, Math.PI * 2); c.fill() }
      // قطرات تنزلق تاركة أثرًا
      for (const d of drops) {
        if (d.stick > 0) d.stick -= 1 / 30
        else { d.v = Math.min(9, d.v + 0.06 * d.s); d.y += d.v * 0.6; d.x += Math.sin(d.y / 40) * 0.25 }
        if (d.y > h + 20) { d.y = -20; d.x = Math.random() * w; d.v = 0; d.stick = Math.random() * 5 }
        const g = c.createLinearGradient(d.x, d.y - d.s * 10, d.x, d.y)
        g.addColorStop(0, 'rgba(210,225,255,0)'); g.addColorStop(1, 'rgba(210,225,255,0.22)')
        c.fillStyle = g; c.fillRect(d.x - d.s * 0.35, d.y - d.s * 10, d.s * 0.7, d.s * 10)
        c.fillStyle = 'rgba(230,240,255,0.55)'; c.beginPath(); c.arc(d.x, d.y, d.s, 0, Math.PI * 2); c.fill()
        c.fillStyle = 'rgba(255,255,255,0.8)'; c.beginPath(); c.arc(d.x - d.s * 0.3, d.y - d.s * 0.3, d.s * 0.3, 0, Math.PI * 2); c.fill()
      }
      void t
    },
  }
}

function galaxy(w: number, h: number): Painter {
  const r = rng(51)
  const neb = layer(w, h, (c) => {
    c.fillStyle = '#02030a'; c.fillRect(0, 0, w, h)
    const cols = ['120,60,200', '40,120,220', '220,70,140', '60,200,200']
    for (let i = 0; i < 70; i++) glow(c, r() * w, r() * h, 80 + r() * 260, `rgba(${cols[i % 4]},A)`, 0.05 + r() * 0.05)
    starsLayer(c, w, h, 1200, r)
  })
  const N = 5200
  const arms = 3
  const pts = Array.from({ length: N }, (_, i) => {
    const arm = i % arms
    const d = Math.pow(r(), 0.7)
    const ang = arm * (Math.PI * 2 / arms) + d * 5.5 + (r() - 0.5) * 0.6 * (1 - d * 0.5)
    const hue = d < 0.15 ? 45 : 200 + r() * 80
    return { d, ang, hue, s: (0.9 + r() * 1.8) * Math.max(1, h / 1080), l: 62 + r() * 30 }
  })
  const fly = Array.from({ length: 140 }, () => ({ x: r() * 2 - 1, y: r() * 2 - 1, z: r() }))
  return {
    frame(c, t) {
      c.drawImage(neb, 0, 0)
      const cx = w * 0.55, cy = h * 0.5, R = Math.min(w, h) * 0.42, rot = t * 0.02
      glow(c, cx, cy, R * 0.5, 'rgba(255,215,160,A)', 0.6)
      glow(c, cx, cy, R * 1.05, 'rgba(120,140,255,A)', 0.12)
      c.globalCompositeOperation = 'lighter'
      for (const p of pts) {
        const a = p.ang + rot * (1.4 - p.d)
        const x = cx + Math.cos(a) * p.d * R, y = cy + Math.sin(a) * p.d * R * 0.42
        c.fillStyle = `hsla(${p.hue},85%,${p.l}%,${(0.9 - p.d * 0.45).toFixed(2)})`
        c.fillRect(x, y, p.s, p.s)
      }
      c.globalCompositeOperation = 'source-over'
      // نجوم تقترب ببطء
      for (const s of fly) {
        s.z -= 0.0012; if (s.z <= 0.02) { s.z = 1; s.x = Math.random() * 2 - 1; s.y = Math.random() * 2 - 1 }
        const x = w / 2 + (s.x / s.z) * w * 0.3, y = h / 2 + (s.y / s.z) * h * 0.3, sz = (1 - s.z) * 2.6
        c.fillStyle = `rgba(255,255,255,${(1 - s.z).toFixed(2)})`; c.fillRect(x, y, sz, sz)
      }
    },
  }
}

function geometry(w: number, h: number): Painter {
  const bg = layer(w, h, (c) => {
    const g = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.7)
    g.addColorStop(0, '#1d1a12'); g.addColorStop(1, '#050403'); c.fillStyle = g; c.fillRect(0, 0, w, h)
  })
  /** وردة بنجمة n رؤوس (زخرفة إسلامية) */
  const rosette = (c: Ctx, n: number, R: number, inner: number) => {
    c.beginPath()
    for (let i = 0; i <= n * 2; i++) {
      const a = (i * Math.PI) / n, rr = i % 2 === 0 ? R : R * inner
      const x = Math.cos(a) * rr, y = Math.sin(a) * rr
      if (i === 0) c.moveTo(x, y); else c.lineTo(x, y)
    }
    c.stroke()
  }
  return {
    frame(c, t) {
      c.drawImage(bg, 0, 0)
      const S = Math.min(w, h)
      c.save(); c.translate(w / 2, h / 2)
      c.shadowColor = 'rgba(255,200,110,0.6)'; c.shadowBlur = 12
      for (let k = 0; k < 6; k++) {
        const R = S * (0.08 + k * 0.075) * (1 + 0.04 * Math.sin(t * 0.4 + k))
        const a = (k % 2 ? 1 : -1) * t * 0.04 * (1 + k * 0.2)
        c.save(); c.rotate(a)
        c.strokeStyle = `rgba(232,196,110,${(0.9 - k * 0.1).toFixed(2)})`; c.lineWidth = 2.2 * Math.max(1, h / 1080)
        rosette(c, k % 2 ? 8 : 12, R, 0.62 + 0.08 * Math.sin(t * 0.3 + k))
        if (k % 2 === 0) { c.rotate(Math.PI / 12); rosette(c, 12, R * 0.82, 0.7) }
        c.restore()
      }
      // شبكة نجوم على الأطراف
      c.shadowBlur = 0
      c.strokeStyle = 'rgba(201,162,74,0.22)'; c.lineWidth = 1
      const step = S * 0.18
      for (let gx = -w / 2 - step; gx < w / 2 + step; gx += step) for (let gy = -h / 2 - step; gy < h / 2 + step; gy += step) {
        if (Math.hypot(gx, gy) < S * 0.48) continue
        c.save(); c.translate(gx, gy); c.rotate(t * 0.02); rosette(c, 8, step * 0.42, 0.55); c.restore()
      }
      c.restore()
      // بريق يعبر
      const sx = ((t * 120) % (w * 2)) - w * 0.5
      const g = c.createLinearGradient(sx - 200, 0, sx + 200, h)
      g.addColorStop(0, 'rgba(255,230,160,0)'); g.addColorStop(0.5, 'rgba(255,230,160,0.06)'); g.addColorStop(1, 'rgba(255,230,160,0)')
      c.fillStyle = g; c.fillRect(0, 0, w, h)
    },
  }
}

function forest(w: number, h: number): Painter {
  const r = rng(61)
  const bg = layer(w, h, (c) => {
    c.fillStyle = vgrad(c, h, [[0, '#06121a'], [0.6, '#0b2224'], [1, '#081614']]); c.fillRect(0, 0, w, h)
    glow(c, w * 0.7, h * 0.18, h * 0.12, 'rgba(220,240,230,A)', 0.5)
    starsLayer(c, w, h, 200, r, 0.4)
    const tree = (x: number, base: number, th: number, col: string) => {
      c.fillStyle = col
      c.fillRect(x - th * 0.02, base - th, th * 0.04, th)
      for (let i = 0; i < 7; i++) {
        const y = base - th * (0.25 + i * 0.11), wd = th * (0.32 - i * 0.04)
        c.beginPath(); c.moveTo(x - wd, y + th * 0.08); c.lineTo(x, y - th * 0.12); c.lineTo(x + wd, y + th * 0.08); c.fill()
      }
    }
    for (let i = 0; i < 26; i++) tree(r() * w, h * 0.78, h * (0.35 + r() * 0.2), '#0e2a2a')
    c.fillStyle = 'rgba(160,200,190,0.10)'; c.fillRect(0, h * 0.6, w, h * 0.2)
    for (let i = 0; i < 18; i++) tree(r() * w, h * 1.02, h * (0.55 + r() * 0.3), '#030a0a')
  })
  const flies = Array.from({ length: 70 }, () => ({ x: r() * w, y: h * (0.35 + r() * 0.6), p: r() * 6.28, s: 0.3 + r() * 0.8 }))
  return {
    frame(c, t) {
      c.drawImage(bg, 0, 0)
      for (let i = 0; i < 3; i++) { // ضباب يتحرك
        const x = ((t * (8 + i * 5)) % (w * 1.5)) - w * 0.25
        glow(c, x, h * (0.68 + i * 0.06), w * 0.35, 'rgba(170,210,200,A)', 0.06)
      }
      c.globalCompositeOperation = 'lighter'
      for (const f of flies) {
        const x = f.x + Math.sin(t * f.s + f.p) * 60, y = f.y + Math.cos(t * f.s * 0.8 + f.p) * 30
        const a = Math.max(0, Math.sin(t * 1.7 * f.s + f.p))
        glow(c, x, y, 16, 'rgba(210,255,120,A)', 0.55 * a)
        c.fillStyle = `rgba(240,255,190,${a.toFixed(2)})`; c.fillRect(x - 1, y - 1, 2.4, 2.4)
      }
      c.globalCompositeOperation = 'source-over'
    },
  }
}

const FACTORIES: Record<SceneId, (w: number, h: number) => Painter> = {
  'night-mosque': nightMosque, 'ocean-sunset': oceanSunset, desert, aurora, 'rain-window': rainWindow, galaxy, geometry, forest,
}

export function createScene(id: SceneId, w: number, h: number): Painter {
  return (FACTORIES[id] ?? nightMosque)(w, h)
}

/** ترتيب العرض: القائمة المختارة (أو كل المشاهد)، بالترتيب أو عشوائيًا دون تكرار متتالٍ */
export function nextScene(list: SceneId[], current: SceneId | null, shuffle: boolean, rand = Math.random): SceneId {
  const pool = list.length ? list : SCENES.map((s) => s.id)
  if (pool.length === 1) return pool[0]
  if (!shuffle) {
    const i = current ? pool.indexOf(current) : -1
    return pool[(i + 1) % pool.length]
  }
  const others = pool.filter((p) => p !== current)
  return others[Math.floor(rand() * others.length) % others.length]
}
