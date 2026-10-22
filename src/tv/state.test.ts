import { describe, expect, it } from 'vitest'
import { tvPhase, ADHAN_SCREEN_MS } from './state'
import type { DayTimes } from '../services/prayer'

const at = (h: number, m: number) => new Date(Date.UTC(2026, 9, 22, h, m))
const times: DayTimes = { fajr: at(2, 26), sunrise: at(3, 48), dhuhr: at(9, 24), asr: at(12, 33), maghrib: at(14, 59), isha: at(16, 18) }
const none = { fajr: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 }

describe('شاشة التلفاز: الأذان والإقامة', () => {
  it('شاشة الأذان في الدقائق الأولى بعد دخول الوقت', () => {
    expect(tvPhase(new Date(times.dhuhr.getTime() + 60_000), times, none)).toMatchObject({ kind: 'adhan', prayer: 'dhuhr' })
    expect(tvPhase(new Date(times.dhuhr.getTime() + ADHAN_SCREEN_MS + 1000), times, none)).toEqual({ kind: 'normal' })
    expect(tvPhase(new Date(times.dhuhr.getTime() - 1000), times, none)).toEqual({ kind: 'normal' })
  })
  it('عدّاد الإقامة بعد شاشة الأذان حتى موعدها', () => {
    const iq = { ...none, maghrib: 10 }
    expect(tvPhase(new Date(times.maghrib.getTime() + 60_000), times, iq).kind).toBe('adhan')
    const p = tvPhase(new Date(times.maghrib.getTime() + 6 * 60_000), times, iq)
    expect(p).toMatchObject({ kind: 'iqama', prayer: 'maghrib' })
    expect(p.kind === 'iqama' && p.at.getTime()).toBe(times.maghrib.getTime() + 10 * 60_000)
    expect(tvPhase(new Date(times.maghrib.getTime() + 11 * 60_000), times, iq)).toEqual({ kind: 'normal' })
  })
  it('الشروق لا يُعامل كصلاة', () => {
    expect(tvPhase(new Date(times.sunrise.getTime() + 60_000), times, none)).toEqual({ kind: 'normal' })
  })
})
