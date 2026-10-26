import { describe as suite, expect, it, beforeEach } from 'vitest'
import { describe, getWeather, parseMet } from './weather'
import { clearAll } from '../db/backup'

const now = Date.parse('2026-10-26T10:20:00Z')
const series = Array.from({ length: 30 }, (_, i) => ({
  time: new Date(Date.parse('2026-10-26T10:00:00Z') + i * 3_600_000).toISOString().replace('.000', ''),
  data: { instant: { details: { air_temperature: 20 + (i % 10), wind_speed: 3.2, relative_humidity: 50 } }, next_1_hours: { summary: { symbol_code: i === 0 ? 'partlycloudy_day' : 'clearsky_night' } } },
}))
const met = { properties: { timeseries: series } }

beforeEach(async () => { await clearAll() })

suite('الطقس', () => {
  it('الرموز بالعربية للنهار والليل', () => {
    expect(describe('clearsky_day')).toEqual({ label: 'صافٍ', icon: '☀️' })
    expect(describe('clearsky_night').icon).toBe('🌙')
    expect(describe('lightrainshowers_day').label).toBe('مطر خفيف')
    expect(describe('heavyrainandthunder').label).toBe('عواصف رعدية')
  })
  it('تحويل استجابة MET Norway', () => {
    const w = parseMet(met, now)
    expect(w.temp).toBe(20)
    expect(w.label).toBe('غائم جزئيًا')
    expect(w.high).toBe(29)
    expect(w.low).toBe(20)
    expect(w.hours.length).toBeGreaterThan(0)
    expect(w.hours.every((h) => new Date(h.at).getUTCHours() % 3 === 0)).toBe(true)
  })
  it('يُحفظ 30 دقيقة، ودون إنترنت يُعاد آخر محفوظ', async () => {
    let calls = 0
    const ok = (async () => { calls++; return new Response(JSON.stringify(met), { status: 200 }) }) as typeof fetch
    await getWeather(32.22, 35.25, ok, now)
    await getWeather(32.22, 35.25, ok, now + 10 * 60_000)
    expect(calls).toBe(1)
    const offline = (async () => { throw new Error('offline') }) as typeof fetch
    expect((await getWeather(32.22, 35.25, offline, now + 3 * 3_600_000)).temp).toBe(20)
    await expect(getWeather(10, 10, offline, now)).rejects.toThrow(/تعذر جلب حالة الطقس/)
  })
})
