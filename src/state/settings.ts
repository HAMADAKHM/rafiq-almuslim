// إعدادات المستخدم: تُحفظ محليًا في IndexedDB.
// أي حقل جديد يُدمج مع القيم الافتراضية في mergeSettings حتى لا تتأثر إعدادات الإصدارات السابقة.
import { DEFAULT_PRAYER_SETTINGS, type PrayerName, type PrayerSettings } from '../services/prayer'

export interface SavedLocation {
  name: string
  nameAr?: string
  country: string
  lat: number
  lng: number
  tz: string
  source: 'city' | 'gps' | 'manual'
}

export type PrayerKey = Exclude<PrayerName, 'sunrise'>

export interface NotificationSettings {
  /** المفتاح العام لكل التذكيرات */
  enabled: boolean
  perPrayer: Record<PrayerKey, boolean>
  /** إشعار عند دخول وقت الصلاة */
  atAdhan: boolean
  /** دقائق التنبيه قبل الأذان (0 = بدون تنبيه مسبق) */
  minutesBefore: number
  morningAdhkar: string | null // "HH:MM"
  eveningAdhkar: string | null
  sleepAdhkar: string | null
  ayahOfDay: string | null
  dhikrOfDay: string | null
  wird: string | null
  memorize: string | null
  occasions: string | null
  dailySummary: string | null
  /** تقليل الإشعارات: الصلاة عند الأذان وتذكير الورد فقط */
  reduce: boolean
  quiet: { enabled: boolean; start: string; end: string }
}

/** طريقة العرض: متتابعة (آية بآية)، صفحات المصحف، أو التركيز (آية واحدة في الشاشة) */
export type ReaderMode = 'flow' | 'mushaf' | 'focus'
export type ReaderBg = 'cream' | 'ivory' | 'white' | 'sepia' | 'green' | 'night'
/** إطار الصفحة: زخرفي كلاسيكي أو بسيط */
export type ReaderFrame = 'classic' | 'plain'
/** خطوط عربية مرخّصة (SIL OFL) تدعم علامات الضبط القرآنية */
export type QuranFont = 'amiri-quran' | 'scheherazade' | 'noto-naskh'

export const QURAN_FONTS: { id: QuranFont; label: string; family: string; note: string }[] = [
  { id: 'amiri-quran', label: 'أميري قرآن', family: '"Amiri Quran", "Amiri", serif', note: 'نسخي مصمم للمصحف' },
  { id: 'scheherazade', label: 'شهرزاد', family: '"Scheherazade New", "Amiri Quran", serif', note: 'نسخي واضح بحروف كبيرة' },
  { id: 'noto-naskh', label: 'نسخ حديث', family: '"Noto Naskh Arabic", "Amiri Quran", serif', note: 'خط حديث بسيط' },
]
export type HomeCardId = 'continue' | 'khatma' | 'adhkar' | 'ayah' | 'quick' | 'summary' | 'dedication' | 'shortcuts'

export interface Settings {
  theme: 'system' | 'light' | 'dark'
  lang: 'ar' | 'en'
  uiScale: number
  quranFontSize: number
  readerMode: ReaderMode
  readerBg: ReaderBg
  readerFrame: ReaderFrame
  quranFont: QuranFont
  /** ترجمة تُعرض تحت الآيات ('none' أو معرّف الترجمة) */
  translation: 'none' | 'en-sahih'
  adhkarFontScale: number
  location: SavedLocation | null
  prayer: PrayerSettings
  notifications: NotificationSettings
  hijriOffset: number
  reciterId: string
  tafsir: string
  showFooterDedication: boolean
  homeCards: { id: HomeCardId; visible: boolean }[]
  /** اختصارات الوصول السريع في الرئيسية (مسارات من أقسام التطبيق) */
  quickLinks: string[]
  /** الانتقال تلقائيًا إلى الذكر التالي عند اكتمال العدد */
  adhkarAutoAdvance: boolean
  /** عرض الأذكار: جلسة (ذكر واحد في الشاشة) أو قائمة */
  adhkarView: 'session' | 'list'
  /** اهتزاز خفيف عند عدّ الأذكار */
  adhkarVibrate: boolean
  /** إبقاء الشاشة مضاءة أثناء القراءة */
  keepAwake: boolean
  /** متابعة أداء الصلوات (اختيارية، تُحفظ على الجهاز فقط) */
  trackPrayers: boolean
}

export const QUICK_LINK_CHOICES = ['/tasbih', '/qibla', '/duas', '/calendar', '/adhkar', '/quran', '/listen', '/prayer', '/wird', '/memorize', '/learn', '/my-adhkar', '/search', '/progress', '/reminders']
export const DEFAULT_QUICK_LINKS = ['/tasbih', '/qibla', '/duas', '/calendar']
export const MAX_QUICK_LINKS = 8

export const HOME_CARD_LABELS: Record<HomeCardId, string> = {
  continue: 'أكمل قراءتك',
  khatma: 'ورد القرآن',
  adhkar: 'أذكار الوقت',
  ayah: 'آية اليوم',
  quick: 'وصول سريع',
  summary: 'إنجاز اليوم',
  dedication: 'بطاقة الإهداء',
  shortcuts: 'الاختصارات',
}

/** بطاقة الإهداء جزء ثابت من هوية التطبيق: يمكن تغيير موضعها لا إخفاؤها. */
export const LOCKED_HOME_CARDS: HomeCardId[] = ['dedication']

export const DEFAULT_HOME_CARDS: Settings['homeCards'] = (['continue', 'khatma', 'adhkar', 'summary', 'ayah', 'quick', 'dedication', 'shortcuts'] as HomeCardId[]).map((id) => ({ id, visible: true }))

export const DEFAULT_NOTIFICATIONS: NotificationSettings = {
  enabled: false,
  perPrayer: { fajr: true, dhuhr: true, asr: true, maghrib: true, isha: true },
  atAdhan: true,
  minutesBefore: 0,
  morningAdhkar: null,
  eveningAdhkar: null,
  sleepAdhkar: null,
  ayahOfDay: null,
  dhikrOfDay: null,
  wird: null,
  memorize: null,
  occasions: null,
  dailySummary: null,
  reduce: false,
  quiet: { enabled: false, start: '23:00', end: '05:00' },
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  lang: 'ar',
  uiScale: 1,
  quranFontSize: 30,
  readerMode: 'flow',
  readerBg: 'cream',
  readerFrame: 'classic',
  quranFont: 'amiri-quran',
  translation: 'none',
  adhkarFontScale: 1,
  location: null,
  prayer: DEFAULT_PRAYER_SETTINGS,
  notifications: DEFAULT_NOTIFICATIONS,
  hijriOffset: 0,
  reciterId: 'alafasy',
  tafsir: 'ar-tafsir-muyassar',
  showFooterDedication: true,
  homeCards: DEFAULT_HOME_CARDS,
  quickLinks: DEFAULT_QUICK_LINKS,
  adhkarAutoAdvance: true,
  adhkarView: 'session',
  adhkarVibrate: true,
  keepAwake: true,
  trackPrayers: false,
}

/** يضمن أن قائمة بطاقات الرئيسية تحتوي كل البطاقات المعروفة مرة واحدة، وأن البطاقات المقفلة ظاهرة */
export function normalizeHomeCards(cards: Settings['homeCards'] | undefined): Settings['homeCards'] {
  const known = new Set(DEFAULT_HOME_CARDS.map((c) => c.id))
  const seen = new Set<HomeCardId>()
  const out: Settings['homeCards'] = []
  for (const c of cards ?? []) {
    if (!known.has(c.id) || seen.has(c.id)) continue
    seen.add(c.id)
    out.push({ id: c.id, visible: LOCKED_HOME_CARDS.includes(c.id) ? true : c.visible })
  }
  for (const c of DEFAULT_HOME_CARDS) if (!seen.has(c.id)) out.push(c)
  return out
}

/** دمج آمن مع القيم الافتراضية (يحافظ على إعدادات الإصدار 0.1) */
export function mergeSettings(saved: Partial<Settings> | null | undefined): Settings {
  const s = saved ?? {}
  return {
    ...DEFAULT_SETTINGS,
    ...s,
    prayer: { ...DEFAULT_SETTINGS.prayer, ...s.prayer, adjustments: { ...DEFAULT_SETTINGS.prayer.adjustments, ...s.prayer?.adjustments } },
    notifications: {
      ...DEFAULT_NOTIFICATIONS,
      ...s.notifications,
      perPrayer: { ...DEFAULT_NOTIFICATIONS.perPrayer, ...s.notifications?.perPrayer },
      quiet: { ...DEFAULT_NOTIFICATIONS.quiet, ...s.notifications?.quiet },
    },
    homeCards: normalizeHomeCards(s.homeCards),
    quickLinks: normalizeQuickLinks(s.quickLinks),
  }
}

export function normalizeQuickLinks(links: string[] | undefined): string[] {
  if (!Array.isArray(links)) return DEFAULT_QUICK_LINKS
  const out = [...new Set(links.filter((l) => QUICK_LINK_CHOICES.includes(l)))].slice(0, MAX_QUICK_LINKS)
  return out.length ? out : DEFAULT_QUICK_LINKS
}
