// عناصر إعدادات بأزرار كبيرة تناسب جهاز التحكم (مشتركة بين صفحات الإعدادات)
/** أزرار اختيار كبيرة (أسهل من القوائم المنسدلة بجهاز التحكم) */
export function Choices<T extends string | number>({ value, options, onChange, label, cols = 3 }: { value: T; options: { id: T; label: string }[]; onChange: (v: T) => void; label: string; cols?: number }) {
  return (
    <div className="tv-choices" role="radiogroup" aria-label={label} style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
      {options.map((o) => <button key={String(o.id)} role="radio" aria-checked={value === o.id} className={'tv-choice' + (value === o.id ? ' on' : '')} onClick={() => onChange(o.id)}>{value === o.id ? '✓ ' : ''}{o.label}</button>)}
    </div>
  )
}

/** مفتاح تشغيل/إيقاف بزر كبير */
export function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return <button role="switch" aria-checked={on} className={'tv-toggle' + (on ? ' on' : '')} onClick={() => onChange(!on)}><span>{label}</span><b>{on ? 'مفعّل' : 'متوقف'}</b></button>
}

/** رقم بزرّي − و + (أسهل من الكتابة بجهاز التحكم) */
export function Stepper({ value, onChange, min, max, label, suffix = '' }: { value: number; onChange: (v: number) => void; min: number; max: number; label: string; suffix?: string }) {
  return (
    <div className="tv-stepper" aria-label={label}>
      <span className="tv-stepper-label">{label}</span>
      <button className="tv-step" onClick={() => onChange(Math.max(min, value - 1))} aria-label={`إنقاص ${label}`}>−</button>
      <b>{value}{suffix}</b>
      <button className="tv-step" onClick={() => onChange(Math.min(max, value + 1))} aria-label={`زيادة ${label}`}>+</button>
    </div>
  )
}

