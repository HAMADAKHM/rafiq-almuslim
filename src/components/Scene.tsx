// لوحة «المسجد عند الغروب»: رسم أصلي بالشيفرة (SVG) بطبقات وإضاءة وانعكاس على الماء، بلا صور خارجية ولا أصول محمية.
// تُستخدم في رأس الرئيسية وبطاقة الصلاة القادمة والمواقيت والأذكار وشاشة البداية.
import { useId } from 'react'

export type PaintTone = 'dawn' | 'day' | 'sunset' | 'night'

interface Palette {
  sky: [number, string][]
  sun: string; glow: string; cloud: string; cloudLit: string
  far: string; mid: string; mainA: string; mainB: string; rim: string
  water: [string, string]; ground: string; tree: string; win: string; winGlow: number
}

const PAL: Record<PaintTone, Palette> = {
  sunset: {
    sky: [[0, '#0b3a37'], [0.32, '#2c6a5f'], [0.58, '#c98f52'], [0.78, '#f3c374'], [1, '#fde6b0']],
    sun: '#fff4d2', glow: '#ffcf7a', cloud: '#5f6b5c', cloudLit: '#f6c983',
    far: '#b88d62', mid: '#4b4a39', mainA: '#1a3a33', mainB: '#5a4628', rim: '#ffd88c',
    water: ['#d7a866', '#21463f'], ground: '#0d241f', tree: '#122d24', win: '#ffd27a', winGlow: 0.4,
  },
  dawn: {
    sky: [[0, '#14324a'], [0.35, '#456a80'], [0.62, '#d79f8e'], [0.82, '#f2c9a2'], [1, '#fbe3c4']],
    sun: '#fff6e6', glow: '#f9cfa8', cloud: '#7d7f8c', cloudLit: '#f7cdb0',
    far: '#a99390', mid: '#4a5257', mainA: '#162b33', mainB: '#4b4140', rim: '#ffd9b8',
    water: ['#d9ab98', '#253f49'], ground: '#0f2228', tree: '#14292c', win: '#ffd9a0', winGlow: 0.35,
  },
  day: {
    sky: [[0, '#4f8fa6'], [0.4, '#86b8c4'], [0.75, '#d6e5dc'], [1, '#f4efdc']],
    sun: '#fffdf4', glow: '#fff1c9', cloud: '#ffffff', cloudLit: '#ffffff',
    far: '#9db3aa', mid: '#55786b', mainA: '#1d453a', mainB: '#4f6a52', rim: '#fff3cf',
    water: ['#9cc4c6', '#2c5b55'], ground: '#183a30', tree: '#1c4436', win: '#fff0c8', winGlow: 0,
  },
  night: {
    sky: [[0, '#040f14'], [0.45, '#0a2328'], [0.8, '#123834'], [1, '#1b463d']],
    sun: '#f5e7bf', glow: '#d9c07e', cloud: '#173431', cloudLit: '#3d5a4c',
    far: '#1d3934', mid: '#132b27', mainA: '#0a1d1a', mainB: '#1a2e27', rim: '#c9a85c',
    water: ['#1f4840', '#06161a'], ground: '#050f0e', tree: '#081816', win: '#ffcf6e', winGlow: 0.9,
  },
}

const HORIZON = 214

function dome(cx: number, by: number, r: number, k = 1.6): string {
  return `M${cx - r},${by} C${cx - r},${by - r * 0.9} ${cx - r * 0.55},${by - r * 1.25} ${cx},${by - r * k} C${cx + r * 0.55},${by - r * 1.25} ${cx + r},${by - r * 0.9} ${cx + r},${by} Z`
}

/** مئذنة قلمية: جذع وشرفتان وقلنسوة مخروطية وهلال */
function pencil(x: number, by: number, h: number, w: number): string {
  const top = by - h
  return [
    `M${x - w / 2},${by} L${x - w / 2},${top} L${x + w / 2},${top} L${x + w / 2},${by} Z`,
    `M${x - w},${by - h * 0.55} h${w * 2} l${-w * 0.4},${w * 0.9} h${-w * 1.2} Z`,
    `M${x - w * 0.9},${by - h * 0.82} h${w * 1.8} l${-w * 0.35},${w * 0.8} h${-w * 1.1} Z`,
    `M${x - w * 0.55},${top} L${x},${top - w * 4.2} L${x + w * 0.55},${top} Z`,
    `M${x - 0.35},${top - w * 4.2} v${-w * 1.1} h0.7 v${w * 1.1} Z`,
  ].join(' ')
}

/** مسجد عثماني الطراز: قبة كبرى على رقبة، وأنصاف قباب متدرجة، وقباب صغيرة، وأربع أو ست مآذن */
function ottoman(cx: number, by: number, s: number, minarets: 2 | 4 | 6 = 4): string {
  const p = [
    `M${cx - 78 * s},${by} V${by - 20 * s} H${cx + 78 * s} V${by} Z`,
    `M${cx - 50 * s},${by - 20 * s} V${by - 30 * s} H${cx + 50 * s} V${by - 20 * s} Z`,
    `M${cx - 30 * s},${by - 30 * s} V${by - 42 * s} H${cx + 30 * s} V${by - 30 * s} Z`,
    dome(cx, by - 42 * s, 31 * s, 1.45),
    `M${cx - 0.9 * s},${by - 87 * s} v${-11 * s} h${1.8 * s} v${11 * s} Z`,
    dome(cx - 38 * s, by - 30 * s, 17 * s, 1.2),
    dome(cx + 38 * s, by - 30 * s, 17 * s, 1.2),
    dome(cx - 62 * s, by - 20 * s, 10 * s, 1.35),
    dome(cx + 62 * s, by - 20 * s, 10 * s, 1.35),
    dome(cx - 22 * s, by - 42 * s, 7 * s, 1.5),
    dome(cx + 22 * s, by - 42 * s, 7 * s, 1.5),
  ]
  p.push(pencil(cx - 88 * s, by, 118 * s, 5.2 * s), pencil(cx + 88 * s, by, 118 * s, 5.2 * s))
  if (minarets >= 4) p.push(pencil(cx - 112 * s, by, 92 * s, 4.4 * s), pencil(cx + 112 * s, by, 92 * s, 4.4 * s))
  if (minarets === 6) p.push(pencil(cx - 134 * s, by, 70 * s, 3.8 * s), pencil(cx + 134 * s, by, 70 * s, 3.8 * s))
  return p.join(' ')
}

/** نوافذ مقوسة مضاءة في واجهة المسجد */
function windows(cx: number, by: number, s: number): string {
  const out: string[] = []
  const arch = (x: number, y: number, w: number, h: number) => `M${x - w / 2},${y} v${-h} a${w / 2},${w / 2} 0 0 1 ${w},0 v${h} Z`
  for (let i = -3; i <= 3; i++) out.push(arch(cx + i * 16 * s, by - 4 * s, 3.4 * s, 7 * s))
  for (let i = -1; i <= 1; i++) out.push(arch(cx + i * 13 * s, by - 23 * s, 2.6 * s, 4 * s))
  return out.join(' ')
}

/** نخلة: جذع منحنٍ وسعف */
function palm(x: number, by: number, h: number, lean: number): string {
  const tx = x + lean, ty = by - h
  const trunk = `M${x - 2.4},${by} Q${x + lean * 0.4},${by - h * 0.5} ${tx - 1},${ty} L${tx + 1.2},${ty} Q${x + lean * 0.4 + 2.6},${by - h * 0.5} ${x + 2.4},${by} Z`
  const leaves = [[-1, -0.25], [-0.85, 0.2], [-0.45, 0.45], [0.45, 0.45], [0.85, 0.2], [1, -0.25], [0, -0.55]].map(([dx, dy]) => {
    const ex = tx + dx * h * 0.42, ey = ty + dy * h * 0.42 + h * 0.08
    const mx = tx + dx * h * 0.22, my = ty - h * 0.08 + dy * h * 0.1
    return `M${tx},${ty} Q${mx},${my - 4} ${ex},${ey} Q${mx},${my + 2} ${tx},${ty + 1.5} Z`
  })
  return [trunk, ...leaves].join(' ')
}

/** مجموعة أشجار مستديرة */
function grove(x0: number, by: number, n: number, r: number, seed: number): string {
  const out: string[] = []
  for (let i = 0; i < n; i++) {
    const rr = r * (0.7 + ((i * 37 + seed) % 10) / 22)
    const x = x0 + i * r * 1.15
    out.push(`M${x - rr},${by} a${rr},${rr * 1.15} 0 1 1 ${rr * 2},0 Z`)
  }
  return out.join(' ')
}

const STARS: [number, number, number][] = [[24, 22, 1.1], [58, 52, 0.7], [96, 18, 0.9], [138, 64, 0.6], [176, 30, 1.2], [214, 12, 0.8], [250, 56, 0.7], [292, 24, 1], [336, 66, 0.6], [372, 20, 1.1], [44, 96, 0.5], [118, 104, 0.6], [196, 88, 0.6], [270, 98, 0.5], [356, 112, 0.6], [12, 140, 0.5], [390, 150, 0.5]]
const BIRDS: [number, number, number][] = [[70, 70, 1], [86, 62, 0.8], [98, 76, 0.7], [312, 92, 0.6], [326, 86, 0.5]]

/**
 * لوحة المسجد. variant: wide (4:3)، tall (للشاشات الطولية)، hero (عريضة لرأس الصفحة)، card (مقربة على المسجد).
 */
export function PaintedScene({ tone = 'sunset', variant = 'wide', className, label }: { tone?: PaintTone; variant?: 'wide' | 'tall' | 'hero' | 'card'; className?: string; label?: string }) {
  const id = useId().replace(/:/g, '')
  const c = PAL[tone]
  const night = tone === 'night'
  const vb = { wide: '0 0 400 300', tall: '90 0 220 400', hero: '0 40 400 250', card: '95 92 190 170' }[variant]
  const sunX = 300, sunY = night ? 64 : tone === 'day' ? 96 : 196
  const mainX = 182, mainBase = HORIZON + 14
  const u = (s: string) => `url(#${s}${id})`
  const mosqueMain = ottoman(mainX, mainBase, 1, 6)
  return (
    <svg className={className} viewBox={vb} preserveAspectRatio="xMidYMid slice" role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      <defs>
        <linearGradient id={`sk${id}`} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2={HORIZON}>
          {c.sky.map(([o, col]) => <stop key={o} offset={o} stopColor={col} />)}
        </linearGradient>
        <radialGradient id={`gl${id}`} gradientUnits="userSpaceOnUse" cx={sunX} cy={sunY} r="170">
          <stop offset="0" stopColor={c.glow} stopOpacity={night ? 0.35 : 0.85} />
          <stop offset="0.35" stopColor={c.glow} stopOpacity={night ? 0.12 : 0.35} />
          <stop offset="1" stopColor={c.glow} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`cl${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={c.cloud} stopOpacity={tone === 'day' ? 0.75 : 0.55} />
          <stop offset="1" stopColor={c.cloudLit} stopOpacity="0.9" />
        </linearGradient>
        <linearGradient id={`mn${id}`} gradientUnits="userSpaceOnUse" x1="40" y1="0" x2="330" y2="0">
          <stop offset="0" stopColor={c.mainA} />
          <stop offset="0.62" stopColor={c.mainA} />
          <stop offset="1" stopColor={c.mainB} />
        </linearGradient>
        <linearGradient id={`rm${id}`} gradientUnits="userSpaceOnUse" x1="150" y1="0" x2="330" y2="0">
          <stop offset="0" stopColor={c.rim} stopOpacity="0" />
          <stop offset="1" stopColor={c.rim} stopOpacity={night ? 0.25 : 0.7} />
        </linearGradient>
        <linearGradient id={`wt${id}`} gradientUnits="userSpaceOnUse" x1="0" y1={mainBase} x2="0" y2="300">
          <stop offset="0" stopColor={c.water[0]} />
          <stop offset="1" stopColor={c.water[1]} />
        </linearGradient>
        <linearGradient id={`hz${id}`} gradientUnits="userSpaceOnUse" x1="0" y1={HORIZON - 40} x2="0" y2={HORIZON + 10}>
          <stop offset="0" stopColor={c.glow} stopOpacity="0" />
          <stop offset="1" stopColor={c.glow} stopOpacity={night ? 0.12 : 0.45} />
        </linearGradient>
        <radialGradient id={`vg${id}`} cx="0.5" cy="0.45" r="0.75">
          <stop offset="0.6" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.35" />
        </radialGradient>
        <filter id={`sf${id}`} x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="2.4" /></filter>
        <filter id={`bl${id}`} x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="1.4" /></filter>
        <filter id={`wg${id}`} x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="1.6" /></filter>
        <mask id={`cm${id}`}><rect x="0" y="0" width="400" height="300" fill="#fff" /><circle cx={sunX + 7} cy={sunY - 4} r="15" fill="#000" /></mask>
      </defs>

      {/* السماء والشمس أو الهلال */}
      <rect x="-20" y="-20" width="440" height="340" fill={u('sk')} />
      {night && STARS.map(([x, y, r], i) => <circle key={i} cx={x} cy={y} r={r} fill="#f8eed2" opacity={0.45 + (i % 4) * 0.13} />)}
      <rect x="-20" y="-20" width="440" height="340" fill={u('gl')} />
      {night
        ? <circle cx={sunX} cy={sunY} r="17" fill={c.sun} mask={u('cm')} />
        : <circle cx={sunX} cy={sunY} r={tone === 'day' ? 15 : 21} fill={c.sun} />}

      {/* الغيوم: طبقات ناعمة مضاءة من جهة الشمس */}
      <g filter={u('sf')} fill={u('cl')}>
        <ellipse cx="70" cy="120" rx="80" ry="9" opacity="0.7" />
        <ellipse cx="150" cy="104" rx="55" ry="6" opacity="0.55" />
        <ellipse cx="250" cy="150" rx="90" ry="8" opacity="0.65" />
        <ellipse cx="350" cy="168" rx="70" ry="6" opacity="0.6" />
        <ellipse cx="40" cy="176" rx="60" ry="5" opacity="0.45" />
        <ellipse cx="200" cy="60" rx="70" ry="5" opacity={night ? 0.3 : 0.4} />
      </g>
      {!night && (
        <g fill="none" stroke={tone === 'day' ? '#2d4a44' : '#2a2a22'} strokeWidth="1.1" strokeLinecap="round" opacity="0.7">
          {BIRDS.map(([x, y, s], i) => <path key={i} d={`M${x - 5 * s},${y - 2 * s} q${2.5 * s},${-2.5 * s} ${5 * s},${1.5 * s} q${2.5 * s},${-4 * s} ${5 * s},${-1.5 * s}`} />)}
        </g>
      )}

      {/* الأفق البعيد ثم المتوسط */}
      <path fill={c.far} opacity="0.55" filter={u('bl')} d={[ottoman(48, HORIZON + 2, 0.32, 4), ottoman(352, HORIZON + 2, 0.36, 4), dome(120, HORIZON, 7), pencil(108, HORIZON + 2, 30, 2.2), dome(262, HORIZON, 6), pencil(276, HORIZON + 2, 34, 2.2), `M-20,${HORIZON} H420 V${HORIZON + 20} H-20 Z`].join(' ')} />
      <rect x="-20" y={HORIZON - 40} width="440" height="50" fill={u('hz')} />
      <path fill={c.mid} opacity="0.9" d={[ottoman(330, HORIZON + 10, 0.52, 4), grove(-10, HORIZON + 12, 5, 9, 3), grove(250, HORIZON + 12, 3, 7, 5)].join(' ')} />
      {c.winGlow > 0 && <path fill={c.win} opacity={c.winGlow * 0.6} d={windows(330, HORIZON + 10, 0.52)} />}

      {/* المسجد الرئيسي بإضاءة جانبية */}
      <path fill={u('mn')} d={mosqueMain} />
      <path fill={u('rm')} d={mosqueMain} opacity="0.55" />
      {c.winGlow > 0 && <path fill={c.win} opacity={c.winGlow} filter={u('wg')} d={windows(mainX, mainBase, 1)} />}
      {c.winGlow > 0 && <path fill={c.win} opacity={Math.min(1, c.winGlow + 0.2)} d={windows(mainX, mainBase, 1)} />}

      {/* الماء والانعكاس */}
      <rect x="-20" y={mainBase} width="440" height={300 - mainBase + 20} fill={u('wt')} />
      <g opacity={night ? 0.5 : 0.38} filter={u('bl')} transform={`translate(0 ${mainBase * 2}) scale(1 -1)`}>
        <path fill={c.mainA} d={mosqueMain} />
        {c.winGlow > 0 && <path fill={c.win} opacity={c.winGlow} d={windows(mainX, mainBase, 1)} />}
      </g>
      <g stroke={night ? c.win : c.sun} strokeLinecap="round" opacity={night ? 0.35 : 0.6}>
        {[0, 1, 2, 3, 4, 5, 6].map((i) => <line key={i} x1={sunX - 26 + i * 3 - i * i} x2={sunX + 26 - i * 2 + i * i * 0.5} y1={mainBase + 6 + i * 7} y2={mainBase + 6 + i * 7} strokeWidth={1.4 - i * 0.12} />)}
      </g>
      <g stroke="#ffffff" strokeLinecap="round" opacity="0.12" strokeWidth="0.8">
        {[[30, 246, 70], [120, 262, 40], [210, 254, 50], [60, 280, 60], [250, 284, 30]].map(([x, y, w], i) => <line key={i} x1={x} x2={x + w} y1={y} y2={y} />)}
      </g>

      {/* المقدمة: ضفة وأشجار ونخيل وممر */}
      <path fill={c.ground} d={`M-20,300 L-20,${mainBase + 8} Q30,${mainBase + 2} 70,${mainBase + 14} Q110,${mainBase + 30} 96,320 Z`} />
      <path fill={c.ground} d={`M420,300 L420,${mainBase + 4} Q370,${mainBase} 330,${mainBase + 16} Q300,${mainBase + 34} 318,320 Z`} />
      <path fill={c.tree} d={[grove(-14, mainBase + 14, 4, 12, 1), grove(348, mainBase + 14, 4, 11, 7), palm(28, mainBase + 30, 74, 10), palm(54, mainBase + 34, 56, -8), palm(372, mainBase + 34, 70, -10), palm(394, mainBase + 30, 52, 6)].join(' ')} />
      <rect x="-20" y="-20" width="440" height="340" fill={u('vg')} />
    </svg>
  )
}
