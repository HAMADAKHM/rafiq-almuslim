// إعدادات المستخدم: تُحفظ محليًا في IndexedDB.
// أي حقل جديد يُدمج مع القيم الافتراضية في mergeSettings حتى لا تتأثر إعدادات الإصدارات السابقة.
import { ADHKAR } from '../content/adhkar'
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
  /** صوت الأذان عند دخول الوقت: 'tone' نغمة الإشعار، أو معرّف صوت مدمج، أو 'device' صوت من الجهاز */
  adhanVoice: string
  /** صوت أذان الفجر: 'same' أو أحد الخيارات السابقة */
  fajrVoice: string
  /** تشغيل الأذان كاملًا داخل التطبيق إذا كان مفتوحًا */
  adhanInApp: boolean
  /** شاشة تنبيه الأذكار (الصباح والمساء والنوم) بصوت الذكر عند حلول وقتها أو عند الضغط على الإشعار */
  adhkarScreen: boolean
}

/** طريقة العرض: متتابعة (آية بآية)، صفحات المصحف، أو التركيز (آية واحدة في الشاشة) */
export type ReaderMode = 'flow' | 'mushaf' | 'focus'
export type ReaderBg = 'cream' | 'ivory' | 'white' | 'sepia' | 'green' | 'night' | 'gold'
/** إطار الصفحة: زخرفي كلاسيكي أو بسيط */
export type ReaderFrame = 'classic' | 'plain'
/** خطوط عربية مرخّصة (SIL OFL) تدعم علامات الضبط القرآنية */
export type QuranFont = 'amiri-quran' | 'scheherazade' | 'noto-naskh'

export const QURAN_FONTS: { id: QuranFont; label: string; family: string; note: string }[] = [
  { id: 'amiri-quran', label: 'أميري قرآن', family: '"Amiri Quran", "Amiri", serif', note: 'نسخي مصمم للمصحف' },
  { id: 'scheherazade', label: 'شهرزاد', family: '"Scheherazade New", "Amiri Quran", serif', note: 'نسخي واضح بحروف كبيرة' },
  { id: 'noto-naskh', label: 'نسخ حديث', family: '"Noto Naskh Arabic", "Amiri Quran", serif', note: 'خط حديث بسيط' },
]
export type HomeCardId = 'companion' | 'continue' | 'suggest' | 'khatma' | 'adhkar' | 'ayah' | 'quick' | 'summary' | 'dedication' | 'shortcuts'

export interface Settings {
  /** gold: أسود وذهبي (مبني على الوضع الداكن مع لون ذهبي بدل الأخضر) */
  theme: 'system' | 'light' | 'dark' | 'gold'
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
  /** «رحلتي الإيمانية»: تسجيل سجل القراءة والاستماع وإتمام الأذكار للإحصاءات (على الجهاز فقط). إيقافه لا يحذف السجل السابق */
  trackActivity: boolean
  /** اسم اختياري للتحية في الرئيسية (يبقى على الجهاز) */
  displayName: string
  /** مجموعات الأذكار اليومية الظاهرة في الرئيسية (من أقسام الأذكار الثابتة فقط) */
  dailyAdhkar: string[]
  /** الثيم الغامر ('' = بلا ثيم): مشهد متحرك وألوان وخط. ثيمان مجانيان والباقي مع رفيق بلس */
  skin: string
  /** إيقاف حركة مشهد الثيم (يبقى المشهد ثابتًا) */
  skinStill: boolean
  /** رفيق بلس: لوحة الألوان والخلفية الإضافية ('' = ألوان التطبيق الأصلية). تُطبَّق فقط مع اشتراك ساري */
  plusPalette: string
  /** رفيق بلس: تذكيرات خاصة يكتبها المستخدم (تُجدول فقط مع اشتراك ساري) */
  customReminders: CustomReminder[]
  /** رفيق بلس — وضع رمضان: تذكير السحور قبل الفجر بدقائق، والإفطار قبل المغرب بدقائق (0 = بلا تذكير)، والإمساك الاحتياطي */
  ramadan: { suhoorMinutes: number; iftarMinutes: number; imsakMinutes: number }
  /** رفيق بلس — تذكيرات الصيام (الليلة السابقة): الأيام البيض، والاثنين والخميس، وعرفة، وعاشوراء، وست شوال */
  fasting: { enabled: boolean; time: string; beed: boolean; monThu: boolean; arafah: boolean; ashura: boolean; shawwal: boolean }
  /** أقسام المكتبة التي أخفاها المستخدم من القائمة (تبقى متاحة في البحث وبالرابط المباشر) */
  hiddenCats: string[]
  /** رفيق بلس — «رفيقي يذكّرني»: الذكر الدوري، و«موعدي مع القرآن»، وقرب خروج وقت الصلاة (تُجدول فقط مع اشتراك ساري) */
  companion: CompanionSettings
}

export interface CompanionSettings {
  adhkar: {
    enabled: boolean
    /** الفترة بالدقائق */
    interval: number
    /** ساعات التذكير خلال اليوم HH:MM */
    start: string
    end: string
    /** أيام الأسبوع: 0 الأحد … 6 السبت */
    days: number[]
    /** مجموعات الأذكار المختارة (COMPANION_GROUPS) */
    groups: string[]
    /** false = إشعار مكتوب بلا صوت (الوضع الهادئ) */
    sound: boolean
    /** إيقاف مؤقت حتى هذه اللحظة (ms) أو null */
    pausedUntil: number | null
  }
  quran: {
    enabled: boolean
    /** مواعيد يومية HH:MM (حتى 4) */
    times: string[]
    days: number[]
    amount: { unit: 'pages' | 'ayahs' | 'juz'; value: number }
    /** دقائق «ذكّرني لاحقًا» */
    snoozeMinutes: number
    sound: boolean
  }
  /** بطاقة «رفيقي اليومي» في الرئيسية: العناصر الظاهرة */
  card: { wird: boolean; position: boolean; dhikr: boolean; goal: boolean }
  /** «هدف صغير» يومي: صفحات قرآن (قراءة فعلية) وأذكار مكتملة */
  goal: { pages: number; adhkar: number }
  /** «وضع السفر»: إيقاف الذكر الدوري وموعد القرآن مؤقتًا مع بقاء تذكيرات الصلاة (يُفعّل يدويًا) */
  travel: { enabled: boolean; until: number | null }
  prayerEnd: {
    enabled: boolean
    /** قبل خروج الوقت بكم دقيقة */
    minutesBefore: number
    perPrayer: Record<PrayerKey, boolean>
  }
}

export interface CustomReminder {
  id: string
  /** نص يكتبه المستخدم */
  title: string
  /** HH:MM بتوقيت المدينة */
  time: string
  /** أيام الأسبوع: 0 الأحد … 6 السبت */
  days: number[]
  /** الصفحة التي تُفتح عند الضغط على التذكير */
  route: string
  enabled: boolean
}

export const QUICK_LINK_CHOICES = ['/tasbih', '/qibla', '/duas', '/calendar', '/adhkar', '/quran', '/listen', '/prayer', '/wird', '/memorize', '/learn', '/my-adhkar', '/search', '/progress', '/reminders', '/studio', '/mosques', '/hadith', '/assistant']
// القبلة والمسبحة والختمة أولًا (للمستخدمين الجدد؛ اختيارات المستخدمين الحاليين تبقى كما هي)
export const DEFAULT_QUICK_LINKS = ['/qibla', '/tasbih', '/wird', '/calendar']
export const MAX_QUICK_LINKS = 8
export const DEFAULT_DAILY_ADHKAR = ['morning', 'evening', 'after-prayer', 'sleep']
export const MAX_DAILY_ADHKAR = 6

export const HOME_CARD_LABELS: Record<HomeCardId, string> = {
  companion: 'رفيقي اليومي (بلس)',
  suggest: 'اقتراح اليوم',
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

// الترتيب الافتراضي على هيئة التصميم المعتمد: آية اليوم، ثم الورد والأذكار جنبًا إلى جنب (كل البطاقات ظاهرة)
export const DEFAULT_HOME_CARDS: Settings['homeCards'] = (['companion', 'ayah', 'khatma', 'adhkar', 'continue', 'suggest', 'summary', 'quick', 'dedication', 'shortcuts'] as HomeCardId[]).map((id) => ({ id, visible: true }))

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
  adhanVoice: 'tone',
  fajrVoice: 'same',
  adhanInApp: true,
  adhkarScreen: true,
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  lang: 'ar',
  uiScale: 1,
  quranFontSize: 30,
  readerMode: 'mushaf',
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
  trackActivity: true,
  displayName: '',
  plusPalette: '',
  skin: '',
  skinStill: false,
  customReminders: [],
  ramadan: { suhoorMinutes: 45, iftarMinutes: 10, imsakMinutes: 10 },
  fasting: { enabled: false, time: '21:00', beed: true, monThu: false, arafah: true, ashura: true, shawwal: true },
  dailyAdhkar: DEFAULT_DAILY_ADHKAR,
  hiddenCats: [],
  companion: {
    adhkar: { enabled: false, interval: 60, start: '09:00', end: '21:00', days: [0, 1, 2, 3, 4, 5, 6], groups: ['salawat', 'istighfar', 'sunnah'], sound: true, pausedUntil: null },
    quran: { enabled: false, times: ['21:00'], days: [0, 1, 2, 3, 4, 5, 6], amount: { unit: 'pages', value: 4 }, snoozeMinutes: 15, sound: true },
    prayerEnd: { enabled: false, minutesBefore: 20, perPrayer: { fajr: true, dhuhr: true, asr: true, maghrib: true, isha: true } },
    card: { wird: true, position: true, dhikr: true, goal: true },
    goal: { pages: 1, adhkar: 3 },
    travel: { enabled: false, until: null },
  },
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
  // بطاقة «رفيقي اليومي» الجديدة تظهر في الأعلى لمن لم تكن لديه، دون تغيير ترتيب بطاقاته الأخرى
  if (!seen.has('companion') && cards?.length) { out.unshift({ id: 'companion', visible: true }); seen.add('companion') }
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
    ramadan: { ...DEFAULT_SETTINGS.ramadan, ...s.ramadan },
    fasting: { ...DEFAULT_SETTINGS.fasting, ...s.fasting },
    companion: mergeCompanion(s.companion),
    homeCards: normalizeHomeCards(s.homeCards),
    quickLinks: normalizeQuickLinks(s.quickLinks),
    dailyAdhkar: normalizeDailyAdhkar(s.dailyAdhkar),
  }
}

function mergeCompanion(c: Partial<CompanionSettings> | undefined): CompanionSettings {
  const d = DEFAULT_SETTINGS.companion
  return {
    adhkar: { ...d.adhkar, ...c?.adhkar },
    quran: { ...d.quran, ...c?.quran, amount: { ...d.quran.amount, ...c?.quran?.amount } },
    prayerEnd: { ...d.prayerEnd, ...c?.prayerEnd, perPrayer: { ...d.prayerEnd.perPrayer, ...c?.prayerEnd?.perPrayer } },
    card: { ...d.card, ...c?.card },
    goal: { ...d.goal, ...c?.goal },
    travel: { ...d.travel, ...c?.travel },
  }
}

export function normalizeQuickLinks(links: string[] | undefined): string[] {
  if (!Array.isArray(links)) return DEFAULT_QUICK_LINKS
  const out = [...new Set(links.filter((l) => QUICK_LINK_CHOICES.includes(l)))].slice(0, MAX_QUICK_LINKS)
  return out.length ? out : DEFAULT_QUICK_LINKS
}

/** يُقبل فقط ما يطابق أقسام الأذكار الثابتة الموجودة */
export function normalizeDailyAdhkar(ids: string[] | undefined): string[] {
  if (!Array.isArray(ids)) return DEFAULT_DAILY_ADHKAR
  const known = new Set(ADHKAR.map((c) => c.id))
  const out = [...new Set(ids.filter((x) => known.has(x)))].slice(0, MAX_DAILY_ADHKAR)
  return out.length ? out : DEFAULT_DAILY_ADHKAR
}
