// أيقونات التطبيق (الأصلية والبديلة لمشتركي بلس) على التصميم المعتمد: قوس محراب بإطار مزدوج، وفي داخله هلال وقبة ومئذنة،
// وأسفله مصحف مفتوح، بألوان كل ثيم ولمساته (نجوم، شروق، رخام، أوراق، زهور، فوانيس، نقش هندسي) — بلا نصوص ولا شارة «بلس».
// مصدر واحد: تعرضه صفحة الثيمات، ويولّد منه scripts/brand/build-alt-icons.mjs ملفات Android.

export type AppIconId = 'default' | 'royal' | 'night' | 'turquoise' | 'dawn' | 'nature' | 'violet' | 'rose' | 'evening'

type Deco = 'geometry' | 'stars' | 'sun' | 'leaves' | 'flowers' | 'lanterns' | 'marble'
interface IconLook {
  name: string
  /** خلفية الأيقونة (تدرج قطري) */
  bg: [string, string]
  /** داخل القوس (تدرج من الأعلى إلى الأسفل) */
  inner: [string, string]
  /** إطار القوس والمصحف */
  emblem: [string, string]
  /** المسجد (القبة والمئذنة) */
  mosque: [string, string]
  ink: string
  deco?: Deco[]
  decoColor?: string
  theme: string
}

// على تصميم صفحة الأيقونات: قوس محراب بإطار مزدوج، وفي داخله هلال وقبة ومئذنة، وأسفله مصحف مفتوح.
export const APP_ICONS: Record<AppIconId, IconLook> = {
  default: { name: 'الأصلية', bg: ['#14684f', '#063326'], inner: ['#0f5a43', '#073a2c'], emblem: ['#f6e8bf', '#d2b06a'], mosque: ['#fbf4dc', '#e2cf98'], ink: '#7b5d24', theme: 't-classic' },
  royal: { name: 'الملكية الذهبية', bg: ['#2a2514', '#06070c'], inner: ['#14120c', '#050506'], emblem: ['#ffe9a6', '#c8923a'], mosque: ['#ffe39a', '#d69b3d'], ink: '#6b4a14', deco: ['geometry'], decoColor: '#d9b45a', theme: 't-royal' },
  night: { name: 'الليلية الزرقاء', bg: ['#2a56b8', '#08163c'], inner: ['#163a8a', '#0a1d4e'], emblem: ['#e6f1ff', '#8fb8f5'], mosque: ['#eaf4ff', '#8fc0f6'], ink: '#2d4f8f', deco: ['stars'], decoColor: '#ffffff', theme: 't-night' },
  turquoise: { name: 'الفيروزية', bg: ['#5fd3cb', '#1b8d8f'], inner: ['#3bb6b2', '#1a8a8a'], emblem: ['#ffffff', '#c9f1ec'], mosque: ['#f2fffd', '#a6e7e2'], ink: '#2a8b88', deco: ['marble'], decoColor: '#ffffff', theme: 't-turquoise' },
  dawn: { name: 'الشروق', bg: ['#ffb45e', '#9a4a2c'], inner: ['#ffd27a', '#f08a46'], emblem: ['#fff6e4', '#f6cf96'], mosque: ['#5b4a52', '#2e2730'], ink: '#8a5a32', deco: ['sun'], decoColor: '#fff3c4', theme: 't-dawn' },
  nature: { name: 'الطبيعية', bg: ['#86b25a', '#2f5a2a'], inner: ['#5f9443', '#335f2c'], emblem: ['#fbf7df', '#dfe3b0'], mosque: ['#f6f8e6', '#cfe0a8'], ink: '#55753a', deco: ['leaves'], decoColor: '#cfe6a8', theme: 't-nature' },
  violet: { name: 'البنفسجية', bg: ['#9563e6', '#2c1468'], inner: ['#6a3fc4', '#341a7c'], emblem: ['#ffffff', '#d8c8fa'], mosque: ['#f6f0ff', '#c8b2f4'], ink: '#5b3aa6', deco: ['stars', 'leaves'], decoColor: '#efe6ff', theme: 't-violet' },
  rose: { name: 'الوردية', bg: ['#f6b3bd', '#c8687f'], inner: ['#eb98a8', '#d07087'], emblem: ['#fff8f0', '#f6d6c0'], mosque: ['#fff6ef', '#f4cdbb'], ink: '#a5566b', deco: ['flowers'], decoColor: '#ffe9ec', theme: 't-rose' },
  evening: { name: 'المساء', bg: ['#173a4c', '#050d16'], inner: ['#0e2a3a', '#061420'], emblem: ['#ffe6a6', '#d69a3e'], mosque: ['#ffe2a0', '#d89a42'], ink: '#7a5420', deco: ['lanterns'], decoColor: '#ffcf7a', theme: 't-evening' },
}
export const APP_ICON_IDS = Object.keys(APP_ICONS) as AppIconId[]

// القوس الخارجي (محراب مدبب بكتفين) والداخلي
const ARCH_OUT = 'M108 436 V236 C108 196 136 176 168 156 C204 134 236 116 256 74 C276 116 308 134 344 156 C376 176 404 196 404 236 V436 Z'
const ARCH_IN = 'M132 436 V242 C132 208 156 192 184 174 C214 156 240 140 256 108 C272 140 298 156 328 174 C356 192 380 208 380 242 V436 Z'

function star(x: number, y: number, r: number, c: string, o = 0.9) {
  return `<path d="M${x} ${y - r} L${x + r * 0.28} ${y - r * 0.28} L${x + r} ${y} L${x + r * 0.28} ${y + r * 0.28} L${x} ${y + r} L${x - r * 0.28} ${y + r * 0.28} L${x - r} ${y} L${x - r * 0.28} ${y - r * 0.28} Z" fill="${c}" opacity="${o}"/>`
}
const leaf = (x: number, y: number, r: number, s: number, c: string, o: number) => `<path transform="translate(${x} ${y}) rotate(${r}) scale(${s})" d="M0 0 C14 -18 40 -18 54 0 C40 18 14 18 0 0 Z M2 0 H50" fill="${c}" stroke="${c}" stroke-width="1.2" opacity="${o}"/>`

/** زخرفة خلفية الأيقونة (خارج القوس) */
function outerDeco(d: Deco, c: string): string {
  if (d === 'stars') return [[70, 92, 7], [440, 120, 6], [452, 300, 4], [60, 300, 4], [400, 60, 4], [120, 50, 3], [466, 210, 3], [50, 200, 3]].map(([x, y, r]) => star(x, y, r, c)).join('')
  if (d === 'geometry') return `<g fill="none" stroke="${c}" stroke-width="2.4" opacity="0.38">${[[64, 80], [448, 80], [64, 300], [448, 300], [256, 30]].map(([x, y]) => `<g transform="translate(${x} ${y})"><rect x="-30" y="-30" width="60" height="60"/><rect x="-30" y="-30" width="60" height="60" transform="rotate(45)"/><circle r="12"/></g>`).join('')}<path d="M0 190 H512 M0 400 H512 M150 0 V512 M362 0 V512" opacity="0.5"/></g>`
  if (d === 'marble') return `<g fill="none" stroke="${c}" stroke-width="2" opacity="0.4"><path d="M0 120 C60 90 70 170 130 130 S200 40 250 20"/><path d="M512 360 C450 330 440 410 380 380 S320 300 300 260"/><path d="M20 470 C80 420 60 360 110 330"/><path d="M420 30 C440 80 500 80 512 140"/></g><circle cx="420" cy="80" r="16" fill="${c}" opacity="0.25"/>`
  if (d === 'sun') return `<g fill="${c}" opacity="0.8"><path d="M60 110 q8 -6 16 0 q8 -6 16 0" fill="none" stroke="${c}" stroke-width="3"/><path d="M410 80 q7 -5 14 0 q7 -5 14 0" fill="none" stroke="${c}" stroke-width="3"/></g>`
  if (d === 'leaves') return [[40, 120, -60, 1.1], [60, 210, -30, 1], [30, 320, -80, 0.9], [472, 120, 240, 1.1], [452, 210, 210, 1], [482, 320, 260, 0.9], [90, 60, -20, 0.8], [422, 60, 200, 0.8]].map(([x, y, r, s]) => leaf(x, y, r, s, c, 0.55)).join('') + `<path d="M50 60 C20 160 30 260 70 360 M462 60 C492 160 482 260 442 360" stroke="${c}" stroke-width="3" fill="none" opacity="0.45"/>`
  if (d === 'flowers') return `<g fill="${c}">${[[60, 90, 1], [452, 100, 0.9], [56, 330, 1.1], [456, 330, 1.1], [90, 210, 0.7], [422, 220, 0.7]].map(([x, y, s]) => `<g transform="translate(${x} ${y}) scale(${s})" opacity="0.7">${[0, 72, 144, 216, 288].map((a) => `<ellipse rx="8" ry="17" transform="rotate(${a}) translate(0 -13)"/>`).join('')}<circle r="6" fill="#f3c27a"/></g>`).join('')}</g>`
  if (d === 'lanterns') return `<g fill="${c}">${[[62, 150], [450, 190]].map(([x, l]) => `<line x1="${x}" y1="0" x2="${x}" y2="${l}" stroke="${c}" stroke-width="3" opacity="0.7"/><circle cx="${x}" cy="${l + 30}" r="40" opacity="0.22"/><path d="M${x - 8} ${l} H${x + 8} L${x + 12} ${l + 10} H${x - 12} Z"/><path d="M${x - 15} ${l + 10} H${x + 15} L${x + 19} ${l + 32} L${x + 10} ${l + 52} H${x - 10} L${x - 19} ${l + 32} Z" opacity="0.95"/><circle cx="${x}" cy="${l + 31}" r="7" fill="#fff4c8"/>`).join('')}</g>`
  return ''
}

/** مشهد داخل القوس بحسب الثيم */
function innerDeco(d: Deco, c: string, p: string): string {
  if (d === 'stars') return [[170, 230, 4], [340, 220, 5], [300, 170, 3], [200, 290, 3], [356, 290, 3], [226, 150, 2.5]].map(([x, y, r]) => star(x, y, r, c, 0.85)).join('')
  if (d === 'sun') return `<circle cx="256" cy="300" r="92" fill="url(#${p}-sun)"/><circle cx="256" cy="300" r="52" fill="${c}" opacity="0.95"/><path d="M132 360 L180 300 L216 330 L262 282 L310 330 L346 304 L380 340 V436 H132 Z" fill="#8a4a3a" opacity="0.45"/><path d="M190 230 q6 -5 12 0 q6 -5 12 0 M300 214 q5 -4 10 0 q5 -4 10 0" fill="none" stroke="#6b3a2a" stroke-width="2.4" opacity="0.7"/>`
  if (d === 'geometry') return `<path d="${ARCH_IN}" fill="none" stroke="${c}" stroke-width="1.5" opacity="0.35" transform="translate(256 300) scale(0.86) translate(-256 -300)"/>`
  if (d === 'leaves') return leaf(150, 300, -40, 0.8, c, 0.45) + leaf(362, 300, 220, 0.8, c, 0.45)
  if (d === 'flowers') return `<g fill="${c}" opacity="0.5">${[[160, 260], [352, 250]].map(([x, y]) => `<g transform="translate(${x} ${y}) scale(0.6)">${[0, 72, 144, 216, 288].map((a) => `<ellipse rx="8" ry="17" transform="rotate(${a}) translate(0 -13)"/>`).join('')}</g>`).join('')}</g>`
  if (d === 'lanterns') return `<g fill="${c}">${[[170, 190], [342, 200]].map(([x, l]) => `<line x1="${x}" y1="150" x2="${x}" y2="${l}" stroke="${c}" stroke-width="1.6" opacity="0.7"/><circle cx="${x}" cy="${l + 16}" r="22" opacity="0.25"/><path d="M${x - 8} ${l} H${x + 8} L${x + 11} ${l + 16} L${x + 5} ${l + 28} H${x - 5} L${x - 11} ${l + 16} Z"/>`).join('')}</g>`
  return ''
}

/** أيقونة كاملة (background=true) أو الطبقة الأمامية للأيقونة التكيفية (background=false مع scale) */
export function appIconSvg(id: AppIconId, { background = true, scale = 1, radius = 112, decorations = true } = {}): string {
  const L = APP_ICONS[id]
  const p = `ai-${id}`
  const c = L.decoColor ?? '#fff'
  const decos = decorations ? L.deco ?? [] : []
  const g = `<g transform="translate(256 256) scale(${scale}) translate(-256 -256)">`
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="${p}-e" gradientUnits="userSpaceOnUse" x1="0" y1="70" x2="0" y2="440"><stop offset="0" stop-color="${L.emblem[0]}"/><stop offset="1" stop-color="${L.emblem[1]}"/></linearGradient>
    <linearGradient id="${p}-m" gradientUnits="userSpaceOnUse" x1="0" y1="170" x2="0" y2="360"><stop offset="0" stop-color="${L.mosque[0]}"/><stop offset="1" stop-color="${L.mosque[1]}"/></linearGradient>
    <linearGradient id="${p}-i" gradientUnits="userSpaceOnUse" x1="0" y1="90" x2="0" y2="436"><stop offset="0" stop-color="${L.inner[0]}"/><stop offset="1" stop-color="${L.inner[1]}"/></linearGradient>
    <linearGradient id="${p}-b" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${L.bg[0]}"/><stop offset="1" stop-color="${L.bg[1]}"/></linearGradient>
    <radialGradient id="${p}-sun"><stop offset="0" stop-color="#fff6c8" stop-opacity="0.9"/><stop offset="1" stop-color="#fff6c8" stop-opacity="0"/></radialGradient>
    <radialGradient id="${p}-glow" cx="0.5" cy="0.45" r="0.55"><stop offset="0" stop-color="#ffffff" stop-opacity="0.16"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></radialGradient>
    <clipPath id="${p}-c"><path d="${ARCH_IN}"/></clipPath>
    <mask id="${p}-moon"><rect width="512" height="512" fill="#fff"/><circle cx="238" cy="160" r="22" fill="#000"/></mask>
  </defs>
  ${background ? `<rect width="512" height="512" rx="${radius}" fill="url(#${p}-b)"/><rect width="512" height="512" rx="${radius}" fill="url(#${p}-glow)"/>${decos.map((d) => outerDeco(d, c)).join('')}` : ''}
  ${g}
    <path d="${ARCH_OUT}" fill="url(#${p}-e)"/>
    <path d="${ARCH_IN}" fill="url(#${p}-i)"/>
    <g clip-path="url(#${p}-c)">${decos.map((d) => innerDeco(d, c, p)).join('')}</g>
    <path d="${ARCH_IN}" fill="none" stroke="${L.ink}" stroke-width="3" opacity="0.35"/>
    <circle cx="224" cy="168" r="26" fill="url(#${p}-e)" mask="url(#${p}-moon)"/>
    <g fill="url(#${p}-m)">
      <path d="M190 318 C184 270 222 248 246 228 C270 248 308 270 302 318 Z"/>
      <rect x="244" y="206" width="4" height="22" rx="2"/><circle cx="246" cy="204" r="5"/>
      <rect x="182" y="314" width="128" height="30" rx="3"/>
      <path d="M150 344 V318 C150 302 164 294 172 290 C180 294 194 302 194 318 V344 Z" opacity="0.92"/>
      <rect x="318" y="198" width="18" height="146" rx="2"/>
      <path d="M314 202 H340 L327 160 Z"/><rect x="312" y="236" width="30" height="7" rx="2"/>
      <circle cx="327" cy="154" r="4"/>
      <rect x="142" y="338" width="226" height="14" rx="3"/>
    </g>
    <g fill="${L.ink}" opacity="0.35">
      <path d="M236 344 V328 a10 10 0 0 1 20 0 V344 Z"/><path d="M205 344 V332 a7 7 0 0 1 14 0 V344 Z"/><path d="M273 344 V332 a7 7 0 0 1 14 0 V344 Z"/>
    </g>
    <path d="M256 368 C214 344 152 340 92 356 V408 C152 394 214 396 256 424 C298 396 360 394 420 408 V356 C360 340 298 344 256 368 Z" fill="url(#${p}-e)"/>
    <path d="M256 380 C214 356 160 354 106 366 M256 392 C214 370 160 368 106 380 M256 380 C298 356 352 354 406 366 M256 392 C298 370 352 368 406 380" fill="none" stroke="${L.ink}" stroke-width="2.4" opacity="0.45"/>
    <path d="M256 368 V424" stroke="${L.ink}" stroke-width="4" stroke-linecap="round" opacity="0.7"/>
    <path d="M86 412 C150 398 214 402 256 430 C298 402 362 398 426 412" fill="none" stroke="url(#${p}-e)" stroke-width="10" stroke-linecap="round"/>
  </g>
</svg>`
}

/** للعرض داخل التطبيق كصورة (معرّفات التدرجات لا تتعارض بين الأيقونات) */
export const appIconDataUrl = (id: AppIconId) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(appIconSvg(id))}`

/** اسم مكوّن Android (activity-alias) لكل أيقونة */
export const aliasOf = (id: AppIconId) => (id === 'default' ? 'LauncherDefault' : `Launcher${id[0].toUpperCase()}${id.slice(1)}`)
