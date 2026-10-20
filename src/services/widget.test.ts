import { describe, expect, it } from 'vitest'
import { buildWidgetData, WIDGET_DAYS } from './widget'
import { DEFAULT_SETTINGS } from '../state/settings'

const nablus = { name: 'Nablus', nameAr: 'نابلس', country: 'PS', lat: 32.2211, lng: 35.2544, tz: 'Asia/Hebron', source: 'city' as const }

describe('بيانات الودجت', () => {
  it('بلا مدينة: لا مواقيت', () => {
    expect(buildWidgetData(DEFAULT_SETTINGS)).toEqual({ v: 1, city: null, days: [] })
  })
  it('سبعة أيام بخمس صلوات مرتبة، ومنسقة بتوقيت المدينة', () => {
    const d = buildWidgetData({ ...DEFAULT_SETTINGS, location: nablus }, new Date('2026-10-20T09:00:00Z'))
    expect(d.city).toBe('نابلس')
    expect(d.days).toHaveLength(WIDGET_DAYS)
    for (const day of d.days) {
      expect(day.prayers.map((p) => p.key)).toEqual(['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'])
      const at = day.prayers.map((p) => p.at)
      expect([...at].sort((a, b) => a - b)).toEqual(at)
    }
    // العصر في نابلس 20 أكتوبر 2026 = 3:35 م (نفس ما تعرضه صفحة المواقيت)
    expect(d.days[0].prayers[2].time).toMatch(/3:35/)
    expect(d.days[1].prayers[0].at - d.days[0].prayers[0].at).toBeGreaterThan(23 * 3600e3)
  })
})
