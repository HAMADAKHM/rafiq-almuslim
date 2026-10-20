import { toArabicDigits } from '../../../lib/arabic'

/** رقم الآية داخل زخرفة نجمية (تُرسم بـ CSS فتعمل مع كل الخطوط ولا تُضاف إلى نص المصحف) */
export function AyahNum({ n }: { n: number }) {
  return <span className="ayah-rosette" aria-label={`الآية ${n}`}><span>{toArabicDigits(n)}</span></span>
}

/** إطار اسم السورة بأسلوب المصاحف */
export function SurahTitle({ name, small }: { name: string; small?: boolean }) {
  return (
    <div className={'surah-cartouche' + (small ? ' small' : '')} role="heading" aria-level={small ? 2 : 1} aria-label={`سورة ${name}`}>
      <svg viewBox="0 0 400 64" preserveAspectRatio="none" aria-hidden="true" className="cartouche-bg">
        <path d="M20 8 H380 Q392 8 396 20 L400 32 L396 44 Q392 56 380 56 H20 Q8 56 4 44 L0 32 L4 20 Q8 8 20 8 Z" className="c-fill" />
        <path d="M26 14 H374 Q384 14 387 23 L390 32 L387 41 Q384 50 374 50 H26 Q16 50 13 41 L10 32 L13 23 Q16 14 26 14 Z" className="c-line" />
        {[40, 360].map((x) => (
          <g key={x} transform={`translate(${x} 32)`} className="c-orn">
            <rect x="-9" y="-9" width="18" height="18" />
            <rect x="-9" y="-9" width="18" height="18" transform="rotate(45)" />
            <circle r="3.5" />
          </g>
        ))}
      </svg>
      <span className="cartouche-text" aria-hidden="true">سُورَةُ {name}</span>
    </div>
  )
}

/** زخرفة هادئة فوق الآية وتحتها في وضع التركيز */
export function Flourish({ flip }: { flip?: boolean }) {
  return (
    <svg viewBox="0 0 240 40" className="flourish" style={flip ? { transform: 'scaleY(-1)' } : undefined} aria-hidden="true">
      <path d="M120 30 C100 30 92 12 72 12 C56 12 50 24 36 24 C26 24 18 18 4 20 M120 30 C140 30 148 12 168 12 C184 12 190 24 204 24 C214 24 222 18 236 20" />
      <path d="M120 6 L128 18 L120 30 L112 18 Z" />
      <circle cx="120" cy="18" r="3" />
    </svg>
  )
}
