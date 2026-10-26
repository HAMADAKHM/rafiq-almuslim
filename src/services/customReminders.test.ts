// التذكيرات الخاصة (رفيق بلس): تُجدول في أيامها فقط، ومع اشتراك ساري فقط.
import { afterEach, describe, expect, it } from 'vitest'
import { buildSchedule } from './reminders'
import { mergeSettings } from '../state/settings'
import { setPlusActive } from '../billing/active'

const base = mergeSettings({
  location: { name: 'Nablus', nameAr: 'نابلس', country: 'PS', lat: 32.2211, lng: 35.2544, tz: 'Asia/Hebron' } as never,
  notifications: { ...mergeSettings(null).notifications, enabled: true },
  customReminders: [
    { id: 'a', title: 'قراءة سورة الكهف', time: '10:00', days: [5], route: '/quran/18', enabled: true },
    { id: 'b', title: 'معطّل', time: '11:00', days: [0, 1, 2, 3, 4, 5, 6], route: '/', enabled: false },
  ],
})
// الخميس 2026-10-29 الساعة 12:00 بتوقيت نابلس (قبل الجمعة)
const from = new Date('2026-10-29T09:00:00Z')

afterEach(() => setPlusActive(false))

describe('التذكيرات الخاصة', () => {
  it('دون اشتراك لا تُجدول أبدًا', () => {
    setPlusActive(false)
    expect(buildSchedule(base, from, 7).filter((r) => r.kind === 'custom')).toHaveLength(0)
  })
  it('مع اشتراك: يوم الجمعة فقط، بالنص والصفحة المختارين، والمعطّل لا يُجدول', () => {
    setPlusActive(true)
    const c = buildSchedule(base, from, 7).filter((r) => r.kind === 'custom')
    expect(c).toHaveLength(1)
    expect(c[0].title).toBe('قراءة سورة الكهف')
    expect(c[0].route).toBe('/quran/18')
    expect(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Hebron', weekday: 'long', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(c[0].at)).toBe('Friday 10:00')
  })
  it('لا تؤثر في تذكيرات الصلاة المجانية', () => {
    setPlusActive(false)
    const free = buildSchedule(base, from, 2).filter((r) => r.kind === 'prayer').length
    setPlusActive(true)
    expect(buildSchedule(base, from, 2).filter((r) => r.kind === 'prayer').length).toBe(free)
  })
})
