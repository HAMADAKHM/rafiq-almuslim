// رسوم أصلية لرفيق المسلم مرسومة بالشيفرة (SVG) — بلا صور خارجية ولا أصول محمية، وتعمل دون إنترنت.
import { useId } from 'react'

export type SceneTone = 'dawn' | 'day' | 'sunset' | 'night'

const SKY: Record<SceneTone, { stops: string[]; sun: string; glow: string; far: string; mid: string; main: string; ground: string; haze: string }> = {
  dawn: { stops: ['#1d3b4a', '#4f6f7a', '#d9a28c', '#f4d0a4'], sun: '#fff1d6', glow: '#f7c9a0', far: '#8a9a96', mid: '#40605a', main: '#1c3a33', ground: '#12292a', haze: '#f1cfa8' },
  day: { stops: ['#5d9bb0', '#8fbfc9', '#d8e6dc', '#f1ecd9'], sun: '#fffaf0', glow: '#fff3d1', far: '#9fb7ad', mid: '#55806f', main: '#1f4c3e', ground: '#173b30', haze: '#eef0e2' },
  sunset: { stops: ['#123f35', '#2f6656', '#c5935a', '#f3c676'], sun: '#fff3cf', glow: '#f6c56b', far: '#7f9a83', mid: '#2e5648', main: '#163a30', ground: '#0e2a22', haze: '#f0c27a' },
  night: { stops: ['#06161a', '#0b2a2a', '#123a35', '#1d4a40'], sun: '#f4e7c0', glow: '#c9b27a', far: '#2c4b45', mid: '#1b3833', main: '#0e2621', ground: '#081a17', haze: '#22463d' },
}

function dome(cx: number, by: number, r: number): string {
  return `M${cx - r},${by} C${cx - r},${by - r * 0.95} ${cx - r * 0.5},${by - r * 1.3} ${cx},${by - r * 1.7} C${cx + r * 0.5},${by - r * 1.3} ${cx + r},${by - r * 0.95} ${cx + r},${by} Z`
}

function minaret(x: number, by: number, h: number, w: number): string {
  const top = by - h
  return [
    `M${x - w / 2},${by} L${x - w / 2},${top} L${x + w / 2},${top} L${x + w / 2},${by} Z`,
    `M${x - w * 0.85},${by - h * 0.62} h${w * 1.7} v3 h${-w * 1.7} Z`,
    `M${x - w * 0.8},${top + 2} h${w * 1.6} v3 h${-w * 1.6} Z`,
    `M${x - w / 2},${top} L${x},${top - w * 2.4} L${x + w / 2},${top} Z`,
    `M${x - 0.6},${top - w * 2.4} v${-w * 0.9} h1.2 v${w * 0.9} Z`,
  ].join(' ')
}

/** مسجد كامل: قبة كبرى على رقبة، وقبتان جانبيتان، ومئذنتان أو أربع */
function mosque(cx: number, by: number, s: number, minarets = 2): string {
  const parts = [
    `M${cx - 62 * s},${by} L${cx - 62 * s},${by - 26 * s} L${cx + 62 * s},${by - 26 * s} L${cx + 62 * s},${by} Z`,
    `M${cx - 27 * s},${by - 26 * s} L${cx - 27 * s},${by - 40 * s} L${cx + 27 * s},${by - 40 * s} L${cx + 27 * s},${by - 26 * s} Z`,
    dome(cx, by - 40 * s, 26 * s),
    `M${cx - 0.8 * s},${by - 84 * s} v${-9 * s} h${1.6 * s} v${9 * s} Z`,
    dome(cx - 42 * s, by - 26 * s, 13 * s),
    dome(cx + 42 * s, by - 26 * s, 13 * s),
    minaret(cx - 74 * s, by, 96 * s, 7 * s),
    minaret(cx + 74 * s, by, 96 * s, 7 * s),
  ]
  if (minarets === 4) parts.push(minaret(cx - 104 * s, by, 72 * s, 6 * s), minaret(cx + 104 * s, by, 72 * s, 6 * s))
  return parts.join(' ')
}

/** هلال صغير فوق القبة */
function Crescent({ x, y, r, fill }: { x: number; y: number; r: number; fill: string }) {
  const id = useId().replace(/:/g, '')
  return (
    <g>
      <mask id={`cm${id}`}><circle cx={x} cy={y} r={r} fill="#fff" /><circle cx={x + r * 0.45} cy={y - r * 0.2} r={r * 0.85} fill="#000" /></mask>
      <circle cx={x} cy={y} r={r} fill={fill} mask={`url(#cm${id})`} />
    </g>
  )
}

const STARS: [number, number, number][] = [[30, 30, 1.2], [70, 60, 0.8], [110, 22, 1], [150, 70, 0.7], [190, 35, 1.3], [235, 18, 0.9], [262, 64, 0.8], [318, 40, 1.1], [352, 78, 0.7], [380, 26, 1], [50, 98, 0.6], [128, 110, 0.7], [300, 104, 0.6], [220, 92, 0.8], [372, 120, 0.6]]

/** مشهد مسجد على أفق مدينة. يُستخدم في شاشة البداية والرئيسية والمواقيت */
export function MosqueScene({ tone = 'sunset', variant = 'wide', className, label }: { tone?: SceneTone; variant?: 'wide' | 'tall' | 'card'; className?: string; label?: string }) {
  const id = useId().replace(/:/g, '')
  const c = SKY[tone]
  const vb = variant === 'tall' ? '80 0 240 420' : variant === 'card' ? '110 110 180 160' : '0 0 400 300'
  const sunX = variant === 'card' ? 245 : 292
  const sunY = tone === 'night' ? 70 : tone === 'day' ? 120 : 205
  return (
    <svg className={className} viewBox={vb} preserveAspectRatio="xMidYMid slice" role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      <defs>
        <linearGradient id={`sky${id}`} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="262">
          {c.stops.map((s, i) => <stop key={i} offset={[0, 0.4, 0.78, 1][i]} stopColor={s} />)}
        </linearGradient>
        <radialGradient id={`glow${id}`}>
          <stop offset="0" stopColor={c.glow} stopOpacity="0.9" />
          <stop offset="1" stopColor={c.glow} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`haze${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={c.haze} stopOpacity="0" />
          <stop offset="1" stopColor={c.haze} stopOpacity="0.35" />
        </linearGradient>
      </defs>
      <rect x="-50" y="-50" width="500" height="520" fill={`url(#sky${id})`} />
      {tone === 'night' && STARS.map(([x, y, r], i) => <circle key={i} cx={x} cy={y} r={r} fill="#f6ecd0" opacity={0.5 + (i % 3) * 0.15} />)}
      <circle cx={sunX} cy={sunY} r="95" fill={`url(#glow${id})`} />
      {tone === 'night'
        ? <Crescent x={sunX} y={sunY} r={16} fill={c.sun} />
        : <circle cx={sunX} cy={sunY} r="22" fill={c.sun} opacity="0.95" />}
      {tone !== 'night' && (
        <g fill="#fff" opacity="0.12">
          <ellipse cx="80" cy="120" rx="60" ry="7" /><ellipse cx="130" cy="112" rx="40" ry="5" /><ellipse cx="320" cy="150" rx="55" ry="6" />
        </g>
      )}
      <path fill={c.far} opacity="0.6" d={[mosque(60, 252, 0.45), mosque(350, 250, 0.5), dome(140, 246, 9), minaret(160, 248, 40, 3.5), dome(255, 246, 8), minaret(270, 248, 46, 3.5), 'M-50,250 L450,250 L450,300 L-50,300 Z'].join(' ')} />
      <rect x="-50" y="230" width="500" height="40" fill={`url(#haze${id})`} />
      <path fill={c.mid} d={[mosque(110, 268, 0.55), mosque(300, 266, 0.6), 'M-50,266 Q60,258 130,266 T290,264 T450,262 L450,320 L-50,320 Z'].join(' ')} />
      <path fill={c.main} d={mosque(200, 278, 1, 4)} />
      <Crescent x={200} y={by(278) - 6} r={4.5} fill={c.glow} />
      <path fill={c.ground} d="M-50,276 Q40,266 110,276 Q170,284 230,276 Q310,266 450,278 L450,480 L-50,480 Z" />
      <g fill={c.ground}>
        {[[-6, 272, 14], [18, 268, 11], [44, 274, 13], [330, 272, 12], [356, 268, 15], [388, 274, 12], [150, 280, 8], [252, 280, 9]].map(([x, y, r], i) => <circle key={i} cx={x} cy={y} r={r} />)}
      </g>
      {variant === 'tall' && <rect x="-50" y="280" width="500" height="200" fill={c.ground} />}
    </svg>
  )
}

// قمة القبة الكبرى للمسجد الرئيسي (نفس حساب mosque)
function by(base: number) { return base - 40 - 26 * 1.7 - 9 }

/** شعار رفيق المسلم: قوس معماري يعلوه هلال، وفيه نجمة ومصحف مفتوح (نفس تصميم أيقونة التطبيق، بلون واحد) */
export function LogoMark({ size = 72, className }: { size?: number; className?: string }) {
  const id = useId().replace(/:/g, '')
  return (
    <svg className={className} width={size} height={size} viewBox="96 40 320 400" aria-hidden="true">
      <mask id={`lm${id}`}><rect x="0" y="0" width="512" height="512" fill="#fff" /><circle cx="270" cy="74" r="25" fill="#000" /></mask>
      <circle cx="256" cy="80" r="30" fill="currentColor" mask={`url(#lm${id})`} />
      <path d="M140 420 V262 C140 182 196 136 256 112 C316 136 372 182 372 262 V420" fill="none" stroke="currentColor" strokeWidth="24" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M256 250 l10 14 17 -3 -3 17 14 10 -14 10 3 17 -17 -3 -10 14 -10 -14 -17 3 3 -17 -14 -10 14 -10 -3 -17 17 3 Z" fill="currentColor" />
      <path d="M256 404 C228 384 196 378 160 384 V330 C196 324 228 330 256 350 Z M256 404 C284 384 316 378 352 384 V330 C316 324 284 330 256 350 Z" fill="currentColor" />
      <path d="M118 424 H394" stroke="currentColor" strokeWidth="20" strokeLinecap="round" />
    </svg>
  )
}

/** لوحة الإهداء: ليل هادئ بهلال ونجوم وفوانيس معلقة فوق أفق المساجد */
export function DedicationArt({ className }: { className?: string }) {
  const id = useId().replace(/:/g, '')
  const lantern = (x: number, len: number, s: number) => (
    <g key={x}>
      <line x1={x} y1="0" x2={x} y2={len} stroke="#d9bd76" strokeWidth="0.8" opacity="0.8" />
      <g transform={`translate(${x} ${len}) scale(${s})`}>
        <circle r="16" cy="22" fill={`url(#lg${id})`} />
        <path d="M-4 0 h8 l2 5 h-12 Z" fill="#c9a54e" />
        <path d="M-8 5 h16 l3 10 l-2 16 l-6 8 h-6 l-6 -8 l-2 -16 Z" fill="#b8913d" />
        <path d="M-5.5 9 h11 l2 7 l-1.5 13 l-4 5 h-4 l-4 -5 l-1.5 -13 Z" fill="#ffe7a8" opacity="0.9" />
        <path d="M-2 39 h4 l-2 6 Z" fill="#c9a54e" />
      </g>
    </g>
  )
  return (
    <svg className={className} viewBox="0 0 400 220" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <defs>
        <linearGradient id={`ds${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#07201b" /><stop offset="0.6" stopColor="#0d3a30" /><stop offset="1" stopColor="#15493c" />
        </linearGradient>
        <radialGradient id={`lg${id}`}><stop offset="0" stopColor="#ffd98a" stopOpacity="0.55" /><stop offset="1" stopColor="#ffd98a" stopOpacity="0" /></radialGradient>
        <radialGradient id={`mg${id}`}><stop offset="0" stopColor="#f3e2b0" stopOpacity="0.45" /><stop offset="1" stopColor="#f3e2b0" stopOpacity="0" /></radialGradient>
      </defs>
      <rect width="400" height="220" fill={`url(#ds${id})`} />
      {STARS.map(([x, y, r], i) => <circle key={i} cx={x} cy={y * 0.9} r={r} fill="#f6ecd0" opacity={0.35 + (i % 3) * 0.2} />)}
      <circle cx="320" cy="52" r="48" fill={`url(#mg${id})`} />
      <Crescent x={320} y={52} r={17} fill="#f3e2b0" />
      {lantern(48, 34, 0.9)}{lantern(86, 62, 0.7)}{lantern(362, 70, 0.75)}
      <path fill="#0a2a23" d={[mosque(200, 222, 1.15, 4), mosque(52, 222, 0.4), mosque(350, 222, 0.42), 'M-10,214 Q100,206 200,214 T410,212 L410,230 L-10,230 Z'].join(' ')} />
      <Crescent x={200} y={222 - 1.15 * (40 + 26 * 1.7 + 9) - 6} r={4.5} fill="#d9bd76" />
    </svg>
  )
}
