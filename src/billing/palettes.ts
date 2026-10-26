// لوحات ألوان وخلفيات «رفيق بلس» (إضافية؛ ألوان التطبيق الأربع الأصلية تبقى مجانية في الإعدادات).
export interface PlusPalette { id: string; label: string; swatch: string }
export const PLUS_PALETTES: PlusPalette[] = [
  { id: 'sapphire', label: 'الياقوت الأزرق', swatch: 'linear-gradient(135deg,#123a63,#0b2a4a)' },
  { id: 'rose', label: 'الورد الدمشقي', swatch: 'linear-gradient(135deg,#6e3346,#4a1f2e)' },
  { id: 'sand', label: 'رمال الصحراء', swatch: 'linear-gradient(135deg,#7a5f35,#5a4425)' },
  { id: 'olive', label: 'غصن الزيتون', swatch: 'linear-gradient(135deg,#4a5c2e,#2f3b1f)' },
  { id: 'midnight', label: 'ليل الأندلس', swatch: 'linear-gradient(135deg,#2b2752,#1e1b3a)' },
]
export const isPlusPalette = (id: string) => PLUS_PALETTES.some((p) => p.id === id)
