// وضع رمضان وتذكيرات الصيام (رفيق بلس)
import { afterEach, describe, expect, it } from 'vitest'
import { nextRamadanEvent, ramadanStatus, ramadanTable } from './ramadan'
import { buildSchedule } from './reminders'
import { toHijri } from './calendar'
import { addDays } from '../lib/dates'
import { mergeSettings } from '../state/settings'
import { setPlusActive } from '../billing/active'

const loc = { name: 'Nablus', nameAr: 'نابلس', country: 'PS', lat: 32.2211, lng: 35.2544, tz: 'Asia/Hebron', source: 'city' as const }
const base = mergeSettings({ location: loc, notifications: { ...mergeSettings(null).notifications, enabled: true } })
const now = new Date('2026-10-26T09:00:00Z')

afterEach(() => setPlusActive(false))

describe('وضع رمضان', () => {
  it('قبل رمضان: عدد الأيام وتاريخ البداية في أول رمضان', () => {
    const st = ramadanStatus(now, loc.tz)
    expect(st.inRamadan).toBe(false)
    expect(st.daysUntil).toBeGreaterThan(60)
    expect(toHijri(st.start, loc.tz)).toMatchObject({ month: 9, day: 1 })
  })
  it('جدول الشهر: الفجر قبل المغرب، والإمساك قبل الفجر بالدقائق المختارة', () => {
    const st = ramadanStatus(now, loc.tz)
    const t = ramadanTable(base, st.start, 10)
    expect(t.length).toBeGreaterThanOrEqual(29)
    expect(t.length).toBeLessThanOrEqual(30)
    for (const d of t) { expect(d.fajr < d.maghrib).toBe(true); expect(d.fajr.getTime() - d.imsak!.getTime()).toBe(600_000) }
    expect(ramadanTable(base, st.start, 0)[0].imsak).toBeNull()
    expect(nextRamadanEvent(t, new Date(t[0].fajr.getTime() - 1000))).toMatchObject({ kind: 'suhoor' })
    expect(nextRamadanEvent(t, new Date(t[0].fajr.getTime() + 1000))).toMatchObject({ kind: 'iftar' })
  })
  it('تذكيرات السحور والإفطار في رمضان فقط ومع اشتراك فقط', () => {
    const st = ramadanStatus(now, loc.tz)
    const inside = addDays(st.start, 3)
    expect(buildSchedule(base, inside, 2).filter((r) => r.kind === 'ramadan')).toHaveLength(0)
    setPlusActive(true)
    const r = buildSchedule(base, inside, 2).filter((x) => x.kind === 'ramadan')
    expect(r.map((x) => x.title)).toContain('وقت السحور')
    expect(r.map((x) => x.title)).toContain('اقترب موعد الإفطار')
    expect(buildSchedule(base, now, 3).filter((x) => x.kind === 'ramadan')).toHaveLength(0)
  })
})

describe('تذكيرات الصيام', () => {
  const quiet = { ...base.notifications, perPrayer: { fajr: false, dhuhr: false, asr: false, maghrib: false, isha: false }, morningAdhkar: null, eveningAdhkar: null, sleepAdhkar: null, ayahOfDay: null, dhikrOfDay: null, wird: null, memorize: null, dailySummary: null, occasions: null }
  const s = mergeSettings({ ...base, notifications: quiet as typeof base.notifications, fasting: { enabled: true, time: '21:00', beed: true, monThu: true, arafah: true, ashura: true, shawwal: true } })
  it('الأيام البيض والاثنين والخميس في الليلة السابقة، مع اشتراك فقط', () => {
    expect(buildSchedule(s, now, 7).filter((r) => r.kind === 'fasting')).toHaveLength(0)
    setPlusActive(true)
    const f = buildSchedule(s, now, 30).filter((r) => r.kind === 'fasting')
    expect(f.some((r) => r.title === 'غدًا من الأيام البيض')).toBe(true)
    expect(f.some((r) => r.title === 'غدًا الخميس' || r.title === 'غدًا الاثنين')).toBe(true)
    for (const r of f) expect(new Intl.DateTimeFormat('en-GB', { timeZone: loc.tz, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(r.at)).toBe('21:00')
  })
  it('لا تذكير بالصيام قبل يوم العيد', () => {
    setPlusActive(true)
    const st = ramadanStatus(now, loc.tz)
    const lastNights = addDays(st.start, 27)
    const f = buildSchedule(s, lastNights, 6).filter((r) => r.kind === 'fasting')
    for (const r of f) { const h = toHijri(addDays(r.at, 1), loc.tz); expect(h.month === 10 && h.day === 1).toBe(false) }
  })
})
