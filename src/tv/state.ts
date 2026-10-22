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
