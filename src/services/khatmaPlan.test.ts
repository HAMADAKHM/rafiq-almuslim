import { describe, expect, it } from 'vitest'
import { createPlan, extendPlan, juzProgress, pagesForMinutes, scheduleStatus } from './khatma'

// أول صفحة في كل جزء وفق مصحف المدينة (يُختبر التطابق مع البيانات الفعلية أدناه)
import fs from 'node:fs'
import path from 'node:path'
const meta = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../public/data/quran/meta.json'), 'utf8'))
const juzStart: number[] = []
for (let g = 0; g < meta.juz.length; g++) if (juzStart[meta.juz[g] - 1] === undefined) juzStart[meta.juz[g] - 1] = meta.page[g]

describe('مخطط الختمة', () => {
  it('بداية الأجزاء من بيانات المصحف: الجزء 2 من الصفحة 22، والجزء 30 من 582', () => {
    expect(juzStart[0]).toBe(1)
    expect(juzStart[1]).toBe(22)
    expect(juzStart[29]).toBe(582)
  })
  it('الجزء الحالي والأجزاء المكتملة', () => {
    const p = { ...createPlan({ mode: 'days', targetDays: 30, today: '2026-10-01' }), nextPage: 45 }
    expect(juzProgress(p, juzStart)).toEqual({ current: 3, completed: 2 })
    expect(juzProgress({ ...p, nextPage: 1 }, juzStart)).toEqual({ current: 1, completed: 0 })
  })
  it('الدقائق اليومية إلى صفحات (متوسط تقديري قابل للتعديل)', () => {
    expect(pagesForMinutes(20)).toBe(10)
    expect(pagesForMinutes(20, 4)).toBe(5)
    expect(pagesForMinutes(1)).toBe(1)
  })
  it('خطة متأخرة: يُقترح تمديد بدل مضاعفة الورد', () => {
    const p = createPlan({ mode: 'days', targetDays: 30, today: '2026-10-01' })
    // مضى 15 يومًا ولم يُقرأ شيء
    const s = scheduleStatus(p, '2026-10-16')
    expect(s.originalPace).toBe(21)
    expect(s.behind).toBe(true)
    expect(s.currentPace).toBeGreaterThan(30)
    const ext = extendPlan(p, s.extendDays)
    const after = scheduleStatus(ext, '2026-10-16')
    expect(after.behind).toBe(false)
    expect(after.currentPace).toBeLessThanOrEqual(21)
  })
  it('خطة في موعدها لا تُعرض كمتأخرة', () => {
    const p = { ...createPlan({ mode: 'days', targetDays: 30, today: '2026-10-01' }), nextPage: 106, log: [{ date: '2026-10-05', from: 1, to: 105 }] }
    expect(scheduleStatus(p, '2026-10-06').behind).toBe(false)
  })
})
