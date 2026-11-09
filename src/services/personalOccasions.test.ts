// المناسبات الشخصية: الموعد القادم، و29 فبراير، والتذكير قبلها بأيام في الوقت المختار، والمنشور.
import { describe, expect, it } from 'vitest'
import { buildSchedule } from './reminders'
import { mergeSettings, type PersonalOccasion } from '../state/settings'
import { defaultPost, isOccasionDay, nextOccurrence, postHeadline, postText, yearsAt } from './personalOccasions'
import { daysLabel, newAlarm } from '../features/alarm/AlarmPage'

const occ = (p: Partial<PersonalOccasion>): PersonalOccasion => ({ id: 1, type: 'birthday', name: 'محمد', month: 11, day: 2, daysBefore: 1, time: '09:00', on: true, ...p })

describe('المناسبات الشخصية', () => {
  it('الموعد القادم: هذا العام أو العام القادم', () => {
    expect(nextOccurrence(occ({ month: 11, day: 2 }), { y: 2026, m: 10, d: 29 })).toEqual({ days: 4, date: { y: 2026, m: 11, d: 2 } })
    expect(nextOccurrence(occ({ month: 11, day: 2 }), { y: 2026, m: 11, d: 2 }).days).toBe(0)
    expect(nextOccurrence(occ({ month: 1, day: 5 }), { y: 2026, m: 12, d: 30 })).toEqual({ days: 6, date: { y: 2027, m: 1, d: 5 } })
  })
  it('29 فبراير يُحتفل به في 28 فبراير في السنة غير الكبيسة', () => {
    expect(isOccasionDay(occ({ month: 2, day: 29 }), { y: 2027, m: 2, d: 28 })).toBe(true)
    expect(isOccasionDay(occ({ month: 2, day: 29 }), { y: 2028, m: 2, d: 28 })).toBe(false)
    expect(isOccasionDay(occ({ month: 2, day: 29 }), { y: 2028, m: 2, d: 29 })).toBe(true)
  })
  it('عدد السنوات فقط إن عُرفت سنة صحيحة', () => {
    expect(yearsAt({ year: 2000 }, 2026)).toBe(26)
    expect(yearsAt({}, 2026)).toBeNull()
    expect(yearsAt({ year: 2030 }, 2026)).toBeNull()
  })
  it('المنشور: النص الافتراضي بحسب النوع، وما يكتبه المستخدم يتقدم عليه', () => {
    expect(postHeadline(occ({}))).toBe('كل عام وأنت بخير')
    expect(postHeadline(occ({ type: 'custom', title: 'تخرج' }))).toBe('تخرج')
    expect(postText(occ({}))).toBe(defaultPost({ type: 'birthday' }))
    expect(postText(occ({ post: '  نص خاص ' }))).toBe('نص خاص')
    expect(postHeadline(occ({ headline: 'مبارك' }))).toBe('مبارك')
  })

  const base = mergeSettings({
    location: { name: 'Nablus', nameAr: 'نابلس', country: 'PS', lat: 32.2211, lng: 35.2544, tz: 'Asia/Hebron' } as never,
    notifications: { ...mergeSettings(null).notifications, enabled: true },
    personalOccasions: [occ({ year: 1990 }), occ({ id: 2, type: 'wedding', name: 'أحمد وسارة', month: 11, day: 4, daysBefore: 0, time: '20:15' }), occ({ id: 3, on: false, month: 10, day: 31 })],
  })
  const from = new Date('2026-10-29T09:00:00Z')
  it('التذكير في اليوم السابق للمناسبة بالوقت المختار، ويفتح المنشور؛ والمعطّل لا يُجدول', () => {
    const p = buildSchedule(base, from, 7).filter((r) => r.kind === 'personal')
    expect(p).toHaveLength(2)
    const fmt = (d: Date) => new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Hebron', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(d)
    expect(fmt(p[0].at)).toBe('01/11, 09:00')
    expect(p[0].title).toBe('غدًا: عيد ميلاد محمد — يتم 36 سنة')
    expect(p[0].route).toBe('/my-occasions?post=1')
    expect(fmt(p[1].at)).toBe('04/11, 20:15')
    expect(p[1].title).toBe('اليوم: ذكرى زواج أحمد وسارة')
    // معرّفات لا تتصادم مع بقية التذكيرات
    const all = buildSchedule(base, from, 7)
    expect(new Set(all.map((r) => r.id)).size).toBe(all.length)
  })
})

describe('منبّه الصحوة', () => {
  it('منبه جديد بمعرّف فريد وصوت «أصبحنا» افتراضيًا', () => {
    const a = newAlarm([])
    expect(a.id).toBe(1)
    expect(a.voice).toBe('asbahna')
    expect(newAlarm([a, { ...a, id: 5 }]).id).toBe(6)
  })
  it('وصف الأيام', () => {
    expect(daysLabel([])).toBe('كل يوم')
    expect(daysLabel([4, 0, 1, 2, 3])).toBe('الأحد إلى الخميس')
    expect(daysLabel([5])).toBe('الجمعة')
  })
})
