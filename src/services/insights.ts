// إحصاءات رفيق بلس الشخصية: تُحسب على الجهاز فقط من السجل المحلي (القراءة والاستماع والأذكار والحفظ)،
// ولا تُرسل إلى أي جهة. لا مقارنة بالآخرين ولا تقييم للنيات: أرقام تساعد على الاستمرار فقط.
import { shiftDayKey } from '../lib/dates'
import type { AdhkarLog, ListenLog, MemoLog, ReadLog } from '../db/db'

export const TOTAL_AYAT = 6236

export interface Insights {
  activeDays: number
  currentStreak: number
  longestStreak: number
  /** آخر 12 أسبوعًا (84 يومًا) من الأقدم للأحدث: مستوى 0–3 */
  heat: { date: string; level: 0 | 1 | 2 | 3 }[]
  /** آيات مختلفة قُرئت مرة على الأقل */
  uniqueAyat: number
  surahsCompleted: number
  /** أيام إتمام كل قسم من الأذكار في آخر 30 يومًا */
  adhkar30: { category: string; days: number }[]
  /** أوقات القراءة: عدد الجلسات لكل فترة من اليوم */
  readingTimes: { label: string; count: number }[]
  listenedAyat: number
  topReciters: { reciter: string; ayat: number }[]
  memoReviews30: number
}

const PERIODS = [
  { label: 'الفجر والصباح الباكر', from: 3, to: 8 },
  { label: 'الضحى', from: 8, to: 12 },
  { label: 'الظهر والعصر', from: 12, to: 17 },
  { label: 'المغرب', from: 17, to: 20 },
  { label: 'الليل', from: 20, to: 27 },
]

export function computeInsights(
  logs: { read: ReadLog[]; listen: ListenLog[]; adhkar: AdhkarLog[]; memo: MemoLog[] },
  today: string,
  surahCounts: number[],
  hourOf: (at: number) => number = (at) => new Date(at).getHours(),
): Insights {
  const perDay = new Map<string, number>()
  const bump = (d: string) => perDay.set(d, (perDay.get(d) ?? 0) + 1)
  logs.read.forEach((r) => bump(r.date))
  logs.listen.forEach((l) => bump(l.date))
  logs.adhkar.forEach((a) => bump(a.date))
  logs.memo.forEach((m) => bump(m.date))

  // المتتالية الحالية: تُحسب حتى اليوم (أو أمس إن لم يُسجَّل شيء اليوم بعد)
  let currentStreak = 0
  let d = perDay.has(today) ? today : shiftDayKey(today, -1)
  while (perDay.has(d)) { currentStreak++; d = shiftDayKey(d, -1) }
  const days = [...perDay.keys()].sort()
  let longestStreak = 0, run = 0, prev = ''
  for (const k of days) { run = prev && shiftDayKey(prev, 1) === k ? run + 1 : 1; longestStreak = Math.max(longestStreak, run); prev = k }

  const heat = Array.from({ length: 84 }, (_, i) => {
    const date = shiftDayKey(today, i - 83)
    const n = perDay.get(date) ?? 0
    return { date, level: (n === 0 ? 0 : n < 3 ? 1 : n < 6 ? 2 : 3) as 0 | 1 | 2 | 3 }
  })

  const seen = surahCounts.map((c) => new Uint8Array(c + 1))
  for (const r of logs.read) {
    const row = seen[r.surah - 1]
    if (!row) continue
    for (let a = Math.max(1, r.from); a <= Math.min(row.length - 1, r.to); a++) row[a] = 1
  }
  let uniqueAyat = 0, surahsCompleted = 0
  seen.forEach((row) => { let n = 0; for (let a = 1; a < row.length; a++) n += row[a]; uniqueAyat += n; if (n === row.length - 1 && n > 0) surahsCompleted++ })

  const since = shiftDayKey(today, -29)
  const cats = new Map<string, Set<string>>()
  logs.adhkar.filter((a) => a.date >= since && a.date <= today).forEach((a) => { if (!cats.has(a.category)) cats.set(a.category, new Set()); cats.get(a.category)!.add(a.date) })
  const adhkar30 = [...cats.entries()].map(([category, s]) => ({ category, days: s.size })).sort((a, b) => b.days - a.days)

  const readingTimes = PERIODS.map((p) => ({ label: p.label, count: 0 }))
  for (const r of logs.read) {
    let h = hourOf(r.at)
    if (h < 3) h += 24
    const i = PERIODS.findIndex((p) => h >= p.from && h < p.to)
    if (i >= 0) readingTimes[i].count++
  }

  const rec = new Map<string, number>()
  logs.listen.forEach((l) => rec.set(l.reciter, (rec.get(l.reciter) ?? 0) + 1))
  const topReciters = [...rec.entries()].map(([reciter, ayat]) => ({ reciter, ayat })).sort((a, b) => b.ayat - a.ayat).slice(0, 3)

  return {
    activeDays: perDay.size, currentStreak, longestStreak, heat, uniqueAyat, surahsCompleted, adhkar30, readingTimes,
    listenedAyat: logs.listen.length, topReciters, memoReviews30: logs.memo.filter((m) => m.date >= since).length,
  }
}
