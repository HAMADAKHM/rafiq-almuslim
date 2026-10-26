import { describe, expect, it } from 'vitest'
import { expectedFinish, newMemoPlan, nextPortion, planOrder, planProgress, remainingAyat } from './memoPlan'

const counts = Array.from({ length: 114 }, (_, i) => (i === 113 ? 6 : i === 112 ? 5 : i === 111 ? 4 : 10))

describe('خطة الحفظ الذكية', () => {
  it('ترتيب السور صعودًا من الناس', () => {
    expect(planOrder(114, 112)).toEqual([114, 113, 112])
    expect(planOrder(1, 3)).toEqual([1, 2, 3])
  })
  it('حصة اليوم تعبر السور، والموضع يتقدم', () => {
    const p = newMemoPlan(114, 112, 3, counts, '2026-10-26') // 15 آية في 3 أيام
    expect(p.ayahsPerDay).toBe(5)
    const a = nextPortion(p, counts)
    expect(a.portion).toEqual([{ surah: 114, from: 1, to: 5 }])
    const b = nextPortion({ ...p, cursor: a.cursor }, counts)
    expect(b.portion).toEqual([{ surah: 114, from: 6, to: 6 }, { surah: 113, from: 1, to: 4 }])
    expect(remainingAyat({ ...p, cursor: b.cursor }, counts)).toBe(5)
    const c = nextPortion({ ...p, cursor: b.cursor }, counts)
    expect(c.portion).toEqual([{ surah: 113, from: 5, to: 5 }, { surah: 112, from: 1, to: 4 }])
    expect(planProgress({ ...p, cursor: c.cursor }, counts)).toBe(1)
    expect(nextPortion({ ...p, cursor: c.cursor }, counts).portion).toEqual([])
  })
  it('الموعد المتوقع للختم', () => {
    const p = newMemoPlan(114, 112, 3, counts, '2026-10-26')
    expect(expectedFinish(p, counts, '2026-10-26')).toBe('2026-10-28')
  })
})
