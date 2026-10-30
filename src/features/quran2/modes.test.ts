import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { MODES, DEFAULT_PREFS, hideHarakat, resolveLook } from './modes'

describe('القارئ الجديد: الأوضاع', () => {
  it('سبعة أوضاع، لكل منها تنسيق مختلف لا لون فقط', () => {
    expect(MODES.map((m) => m.id)).toEqual(['classic', 'comfortable', 'senior', 'dark', 'tajweed', 'kids', 'translation'])
    // المصحف الملوّن بشكل الكلاسيكي نفسه، ويختلف بألوان التجويد (حين تتوفر بياناتها الموثقة)
    const others = MODES.filter((m) => m.id !== 'tajweed')
    const sig = new Set(others.map((m) => `${m.layout}|${m.size}|${m.simple}|${m.paper}`))
    expect(sig.size).toBe(others.length)
    expect(MODES.find((m) => m.id === 'senior')!.maxSize).toBeGreaterThanOrEqual(64)
  })
  it('تجاوزات المستخدم تُطبَّق، والحجم لا يتجاوز حدود الوضع', () => {
    const l = resolveLook({ ...DEFAULT_PREFS, mode: 'senior', size: 500, paper: 'night' })
    expect(l.size).toBe(72)
    expect(l.paper).toBe('#111827')
    expect(resolveLook({ ...DEFAULT_PREFS, mode: 'translation' }).translation).toBe(true)
  })
  it('إخفاء الحركات للعرض فقط: الحروف والألف الخنجرية والمد وعلامات الوقف باقية', () => {
    // البقرة: 2 من ملف المصحف (لا يُكتب النص القرآني يدويًا في الشيفرة)
    const t = JSON.parse(readFileSync('public/data/quran/quran.json', 'utf8')).verses[1][1] as string
    const h = hideHarakat(t)
    expect(h).toContain('\u0670')
    expect(h).toContain('\u06DB')
    expect(h).not.toMatch(/[\u064B-\u0652]/)
    expect(h.replace(/[^\u0621-\u064A\u0671]/g, '')).toBe(t.replace(/[^\u0621-\u064A\u0671]/g, ''))
  })
})
