import { describe, expect, it } from 'vitest'
import { buildExtraWidgetData, dhikrText, WIDGET_DAYS } from './widget'
import { ADHKAR } from '../content/adhkar'

// بيانات مصحف مصغرة: آيات بنص معروف لكل سورة
const quran = {
  verses: Array.from({ length: 114 }, (_, s) => Array.from({ length: 300 }, (_, a) => `آية ${s + 1}:${a + 1}`)),
  meta: { surahs: Array.from({ length: 114 }, (_, i) => ({ name: `س${i + 1}` })) },
} as never

describe('بيانات ودجتات الأذكار والدعاء و«الكل في واحد»', () => {
  const d = buildExtraWidgetData(quran, 'Asia/Hebron', new Date('2026-11-07T09:00:00Z'))
  it('أذكار الصباح والمساء والنوم بنصها وعددها ومصدرها كما في التطبيق', () => {
    for (const k of ['morning', 'evening', 'sleep'] as const) {
      expect(d.adhkar[k].length).toBeGreaterThan(3)
      for (const x of d.adhkar[k]) { expect(x.t.length).toBeGreaterThan(0); expect(x.c).toBeGreaterThanOrEqual(1); expect(x.s.length).toBeGreaterThan(0) }
    }
    const first = ADHKAR.find((c) => c.id === 'morning')!.items.find((i) => i.text)!
    expect(d.adhkar.morning.some((x) => x.t === first.text && x.s === first.source)).toBe(true)
  })
  it('أذكار القرآن تُؤخذ من المصحف نفسه، ولا يُخترع نص لعنصر بلا نص', () => {
    expect(dhikrText({ id: 'x', kind: 'quran', source: 'البقرة', quran: [{ surah: 2, from: 255, to: 255 }] } as never, quran)).toBe('آية 2:255')
    expect(dhikrText({ id: 'y', kind: 'quran', source: 'البقرة', quran: [{ surah: 2, from: 255, to: 255 }] } as never, null)).toBeNull()
  })
  it('أدعية بمصادرها، وآيات «آية أخرى» بمرجعها، وذكر اليوم لثلاثين يومًا', () => {
    expect(d.duas.length).toBeGreaterThan(10)
    for (const x of d.duas) expect(x.s.length).toBeGreaterThan(0)
    expect(d.ayat.length).toBeGreaterThan(10)
    expect(d.ayat[0].ref).toMatch(/^سورة س\d+ • الآية/)
    expect(d.dhikrDays).toHaveLength(WIDGET_DAYS)
    expect(d.dhikrDays[0].date).toBe('2026-11-07')
  })
})
