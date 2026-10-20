// بيانات ودجت الشاشة الرئيسية (Android): مواقيت 7 أيام محسوبة مسبقًا ومنسقة بتوقيت المدينة،
// لأن الودجت لا يشغّل JavaScript. يختار الودجت الصلاة القادمة بنفسه ويُحدَّث عند كل فتح للتطبيق.
import { PRAYER_LABELS, prayerTimesFor } from './prayer'
import { addDays, dateParts, dayKey, formatHijri, formatTime } from '../lib/dates'
import { ayahOfDay } from './daily'
import { toArabicDigits } from '../lib/arabic'
import type { QuranData } from './quran'
import type { PrayerKey, Settings } from '../state/settings'

export const WIDGET_DAYS = 7
const FIVE: PrayerKey[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha']

export interface WidgetData {
  v: 1
  city: string | null
  days: { hijri: string; prayers: { key: PrayerKey; label: string; at: number; time: string }[] }[]
}

export function buildWidgetData(settings: Settings, now = new Date()): WidgetData {
  const loc = settings.location
  if (!loc) return { v: 1, city: null, days: [] }
  const days = Array.from({ length: WIDGET_DAYS }, (_, i) => {
    const date = addDays(now, i)
    const times = prayerTimesFor(loc, dateParts(date, loc.tz), settings.prayer)
    return {
      hijri: formatHijri(date, loc.tz, settings.hijriOffset),
      prayers: FIVE.map((key) => ({ key, label: PRAYER_LABELS[key], at: times[key].getTime(), time: formatTime(times[key], loc.tz) })),
    }
  })
  return { v: 1, city: loc.nameAr ?? loc.name, days }
}

// ---------- ودجت «آية اليوم والورد» ----------
export const DAILY_AYAH_MAX_CHARS = 200

export interface DailyWidgetData {
  v: 1
  /** آية كل يوم للأيام السبعة القادمة (بتاريخ المدينة)؛ النص من المصحف كما هو، ويُترك فارغًا إن طال عن مساحة الودجت بدل قصّه */
  days: { date: string; text: string | null; ref: string }[]
  /** حالة الورد عند آخر فتح للتطبيق */
  wird: { date: string; label: string; done: boolean; percent: number } | null
}

export function buildDailyWidgetData(
  quran: Pick<QuranData, 'verses' | 'meta'>,
  wird: { from: number; to: number; doneToday: boolean; percent: number } | null,
  tz: string | undefined,
  now = new Date(),
): DailyWidgetData {
  const days = Array.from({ length: WIDGET_DAYS }, (_, i) => {
    const date = dayKey(addDays(now, i), tz)
    const a = ayahOfDay(date)
    const text = quran.verses[a.surah - 1][a.ayah - 1]
    return { date, text: text.length <= DAILY_AYAH_MAX_CHARS ? text : null, ref: `سورة ${quran.meta.surahs[a.surah - 1].name} • الآية ${toArabicDigits(a.ayah)}` }
  })
  const w = wird ? { date: dayKey(now, tz), label: `الصفحات ${wird.from}–${wird.to}`, done: wird.doneToday, percent: Math.round(Math.max(0, Math.min(100, wird.percent))) } : null
  return { v: 1, days, wird: w }
}
