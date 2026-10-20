// بيانات ودجت الشاشة الرئيسية (Android): مواقيت 7 أيام محسوبة مسبقًا ومنسقة بتوقيت المدينة،
// لأن الودجت لا يشغّل JavaScript. يختار الودجت الصلاة القادمة بنفسه ويُحدَّث عند كل فتح للتطبيق.
import { PRAYER_LABELS, prayerTimesFor } from './prayer'
import { addDays, dateParts, formatHijri, formatTime } from '../lib/dates'
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
