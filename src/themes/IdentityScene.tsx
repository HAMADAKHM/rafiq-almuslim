// خلفيات «ثيمات الهوية»: لوحات SVG هادئة مرسومة بالكود (لا صور خارجية ولا حقوق لطرف آخر)،
// زخرفة هندسية خفيفة + عنصر الثيم (هلال، فوانيس، شمس، أوراق، زهور) + محراب وقبة في الأسفل.
// الحركة خفيفة واختيارية (تتوقف مع «مشهد ثابت» أو «تقليل الحركة»)، ولا تمس وضوح النص.
import type { IdentityId } from './skins'

interface Look { sky: [string, string, string]; line: string; lineOpacity: number; silhouette: string; silOpacity: number; accent: string; motif: 'arch' | 'stars' | 'geometry' | 'sun' | 'leaves' | 'violet' | 'flowers' | 'lanterns'; glow?: string }

export const IDENTITY_LOOK: Record<IdentityId, Look> = {
  't-classic': { sky: ['#fbf8f0', '#f4eddc', '#ece1c8'], line: '#b8902f', lineOpacity: 0.16, silhouette: '#0b5e4a', silOpacity: 0.1, accent: '#b8902f', motif: 'arch' },
  't-royal': { sky: ['#16285a', '#0d1a3c', '#060c20'], line: '#d9b45a', lineOpacity: 0.2, silhouette: '#d9b45a', silOpacity: 0.16, accent: '#e8c877', motif: 'geometry', glow: '#d9b45a' },
  't-night': { sky: ['#13285a', '#0a1838', '#040a1c'], line: '#8cc4ff', lineOpacity: 0.07, silhouette: '#020611', silOpacity: 0.85, accent: '#f3dc9a', motif: 'stars', glow: '#aed6ff' },
  't-turquoise': { sky: ['#f2fbfa', '#ddf3f0', '#c6e9e5'], line: '#0f8c88', lineOpacity: 0.16, silhouette: '#0a5f5c', silOpacity: 0.12, accent: '#b98b2e', motif: 'geometry' },
  't-dawn': { sky: ['#ffd9a8', '#ffb27a', '#f7e3c7'], line: '#c8641e', lineOpacity: 0.08, silhouette: '#5a2e1e', silOpacity: 0.32, accent: '#fff2c4', motif: 'sun', glow: '#fff0b8' },
  't-nature': { sky: ['#f6f9ee', '#e8f0da', '#d7e5c2'], line: '#3d7a3a', lineOpacity: 0.1, silhouette: '#2f5a2c', silOpacity: 0.12, accent: '#4b9147', motif: 'leaves' },
  't-violet': { sky: ['#3a2272', '#21134a', '#0f0824'], line: '#c9b6ff', lineOpacity: 0.09, silhouette: '#0b0620', silOpacity: 0.8, accent: '#e7e9f2', motif: 'violet', glow: '#dccfff' },
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
        <Silhouette color={L.silhouette} opacity={L.silOpacity} />
      </svg>
    </div>
  )
}
