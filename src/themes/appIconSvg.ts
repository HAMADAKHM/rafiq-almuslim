// أيقونات التطبيق البديلة (رفيق بلس): الرمز نفسه (محراب يعلوه هلال وفي داخله مصحف مفتوح ونجمة)
// بألوان كل ثيم ولمساته (نجوم، شمس، أوراق، زهور، فوانيس، نقش هندسي) — بلا نصوص ولا شارة «بلس» داخل الأيقونة.
// مصدر واحد: تعرضه صفحة الثيمات، ويولّد منه scripts/brand/build-alt-icons.mjs ملفات Android.

export type AppIconId = 'default' | 'royal' | 'night' | 'turquoise' | 'dawn' | 'nature' | 'violet' | 'rose' | 'evening'

interface IconLook { name: string; bg: [string, string]; emblem: [string, string]; ink: string; deco?: 'geometry' | 'stars' | 'sun' | 'leaves' | 'flowers' | 'lanterns'; decoColor?: string; theme: string }

export const APP_ICONS: Record<AppIconId, IconLook> = {
  default: { name: 'الأصلية', bg: ['#0E5446', '#062F28'], emblem: ['#E9CF8E', '#B98F45'], ink: '#073B32', theme: 't-classic' },
  royal: { name: 'الملكية الذهبية', bg: ['#1c3170', '#070f26'], emblem: ['#F3DA97', '#C2973F'], ink: '#0a1430', deco: 'geometry', decoColor: '#d9b45a', theme: 't-royal' },
  night: { name: 'الليلية الزرقاء', bg: ['#21458f', '#071330'], emblem: ['#F2F7FF', '#9CC6FF'], ink: '#0a1838', deco: 'stars', decoColor: '#ffffff', theme: 't-night' },
  turquoise: { name: 'الفيروزية', bg: ['#22b8b1', '#0a5c5e'], emblem: ['#FFFFFF', '#D6F3EF'], ink: '#0a5f5c', deco: 'geometry', decoColor: '#ffffff', theme: 't-turquoise' },
  dawn: { name: 'الفجر', bg: ['#ffb46a', '#8a3b3e'], emblem: ['#FFF7E2', '#FFD49A'], ink: '#7a3b2a', deco: 'sun', decoColor: '#fff0c0', theme: 't-dawn' },
  nature: { name: 'الطبيعية', bg: ['#74ad52', '#2a5428'], emblem: ['#FBF6DE', '#E2D8A2'], ink: '#2a5428', deco: 'leaves', decoColor: '#d9ebb8', theme: 't-nature' },
  violet: { name: 'البنفسجية', bg: ['#7d52d4', '#22105a'], emblem: ['#FFFFFF', '#CFC6F0'], ink: '#22105a', deco: 'stars', decoColor: '#efe8ff', theme: 't-violet' },
  rose: { name: 'الوردية', bg: ['#f2a9ba', '#a8546d'], emblem: ['#FFF7F1', '#F3D2B8'], ink: '#8a3a51', deco: 'flowers', decoColor: '#fff3f4', theme: 't-rose' },
  evening: { name: 'المساء', bg: ['#1d3456', '#050b17'], emblem: ['#FFDE94', '#E39B3B'], ink: '#0a1424', deco: 'lanterns', decoColor: '#ffcf7a', theme: 't-evening' },
}
export const APP_ICON_IDS = Object.keys(APP_ICONS) as AppIconId[]

function deco(d: IconLook['deco'], c: string): string {
  if (d === 'stars') return `<g fill="${c}">${[[96, 120, 5], [404, 150, 4], [430, 300, 3], [80, 330, 3], [380, 76, 3], [150, 70, 2.5], [452, 210, 2.5]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" opacity="0.85"/>`).join('')}</g>`
  if (d === 'sun') return `<circle cx="256" cy="300" r="150" fill="${c}" opacity="0.22"/><circle cx="256" cy="300" r="96" fill="${c}" opacity="0.28"/>`
  if (d === 'leaves') return `<g fill="${c}" opacity="0.55">${[[70, 150, 30], [442, 170, 150], [64, 360, -20], [448, 380, 200]].map(([x, y, r]) => `<path transform="translate(${x} ${y}) rotate(${r})" d="M0 0 C16 -20 42 -18 54 0 C42 18 16 20 0 0 Z"/>`).join('')}</g>`
  if (d === 'flowers') return `<g fill="${c}" opacity="0.5">${[[84, 110], [428, 120], [80, 400], [432, 396]].map(([x, y]) => `<g transform="translate(${x} ${y})">${[0, 72, 144, 216, 288].map((a) => `<ellipse rx="7" ry="15" transform="rotate(${a}) translate(0 -12)"/>`).join('')}</g>`).join('')}</g>`
  if (d === 'lanterns') return `<g fill="${c}">${[[88, 70], [424, 100]].map(([x, l]) => `<line x1="${x}" y1="0" x2="${x}" y2="${l}" stroke="${c}" stroke-width="3" opacity="0.7"/><circle cx="${x}" cy="${l + 26}" r="34" opacity="0.18"/><path d="M${x - 13} ${l + 8} H${x + 13} L${x + 17} ${l + 28} L${x + 9} ${l + 46} H${x - 9} L${x - 17} ${l + 28} Z" opacity="0.95"/>`).join('')}</g>`
  if (d === 'geometry') return `<g fill="none" stroke="${c}" stroke-width="2" opacity="0.22">${[[72, 92], [440, 92], [72, 420], [440, 420]].map(([x, y]) => `<g transform="translate(${x} ${y})"><rect x="-26" y="-26" width="52" height="52"/><rect x="-26" y="-26" width="52" height="52" transform="rotate(45)"/></g>`).join('')}</g>`
  return ''
}

/** أيقونة كاملة (background=true) أو الطبقة الأمامية للأيقونة التكيفية (background=false مع scale) */
export function appIconSvg(id: AppIconId, { background = true, scale = 1, radius = 112, decorations = true } = {}): string {
  const L = APP_ICONS[id]
  const p = `ai-${id}`
  const g = `<g transform="translate(256 256) scale(${scale}) translate(-256 -256)">`
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="${p}-e" gradientUnits="userSpaceOnUse" x1="0" y1="50" x2="0" y2="440"><stop offset="0" stop-color="${L.emblem[0]}"/><stop offset="1" stop-color="${L.emblem[1]}"/></linearGradient>
    <linearGradient id="${p}-b" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${L.bg[0]}"/><stop offset="1" stop-color="${L.bg[1]}"/></linearGradient>
    <mask id="${p}-m"><rect width="512" height="512" fill="#fff"/><circle cx="270" cy="74" r="25" fill="#000"/></mask>
  </defs>
  ${background ? `<rect width="512" height="512" rx="${radius}" fill="url(#${p}-b)"/>${decorations && L.deco ? deco(L.deco, L.decoColor ?? '#fff') : ''}` : ''}
  ${g}
    <circle cx="256" cy="80" r="30" fill="url(#${p}-e)" mask="url(#${p}-m)"/>
    <path d="M140 420 V262 C140 182 196 136 256 112 C316 136 372 182 372 262 V420" fill="none" stroke="url(#${p}-e)" stroke-width="22" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M178 420 V270 C178 214 214 180 256 160 C298 180 334 214 334 270 V420" fill="none" stroke="url(#${p}-e)" stroke-width="7" opacity="0.55"/>
    <path d="M256 250 l10 14 17 -3 -3 17 14 10 -14 10 3 17 -17 -3 -10 14 -10 -14 -17 3 3 -17 -14 -10 14 -10 -3 -17 17 3 Z" fill="url(#${p}-e)" opacity="0.9"/>
    <path d="M256 404 C228 384 196 378 160 384 V330 C196 324 228 330 256 350 Z" fill="url(#${p}-e)"/>
    <path d="M256 404 C284 384 316 378 352 384 V330 C316 324 284 330 256 350 Z" fill="url(#${p}-e)"/>
    <path d="M256 352 V402" stroke="${L.ink}" stroke-width="5" stroke-linecap="round"/>
    <path d="M118 424 H394" stroke="url(#${p}-e)" stroke-width="18" stroke-linecap="round"/>
  </g>
</svg>`
}

/** للعرض داخل التطبيق كصورة (معرّفات التدرجات لا تتعارض بين الأيقونات) */
export const appIconDataUrl = (id: AppIconId) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(appIconSvg(id))}`

/** اسم مكوّن Android (activity-alias) لكل أيقونة */
export const aliasOf = (id: AppIconId) => (id === 'default' ? 'LauncherDefault' : `Launcher${id[0].toUpperCase()}${id.slice(1)}`)
