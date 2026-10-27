// منطق شاشة التلفاز: الإعدادات المحلية، وحالة الشاشة (عادية / الأذان / انتظار الإقامة).
import { SCENES, type SceneId } from './scenes'
import { DEFAULT_PRAYER_SETTINGS, type DayTimes, type PrayerName, type PrayerSettings } from '../services/prayer'
import type { City } from '../services/cities'

export type TvPrayer = Exclude<PrayerName, 'sunrise'>
export const TV_PRAYERS: TvPrayer[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha']

export interface TvSettings {
  city: Pick<City, 'name' | 'nameAr' | 'country' | 'lat' | 'lng' | 'tz'> | null
  prayer: PrayerSettings
  /** تشغيل الأذان عند دخول الوقت */
  adhan: boolean
  /** دقائق انتظار الإقامة بعد الأذان لكل صلاة (0 = لا يُعرض عدّاد الإقامة) */
  iqama: Record<TvPrayer, number>
  /** نظام الساعة */
  hour12: boolean
  /** التلاوة: مشغّلة أم لا، ووضعها، والقارئ، وسورة البدء، ومستوى الصوت (0–1) */
  reciteOn: boolean
  reciteMode: 'ayah' | 'surah' | 'adhkar'
  reciterId: string
  reciteSurah: number
  reciteVolume: number
  /** التوقيت الصيفي/الشتوي يدويًا بالدقائق (0 = تلقائي حسب المدينة، 60 = تقديم ساعة، -60 = تأخير ساعة) */
  clockShift: number
  /** خلفية متحركة: طيور تحلّق وغيوم تسير ببطء (يمكن إيقافها في التلفزيونات البطيئة) */
  animate: boolean
  /** مشهد الشاشة: 'rotate' تنقل في القائمة، أو مشهد واحد، أو 'classic' (الرسم الأصلي بالطيور) */
  scene: SceneId | 'rotate' | 'classic'
  /** قائمة المشاهد المفضلة للتنقل (فارغة = كل المشاهد) */
  playlist: SceneId[]
  /** دقائق كل مشهد في التنقل */
  rotateMin: number
  shuffle: boolean
  /** الجودة: تلقائي (1080)، اقتصادي للأجهزة الضعيفة، عالية حتى 4K */
  quality: 'auto' | 'eco' | 'high'
}

export const DEFAULT_TV: TvSettings = {
  city: null,
  prayer: DEFAULT_PRAYER_SETTINGS,
  adhan: true,
  iqama: { fajr: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 },
  hour12: true,
  reciteOn: false,
  reciteMode: 'surah',
  reciterId: 'husary',
  reciteSurah: 2,
  reciteVolume: 0.5,
  clockShift: 0,
  animate: true,
  scene: 'rotate',
  playlist: [],
  rotateMin: 10,
  shuffle: true,
  quality: 'auto',
}

const KEY = 'rafiq-tv:settings'
export function loadTv(): TvSettings {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || 'null') as Partial<TvSettings> | null
    if (!raw) return DEFAULT_TV
    return normalizeTv(raw)
  } catch { return DEFAULT_TV }
}

/** دمج آمن مع القيم الافتراضية (للتخزين ولأوامر الجوال) */
export function normalizeTv(raw: Partial<TvSettings>): TvSettings {
  try {
    const playlist = Array.isArray(raw.playlist) ? raw.playlist.filter((x): x is SceneId => SCENES.some((sc) => sc.id === x)) : []
    const scene = raw.scene === 'rotate' || raw.scene === 'classic' || SCENES.some((sc) => sc.id === raw.scene) ? raw.scene! : DEFAULT_TV.scene
    return { ...DEFAULT_TV, ...raw, scene, playlist, prayer: { ...DEFAULT_TV.prayer, ...raw.prayer, adjustments: { ...DEFAULT_TV.prayer.adjustments, ...raw.prayer?.adjustments } }, iqama: { ...DEFAULT_TV.iqama, ...raw.iqama } }
  } catch { return DEFAULT_TV }
}
export function saveTv(s: TvSettings) { try { localStorage.setItem(KEY, JSON.stringify(s)) } catch { /* التخزين غير متاح */ } }

/** مدة عرض شاشة الأذان بعد دخول الوقت */
export const ADHAN_SCREEN_MS = 4 * 60_000

export type TvPhase =
  | { kind: 'normal' }
  | { kind: 'adhan'; prayer: TvPrayer; at: Date }
  | { kind: 'iqama'; prayer: TvPrayer; at: Date }

/**
 * حالة الشاشة الآن: «الأذان» في الدقائق الأولى بعد دخول الوقت، ثم «الإقامة» حتى موعدها إن ضُبطت دقائقها.
 */
export function tvPhase(now: Date, times: DayTimes, iqama: Record<TvPrayer, number>): TvPhase {
  const t = now.getTime()
  for (const p of TV_PRAYERS) {
    const at = times[p].getTime()
    const iq = at + iqama[p] * 60_000
    if (t >= at && t < at + ADHAN_SCREEN_MS && (iqama[p] === 0 || t < iq)) return { kind: 'adhan', prayer: p, at: times[p] }
    if (iqama[p] > 0 && t >= at && t < iq) return { kind: 'iqama', prayer: p, at: new Date(iq) }
  }
  return { kind: 'normal' }
}

/** فرق توقيت المنطقة عن غرينتش بالدقائق في لحظة معينة (يعمل في متصفحات التلفزيونات القديمة) */
export function tzOffsetMinutes(tz: string, at: Date): number {
  // en-US رقمي: «10/25/2026, 18:49» — دون formatToParts وhourCycle (غير متوفرين في المتصفحات القديمة)
  const txt = new Intl.DateTimeFormat('en-US', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).format(at)
  const m = txt.replace(/[^\d/:, ]/g, '').match(/(\d+)\/(\d+)\/(\d+),?\s*(\d+):(\d+)/)
  if (!m) throw new Error('tz format')
  const local = Date.UTC(Number(m[3]), Number(m[1]) - 1, Number(m[2]), Number(m[4]) % 24, Number(m[5]))
  return Math.round((local - Math.floor(at.getTime() / 60_000) * 60_000) / 60_000)
}

/**
 * مناطق ثابتة الفرق بلا توقيت صيفي، بأسماء «منطقة/مدينة» (المتصفحات القديمة لا تقبل Etc/GMT±N).
 */
const FIXED_ZONES: Record<number, string> = {
  [-5]: 'America/Bogota', [-4]: 'America/La_Paz', [-3]: 'America/Argentina/Buenos_Aires', [-1]: 'Atlantic/Cape_Verde',
  0: 'Africa/Abidjan', 1: 'Africa/Lagos', 2: 'Africa/Johannesburg', 3: 'Asia/Riyadh', 4: 'Asia/Dubai', 5: 'Asia/Karachi',
  6: 'Asia/Dhaka', 7: 'Asia/Bangkok', 8: 'Asia/Singapore', 9: 'Asia/Tokyo', 10: 'Australia/Brisbane',
}

function zoneWorks(tz: string): boolean {
  try { new Intl.DateTimeFormat('en-US', { timeZone: tz }).format(new Date()); return true } catch { return false }
}

/**
 * المنطقة الزمنية للعرض مع التوقيت الصيفي/الشتوي اليدوي: إن كان نظام التلفاز لا يعرف تغيير الساعة
 * في بلدك يُقدَّم العرض أو يُؤخَّر ساعة (المواقيت نفسها تُحسب فلكيًا ولا تتغير، والأذان في وقته الحقيقي).
 * إن تعذر ذلك على المتصفح تبقى منطقة المدينة كما هي، ولا تتوقف الشاشة أبدًا.
 */
export function shiftedTz(tz: string, shiftMin: number, at: Date): string {
  if (!shiftMin) return tz
  try {
    const off = tzOffsetMinutes(tz, at) + shiftMin
    if (off % 60 !== 0) return tz
    const zone = FIXED_ZONES[off / 60]
    if (zone && zoneWorks(zone) && tzOffsetMinutes(zone, at) === off) return zone
  } catch { /* متصفح قديم */ }
  return tz
}
