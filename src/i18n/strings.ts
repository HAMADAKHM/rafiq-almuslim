// نصوص الواجهة. العربية هي اللغة الأساسية؛ الإنجليزية مُعدّة للتنقل والإعدادات تمهيدًا لترجمة كاملة.
export type Lang = 'ar' | 'en'

const STRINGS = {
  home: { ar: 'الرئيسية', en: 'Home' },
  wird: { ar: 'ورد اليوم', en: "Today's Wird" },
  quran: { ar: 'القرآن الكريم', en: 'The Quran' },
  memorize: { ar: 'الحفظ والمراجعة', en: 'Memorize & Review' },
  listen: { ar: 'الاستماع', en: 'Listen' },
  prayer: { ar: 'مواقيت الصلاة', en: 'Prayer Times' },
  qibla: { ar: 'القبلة', en: 'Qibla' },
  adhkar: { ar: 'الأذكار', en: 'Adhkar' },
  duas: { ar: 'الأدعية', en: 'Duas' },
  learn: { ar: 'التفسير والتعلم', en: 'Tafsir & Learning' },
  progress: { ar: 'متابعة التقدم', en: 'Progress' },
  tasbih: { ar: 'المسبحة', en: 'Tasbih' },
  myAdhkar: { ar: 'أذكاري الشخصية', en: 'My Adhkar' },
  studio: { ar: 'استوديو التصاميم', en: 'Ayah Studio' },
  mosques: { ar: 'المساجد القريبة', en: 'Nearby Mosques' },
  calendar: { ar: 'التقويم الإسلامي', en: 'Islamic Calendar' },
  reminders: { ar: 'إعدادات التذكير', en: 'Reminders' },
  journey: { ar: 'ابدأ رحلتك', en: 'Start your journey' },
  search: { ar: 'البحث', en: 'Search' },
  settings: { ar: 'الإعدادات', en: 'Settings' },
  about: { ar: 'عن التطبيق ورسالة الوفاء', en: 'About & Dedication' },
  groupDaily: { ar: 'يومي', en: 'Daily' },
  groupQuran: { ar: 'القرآن', en: 'Quran' },
  groupWorship: { ar: 'العبادات', en: 'Worship' },
  groupMore: { ar: 'المزيد', en: 'More' },
  menu: { ar: 'القائمة', en: 'Menu' },
  appName: { ar: 'رفيق المسلم', en: 'Islamic Companion' },
  tagline: { ar: 'مجاني بالكامل • بلا إعلانات', en: 'Completely free • No ads' },
} as const

export type StringKey = keyof typeof STRINGS

export function t(key: StringKey, lang: Lang = 'ar'): string {
  return STRINGS[key][lang]
}
