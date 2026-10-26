// خطة الحفظ الذكية (رفيق بلس): يختار المستخدم السور وموعد الختم، فتُحسب حصة كل يوم من الآيات الجديدة،
// وتُضاف بعد حفظها إلى نظام المراجعة المتباعدة الموجود (صفحة الحفظ المجانية كما هي).
import { shiftDayKey, daysBetween } from '../lib/dates'

export interface MemoPlan {
  id: string
  /** ترتيب السور في الخطة (مثلًا من الناس صعودًا) */
  order: number[]
  ayahsPerDay: number
  startedAt: string
  /** موضع الحفظ التالي: فهرس السورة في order، والآية */
  cursor: { i: number; ayah: number }
  /** أيام إتمام حصة اليوم */
  log: string[]
}

export interface Portion { surah: number; from: number; to: number }

/** ترتيب السور من سورة إلى سورة (تنازليًا إن كانت البداية بعد النهاية، كمن يبدأ من الناس) */
export function planOrder(fromSurah: number, toSurah: number): number[] {
  const step = fromSurah <= toSurah ? 1 : -1
  const out: number[] = []
  for (let s = fromSurah; s !== toSurah + step; s += step) out.push(s)
  return out
}

export const totalAyat = (order: number[], counts: number[]) => order.reduce((n, s) => n + counts[s - 1], 0)

/** الآيات المتبقية من الموضع الحالي */
export function remainingAyat(p: MemoPlan, counts: number[]): number {
  if (p.cursor.i >= p.order.length) return 0
  return counts[p.order[p.cursor.i] - 1] - p.cursor.ayah + 1 + totalAyat(p.order.slice(p.cursor.i + 1), counts)
}

/** حصة اليوم: الآيات الجديدة التالية مقسّمة على السور، والموضع بعدها */
export function nextPortion(p: MemoPlan, counts: number[]): { portion: Portion[]; cursor: MemoPlan['cursor'] } {
  let { i, ayah } = p.cursor
  let left = p.ayahsPerDay
  const portion: Portion[] = []
  while (left > 0 && i < p.order.length) {
    const s = p.order[i]
    const end = Math.min(counts[s - 1], ayah + left - 1)
    portion.push({ surah: s, from: ayah, to: end })
    left -= end - ayah + 1
    if (end >= counts[s - 1]) { i++; ayah = 1 } else ayah = end + 1
  }
  return { portion, cursor: { i, ayah } }
}

export function ayahsPerDayFor(total: number, days: number) { return Math.max(1, Math.ceil(total / Math.max(1, days))) }

/** الموعد المتوقع للختم بالوتيرة الحالية */
export function expectedFinish(p: MemoPlan, counts: number[], today: string): string {
  const days = Math.ceil(remainingAyat(p, counts) / Math.max(1, p.ayahsPerDay))
  return shiftDayKey(today, Math.max(0, days - (p.log.includes(today) ? 0 : 1)))
}

export function newMemoPlan(fromSurah: number, toSurah: number, days: number, counts: number[], today: string): MemoPlan {
  const order = planOrder(fromSurah, toSurah)
  return { id: Math.random().toString(36).slice(2, 10), order, ayahsPerDay: ayahsPerDayFor(totalAyat(order, counts), days), startedAt: today, cursor: { i: 0, ayah: 1 }, log: [] }
}

export const planProgress = (p: MemoPlan, counts: number[]) => 1 - remainingAyat(p, counts) / Math.max(1, totalAyat(p.order, counts))
export const streakDays = (p: MemoPlan, today: string) => { let n = 0; let d = p.log.includes(today) ? today : shiftDayKey(today, -1); while (p.log.includes(d)) { n++; d = shiftDayKey(d, -1) } return n }
export const planAgeDays = (p: MemoPlan, today: string) => daysBetween(p.startedAt, today) + 1
