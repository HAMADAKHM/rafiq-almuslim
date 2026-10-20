import { describe, expect, it } from 'vitest'
import { buildDailyWidgetData, DAILY_AYAH_MAX_CHARS } from './widget'
import { ayahOfDay } from './daily'

const surahs = Array.from({ length: 114 }, (_, i) => ({ n: i + 1, name: `س${i + 1}` }))
const verses = Array.from({ length: 114 }, (_, s) => Array.from({ length: 300 }, (_, a) => (s === 1 ? 'ط'.repeat(DAILY_AYAH_MAX_CHARS + 1) : `آية ${s + 1}:${a + 1}`)))
const quran = { verses, meta: { surahs } } as never

describe('ودجت آية اليوم والورد', () => {
  it('سبعة أيام بآية كل يوم من المصحف كما هي، والطويلة لا تُقصّ', () => {
    const d = buildDailyWidgetData(quran, null, 'Asia/Hebron', new Date('2026-10-20T09:00:00Z'))
    expect(d.days).toHaveLength(7)
    expect(d.days[0].date).toBe('2026-10-20')
    const a = ayahOfDay('2026-10-20')
    if (a.surah === 2) expect(d.days[0].text).toBeNull()
    else expect(d.days[0].text).toBe(`آية ${a.surah}:${a.ayah}`)
    for (const x of d.days) expect(x.text === null || x.text.length <= DAILY_AYAH_MAX_CHARS).toBe(true)
    expect(d.wird).toBeNull()
  })
  it('حالة الورد ونسبة الختمة', () => {
    const d = buildDailyWidgetData(quran, { from: 45, to: 54, doneToday: true, percent: 8.6 }, 'Asia/Hebron', new Date('2026-10-20T09:00:00Z'))
    expect(d.wird).toEqual({ date: '2026-10-20', label: 'الصفحات 45–54', done: true, percent: 9 })
  })
})
