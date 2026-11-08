import { describe, expect, it } from 'vitest'
import { activeRule, dedicationText, DEFAULT_PREMIUM, describeWhen, nextFromPlaylist, nightDim, normalizePremium, occasionsOn, orderReciters, pixelShift, ruleMatches, swapSides, type ScheduleCtx, type ScheduleRule } from './premium'
import type { DayTimes } from '../services/prayer'

const d = (h: number, m = 0) => new Date(2026, 10, 8, h, m)
const times = { fajr: d(5), sunrise: d(6, 30), dhuhr: d(12), asr: d(15), maghrib: d(17, 30), isha: d(19) } as DayTimes
const ctx = (h: number, m = 0, extra: Partial<ScheduleCtx> = {}): ScheduleCtx => ({ now: d(h, m), hour: h, weekday: 0, times, occasions: [], ...extra })
const rule = (id: string, when: ScheduleRule['when']): ScheduleRule => ({ id, when, on: true, show: { scene: 'kaaba', galleryCat: 'all' } })

describe('جداول العرض الذكية', () => {
  it('الساعات: داخل المدى وعبر منتصف الليل', () => {
    expect(ruleMatches({ kind: 'hours', from: 6, to: 12 }, ctx(8))).toBe(true)
    expect(ruleMatches({ kind: 'hours', from: 6, to: 12 }, ctx(12))).toBe(false)
    expect(ruleMatches({ kind: 'hours', from: 22, to: 4 }, ctx(23))).toBe(true)
    expect(ruleMatches({ kind: 'hours', from: 22, to: 4 }, ctx(3))).toBe(true)
    expect(ruleMatches({ kind: 'hours', from: 22, to: 4 }, ctx(10))).toBe(false)
  })
  it('حول وقت الصلاة: قبلها وبعدها بالدقائق', () => {
    const w = { kind: 'prayer' as const, prayer: 'asr' as const, before: 10, after: 20 }
    expect(ruleMatches(w, ctx(14, 51))).toBe(true)
    expect(ruleMatches(w, ctx(15, 19))).toBe(true)
    expect(ruleMatches(w, ctx(15, 21))).toBe(false)
    expect(ruleMatches({ ...w, prayer: 'all' }, ctx(11, 55))).toBe(true)
  })
  it('الليل من العشاء حتى الفجر', () => {
    expect(ruleMatches({ kind: 'night' }, ctx(20))).toBe(true)
    expect(ruleMatches({ kind: 'night' }, ctx(4))).toBe(true)
    expect(ruleMatches({ kind: 'night' }, ctx(9))).toBe(false)
  })
  it('الأخص أولًا: المناسبة قبل الصلاة قبل الليل قبل الأيام قبل الساعات', () => {
    const rules = [rule('h', { kind: 'hours', from: 0, to: 0 }), rule('w', { kind: 'weekday', days: [5] }), rule('n', { kind: 'night' }), rule('p', { kind: 'prayer', prayer: 'isha', before: 5, after: 5 }), rule('o', { kind: 'occasion', occ: 'ramadan' })]
    expect(activeRule(rules, ctx(10))?.id).toBe('h')
    expect(activeRule(rules, ctx(10, 0, { weekday: 5 }))?.id).toBe('w')
    expect(activeRule(rules, ctx(21, 0, { weekday: 5 }))?.id).toBe('n')
    expect(activeRule(rules, ctx(19, 2))?.id).toBe('p')
    expect(activeRule(rules, ctx(19, 2, { occasions: ['ramadan'] }))?.id).toBe('o')
    expect(activeRule(rules.map((r) => ({ ...r, on: false })), ctx(10))).toBeNull()
  })
  it('المناسبات من التاريخ الهجري', () => {
    expect(occasionsOn({ year: 1448, month: 9, day: 1 }, 2)).toEqual(['ramadan'])
    expect(occasionsOn({ year: 1448, month: 10, day: 2 }, 5)).toEqual(['eid_fitr', 'friday'])
    expect(occasionsOn({ year: 1448, month: 12, day: 9 }, 1)).toEqual(['hajj', 'dhul_hijjah_ten'])
    expect(occasionsOn({ year: 1448, month: 12, day: 10 }, 1)).toEqual(['eid_adha', 'hajj', 'dhul_hijjah_ten'])
    expect(occasionsOn({ year: 1448, month: 1, day: 10 }, 3)).toEqual(['ashura'])
  })
  it('وصف عربي لكل جدول', () => {
    expect(describeWhen({ kind: 'hours', from: 6, to: 12 })).toBe('من 06:00 إلى 12:00')
    expect(describeWhen({ kind: 'weekday', days: [5, 0] })).toBe('الأحد، الجمعة')
  })
})

describe('حماية الشاشة (OLED)', () => {
  it('الإزاحة تدور على 9 مواضع صغيرة وتتوقف عند الإيقاف', () => {
    const seen = new Set<string>()
    for (let k = 0; k < 9; k++) { const p = pixelShift(new Date(k * 120_000), true); seen.add(`${p.x},${p.y}`); expect(Math.abs(p.x)).toBeLessThanOrEqual(0.45) }
    expect(seen.size).toBe(9)
    expect(pixelShift(new Date(), false)).toEqual({ x: 0, y: 0 })
    expect(swapSides(3, true)).toBe(true)
    expect(swapSides(3, false)).toBe(false)
  })
  it('تعتيم الليل بعد العشاء بنصف ساعة حتى قبل الفجر بنصف ساعة', () => {
    expect(nightDim(d(19, 20), times, true, 0.4)).toBe(0)
    expect(nightDim(d(19, 31), times, true, 0.4)).toBe(0.4)
    expect(nightDim(d(4, 20), times, true, 0.4)).toBe(0.4)
    expect(nightDim(d(4, 40), times, true, 0.4)).toBe(0)
    expect(nightDim(d(23), times, false, 0.4)).toBe(0)
  })
})

describe('التلاوة والإهداء', () => {
  it('قائمة السور تدور، ودونها السورة التالية', () => {
    const next = (s: number) => s + 1
    expect(nextFromPlaylist(18, [], next)).toBe(19)
    expect(nextFromPlaylist(18, [18, 36, 67], next)).toBe(36)
    expect(nextFromPlaylist(67, [18, 36, 67], next)).toBe(18)
    expect(nextFromPlaylist(2, [18, 36], next)).toBe(18)
  })
  it('المفضلون أولًا دون حذف أي قارئ', () => {
    expect(orderReciters(['a', 'b', 'c', 'd'], ['c', 'a'])).toEqual(['a', 'c', 'b', 'd'])
  })
  it('الإهداء يظهر بالاسم ويُخفى', () => {
    expect(dedicationText({ on: true, name: ' أبو محمد ', deceased: true })).toBe('صدقة جارية عن روح أبو محمد — نسألكم الدعاء')
    expect(dedicationText({ on: false, name: 'x', deceased: true })).toBeNull()
    expect(dedicationText({ on: true, name: '  ', deceased: true })).toBeNull()
  })
  it('الإعدادات الناقصة أو الخاطئة تعود للقيم الآمنة', () => {
    expect(normalizePremium(null)).toEqual(DEFAULT_PREMIUM)
    const n = normalizePremium({ quran: { speed: 9, playlist: [0, 18, 200, 36], fav: ['husary', 3] }, oled: { dimLevel: 5 }, schedule: { on: true, rules: [{ when: { kind: 'bad' }, show: { scene: 'kaaba' } }, { id: 'x', when: { kind: 'hours', from: 30, to: 2 }, show: { scene: 'gallery', galleryCat: 'nature' } }] } })
    expect(n.quran).toEqual({ speed: 1, playlist: [18, 36], fav: ['husary'] })
    expect(n.oled.dimLevel).toBe(0.7)
    expect(n.schedule.rules).toEqual([{ id: 'x', on: true, when: { kind: 'hours', from: 23, to: 2 }, show: { scene: 'gallery', galleryCat: 'nature' } }])
  })
})
