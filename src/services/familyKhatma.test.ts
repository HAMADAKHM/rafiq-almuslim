import { describe, expect, it } from 'vitest'
import { distribute, juzOf, newFamilyKhatma, shareMessage } from './familyKhatma'

describe('ختمة العائلة', () => {
  it('توزيع الأجزاء الثلاثين متتالية ومتوازنة', () => {
    for (const n of [1, 3, 4, 7, 30]) {
      const d = distribute(n)
      expect(d).toHaveLength(30)
      const counts = Array.from({ length: n }, (_, m) => d.filter((x) => x === m).length)
      expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1)
      expect([...d].sort((a, b) => a - b)).toEqual(d)
    }
  })
  it('الرسالة تذكر كل فرد وأجزاءه والإهداء', () => {
    const k = newFamilyKhatma('ختمة العائلة', 'عن روح الوالد رحمه الله', ['أحمد', ' ', 'محمد', 'سارة'], '2026-10-26')
    expect(k.members).toEqual(['أحمد', 'محمد', 'سارة'])
    expect(juzOf(k, 0)).toEqual(Array.from({ length: 10 }, (_, i) => i + 1))
    const msg = shareMessage(k, (j) => `بداية ${j}`)
    expect(msg).toContain('عن روح الوالد رحمه الله')
    expect(msg).toContain('أحمد: الأجزاء ١–١٠')
    expect(msg).toContain('سارة: الأجزاء ٢١–٣٠')
  })
})
