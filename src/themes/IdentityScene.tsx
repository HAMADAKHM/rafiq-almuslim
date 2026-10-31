// خلفيات «ثيمات الهوية»: لوحات SVG هادئة مرسومة بالكود (لا صور خارجية ولا حقوق لطرف آخر)،
// زخرفة هندسية خفيفة + عنصر الثيم (هلال، فوانيس، شمس، أوراق، زهور) + محراب وقبة في الأسفل.
// الحركة خفيفة واختيارية (تتوقف مع «مشهد ثابت» أو «تقليل الحركة»)، ولا تمس وضوح النص.
import type { IdentityId } from './skins'

type Motif = 'arch' | 'stars' | 'geometry' | 'sun' | 'leaves' | 'violet' | 'flowers' | 'lanterns' | 'branch' | 'skyline' | 'sunleaf' | 'clouds' | 'heritage' | 'sunset' | 'none' | 'landscape' | 'bokeh'
interface Look { sky: [string, string, string]; line: string; lineOpacity: number; silhouette: string; silOpacity: number; accent: string; motif: Motif; glow?: string }

// خلفيات التصاميم التسعة المعتمدة (ثم ثيمات الشروق والوردي والمساء)
export const IDENTITY_LOOK: Record<IdentityId, Look> = {
  'e-emerald': { sky: ['#f6f9f4', '#f2f6f1', '#e6efe6'], line: '#b8913f', lineOpacity: 0.08, silhouette: '#0b6b4f', silOpacity: 0.14, accent: '#b8913f', motif: 'arch' },
  'e-midnight': { sky: ['#121a33', '#0b1020', '#070a14'], line: '#9cc2ff', lineOpacity: 0.04, silhouette: '#04060d', silOpacity: 0.92, accent: '#dfe8ff', motif: 'stars', glow: '#9cc2ff' },
  'e-ivory': { sky: ['#fdfaf3', '#fbf7ee', '#f3ecdc'], line: '#b8995a', lineOpacity: 0.08, silhouette: '#7d5f22', silOpacity: 0.1, accent: '#b8995a', motif: 'arch' },
  'e-nature': { sky: ['#f6faf2', '#eef4ea', '#e2ecdc'], line: '#3c7a3f', lineOpacity: 0.04, silhouette: '#3c7a3f', silOpacity: 0.12, accent: '#5f9a4a', motif: 'leaves' },
  'e-white': { sky: ['#ffffff', '#ffffff', '#fafafa'], line: '#0f7a5a', lineOpacity: 0, silhouette: '#0f7a5a', silOpacity: 0, accent: '#0f7a5a', motif: 'none' },
  'e-dark': { sky: ['#141716', '#0f1110', '#0b0c0c'], line: '#4cc59a', lineOpacity: 0, silhouette: '#000000', silOpacity: 0, accent: '#4cc59a', motif: 'none' },
  't-classic': { sky: ['#fbf9f2', '#f7f4ea', '#efe9d8'], line: '#c6a66b', lineOpacity: 0.07, silhouette: '#3f7d63', silOpacity: 0.16, accent: '#5f8f4a', motif: 'branch' },
  't-night': { sky: ['#0d1d3d', '#0a1730', '#081226'], line: '#e0bd6e', lineOpacity: 0.04, silhouette: '#050c1c', silOpacity: 0.95, accent: '#f3d58c', motif: 'skyline', glow: '#ffb45a' },
  't-nature': { sky: ['#fbf4e8', '#f6efe3', '#efe4d2'], line: '#b08b67', lineOpacity: 0.05, silhouette: '#7d8f62', silOpacity: 0.14, accent: '#4f7a3a', motif: 'sunleaf', glow: '#fff4d8' },
  't-turquoise': { sky: ['#cfeef3', '#e6f5f6', '#f4fbfb'], line: '#138a8c', lineOpacity: 0.05, silhouette: '#5fb3b5', silOpacity: 0.22, accent: '#ffffff', motif: 'clouds' },
  't-heritage': { sky: ['#0b3328', '#082a22', '#061f19'], line: '#d9b46a', lineOpacity: 0.16, silhouette: '#d9b46a', silOpacity: 0.08, accent: '#f3c46a', motif: 'heritage', glow: '#ffc35a' },
  't-violet': { sky: ['#2b1f4f', '#5a4080', '#c58a8f'], line: '#f6dcbf', lineOpacity: 0.03, silhouette: '#1c1338', silOpacity: 0.9, accent: '#ffd9a8', motif: 'sunset', glow: '#ffd2a0' },
  't-minimal': { sky: ['#f9f9f7', '#f7f7f5', '#f2f2ef'], line: '#1f6a55', lineOpacity: 0, silhouette: '#1f6a55', silOpacity: 0, accent: '#1f6a55', motif: 'none' },
  't-gradient': { sky: ['#8fd6ea', '#fde9ef', '#fff4d6'], line: '#4f5bb5', lineOpacity: 0, silhouette: '#2f9aa8', silOpacity: 0.55, accent: '#5aa34a', motif: 'landscape', glow: '#fff6d0' },
  't-royal': { sky: ['#1c140b', '#110d08', '#0a0806'], line: '#d4a84f', lineOpacity: 0.05, silhouette: '#000000', silOpacity: 0.7, accent: '#e2bd6c', motif: 'bokeh', glow: '#ffb84d' },
  't-dawn': { sky: ['#ffd9a8', '#ffb27a', '#f7e3c7'], line: '#c8641e', lineOpacity: 0.08, silhouette: '#5a2e1e', silOpacity: 0.32, accent: '#fff2c4', motif: 'sun', glow: '#fff0b8' },
  't-rose': { sky: ['#fff6f7', '#f9e3e8', '#f1d1d9'], line: '#b98a5e', lineOpacity: 0.18, silhouette: '#a8546d', silOpacity: 0.1, accent: '#c96582', motif: 'flowers' },
  't-evening': { sky: ['#1b2f4c', '#0f1d34', '#060c18'], line: '#f0b45a', lineOpacity: 0.07, silhouette: '#03070f', silOpacity: 0.88, accent: '#f6c77e', motif: 'lanterns', glow: '#ffcf7a' },
}

/** نجمة ثمانية للنمط الهندسي */
const STAR8 = 'M28 6 L33 19 L46 14 L41 27 L54 32 L41 37 L46 50 L33 45 L28 58 L23 45 L10 50 L15 37 L2 32 L15 27 L10 14 L23 19 Z'

function Silhouette({ color, opacity }: { color: string; opacity: number }) {
  // قبة ومئذنتان وقوسا محراب — بسيطة لتبقى هادئة خلف النص
  return (
    <g fill={color} opacity={opacity}>
      <path d="M0 860 L0 770 Q40 760 70 772 L70 860 Z" />
      <rect x="92" y="640" width="16" height="220" rx="3" /><path d="M88 640 L100 600 L112 640 Z" /><circle cx="100" cy="596" r="5" />
      <rect x="292" y="640" width="16" height="220" rx="3" /><path d="M288 640 L300 600 L312 640 Z" /><circle cx="300" cy="596" r="5" />
      <path d="M130 860 L130 735 Q130 650 200 630 Q270 650 270 735 L270 860 Z" />
      <path d="M196 630 L200 606 L204 630 Z" />
      <path d="M330 860 L330 780 Q365 762 400 772 L400 860 Z" />
    </g>
  )
}

export function IdentityScene({ id }: { id: IdentityId }) {
  const L = IDENTITY_LOOK[id]
  const g = `ig-${id}`
  return (
    <div className="skin-scene identity-scene" aria-hidden="true">
      <svg className="sk-svg" viewBox="0 0 400 860" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id={`${g}-sky`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={L.sky[0]} /><stop offset="0.55" stopColor={L.sky[1]} /><stop offset="1" stopColor={L.sky[2]} />
          </linearGradient>
          <pattern id={`${g}-pat`} width="56" height="64" patternUnits="userSpaceOnUse">
            <path d={STAR8} fill="none" stroke={L.line} strokeWidth="0.9" />
            <path d="M0 0 L56 64 M56 0 L0 64" stroke={L.line} strokeWidth="0.4" opacity="0.6" />
          </pattern>
          <linearGradient id={`${g}-horizon`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={L.glow ?? '#000'} stopOpacity="0" /><stop offset="0.6" stopColor={L.glow ?? '#000'} stopOpacity="0.35" /><stop offset="1" stopColor={L.glow ?? '#000'} stopOpacity="0" /></linearGradient>
          <filter id={`${g}-blur`}><feGaussianBlur stdDeviation="6" /></filter>
          {L.glow && <radialGradient id={`${g}-glow`}><stop offset="0" stopColor={L.glow} stopOpacity="0.55" /><stop offset="1" stopColor={L.glow} stopOpacity="0" /></radialGradient>}
        </defs>
        <rect width="400" height="860" fill={`url(#${g}-sky)`} />
        <rect width="400" height="860" fill={`url(#${g}-pat)`} opacity={L.lineOpacity * 4} className={L.motif === 'geometry' ? 'sk-pulse' : undefined} />

        {L.motif === 'stars' || L.motif === 'violet' ? (
          <g className="sk-stars" fill="#fff">
            {Array.from({ length: 46 }, (_, i) => <circle key={i} cx={(i * 97) % 400} cy={(i * 53) % 520} r={i % 5 === 0 ? 1.6 : 0.9} style={{ animationDelay: `${(i % 9) * 0.6}s` }} />)}
          </g>
        ) : null}
        {(L.motif === 'stars' || L.motif === 'violet') && (
          <g className="sk-moon">
            <circle cx="300" cy="140" r="70" fill={`url(#${g}-glow)`} />
            <path d="M300 104 a38 38 0 1 0 30 62 a30 30 0 1 1 -30 -62 Z" fill={L.accent} />
          </g>
        )}
        {L.motif === 'sun' && (
          <g>
            <circle cx="200" cy="560" r="190" fill={`url(#${g}-glow)`} className="sk-pulse" />
            <circle cx="200" cy="560" r="62" fill={L.accent} opacity="0.95" />
            <path d="M0 700 Q80 620 160 690 Q240 610 320 680 Q360 650 400 670 L400 860 L0 860 Z" fill="#8a4a2e" opacity="0.35" />
          </g>
        )}
        {L.motif === 'geometry' && L.glow && <circle cx="200" cy="300" r="240" fill={`url(#${g}-glow)`} opacity="0.35" className="sk-pulse" />}
        {L.motif === 'leaves' && (
          <g fill={L.accent} opacity="0.32">
            {[[18, 40, 30], [52, 18, -20], [360, 70, 140], [384, 120, 170], [20, 300, 60], [380, 420, 200]].map(([x, y, r], i) => (
              <path key={i} className="sk-leaf-sway" transform={`translate(${x} ${y}) rotate(${r})`} d="M0 0 C18 -22 46 -20 60 0 C46 20 18 22 0 0 Z" style={{ animationDelay: `${i * 0.8}s` }} />
            ))}
            <path d="M0 120 Q60 80 40 0 M400 180 Q340 120 372 40" stroke={L.accent} strokeWidth="2" fill="none" opacity="0.7" />
          </g>
        )}
        {L.motif === 'flowers' && (
          <g fill={L.accent} opacity="0.22">
            {[[40, 60], [360, 90], [30, 380], [370, 470]].map(([x, y], i) => (
              <g key={i} transform={`translate(${x} ${y})`}>
                {[0, 72, 144, 216, 288].map((a) => <ellipse key={a} rx="9" ry="20" transform={`rotate(${a}) translate(0 -16)`} />)}
                <circle r="7" fill={L.line} />
              </g>
            ))}
          </g>
        )}
        {L.motif === 'lanterns' && (
          <g>
            {[[70, 120, 0], [200, 80, 1], [330, 140, 2]].map(([x, len, i]) => (
              <g key={i} className="sk-lantern" style={{ transformOrigin: `${x}px 0px`, animationDelay: `${i * 0.7}s` }}>
                <line x1={x} y1="0" x2={x} y2={len} stroke={L.accent} strokeWidth="1.2" opacity="0.7" />
                <circle cx={x} cy={len + 26} r="44" fill={`url(#${g}-glow)`} className="sk-lantern-glow" />
                <path d={`M${x - 14} ${len + 8} L${x + 14} ${len + 8} L${x + 18} ${len + 30} L${x + 10} ${len + 48} L${x - 10} ${len + 48} L${x - 18} ${len + 30} Z`} fill={L.accent} opacity="0.92" />
                <path d={`M${x - 8} ${len} L${x + 8} ${len} L${x + 12} ${len + 8} L${x - 12} ${len + 8} Z`} fill={L.accent} />
              </g>
            ))}
          </g>
        )}
        {L.motif === 'arch' && (
          <path d="M60 860 L60 330 Q60 170 200 120 Q340 170 340 330 L340 860" fill="none" stroke={L.accent} strokeWidth="2" opacity="0.22" />
        )}
        {L.motif === 'branch' && (
          <g>
            <path d="M400 0 C360 40 330 70 300 130" stroke="#6d8f52" strokeWidth="2.2" fill="none" opacity="0.55" />
            {[[392, 14, 200], [372, 40, 150], [356, 60, 215], [340, 86, 160], [326, 104, 230], [312, 124, 170], [384, 30, 250], [350, 74, 120]].map(([x, y, r], i) => (
              <path key={i} className="sk-leaf-sway" transform={`translate(${x} ${y}) rotate(${r})`} d="M0 0 C10 -14 32 -14 42 0 C32 14 10 14 0 0 Z" fill={i % 2 ? '#7da35a' : '#5f8f4a'} opacity="0.4" style={{ animationDelay: `${i * 0.6}s` }} />
            ))}
          </g>
        )}
        {L.motif === 'skyline' && (
          <g>
            <g className="sk-stars" fill="#fff">{Array.from({ length: 50 }, (_, i) => <circle key={i} cx={(i * 89) % 400} cy={(i * 47) % 420} r={i % 6 === 0 ? 1.5 : 0.8} style={{ animationDelay: `${(i % 9) * 0.6}s` }} />)}</g>
            <g className="sk-moon"><circle cx="120" cy="128" r="56" fill={`url(#${g}-glow)`} opacity="0.5" /><path d="M120 100 a30 30 0 1 0 24 49 a24 24 0 1 1 -24 -49 Z" fill={L.accent} /></g>
            <rect x="0" y="640" width="400" height="220" fill={`url(#${g}-horizon)`} />
            <g fill="#ffcf7a" opacity="0.8">{[[112, 760], [150, 748], [208, 742], [246, 756], [338, 770], [60, 790]].map(([x, y], i) => <rect key={i} x={x} y={y} width="4" height="7" rx="1" />)}</g>
          </g>
        )}
        {L.motif === 'sunleaf' && (
          <g>
            <circle cx="60" cy="120" r="200" fill={`url(#${g}-glow)`} opacity="0.9" />
            <g fill="#4f6a3a" opacity="0.16" filter={`url(#${g}-blur)`}>
              {[[330, 40, 30], [360, 90, 70], [300, 110, -20], [380, 160, 110], [340, 190, 40], [280, 60, 150]].map(([x, y, r], i) => <path key={i} transform={`translate(${x} ${y}) rotate(${r}) scale(1.5)`} d="M0 0 C14 -20 44 -20 58 0 C44 20 14 20 0 0 Z" />)}
            </g>
          </g>
        )}
        {L.motif === 'clouds' && (
          <g fill="#ffffff" opacity="0.85">
            {[[60, 90, 1], [300, 60, 1.3], [210, 180, 0.8], [40, 300, 0.9], [330, 330, 1.1]].map(([x, y, k], i) => (
              <g key={i} className="sk-cloud" transform={`translate(${x} ${y}) scale(${k})`} style={{ animationDelay: `${i * 2}s` }}><ellipse cx="0" cy="0" rx="44" ry="14" /><ellipse cx="-16" cy="-8" rx="20" ry="14" /><ellipse cx="14" cy="-12" rx="24" ry="17" /></g>
            ))}
          </g>
        )}
        {L.motif === 'heritage' && (
          <g>
            <g opacity="0.5"><circle cx="150" cy="150" r="100" fill={`url(#${g}-glow)`} className="sk-pulse" /></g>
            <g className="sk-lantern" style={{ transformOrigin: '150px 0px' }}>
              <line x1="150" y1="0" x2="150" y2="96" stroke="#d9b46a" strokeWidth="1.4" />
              <path d="M138 96 H162 L166 108 H134 Z" fill="#b4904a" />
              <path d="M132 108 H168 L172 150 L160 178 H140 L128 150 Z" fill="#ffd27a" opacity="0.9" stroke="#b4904a" strokeWidth="2" />
              <path d="M150 112 V174 M136 140 H164" stroke="#b4904a" strokeWidth="1.5" />
              <path d="M140 178 H160 L154 188 H146 Z" fill="#b4904a" />
            </g>
          </g>
        )}
        {L.motif === 'sunset' && (
          <g>
            <circle cx="320" cy="430" r="120" fill={`url(#${g}-glow)`} opacity="0.75" />
            <circle cx="320" cy="430" r="26" fill="#ffe2b8" opacity="0.95" />
            <path d="M110 104 a26 26 0 1 0 19 42 a21 21 0 1 1 -19 -42 Z" fill="#f6dcbf" opacity="0.8" />
            <path d="M0 520 L70 440 L130 490 L210 410 L290 480 L350 440 L400 470 L400 860 L0 860 Z" fill="#5a3f78" opacity="0.75" />
            <path d="M0 590 L90 530 L170 570 L250 520 L330 565 L400 540 L400 860 L0 860 Z" fill="#3f2b5e" opacity="0.85" />
            <g fill="#ffcf9a" opacity="0.65">{Array.from({ length: 24 }, (_, i) => <circle key={i} cx={(i * 53) % 400} cy={700 + ((i * 37) % 120)} r="1.6" />)}</g>
          </g>
        )}
        {L.motif === 'landscape' && (
          <g>
            <circle cx="320" cy="160" r="120" fill={`url(#${g}-glow)`} opacity="0.8" />
            <g fill="#ffffff" opacity="0.9">{[[80, 110, 1], [280, 70, 1.2], [200, 220, 0.7]].map(([x, y, k], i) => <g key={i} className="sk-cloud" transform={`translate(${x} ${y}) scale(${k})`}><ellipse rx="40" ry="13" /><ellipse cx="-14" cy="-8" rx="18" ry="12" /><ellipse cx="12" cy="-11" rx="22" ry="15" /></g>)}</g>
            <path d="M0 700 Q100 640 200 680 T400 660 L400 860 L0 860 Z" fill="#8cc56a" opacity="0.85" />
            <path d="M0 760 Q120 710 240 750 T400 730 L400 860 L0 860 Z" fill="#5aa34a" />
            {[[30, 690], [370, 670], [345, 690]].map(([x, y], i) => <g key={i}><rect x={x - 2} y={y - 10} width="4" height="24" fill="#6b4a2a" /><circle cx={x} cy={y - 18} r="18" fill="#4f9a3e" /></g>)}
          </g>
        )}
        {L.motif === 'bokeh' && (
          <g>
            {[[40, 260, 26, 0.1], [370, 300, 22, 0.12], [320, 470, 36, 0.07], [70, 480, 22, 0.09], [360, 620, 30, 0.08], [30, 640, 16, 0.12]].map(([x, y, r, o], i) => <g key={i} opacity={o}><circle cx={x} cy={y} r={r} fill="#ffb84d" className="sk-pulse" style={{ animationDelay: `${i * 0.7}s` }} /></g>)}
            <circle cx="70" cy="700" r="130" fill={`url(#${g}-glow)`} opacity="0.5" />
          </g>
        )}
        <Silhouette color={L.silhouette} opacity={L.silOpacity} />
      </svg>
    </div>
  )
}
