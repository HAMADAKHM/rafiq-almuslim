import { afterEach, describe, expect, it } from 'vitest'
import { dayKey } from './dates'
import { minutesInTz } from '../services/prayer'
import { atLocalTime } from '../services/reminders'
import { toHijri } from '../services/calendar'

// يحاكي WebView قديمًا (Chrome 51 في تلفزيونات Android 7) بلا formatToParts
const proto = Intl.DateTimeFormat.prototype as { formatToParts?: unknown }
const orig = proto.formatToParts
afterEach(() => { proto.formatToParts = orig })

describe('التواريخ والمواقيت دون formatToParts (متصفحات قديمة)', () => {
  const samples = [new Date('2026-11-05T21:47:00Z'), new Date('2026-03-29T00:30:00Z'), new Date('2026-12-31T23:59:00Z')]
  it('النتائج نفسها مع الدالة الأصلية وبدونها', () => {
    const native = samples.map((d) => [dayKey(d, 'Asia/Hebron'), minutesInTz(d, 'Asia/Hebron'), minutesInTz(d, 'America/New_York'), toHijri(d, 'Asia/Riyadh')])
    const t = atLocalTime({ y: 2026, m: 11, d: 1 }, '08:00', 'America/New_York').toISOString()
    proto.formatToParts = undefined
    const legacy = samples.map((d) => [dayKey(d, 'Asia/Hebron'), minutesInTz(d, 'Asia/Hebron'), minutesInTz(d, 'America/New_York'), toHijri(d, 'Asia/Riyadh')])
    expect(legacy).toEqual(native)
    expect(atLocalTime({ y: 2026, m: 11, d: 1 }, '08:00', 'America/New_York').toISOString()).toBe(t)
  })
})

describe('تثبيت formatToParts للمتصفحات القديمة', () => {
  it('يعمل بعد التثبيت ويطابق الأصلي', async () => {
    const d = new Date('2026-11-05T21:47:00Z')
    const opts: Intl.DateTimeFormatOptions = { timeZone: 'Asia/Hebron', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }
    const want = new Intl.DateTimeFormat('en-GB', opts).formatToParts(d).filter((p) => p.type !== 'literal').map((p) => [p.type, Number(p.value)])
    proto.formatToParts = undefined
    const { installFormatToParts } = await import('./intlParts')
    installFormatToParts()
    const got = new Intl.DateTimeFormat('en-GB', opts).formatToParts(d).map((p) => [p.type, Number(p.value)])
    const byType = (a: (string | number)[][]) => [...a].sort((x, y) => String(x[0]).localeCompare(String(y[0])))
    expect(byType(got)).toEqual(byType(want))
  })
})
