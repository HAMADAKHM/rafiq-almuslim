// تحويل التاريخ بين الهجري والميلادي، ومواعيد رمضان والعيدين القادمة
import { describe, expect, it } from 'vitest'
import { fromHijri, hijriMonthLength, toHijri, upcomingYearlyDates } from './calendar'

describe('تحويل التاريخ', () => {
  it('ذهابًا وإيابًا على مدى سنوات', () => {
    for (let t = Date.UTC(2020, 0, 1, 12); t < Date.UTC(2040, 0, 1); t += 37 * 86_400_000) {
      const h = toHijri(new Date(t), 'UTC')
      expect(fromHijri(h.year, h.month, h.day)?.toISOString().slice(0, 10)).toBe(new Date(t).toISOString().slice(0, 10))
    }
  })
  it('قيم معروفة من تقويم أم القرى', () => {
    expect(fromHijri(1445, 9, 1)?.toISOString().slice(0, 10)).toBe('2024-03-11')
    expect(fromHijri(1446, 10, 1)?.toISOString().slice(0, 10)).toBe('2025-03-30')
  })
  it('يوم غير موجود ومدخلات خاطئة', () => {
    const m = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].find((x) => hijriMonthLength(1447, x) === 29)!
    expect(fromHijri(1447, m, 30)).toBeNull()
    expect(fromHijri(1447, 13, 1)).toBeNull()
    expect(fromHijri(1447, 1, 0)).toBeNull()
  })
  it('رمضان والعيدان لعشر سنوات بالترتيب، والفطر بعد رمضان بـ29 أو 30 يومًا', () => {
    const rows = upcomingYearlyDates(new Date(Date.UTC(2026, 9, 29)), 10)
    expect(rows).toHaveLength(10)
    for (const r of rows) {
      const len = (r.fitr!.getTime() - r.ramadan!.getTime()) / 86_400_000
      expect(len === 29 || len === 30).toBe(true)
      expect((r.adha!.getTime() - r.arafah!.getTime()) / 86_400_000).toBe(1)
    }
    expect(rows[0].hijriYear).toBe(1448)
  })
})
