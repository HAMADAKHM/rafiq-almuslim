// إحصائيات مبنية فقط على ما سجّله المستخدم فعليًا. لا بيانات افتراضية ولا تقدير للإيمان أو الصلاح.
import type { AdhkarLog, MemoLog, MemoSegment, ReadLog } from '../db/db'
import { shiftDayKey } from '../lib/dates'
import { effectiveStatus, type SegmentStatus } from './srs'

export interface Stats {
  readingDays: number
  ayahsRead: number
  pagesRead: number
  memo: Record<SegmentStatus, number> & { totalAyahs: number; memorizedAyahs: number }
  reviewsDone: number
  adhkarDone: number
  streak: number
}

export function computeStats(read: ReadLog[], memo: MemoSegment[], memoLogs: MemoLog[], adhkar: AdhkarLog[], today: string): Stats {
  const days = new Set(read.map((r) => r.date))
  const pages = new Set<number>()
  // الآيات الفريدة المقروءة لكل يوم (لا نحسب الآية مرتين في اليوم نفسه)
  const perDay = new Map<string, Set<string>>()
  for (const r of read) {
    r.pages.forEach((p) => pages.add(p))
    const set = perDay.get(r.date) ?? new Set()
    for (let a = r.from; a <= r.to; a++) set.add(`${r.surah}:${a}`)
    perDay.set(r.date, set)
  }
  let ayahsRead = 0
  perDay.forEach((s) => (ayahsRead += s.size))

  const memoCounts = { new: 0, learning: 0, memorized: 0, review: 0, totalAyahs: 0, memorizedAyahs: 0 }
  for (const s of memo) {
    const st = effectiveStatus(s, today)
    memoCounts[st]++
    const n = s.to - s.from + 1
    memoCounts.totalAyahs += n
    if (st === 'memorized' || st === 'review') memoCounts.memorizedAyahs += n
  }

  // أيام متتالية من النشاط (قراءة أو مراجعة أو أذكار) تنتهي اليوم أو أمس
  const active = new Set([...days, ...memoLogs.map((l) => l.date), ...adhkar.map((a) => a.date)])
  let streak = 0
  let cursor = active.has(today) ? today : shiftDayKey(today, -1)
  while (active.has(cursor)) { streak++; cursor = shiftDayKey(cursor, -1) }

  return {
    readingDays: days.size,
    ayahsRead,
    pagesRead: pages.size,
    memo: memoCounts,
    reviewsDone: memoLogs.filter((l) => l.kind === 'review').length,
    adhkarDone: adhkar.length,
    streak,
  }
}

/** سلسلة يومية لعدد الآيات المقروءة والمراجعات والأذكار لآخر N يوم */
export function dailySeries(read: ReadLog[], memoLogs: MemoLog[], adhkar: AdhkarLog[], today: string, days: number) {
  const out: { date: string; ayahs: number; reviews: number; adhkar: number }[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = shiftDayKey(today, -i)
    const set = new Set<string>()
    read.filter((r) => r.date === d).forEach((r) => { for (let a = r.from; a <= r.to; a++) set.add(`${r.surah}:${a}`) })
    out.push({ date: d, ayahs: set.size, reviews: memoLogs.filter((l) => l.date === d).length, adhkar: adhkar.filter((a) => a.date === d).length })
  }
  return out
}
