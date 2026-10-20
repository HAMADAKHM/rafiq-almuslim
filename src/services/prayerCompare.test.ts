import { describe, expect, it } from 'vitest'
import { adjustmentsFromDiffs, compareOfficial, minutesInTz, type DayTimes } from './prayer'

const tz = 'Asia/Hebron'
// 2026-10-20 بتوقيت فلسطين (UTC+3 صيفي)
const at = (h: number, m: number) => new Date(Date.UTC(2026, 9, 20, h - 3, m))
const times: DayTimes = { fajr: at(4, 40), sunrise: at(6, 0), dhuhr: at(11, 30), asr: at(14, 50), maghrib: at(17, 15), isha: at(18, 35) }

describe('مقارنة المواقيت بالتقويم الرسمي', () => {
  it('الدقائق في منطقة المدينة', () => {
    expect(minutesInTz(at(4, 40), tz)).toBe(280)
  })
  it('يحسب الفرق للحقول المُدخلة فقط', () => {
    expect(compareOfficial(times, { fajr: '04:43', isha: '18:30', dhuhr: '' }, tz)).toEqual({ fajr: 3, isha: -5 })
    expect(compareOfficial(times, { fajr: 'خطأ' }, tz)).toEqual({})
  })
  it('يطبّق الفروق فوق التعديلات الحالية ويرفض الفروق الكبيرة', () => {
    const cur = { fajr: 1, sunrise: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 }
    const r = adjustmentsFromDiffs(cur, { fajr: 3, maghrib: 45 })
    expect(r.adjustments.fajr).toBe(4)
    expect(r.adjustments.maghrib).toBe(0)
    expect(r.tooLarge).toEqual(['maghrib'])
  })
})
