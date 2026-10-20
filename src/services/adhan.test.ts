// اختبارات صوت الأذان: اختيار الصوت لكل صلاة، وربطه بقنوات Android ومقاطع iOS.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_SETTINGS, type Settings } from '../state/settings'
import type { Reminder } from './reminders'

vi.mock('../content/adhan-voices.json', () => ({
  default: [
    { id: 'makkah', name: 'أذان مكة', source: 's', license: 'l', durationSec: 200, file: 'adhan_makkah.mp3', iosFile: 'adhan_makkah_ios.caf' },
    { id: 'fajrv', name: 'أذان الفجر', source: 's', license: 'l', durationSec: 220, file: 'adhan_fajrv.mp3', iosFile: 'adhan_fajrv_ios.caf' },
  ],
}))

const { voiceIdFor, channelsFor, withAdhanSounds, validateDeviceFile, encodeWav } = await import('./adhan')

let s: Settings
beforeEach(() => { s = structuredClone(DEFAULT_SETTINGS) })
const withN = (patch: Partial<Settings['notifications']>) => ({ ...s, notifications: { ...s.notifications, ...patch } })
const rem = (prayer?: Reminder['prayer'], kind: Reminder['kind'] = 'prayer'): Reminder => ({ id: 1, at: new Date(), kind, title: 't', body: 'b', route: '/prayer', prayer })

describe('صوت الأذان', () => {
  it('الافتراضي نغمة الإشعار، وصوت الفجر يتبع البقية', () => {
    expect(voiceIdFor(s, 'asr')).toBe('tone')
    const x = withN({ adhanVoice: 'makkah' })
    expect(voiceIdFor(x, 'fajr')).toBe('makkah')
    expect(voiceIdFor(withN({ adhanVoice: 'makkah', fajrVoice: 'fajrv' }), 'fajr')).toBe('fajrv')
    expect(voiceIdFor(withN({ adhanVoice: 'makkah', fajrVoice: 'fajrv' }), 'isha')).toBe('makkah')
  })
  it('صوت محذوف من التطبيق يعود إلى النغمة الافتراضية', () => {
    expect(voiceIdFor(withN({ adhanVoice: 'gone' }), 'asr')).toBe('tone')
  })
  it('قنوات Android: قناة لكل صوت مستخدم بأهمية عالية', () => {
    const ch = channelsFor(withN({ adhanVoice: 'makkah', fajrVoice: 'fajrv' }))
    expect(ch.map((c) => c.id).sort()).toEqual(['adhan_fajrv_v1', 'adhan_makkah_v1'])
    expect(ch.every((c) => c.importance === 5 && c.sound.endsWith('.mp3'))).toBe(true)
    expect(channelsFor(s)).toEqual([])
    expect(channelsFor(withN({ adhanVoice: 'device' }))).toEqual([])
  })
  it('يُضاف الصوت لتذكيرات دخول الوقت فقط، وبحسب المنصة', () => {
    const x = withN({ adhanVoice: 'makkah', fajrVoice: 'fajrv' })
    const list = [rem('fajr'), rem('asr'), rem('asr', 'prayer-before'), rem(undefined, 'morning')]
    const a = withAdhanSounds(list, x, 'android')
    expect(a.map((r) => r.channelId)).toEqual(['adhan_fajrv_v1', 'adhan_makkah_v1', undefined, undefined])
    const i = withAdhanSounds(list, x, 'ios')
    expect(i.map((r) => r.sound)).toEqual(['adhan_fajrv_ios.caf', 'adhan_makkah_ios.caf', undefined, undefined])
    expect(withAdhanSounds(list, withN({ adhanVoice: 'device' }), 'android')[1].channelId).toBeUndefined()
  })
  it('التحقق من ملف الجهاز', () => {
    expect(validateDeviceFile({ name: 'a.mp3', type: 'audio/mpeg', size: 1000 })).toBeNull()
    expect(validateDeviceFile({ name: 'a.m4a', type: '', size: 1000 })).toBeNull()
    expect(validateDeviceFile({ name: 'a.pdf', type: 'application/pdf', size: 1000 })).toMatch(/صوتي/)
    expect(validateDeviceFile({ name: 'a.mp3', type: 'audio/mpeg', size: 20 * 1024 * 1024 })).toMatch(/15/)
  })
  it('الإعدادات القديمة تحصل على قيم افتراضية للأذان', async () => {
    const { mergeSettings } = await import('../state/settings')
    const m = mergeSettings({ notifications: { enabled: true } } as never)
    expect(m.notifications.adhanVoice).toBe('tone')
    expect(m.notifications.fajrVoice).toBe('same')
    expect(m.notifications.adhanInApp).toBe(true)
  })
  it('صوت الجهاز: قناة Android أو مقطع iOS المثبّت، وإلا نغمة الإشعار', () => {
    const x = withN({ adhanVoice: 'device' })
    expect(withAdhanSounds([rem('asr')], x, 'android', { androidChannel: 'adhan_dev_abc' })[0].channelId).toBe('adhan_dev_abc')
    expect(withAdhanSounds([rem('asr')], x, 'ios', { iosSound: 'adhan_device_abc.wav' })[0].sound).toBe('adhan_device_abc.wav')
    expect(withAdhanSounds([rem('asr')], x, 'android', null)[0].channelId).toBeUndefined()
  })
  it('ترميز WAV صحيح الرأس والطول', () => {
    const buf = encodeWav(new Float32Array([0, 1, -1, 0.5]), 22050)
    const v = new DataView(buf)
    const tag = (o: number) => String.fromCharCode(...new Uint8Array(buf, o, 4))
    expect(tag(0)).toBe('RIFF'); expect(tag(8)).toBe('WAVE'); expect(tag(36)).toBe('data')
    expect(v.getUint32(24, true)).toBe(22050)
    expect(v.getUint32(40, true)).toBe(8)
    expect(buf.byteLength).toBe(52)
    expect(v.getInt16(46, true)).toBe(0x7fff)
    expect(v.getInt16(48, true)).toBe(-0x8000)
  })
})
