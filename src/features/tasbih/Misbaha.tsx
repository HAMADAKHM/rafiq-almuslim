// رسم المسبحة: 33 حبة على حلقة، وحبة «إمام» مع شرابة في الأسفل. تدور الحلقة حبة واحدة مع كل تسبيحة.
import type { BEADS } from '../../services/tasbih'

const N = 33
const R = 128
const STEP = 360 / N

export function Misbaha({ bead, count }: { bead: (typeof BEADS)[number]; count: number }) {
  const g = `bead-${bead.id}`
  return (
    <svg className="misbaha" viewBox="0 0 320 360" aria-hidden="true">
      <defs>
        <radialGradient id={g} cx="0.35" cy="0.3" r="0.75">
          <stop offset="0" stopColor={bead.c[0]} /><stop offset="0.55" stopColor={bead.c[1]} /><stop offset="1" stopColor={bead.c[2]} />
        </radialGradient>
      </defs>
      <circle cx="160" cy="160" r={R} fill="none" stroke={bead.cord} strokeWidth="2" opacity="0.8" />
      {/* الحلقة تدور حبة مع كل ضغطة */}
      <g className="misbaha-ring" style={{ transform: `rotate(${-count * STEP}deg)`, transformOrigin: '160px 160px' }}>
        {Array.from({ length: N }, (_, i) => {
          const a = ((i * STEP - 90) * Math.PI) / 180
          return (
            <g key={i}>
              <circle cx={160 + R * Math.cos(a)} cy={160 + R * Math.sin(a)} r="11.5" fill={`url(#${g})`} />
              <circle cx={160 + R * Math.cos(a) - 3.5} cy={160 + R * Math.sin(a) - 4} r="3" fill="#fff" opacity="0.55" />
            </g>
          )
        })}
      </g>
      {/* حبة الإمام والشرابة */}
      <path d={`M160 ${160 + R + 8} V${160 + R + 30}`} stroke={bead.cord} strokeWidth="2.5" />
      <ellipse cx="160" cy={160 + R + 40} rx="9" ry="13" fill={`url(#${g})`} />
      <g stroke={bead.cord} strokeWidth="1.6" strokeLinecap="round">
        {[-8, -4, 0, 4, 8].map((dx) => <path key={dx} d={`M160 ${160 + R + 52} q${dx / 2} 14 ${dx} 30`} fill="none" />)}
      </g>
    </svg>
  )
}
