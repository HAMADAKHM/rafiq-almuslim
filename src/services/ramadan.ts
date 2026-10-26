// وضع رمضان (رفيق بلس): مواقيت السحور والإفطار لكل يوم من الشهر، والعدّ التنازلي، وتذكيرات السحور والإفطار.
// بداية الشهر محسوبة بتقويم أم القرى مع تعديل المستخدم، والعبرة برؤية الهلال في بلده.
import { addDays, dateParts, dayKey } from '../lib/dates'
import { toHijri, type HijriDate } from './calendar'
import { prayerTimesFor } from './prayer'
import type { Settings } from '../state/settings'

export interface RamadanStatus {
  inRamadan: boolean
  hijri: HijriDate
  /** يوم رمضان الحالي (1–30) */
  day: number | null
  /** أيام متبقية حتى أول رمضان القادم (بحسب التقويم المحسوب) */
  daysUntil: number | null
  /** تاريخ أول يوم من رمضان (الحالي أو القادم) */
  start: Date
}

export function ramadanStatus(now: Date, tz: string | undefined, hijriOffset = 0): RamadanStatus {
  const h = toHijri(now, tz, hijriOffset)
  if (h.month === 9) return { inRamadan: true, hijri: h, day: h.day, daysUntil: null, start: addDays(now, -(h.day - 1)) }
  for (let i = 1; i < 400; i++) {
    const d = addDays(now, i)
    const x = toHijri(d, tz, hijriOffset)
    if (x.month === 9 && x.day === 1) return { inRamadan: false, hijri: h, day: null, daysUntil: i, start: d }
  }
  return { inRamadan: false, hijri: h, day: null, daysUntil: null, start: now }
}

export interface RamadanDay { key: string; date: Date; day: number; imsak: Date | null; fajr: Date; maghrib: Date }

/** جدول أيام الشهر: الإمساك الاحتياطي (اختياري)، والفجر = نهاية السحور، والمغرب = الإفطار */
export function ramadanTable(settings: Settings, start: Date, imsakMinutes: number): RamadanDay[] {
  const loc = settings.location
  if (!loc) return []
  const out: RamadanDay[] = []
  for (let i = 0; i < 30; i++) {
    const date = addDays(start, i)
    const h = toHijri(date, loc.tz, settings.hijriOffset)
    if (i > 0 && h.month !== 9) break
    const t = prayerTimesFor(loc, dateParts(date, loc.tz), settings.prayer)
    out.push({ key: dayKey(date, loc.tz), date, day: i + 1, imsak: imsakMinutes > 0 ? new Date(t.fajr.getTime() - imsakMinutes * 60_000) : null, fajr: t.fajr, maghrib: t.maghrib })
  }
  return out
}

/** الحدث القادم: نهاية السحور (الفجر) أو الإفطار (المغرب) */
export function nextRamadanEvent(table: RamadanDay[], now: Date): { kind: 'suhoor' | 'iftar'; at: Date } | null {
  for (const d of table) {
    if (d.fajr > now) return { kind: 'suhoor', at: d.fajr }
    if (d.maghrib > now) return { kind: 'iftar', at: d.maghrib }
  }
  return null
}
