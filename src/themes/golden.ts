// تصميم «رفيق المسلم الذهبي» كما أرسله صاحب التطبيق: صور حقيقية (من صور صاحب التطبيق نفسه)، وبطاقات عاجية
// بإطار ذهبي، وأخضر داكن، وشريط سفلي بزر رئيسية بارز. الصور في public/golden ولا يُرسم أي منها بالكود.
export const GOLDEN_ID = 'e-golden'
export const goldenPhoto = (id: string) => `${import.meta.env.BASE_URL}golden/${id}.jpg`

/** صورة رأس كل صفحة بحسب مسارها (أطول بادئة مطابقة) */
const HERO: [string, string][] = [
  ['/prayer', 'islamic-09'], ['/quran', 'islamic-03'], ['/mushaf', 'islamic-03'], ['/adhkar', 'p04'], ['/duas', 'p13'],
  ['/calendar', 'p05'], ['/date-tools', 'p05'], ['/qibla', 'islamic-04'], ['/hadith', 'p16'], ['/academy', 'islamic-07'],
  ['/kids', 'p15'], ['/tasbih', 'p32'], ['/more', 'p15'], ['/settings', 'p13'], ['/plus', 'p15'], ['/listen', 'islamic-03'],
  ['/learn', 'islamic-07'], ['/library', 'p16'], ['/mosques', 'islamic-08'], ['/ramadan', 'p05'], ['/cards', 'p03'],
]
export function heroFor(path: string): string {
  let best = ''
  let id = 'p03'
  for (const [p, img] of HERO) if ((path === p || path.startsWith(p + '/')) && p.length > best.length) { best = p; id = img }
  return id
}

/**
 * المعلم الديني البارز في دولة المستخدم — فقط حين تتوفر لدينا صورة حقيقية له؛ وإلا صورة دينية عامة.
 * SA: الكعبة المشرفة، AE: مسجد أبيض كبير بقباب (من صور صاحب التطبيق).
 * دول أخرى (فلسطين: المسجد الأقصى، مصر: الأزهر، تركيا: السلطان أحمد...) تُضاف حين تصل صورها.
 */
const LANDMARK: Record<string, { photo: string; name: string }> = {
  SA: { photo: 'islamic-04', name: 'المسجد الحرام' },
  AE: { photo: 'islamic-09', name: 'مسجد' },
}
export function landmarkFor(country: string | undefined | null): { photo: string; name: string } | null {
  return (country && LANDMARK[country.toUpperCase()]) || null
}

/** صور مصغرة لأقسام الأذكار كما في التصميم */
export const ADHKAR_THUMB: Record<string, string> = {
  morning: 'p43', evening: 'p08', sleep: 'p31', waking: 'nature-04', 'after-prayer': 'p22', home: 'p12',
  food: 'p32', travel: 'nature-09', mosque: 'islamic-14', misc: 'nature-02', salawat: 'p03',
}
