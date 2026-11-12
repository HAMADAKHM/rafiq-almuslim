// وضع رمضان: الصلاة «الآن»، والحدث القادم (الإفطار أو السحور)، والعبارات الموثقة بمصادرها.
import { describe, expect, it } from 'vitest'
import { RAMADAN_PHRASES, cd, currentPrayer, ramadanNext } from './RamadanHome'
import { DEFAULT_PRAYER_SETTINGS } from '../../services/prayer'

const day = (h: number, m = 0) => new Date(Date.UTC(2027, 1, 20, h, m))
const times = { fajr: day(3), sunrise: day(4, 30), dhuhr: day(10), asr: day(13), maghrib: day(15, 40), isha: day(17) }

describe('الرئيسية في وضع رمضان', () => {
  it('الصلاة الحالية: لا شيء قبل الفجر ولا بين الشروق والظهر', () => {
    expect(currentPrayer(times, day(2))).toBeNull()
    expect(currentPrayer(times, day(3, 30))).toBe('fajr')
    expect(currentPrayer(times, day(6))).toBeNull()
    expect(currentPrayer(times, day(15, 45))).toBe('maghrib')
    expect(currentPrayer(times, day(20))).toBe('isha')
  })
  it('الحدث القادم: السحور قبل الفجر، والإفطار نهارًا، وسحور الغد بعد المغرب', () => {
    const loc = { name: 'Jerusalem', nameAr: 'القدس', country: 'PS', lat: 31.77, lng: 35.21, tz: 'Asia/Jerusalem' } as never
    const t0 = new Date('2027-02-20T00:30:00Z')
    expect(ramadanNext(loc, DEFAULT_PRAYER_SETTINGS, t0).kind).toBe('suhoor')
    expect(ramadanNext(loc, DEFAULT_PRAYER_SETTINGS, new Date('2027-02-20T10:00:00Z')).kind).toBe('iftar')
    const night = ramadanNext(loc, DEFAULT_PRAYER_SETTINGS, new Date('2027-02-20T18:00:00Z'))
    expect(night.kind).toBe('suhoor')
    expect(night.at.getTime()).toBeGreaterThan(new Date('2027-02-21T00:00:00Z').getTime())
  })
  it('العدّاد بصيغة ساعات:دقائق:ثوانٍ', () => {
    expect(cd(3_725_000)).toBe('01:02:05')
    expect(cd(-5)).toBe('00:00:00')
  })
  it('كل عبارة لها مصدر من صحيح البخاري برقم الحديث', () => {
    for (const p of RAMADAN_PHRASES) expect(p.source).toMatch(/^صحيح البخاري \(\d+\)$/)
  })
})
