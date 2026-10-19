import { describe, expect, it } from 'vitest'
import { applyGrade, effectiveStatus, initialSrs, splitRange } from './srs'

describe('جدولة المراجعة (SM-2 مبسطة)', () => {
  const today = '2026-10-19'
  it('مقطع جديد يبدأ بحالة "جديد" ومستحق اليوم', () => {
    const s = initialSrs(today)
    expect(s.status).toBe('new')
    expect(s.due).toBe(today)
  })
  it('التقييم "متقن" مرتين ينقله إلى "محفوظ" بفواصل متزايدة', () => {
    let s = applyGrade(initialSrs(today), 3, today)
    expect(s.status).toBe('learning')
    expect(s.interval).toBe(3)
    s = applyGrade(s, 3, s.due)
    expect(s.status).toBe('memorized')
    expect(s.interval).toBe(6)
    const s3 = applyGrade(s, 2, s.due)
    expect(s3.interval).toBeGreaterThan(6)
  })
  it('"لم أتذكّر" يعيد المقطع للمراجعة غدًا ويقلل السهولة', () => {
    let s = applyGrade(initialSrs(today), 3, today)
    s = applyGrade(s, 3, s.due)
    const f = applyGrade(s, 0, '2026-11-01')
    expect(f.interval).toBe(1)
    expect(f.due).toBe('2026-11-02')
    expect(f.lapses).toBe(1)
    expect(f.status).toBe('review')
    expect(f.ease).toBeLessThan(s.ease)
  })
  it('المحفوظ المستحق يظهر بحالة "يحتاج إلى مراجعة"', () => {
    const s = { ...initialSrs(today), status: 'memorized' as const, due: '2026-10-18' }
    expect(effectiveStatus(s, today)).toBe('review')
    expect(effectiveStatus({ ...s, due: '2026-10-25' }, today)).toBe('memorized')
  })
  it('السهولة لا تنزل تحت 1.3', () => {
    let s = initialSrs(today)
    for (let i = 0; i < 20; i++) s = applyGrade(s, 0, today)
    expect(s.ease).toBeGreaterThanOrEqual(1.3)
  })
  it('تقسيم النطاق إلى مقاطع', () => {
    expect(splitRange(1, 7, 3)).toEqual([[1, 3], [4, 6], [7, 7]])
    expect(splitRange(5, 5, 3)).toEqual([[5, 5]])
  })
})
