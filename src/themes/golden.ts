// تصميم «رفيق المسلم الذهبي» كما أرسله صاحب التطبيق: صور حقيقية (من صور صاحب التطبيق نفسه)، وبطاقات عاجية
// بإطار ذهبي، وأخضر داكن، وشريط سفلي بزر رئيسية بارز. الصور في public/golden ولا يُرسم أي منها بالكود.
export const GOLDEN_ID = 'e-golden'
export const goldenPhoto = (id: string) => `${import.meta.env.BASE_URL}golden/${id}.jpg`

/** صورة رأس كل صفحة بحسب مسارها (أطول بادئة مطابقة) */
const HERO: [string, string][] = [
  ['/prayer', 'bg-mosque'], ['/quran', 'bg-quran'], ['/mushaf', 'bg-quran'], ['/read', 'bg-quran'], ['/listen', 'bg-quran'], ['/memorize', 'bg-quran'], ['/wird', 'bg-quran'],
  ['/adhkar', 'bg-night'], ['/duas', 'bg-night'], ['/tasbih', 'bg-night'], ['/my-adhkar', 'bg-night'], ['/kids-adhkar', 'bg-night'],
  ['/calendar', 'bg-arch'], ['/date-tools', 'bg-arch'], ['/ramadan', 'bg-night'], ['/qibla', 'bg-kaaba'], ['/mosques', 'bg-mosque'],
  ['/hadith', 'bg-madinah'], ['/academy', 'bg-arch'], ['/learn', 'bg-arch'], ['/library', 'bg-madinah2'], ['/stories', 'bg-madinah2'],
  ['/kids', 'bg-quran'], ['/more', 'bg-arch'], ['/settings', 'bg-arch'], ['/plus', 'bg-madinah2'], ['/cards', 'bg-quran'],
]
export function heroFor(path: string): string {
  let best = ''
  let id = 'bg-arch'
  for (const [p, img] of HERO) if ((path === p || path.startsWith(p + '/')) && p.length > best.length) { best = p; id = img }
  return id
}

/**
 * المعلم الديني البارز في دولة المستخدم — فقط حين تتوفر لدينا صورة حقيقية له؛ وإلا صورة دينية عامة.
 * السعودية: الكعبة المشرفة (والمدينة المنورة: المسجد النبوي)، وتركيا والإمارات: مسجد من صور صاحب التطبيق.
 * دول أخرى (فلسطين: المسجد الأقصى، مصر: الأزهر...) تُضاف حين تصل صورها.
 */
const LANDMARK: Record<string, { photo: string; name: string }> = {
  SA: { photo: 'bg-kaaba', name: 'المسجد الحرام' },
  TR: { photo: 'bg-mosque', name: 'مسجد' },
  AE: { photo: 'bg-arch', name: 'مسجد' },
}
export function landmarkFor(country: string | undefined | null, city?: string | null): { photo: string; name: string } | null {
  // المدينة المنورة: المسجد النبوي
  if (country?.toUpperCase() === 'SA' && city && /madina|medina|المدينة/i.test(city)) return { photo: 'bg-madinah', name: 'المسجد النبوي' }
  return (country && LANDMARK[country.toUpperCase()]) || null
}

/** صور مصغرة لأقسام الأذكار كما في التصميم */
export const ADHKAR_THUMB: Record<string, string> = {
  morning: 'p43', evening: 'p08', sleep: 'p31', waking: 'nature-04', 'after-prayer': 'p22', home: 'p12',
  food: 'p32', travel: 'nature-09', mosque: 'islamic-14', misc: 'nature-02', salawat: 'p03',
}
