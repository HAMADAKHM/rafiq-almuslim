// منطق شاشة التلفاز: الإعدادات المحلية، وحالة الشاشة (عادية / الأذان / انتظار الإقامة).
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
}

const KEY = 'rafiq-tv:settings'
export function loadTv(): TvSettings {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || 'null') as Partial<TvSettings> | null
    if (!raw) return DEFAULT_TV
    return { ...DEFAULT_TV, ...raw, prayer: { ...DEFAULT_TV.prayer, ...raw.prayer, adjustments: { ...DEFAULT_TV.prayer.adjustments, ...raw.prayer?.adjustments } }, iqama: { ...DEFAULT_TV.iqama, ...raw.iqama } }
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

/** فرق توقيت المنطقة عن غرينتش بالدقائق في لحظة معينة */
export function tzOffsetMinutes(tz: string, at: Date): number {
  const p = new Intl.DateTimeFormat('en-US', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(at)
  const n = (t: string) => Number(p.find((x) => x.type === t)?.value)
  const local = Date.UTC(n('year'), n('month') - 1, n('day'), n('hour') % 24, n('minute'))
  return Math.round((local - Math.floor(at.getTime() / 60_000) * 60_000) / 60_000)
}

/**
 * المنطقة الزمنية للعرض مع التوقيت الصيفي/الشتوي اليدوي: إن كان نظام التلفاز لا يعرف تغيير الساعة
 * في بلدك يُقدَّم العرض أو يُؤخَّر ساعة (المواقيت نفسها تُحسب فلكيًا ولا تتغير، والأذان في وقته الحقيقي).
 */
export function shiftedTz(tz: string, shiftMin: number, at: Date): string {
  if (!shiftMin) return tz
  try {
    const off = tzOffsetMinutes(tz, at) + shiftMin
    if (off % 60 !== 0) return tz
    const h = off / 60
    return h === 0 ? 'Etc/GMT' : `Etc/GMT${h > 0 ? '-' : '+'}${Math.abs(h)}`
  } catch { return tz }
}
