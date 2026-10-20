// مواقيت الصلاة باستخدام مكتبة adhan (MIT) — مكتبة مفتوحة المصدر عالية الدقة ومختبرة،
// تعتمد معادلات "Astronomical Algorithms" لجان ميوس. انظر docs/SOURCES.md.
import { CalculationMethod, Coordinates, HighLatitudeRule, Madhab, PrayerTimes, type CalculationParameters } from 'adhan'
import { addDays, dateParts } from '../lib/dates'

export type PrayerName = 'fajr' | 'sunrise' | 'dhuhr' | 'asr' | 'maghrib' | 'isha'
export const PRAYERS: PrayerName[] = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha']
export const PRAYER_LABELS: Record<PrayerName, string> = {
  fajr: 'الفجر', sunrise: 'الشروق', dhuhr: 'الظهر', asr: 'العصر', maghrib: 'المغرب', isha: 'العشاء',
}

export type MethodId =
  | 'MuslimWorldLeague' | 'Egyptian' | 'Karachi' | 'UmmAlQura' | 'Dubai' | 'MoonsightingCommittee'
  | 'NorthAmerica' | 'Kuwait' | 'Qatar' | 'Singapore' | 'Tehran' | 'Turkey'

export const METHODS: { id: MethodId; label: string; detail: string }[] = [
  { id: 'MuslimWorldLeague', label: 'رابطة العالم الإسلامي', detail: 'الفجر 18°، العشاء 17°' },
  { id: 'Egyptian', label: 'الهيئة المصرية العامة للمساحة', detail: 'الفجر 19.5°، العشاء 17.5°' },
  { id: 'UmmAlQura', label: 'أم القرى (مكة المكرمة)', detail: 'الفجر 18.5°، العشاء بعد المغرب بـ90 دقيقة' },
  { id: 'Karachi', label: 'جامعة العلوم الإسلامية بكراتشي', detail: 'الفجر 18°، العشاء 18°' },
  { id: 'Dubai', label: 'دبي', detail: 'الفجر 18.2°، العشاء 18.2°' },
  { id: 'Kuwait', label: 'الكويت', detail: 'الفجر 18°، العشاء 17.5°' },
  { id: 'Qatar', label: 'قطر', detail: 'الفجر 18°، العشاء بعد المغرب بـ90 دقيقة' },
  { id: 'Turkey', label: 'رئاسة الشؤون الدينية التركية', detail: 'الفجر 18°، العشاء 17° مع تعديلات' },
  { id: 'Tehran', label: 'معهد الجيوفيزياء بطهران', detail: 'الفجر 17.7°، العشاء 14°' },
  { id: 'Singapore', label: 'سنغافورة / ماليزيا / إندونيسيا', detail: 'الفجر 20°، العشاء 18°' },
  { id: 'NorthAmerica', label: 'أمريكا الشمالية (ISNA)', detail: 'الفجر 15°، العشاء 15°' },
  { id: 'MoonsightingCommittee', label: 'لجنة رؤية الهلال', detail: 'حساب موسمي حسب خط العرض' },
]

export interface PrayerSettings {
  method: MethodId
  madhab: 'shafi' | 'hanafi'
  highLat: 'auto' | 'middleofthenight' | 'seventhofthenight' | 'twilightangle'
  /** تعديل يدوي بالدقائق لكل صلاة لمطابقة التقويم المحلي المعتمد */
  adjustments: Record<PrayerName, number>
}

export const DEFAULT_PRAYER_SETTINGS: PrayerSettings = {
  method: 'MuslimWorldLeague',
  madhab: 'shafi',
  highLat: 'auto',
  adjustments: { fajr: 0, sunrise: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 },
}

/**
 * اقتراح طريقة حساب حسب الدولة — اقتراح فقط، يظهر للمستخدم ويمكنه تغييره.
 * لا نعتبره مطابقًا للتقويم الرسمي؛ يُنصح دائمًا بمقارنته بتقويم وزارة الأوقاف المحلية.
 */
export function suggestMethod(country: string): MethodId {
  const map: Record<string, MethodId> = {
    SA: 'UmmAlQura', EG: 'Egyptian', SD: 'Egyptian', LY: 'Egyptian', SY: 'Egyptian', LB: 'Egyptian', IQ: 'Egyptian',
    PK: 'Karachi', IN: 'Karachi', BD: 'Karachi', AF: 'Karachi',
    AE: 'Dubai', KW: 'Kuwait', QA: 'Qatar', TR: 'Turkey', IR: 'Tehran',
    SG: 'Singapore', MY: 'Singapore', ID: 'Singapore', BN: 'Singapore',
    US: 'NorthAmerica', CA: 'NorthAmerica', GB: 'MoonsightingCommittee',
  }
  return map[country] ?? 'MuslimWorldLeague'
}

function buildParams(s: PrayerSettings, lat: number): CalculationParameters {
  const params = CalculationMethod[s.method]()
  params.madhab = s.madhab === 'hanafi' ? Madhab.Hanafi : Madhab.Shafi
  if (s.highLat === 'auto') {
    params.highLatitudeRule = Math.abs(lat) > 48 ? HighLatitudeRule.recommended(new Coordinates(lat, 0)) : HighLatitudeRule.MiddleOfTheNight
  } else {
    params.highLatitudeRule = { middleofthenight: HighLatitudeRule.MiddleOfTheNight, seventhofthenight: HighLatitudeRule.SeventhOfTheNight, twilightangle: HighLatitudeRule.TwilightAngle }[s.highLat]
  }
  // نضيف تعديلات المستخدم فوق تعديلات الطريقة نفسها (مثل تعديل طريقة تركيا)
  for (const p of PRAYERS) params.methodAdjustments[p] = (params.methodAdjustments[p] ?? 0) + (s.adjustments[p] ?? 0)
  return params
}

export type DayTimes = Record<PrayerName, Date>

export interface Place {
  lat: number
  lng: number
  tz: string
}

/** مواقيت يوم محدد (بحسب التقويم المحلي للمدينة). */
export function prayerTimesFor(place: Place, day: { y: number; m: number; d: number }, s: PrayerSettings): DayTimes {
  // adhan يقرأ السنة/الشهر/اليوم من كائن Date محليًا؛ نبنيه من مكونات اليوم في منطقة المدينة.
  const date = new Date(day.y, day.m - 1, day.d)
  const pt = new PrayerTimes(new Coordinates(place.lat, place.lng), date, buildParams(s, place.lat))
  return { fajr: pt.fajr, sunrise: pt.sunrise, dhuhr: pt.dhuhr, asr: pt.asr, maghrib: pt.maghrib, isha: pt.isha }
}

export function todayTimes(place: Place, s: PrayerSettings, now = new Date()): DayTimes {
  return prayerTimesFor(place, dateParts(now, place.tz), s)
}

/** الصلاة القادمة (تُستثنى الشروق لأنه ليس صلاة، لكنه يُعرض في الجدول). */
export function nextPrayer(place: Place, s: PrayerSettings, now = new Date()): { name: PrayerName; time: Date } {
  for (let offset = 0; offset < 3; offset++) {
    const times = prayerTimesFor(place, dateParts(addDays(now, offset), place.tz), s)
    for (const p of PRAYERS) {
      if (p === 'sunrise') continue
      if (times[p].getTime() > now.getTime()) return { name: p, time: times[p] }
    }
  }
  throw new Error('تعذر حساب الصلاة القادمة')
}

/** مواقيت عدة أيام قادمة */
export function upcomingDays(place: Place, s: PrayerSettings, days: number, now = new Date()): { key: { y: number; m: number; d: number }; times: DayTimes }[] {
  const out = []
  for (let i = 0; i < days; i++) {
    // نستخدم الظهيرة لتجنب حدود منتصف الليل عند تغيّر التوقيت الصيفي
    const key = dateParts(addDays(now, i), place.tz)
    out.push({ key, times: prayerTimesFor(place, key, s) })
  }
  return out
}

/** الدقائق منذ منتصف الليل لوقتٍ ما في منطقة المدينة الزمنية */
export function minutesInTz(d: Date, tz: string): number {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(d)
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0)
  return get('hour') * 60 + get('minute')
}

const parseHM = (s: string): number | null => {
  const m = s.trim().match(/^(\d{1,2}):(\d{2})$/)
  if (!m) return null
  const h = Number(m[1]), min = Number(m[2])
  return h < 24 && min < 60 ? h * 60 + min : null
}

/** الفرق بالدقائق بين التوقيت الرسمي الذي أدخله المستخدم والمحسوب (موجب = الرسمي متأخر). تُتجاهل الحقول الفارغة */
export function compareOfficial(times: DayTimes, official: Partial<Record<PrayerName, string>>, tz: string): Partial<Record<PrayerName, number>> {
  const out: Partial<Record<PrayerName, number>> = {}
  for (const p of PRAYERS) {
    const o = parseHM(official[p] ?? '')
    if (o == null) continue
    let diff = o - minutesInTz(times[p], tz)
    if (diff > 720) diff -= 1440
    if (diff < -720) diff += 1440
    out[p] = diff
  }
  return out
}

export const MAX_ADJUSTMENT = 30
/** تعديلات جديدة تطابق التوقيت الرسمي، ضمن ±30 دقيقة (الفرق الأكبر يدل غالبًا على طريقة حساب أو مدينة غير مناسبة) */
export function adjustmentsFromDiffs(current: Record<PrayerName, number>, diffs: Partial<Record<PrayerName, number>>): { adjustments: Record<PrayerName, number>; tooLarge: PrayerName[] } {
  const adjustments = { ...current }
  const tooLarge: PrayerName[] = []
  for (const p of PRAYERS) {
    const d = diffs[p]
    if (d == null) continue
    const next = current[p] + d
    if (Math.abs(next) > MAX_ADJUSTMENT) tooLarge.push(p)
    else adjustments[p] = next
  }
  return { adjustments, tooLarge }
}
