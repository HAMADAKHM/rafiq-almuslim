import { describe, expect, it } from 'vitest'
import { createPlan, weekStats, type KhatmaPlan } from './khatma'

const base = (patch: Partial<KhatmaPlan>): KhatmaPlan => ({ ...createPlan({ name: 'ختمة', mode: 'pages', targetDays: 30, pagesPerDay: 4, startPage: 1, today: '2026-10-01' }), ...patch })

describe('هدف الأسبوع في الختمة', () => {
  it('يجمع قراءة آخر 7 أيام فقط ويحسب الأيام النشطة', () => {
    const p = base({ nextPage: 31, log: [
      { date: '2026-10-10', from: 1, to: 10 }, // قبل الأسبوع
      { date: '2026-10-14', from: 11, to: 14 },
      { date: '2026-10-16', from: 15, to: 22 },
      { date: '2026-10-20', from: 23, to: 30 },
    ] })
    const w = weekStats(p, '2026-10-20')
    expect(w.read).toBe(4 + 8 + 8)
    expect(w.activeDays).toBe(3)
    expect(w.target).toBe(28) // 4 صفحات × 7
  })
  it('الهدف لا يتجاوز ما تبقى من الختمة', () => {
    const p = base({ nextPage: 600, pagesPerDay: 10, log: [] })
    expect(weekStats(p, '2026-10-20').target).toBe(5)
  })
})
