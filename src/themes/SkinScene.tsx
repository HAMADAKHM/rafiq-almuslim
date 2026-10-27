// المشاهد المتحركة للثيمات الغامرة (SVG + CSS، الحركة في src/styles/skins.css).
// خفيفة: transform وopacity فقط، وتتوقف مع «تقليل الحركة» أو عند إخفاء التطبيق.
import type { SkinId } from './skins'

/** صفوف نجوم ثابتة المواقع (لا عشوائية في كل عرض) */
function stars(n: number, seed: number, h = 560) {
  const out: { x: number; y: number; r: number; d: number }[] = []
  let s = seed
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280)
  for (let i = 0; i < n; i++) out.push({ x: rnd() * 400, y: rnd() * h, r: 0.4 + rnd() * 1.3, d: rnd() * 6 })
  return out
}

function Stars({ n, seed, h }: { n: number; seed: number; h?: number }) {
  return (
    <g className="sk-stars">
      {stars(n, seed, h).map((st, i) => <circle key={i} cx={st.x} cy={st.y} r={st.r} fill="#fff" style={{ animationDelay: `${st.d}s` }} />)}
    </g>
  )
}

/** صف قباب ومآذن مع نوافذ مضاءة */
function Skyline({ fill, glow }: { fill: string; glow: string }) {
  return (
    <g className="sk-skyline">
      <rect x="0" y="560" width="400" height="240" fill="url(#horizon)" />
      <path fill={fill} d="M0 800V700h18v-40h6l3-12 3 12h6v40h20v-22q22-34 44 0v22h14v-70l6-18 6 18v70h16v-34q34-56 68 0v34h14v-26q16-26 32 0v26h16v-64l5-16 5 16v64h18v-30q24-40 48 0v30h20v-48h6l3-12 3 12h6v48h18v100z" />
      {[[94, 712], [104, 712], [196, 720], [208, 720], [220, 720], [282, 726], [292, 726], [348, 716]].map(([x, y], i) => (
        <rect key={i} className="sk-window" x={x} y={y} width="5" height="9" rx="2.5" fill={glow} style={{ animationDelay: `${i * 0.7}s` }} />
      ))}
    </g>
  )
}

/** نجمة ثمانية للزخارف الهندسية */
const STAR8 = 'M0-14L4-4 14 0 4 4 0 14-4 4-14 0-4-4z'

function Lantern({ x, len, delay, scale = 1 }: { x: number; len: number; delay: number; scale?: number }) {
  return (
    <g className="sk-lantern" style={{ transformOrigin: `${x}px 0px`, animationDelay: `${delay}s` }}>
      <line x1={x} y1="0" x2={x} y2={len} stroke="#d9b45a" strokeWidth="1.2" />
      <g transform={`translate(${x} ${len}) scale(${scale})`}>
        <circle className="sk-lantern-glow" r="34" fill="url(#lanternGlow)" style={{ animationDelay: `${delay}s` }} />
        <path d="M-6-4h12l-2-8h-8z" fill="#c9a24a" />
        <path d="M-14 0h28l-6 36h-16z" fill="#f6c25b" opacity="0.92" />
        <path d="M-14 0h28M-11 12h22M-8 24h16" stroke="#8a5f1a" strokeWidth="1.4" />
        <path d="M-8 36h16l-3 7h-10z" fill="#c9a24a" />
        <path d="M0 3v31M-7 3l3 31M7 3l-3 31" stroke="#8a5f1a" strokeWidth="0.8" opacity="0.7" />
      </g>
    </g>
  )
}

export function SkinScene({ id }: { id: SkinId }) {
  return (
    <div className={`skin-scene scene-${id}`} aria-hidden="true">
      <svg viewBox="0 0 400 800" preserveAspectRatio="xMidYMid slice" className="sk-svg">
        <defs>
          <radialGradient id="moonGlow"><stop offset="0" stopColor="#fff6d6" stopOpacity="0.55" /><stop offset="1" stopColor="#fff6d6" stopOpacity="0" /></radialGradient>
          <radialGradient id="sunGlow"><stop offset="0" stopColor="#ffd88a" stopOpacity="0.9" /><stop offset="0.4" stopColor="#ff9a5a" stopOpacity="0.35" /><stop offset="1" stopColor="#ff7a50" stopOpacity="0" /></radialGradient>
          <radialGradient id="lanternGlow"><stop offset="0" stopColor="#ffd27a" stopOpacity="0.7" /><stop offset="1" stopColor="#ffb347" stopOpacity="0" /></radialGradient>
          <linearGradient id="duneA" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#e09a5a" /><stop offset="1" stopColor="#8a4a3a" /></linearGradient>
          <linearGradient id="duneB" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#b8643f" /><stop offset="1" stopColor="#5a2c34" /></linearGradient>
          <linearGradient id="duneC" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#7a3a3e" /><stop offset="1" stopColor="#2e1426" /></linearGradient>
          <linearGradient id="sweep" x1="0" y1="0" x2="1" y2="1"><stop offset="0.35" stopColor="#ffe7a3" stopOpacity="0" /><stop offset="0.5" stopColor="#ffe7a3" stopOpacity="0.28" /><stop offset="0.65" stopColor="#ffe7a3" stopOpacity="0" /></linearGradient>
          <pattern id="zellige" width="56" height="56" patternUnits="userSpaceOnUse">
            <rect width="56" height="56" fill="none" />
            <g transform="translate(28 28)"><path d={STAR8} fill="#1f7b7d" /><circle r="3.4" fill="#f4ead7" /></g>
            <g transform="translate(0 0)"><path d={STAR8} fill="#c2643d" transform="scale(0.55)" /></g>
            <g transform="translate(56 0)"><path d={STAR8} fill="#c2643d" transform="scale(0.55)" /></g>
            <g transform="translate(0 56)"><path d={STAR8} fill="#c2643d" transform="scale(0.55)" /></g>
            <g transform="translate(56 56)"><path d={STAR8} fill="#c2643d" transform="scale(0.55)" /></g>
            <path d="M28 6L50 28 28 50 6 28z" fill="none" stroke="#c9a24a" strokeWidth="1" />
          </pattern>
          <pattern id="girih" width="80" height="80" patternUnits="userSpaceOnUse">
            <g fill="none" stroke="#c9a24a" strokeWidth="0.9" opacity="0.55">
              <path d="M40 4l10 26 26 10-26 10-10 26-10-26L4 40l26-10z" />
              <path d="M40 22l5 13 13 5-13 5-5 13-5-13-13-5 13-5z" />
              <path d="M0 0l12 12M80 0L68 12M0 80l12-12M80 80L68 68" />
            </g>
          </pattern>
          <linearGradient id="horizon" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#3b4c9a" stopOpacity="0" /><stop offset="0.55" stopColor="#4a5cb0" stopOpacity="0.55" /><stop offset="1" stopColor="#1b2456" stopOpacity="0.9" /></linearGradient>
          <mask id="crescent"><circle r="46" fill="#fff" /><circle cx="20" cy="-12" r="40" fill="#000" /></mask>
          <filter id="blur18" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="18" /></filter>
        </defs>

        {id === 'qadr' && (
          <>
            <Stars n={110} seed={7} />
            <circle cx="300" cy="150" r="90" fill="url(#moonGlow)" className="sk-pulse" />
            <g transform="translate(300 150)"><circle r="46" fill="#fbefc4" mask="url(#crescent)" className="sk-moon" /></g>
            <line className="sk-meteor" x1="80" y1="60" x2="150" y2="96" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
            <Skyline fill="#050915" glow="#ffcf6b" />
          </>
        )}

        {id === 'andalus' && (
          <>
            <rect className="sk-zellige" x="-56" y="-56" width="512" height="912" fill="url(#zellige)" opacity="0.16" />
            <path className="sk-rays" d="M200-40L120 820h160z" fill="#fff8e6" />
            <g className="sk-arch" fill="none" stroke="#1f7b7d" strokeWidth="3" opacity="0.5">
              <path d="M30 230V120q0-78 85-96 22-14 42 0 43 4 43 52 0-48 43-52 20-14 42 0 85 18 85 96v110" />
              <path d="M48 230V126q0-64 70-80 18-12 34 0 48 6 48 52 0-46 48-52 16-12 34 0 70 16 70 80v104" stroke="#c2643d" strokeWidth="1.6" />
            </g>
          </>
        )}

        {id === 'desert' && (
          <>
            <circle cx="210" cy="430" r="150" fill="url(#sunGlow)" className="sk-pulse" />
            <circle cx="210" cy="440" r="42" fill="#ffd38a" opacity="0.95" />
            <g className="sk-drift-slow"><path fill="url(#duneA)" d="M-600 560q150-56 300 0t300 0 300 0 300 0 300 0 300 0V800h-1800z" opacity="0.85" /></g>
            <g className="sk-caravan" fill="#2a1220">
              {[0, 26, 52].map((dx) => (
                <path key={dx} transform={`translate(${dx} 0)`} d="M0 600q4-12 10-12 3-10 8-4 4-4 6 2 6 2 6 10v10h-2v-8h-3v8h-2v-8h-10v8h-2v-8h-3v8h-2v-10q-4 4-6 2z" />
              ))}
            </g>
            <g className="sk-drift"><path fill="url(#duneB)" d="M-600 640q150-44 300 0t300 0 300 0 300 0 300 0 300 0V800h-1800z" /></g>
            <path fill="url(#duneC)" d="M0 720q120-50 220-10t180-20V800H0z" />
            <g className="sk-sand">{stars(26, 3, 800).map((p, i) => <circle key={i} cx={p.x} cy={500 + (p.y % 280)} r={p.r * 0.7} fill="#ffd9a0" opacity="0.5" style={{ animationDelay: `-${p.d}s` }} />)}</g>
          </>
        )}

        {id === 'ocean' && (
          <>
            <g className="sk-caustic" opacity="0.18">{[0, 1, 2, 3, 4].map((i) => <ellipse key={i} cx={60 + i * 75} cy={120 + (i % 2) * 60} rx="70" ry="24" fill="#bff3ff" filter="url(#blur18)" style={{ animationDelay: `${i * 1.3}s` }} />)}</g>
            <path className="sk-ray" d="M120-20L60 560h70z" fill="#b8f0ff" />
            <path className="sk-ray" d="M260-20L230 560h60z" fill="#b8f0ff" style={{ animationDelay: '-2s' }} />
            <g className="sk-bubbles">{stars(18, 11, 800).map((b, i) => <circle key={i} cx={b.x} cy={820} r={1.5 + b.r * 2} fill="none" stroke="#d6f8ff" strokeWidth="0.8" opacity="0.6" style={{ animationDelay: `-${b.d * 2}s`, animationDuration: `${9 + b.r * 6}s` }} />)}</g>
            <g className="sk-wave sk-wave1"><path fill="#0e6b80" opacity="0.55" d="M-400 640q50-22 100 0t100 0 100 0 100 0 100 0 100 0 100 0 100 0 100 0 100 0 100 0 100 0V800h-1200z" /></g>
            <g className="sk-wave sk-wave2"><path fill="#0a5266" opacity="0.75" d="M-400 680q50-18 100 0t100 0 100 0 100 0 100 0 100 0 100 0 100 0 100 0 100 0 100 0 100 0V800h-1200z" /></g>
            <g className="sk-wave sk-wave3"><path fill="#063a4a" d="M-400 720q50-14 100 0t100 0 100 0 100 0 100 0 100 0 100 0 100 0 100 0 100 0 100 0 100 0V800h-1200z" /></g>
          </>
        )}

        {id === 'garden' && (
          <>
            <circle cx="320" cy="90" r="160" fill="url(#sunGlow)" opacity="0.45" className="sk-pulse" />
            <g fill="#3f7d4a" opacity="0.5">
              <path d="M0 0q60 40 40 120 30-20 60-10-50-50-20-110z" />
              <path d="M400 800q-70-40-50-140-30 30-70 20 60 50 30 120z" />
            </g>
            <g className="sk-leaves">
              {stars(16, 21, 300).map((l, i) => (
                <g key={i} transform={`translate(${l.x.toFixed(0)} 0)`}>
                  <path className="sk-leaf" d="M0 0q8-10 16 0-8 10-16 0z" fill={i % 3 === 0 ? '#e7a3b4' : i % 3 === 1 ? '#7fb069' : '#c9d86a'}
                    style={{ animationDelay: `-${l.d * 2.5}s`, animationDuration: `${12 + l.r * 6}s` }} />
                </g>
              ))}
            </g>
          </>
        )}

        {id === 'ramadan' && (
          <>
            <Stars n={70} seed={13} h={500} />
            <g transform="translate(80 170) scale(0.85)"><circle r="46" fill="#f7e3a1" mask="url(#crescent)" className="sk-moon" /></g>
            <path d="M0 60q50 30 100 6t100 6 100 0 100-6" fill="none" stroke="#d9b45a" strokeWidth="1.2" opacity="0.7" />
            <g fill="#d9b45a" opacity="0.8">{[30, 80, 130, 180, 230, 280, 330, 380].map((x, i) => <path key={x} d={`M${x} ${66 + (i % 2) * 6}l6 12h-12z`} />)}</g>
            <Lantern x={150} len={150} delay={0} />
            <Lantern x={250} len={220} delay={1.2} scale={1.25} />
            <Lantern x={340} len={120} delay={0.6} scale={0.85} />
            <Skyline fill="#0a0722" glow="#ffcf6b" />
          </>
        )}

        {id === 'aurora' && (
          <>
            <Stars n={90} seed={17} h={520} />
            <g className="sk-aurora" filter="url(#blur18)">
              <path className="sk-aur1" d="M-60 260q120-120 240-30t260-60v120q-140 70-260-10t-240 40z" fill="#3ef2b0" opacity="0.45" />
              <path className="sk-aur2" d="M-60 320q140-90 250-20t250-80v90q-130 60-250 10t-250 50z" fill="#6b8bff" opacity="0.35" />
              <path className="sk-aur3" d="M-60 220q100-60 220 10t240-40v70q-120 40-240-10t-220 30z" fill="#c06bff" opacity="0.25" />
            </g>
            <path fill="#16324a" d="M0 800V640l60-70 40 40 70-110 60 80 40-40 70 90 60-60V800z" />
            <path fill="#0a1b28" d="M0 800V700l80-50 70 40 90-70 80 60 80-30V800z" />
          </>
        )}

        {id === 'royal' && (
          <>
            <rect x="0" y="0" width="400" height="800" fill="url(#girih)" />
            <rect className="sk-sweep" x="-400" y="0" width="800" height="800" fill="url(#sweep)" />
            <g fill="none" stroke="#c9a24a" strokeWidth="1.4" opacity="0.7">
              <path d="M20 20h60M20 20v60M380 20h-60M380 20v60M20 780h60M20 780v-60M380 780h-60M380 780v-60" />
            </g>
          </>
        )}
      </svg>
      {id === 'qadr' && <div className="sk-vignette" />}
    </div>
  )
}
