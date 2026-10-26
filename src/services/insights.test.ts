import { describe, expect, it } from 'vitest'
import { computeInsights } from './insights'

const read = (date: string, surah: number, from: number, to: number, hour = 6) => ({ date, surah, from, to, ayahs: to - from + 1, pages: [], at: Date.UTC(2026, 9, 1, hour) })
const counts = [7, 286, ...Array(112).fill(5)]

describe('إحصاءات بلس', () => {
  it('المتتالية الحالية والأطول، والأيام النشطة', () => {
    const i = computeInsights({ read: [read('2026-10-20', 1, 1, 7), read('2026-10-21', 1, 1, 2), read('2026-10-24', 2, 1, 5), read('2026-10-25', 2, 6, 9)], listen: [], adhkar: [{ date: '2026-10-26', category: 'morning', at: 0 }], memo: [] }, '2026-10-26', counts, () => 6)
    expect(i.activeDays).toBe(5)
    expect(i.currentStreak).toBe(3)
    expect(i.longestStreak).toBe(3)
    expect(i.heat).toHaveLength(84)
    expect(i.heat[83]).toEqual({ date: '2026-10-26', level: 1 })
  })
  it('المتتالية تبقى إن لم يُسجَّل شيء اليوم بعد', () => {
    const i = computeInsights({ read: [read('2026-10-24', 1, 1, 1), read('2026-10-25', 1, 1, 1)], listen: [], adhkar: [], memo: [] }, '2026-10-26', counts)
    expect(i.currentStreak).toBe(2)
  })
  it('الآيات المختلفة والسور المكتملة دون تكرار', () => {
    const i = computeInsights({ read: [read('2026-10-01', 1, 1, 4), read('2026-10-02', 1, 3, 7), read('2026-10-02', 2, 1, 3)], listen: [], adhkar: [], memo: [] }, '2026-10-26', counts)
    expect(i.uniqueAyat).toBe(10)
    expect(i.surahsCompleted).toBe(1)
  })
  it('الأذكار في آخر 30 يومًا وأوقات القراءة والقراء', () => {
    const i = computeInsights({
      read: [read('2026-10-01', 1, 1, 1, 5), read('2026-10-01', 1, 2, 2, 22), read('2026-10-01', 1, 3, 3, 1)],
      listen: [{ date: '2026-10-01', reciter: 'husary', surah: 1, ayah: 1, at: 0 }, { date: '2026-10-01', reciter: 'husary', surah: 1, ayah: 2, at: 0 }, { date: '2026-10-01', reciter: 'alafasy', surah: 1, ayah: 3, at: 0 }],
      adhkar: [{ date: '2026-10-25', category: 'morning', at: 0 }, { date: '2026-10-25', category: 'morning', at: 1 }, { date: '2026-10-20', category: 'morning', at: 0 }, { date: '2026-09-01', category: 'evening', at: 0 }],
      memo: [],
    }, '2026-10-26', counts, (at) => new Date(at).getUTCHours())
    expect(i.adhkar30).toEqual([{ category: 'morning', days: 2 }])
    expect(i.readingTimes[0].count).toBe(1)
    expect(i.readingTimes[4].count).toBe(2)
    expect(i.topReciters[0]).toEqual({ reciter: 'husary', ayat: 2 })
  })
})
