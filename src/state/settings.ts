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
  /** إشعار يومي لمشاركة منشور (آية/دعاء/دعاء لمتوفى) يفتح الاستوديو */
  shareDaily?: string | null
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
  /** صوت إشعار أذكار الصباح والمساء والنوم: ذكر بتسجيل «حصن المسلم» بدل النغمة */
  adhkarVoice: boolean
  /** (قديم، يُقرأ للترحيل) من يقرأ الذكر في إشعار الصباح والمساء */
  morningVoice?: TimedVoice
  eveningVoice?: TimedVoice
  /** صوت كل تذكير أذكار: hisn أو device أو mine أو tone (نغمة عادية) */
  voices?: Partial<Record<'morning' | 'evening' | 'sleep' | 'wake' | 'afterPrayer', VoiceOpt>>
  /** أذكار الاستيقاظ (وقت يومي) */
  wakeAdhkar?: string | null
  /** أذكار ما بعد الصلاة: بعد الأذان بدقائق، للصلوات المختارة */
  afterPrayer?: { enabled: boolean; minutes: number; prayers: PrayerKey[] }
  /** أيام الأسبوع لتذكيرات الأذكار (0 الأحد … 6 السبت)؛ غير المحدد = كل الأيام */
  adhkarDays?: Partial<Record<'morning' | 'evening' | 'sleep' | 'wake', number[]>>
  /** اهتزاز إشعارات الأذكار المسموعة */
  vibrate?: boolean
  /** إظهار نص الذكر على شاشة القفل */
  lockText?: boolean
}

/** hisn = تسجيل بشري من حصن المسلم، device = نطق الذكر بمحرك الكلام العربي في الهاتف، mine = تسجيل أضافه المستخدم */
export type TimedVoice = 'hisn' | 'device' | 'mine'
/** snd:<id> = نغمة من «استوديو الأصوات» */
export type VoiceOpt = TimedVoice | 'tone' | `snd:${string}`

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
export type HomeCardId = 'sections' | 'companion' | 'continue' | 'suggest' | 'khatma' | 'adhkar' | 'ayah' | 'quick' | 'summary' | 'dedication' | 'shortcuts'

/** «استوديو أصوات رفيق المسلم» */
export interface AudioStudioSettings {
  volume: number
  muteAll: boolean
  repeat: 'once' | 'loop'
  /** أصوات الطبيعة مع الذكر في الاستوديو، أو بدله، أو بلا */
  natureMode: 'off' | 'with' | 'instead'
  nature: string
  /** النغمة الافتراضية لكل التذكيرات */
  defaultTone: string
  /** نغمة كل مناسبة (بلس) — '' = الافتراضية */
  occasions: { salawat: string; adhkarDone: string }
  tasbih: { clickOn: boolean; click: string; m33: string; m100: string; done: string }
  /** قارئ آيات كل مجموعة أذكار */
  reciters: Partial<Record<'morning' | 'evening' | 'sleep', string>>
  /** تنزيل تسجيلات الأذكار تلقائيًا (لتعمل دون إنترنت) */
  autoDownload?: boolean
}
export const DEFAULT_AUDIO_STUDIO: AudioStudioSettings = {
  volume: 80, muteAll: false, repeat: 'once', natureMode: 'off', nature: 'n_rain', defaultTone: 'chime',
  occasions: { salawat: '', adhkarDone: 'k_done' },
  tasbih: { clickOn: true, click: 'k_click', m33: 'k_33', m100: 'k_100', done: 'k_done' },
  reciters: {},
}

export interface WidgetPrefs { hijri: boolean; greg: boolean; city: boolean; countdown: boolean; font: number; adhkar: 'morning' | 'evening' | 'sleep' | 'auto'; vibrate: boolean; tasbih: string
  /** صوت نقرة عند الضغط على المسبحة والأذكار (يحترم الصامت)، وقوة الاهتزاز، وعدد دورة الذكر الواحد */
  tapSound?: boolean; vibrateLevel?: 'light' | 'strong'; tasbihTarget?: number }
export const DEFAULT_WIDGET_PREFS: WidgetPrefs = { hijri: true, greg: true, city: true, countdown: true, font: 100, adhkar: 'auto', vibrate: true, tasbih: 'seq', tapSound: true, vibrateLevel: 'light', tasbihTarget: 100 }

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
  /** طُبّق التصميم الذهبي افتراضيًا مرة واحدة (بعدها يبقى اختيار المستخدم كما هو) */
  goldenApplied?: boolean
  /** نُقل مرة واحدة إلى التصميم «الليلي الذهبي» المعتمد */
  nightApplied?: boolean
  /** إيقاف حركة مشهد الثيم (يبقى المشهد ثابتًا) */
  skinStill: boolean
  /** رفيق بلس: لوحة الألوان والخلفية الإضافية ('' = ألوان التطبيق الأصلية). تُطبَّق فقط مع اشتراك ساري */
  plusPalette: string
  /** رفيق بلس: تذكيرات خاصة يكتبها المستخدم (تُجدول فقط مع اشتراك ساري) */
  customReminders: CustomReminder[]
  /** الأقسام الثلاثة في وسط الشريط السفلي */
  tabs?: string[]
  /** «استوديو الودجت»: العناصر الظاهرة وحجم الخط ونوع الأذكار والاهتزاز وذكر المسبحة */
  widgetPrefs?: WidgetPrefs
  audioStudio?: AudioStudioSettings
  /** رفيق بلس — وضع رمضان: تذكير السحور قبل الفجر بدقائق، والإفطار قبل المغرب بدقائق (0 = بلا تذكير)، والإمساك الاحتياطي */
  /** theme: وضع رمضان يغيّر ثيم التطبيق كله — 'auto' في شهر رمضان فقط، 'on' دائمًا، 'off' لا */
  ramadan: { suhoorMinutes: number; iftarMinutes: number; imsakMinutes: number; theme?: 'auto' | 'on' | 'off' }
  /** رفيق بلس — تذكيرات الصيام (الليلة السابقة): الأيام البيض، والاثنين والخميس، وعرفة، وعاشوراء، وست شوال */
  fasting: { enabled: boolean; time: string; beed: boolean; monThu: boolean; arafah: boolean; ashura: boolean; shawwal: boolean }
  /** أقسام المكتبة التي أخفاها المستخدم من القائمة (تبقى متاحة في البحث وبالرابط المباشر) */
  hiddenCats: string[]
  /** منبّه الصحوة (Android): منبهات يحددها المستخدم */
  wakeAlarms?: WakeAlarm[]
  /** مناسبات شخصية سنوية (عيد ميلاد، ذكرى زواج…) بتذكير ومنشور للمشاركة */
  personalOccasions?: PersonalOccasion[]
  /** رفيق بلس — «رفيقي يذكّرني»: الذكر الدوري، و«موعدي مع القرآن»، وقرب خروج وقت الصلاة (تُجدول فقط مع اشتراك ساري) */
  companion: CompanionSettings
}

export type WakeVoice = 'asbahna' | 'salawat' | 'tone'
export interface WakeAlarm {
  id: number
  on: boolean
  h: number
  m: number
  /** أيام الأسبوع 0 الأحد … 6 السبت (فارغة = كل يوم) */
  days: number[]
  voice: WakeVoice
  /** اسم ملف النغمة في موارد Android (rafiq_chime / snd_t_*) أو none */
  tone: string
  vibrate: boolean
  /** دقائق الغفوة */
  snooze: number
  label?: string
}

export type OccasionType = 'birthday' | 'wedding' | 'custom'
export interface PersonalOccasion {
  id: number
  type: OccasionType
  /** اسم صاحب المناسبة (يظهر في المنشور) */
  name: string
  /** عنوان المناسبة إن كانت مخصصة */
  title?: string
  month: number
  day: number
  /** سنة البداية (اختيارية) لحساب العمر أو عدد السنوات */
  year?: number
  /** تذكير قبل المناسبة بأيام (0 = يومها) */
  daysBefore: number
  time: string
  /** عنوان المنشور ونصه كما عدّلهما المستخدم، والتوقيع أسفله */
  headline?: string
  post?: string
  sign?: string
  on: boolean
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
    /** يُقرأ الذكر نفسه في الإشعار بتسجيل «حصن المسلم» (بدل نغمة الإشعار) */
    voice: boolean
    /** التناوب بين الأذكار التي لها تسجيل مسموع فقط */
    voicedOnly: boolean
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

export const QUICK_LINK_CHOICES = ['/tasbih', '/qibla', '/duas', '/calendar', '/adhkar', '/quran', '/listen', '/prayer', '/wird', '/memorize', '/learn', '/my-adhkar', '/search', '/progress', '/reminders', '/studio', '/mosques', '/hadith', '/academy', '/kids', '/assistant', '/cards']
// القبلة والمسبحة والختمة أولًا (للمستخدمين الجدد؛ اختيارات المستخدمين الحاليين تبقى كما هي)
export const DEFAULT_QUICK_LINKS = ['/qibla', '/tasbih', '/wird', '/calendar']
export const MAX_QUICK_LINKS = 8
export const DEFAULT_DAILY_ADHKAR = ['morning', 'evening', 'after-prayer', 'sleep']
export const MAX_DAILY_ADHKAR = 6

export const HOME_CARD_LABELS: Record<HomeCardId, string> = {
  sections: 'الأقسام الرئيسية',
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
export const DEFAULT_HOME_CARDS: Settings['homeCards'] = (['companion', 'sections', 'ayah', 'khatma', 'adhkar', 'continue', 'suggest', 'summary', 'quick', 'dedication', 'shortcuts'] as HomeCardId[]).map((id) => ({ id, visible: true }))

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
  adhkarVoice: true,
  // الصباح: «أصبحنا وأصبح الملك لله» بتسجيل حصن المسلم. المساء: لا يوجد تسجيل لـ«أمسينا» في حصن المسلم،
  // فيُنطق بصوت الهاتف العربي (ويعود إلى «بسم الله الذي لا يضر…» البشري إن لم يتوفر صوت عربي)
  morningVoice: 'hisn',
  eveningVoice: 'device',
  voices: {},
  wakeAdhkar: null,
  afterPrayer: { enabled: false, minutes: 10, prayers: ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] },
  adhkarDays: {},
  vibrate: true,
  lockText: true,
}

/**
 * العرض الافتراضي: التصميم الذهبي المعتمد. يُطبَّق مرة واحدة على من كان على الثيم الأصلي، ثم يبقى اختياره.
 * VITE_DEFAULT_SKIN='' يُبقي الأصلي افتراضيًا (تستعمله اختبارات الواجهة القديمة التي تفحص الشكل الأصلي).
 */
const DEFAULT_SKIN: string = (import.meta.env?.VITE_DEFAULT_SKIN as string | undefined) ?? 'e-night'

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
  skin: DEFAULT_SKIN,
  goldenApplied: true,
  nightApplied: true,
  skinStill: false,
  customReminders: [],
  ramadan: { suhoorMinutes: 45, iftarMinutes: 10, imsakMinutes: 10, theme: 'auto' },
  fasting: { enabled: false, time: '21:00', beed: true, monThu: false, arafah: true, ashura: true, shawwal: true },
  dailyAdhkar: DEFAULT_DAILY_ADHKAR,
  hiddenCats: [],
  companion: {
    adhkar: { enabled: false, interval: 60, start: '09:00', end: '21:00', days: [0, 1, 2, 3, 4, 5, 6], groups: ['salawat', 'istighfar', 'sunnah'], sound: true, voice: true, voicedOnly: true, pausedUntil: null },
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
  // «الأقسام الرئيسية» الجديدة تظهر بعد «رفيقي اليومي» لمن لم تكن لديه
  if (!seen.has('sections') && cards?.length) { const i = out.findIndex((c) => c.id === 'companion'); out.splice(i + 1, 0, { id: 'sections', visible: true }); seen.add('sections') }
  for (const c of DEFAULT_HOME_CARDS) if (!seen.has(c.id)) out.push(c)
  return out
}

/** دمج آمن مع القيم الافتراضية (يحافظ على إعدادات الإصدار 0.1) */
export function mergeSettings(saved: Partial<Settings> | null | undefined): Settings {
  const s = saved ?? {}
  return {
    ...DEFAULT_SETTINGS,
    ...s,
    // التصميم الذهبي هو العرض المعتمد: يُطبَّق مرة واحدة على من كان على الثيم الأصلي، ثم يبقى اختياره له
    ...(DEFAULT_SKIN && !s.goldenApplied && (s.skin ?? '') === '' ? { skin: DEFAULT_SKIN, goldenApplied: true } : {}),
    // التصميم «الليلي الذهبي» صار المعتمد: يُنقل إليه مرة واحدة من كان على الذهبي أو الأصلي (ويبقى الذهبي في الثيمات)
    ...(DEFAULT_SKIN && !s.nightApplied && ['', 'e-golden'].includes(s.skin ?? '') ? { skin: DEFAULT_SKIN, goldenApplied: true, nightApplied: true } : {}),
    prayer: { ...DEFAULT_SETTINGS.prayer, ...s.prayer, adjustments: { ...DEFAULT_SETTINGS.prayer.adjustments, ...s.prayer?.adjustments } },
    notifications: {
      ...DEFAULT_NOTIFICATIONS,
      ...s.notifications,
      perPrayer: { ...DEFAULT_NOTIFICATIONS.perPrayer, ...s.notifications?.perPrayer },
      quiet: { ...DEFAULT_NOTIFICATIONS.quiet, ...s.notifications?.quiet },
      afterPrayer: { ...DEFAULT_NOTIFICATIONS.afterPrayer!, ...s.notifications?.afterPrayer },
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
