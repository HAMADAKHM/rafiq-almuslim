import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { BUNDLED, hisnRecordings, quranItems, soundChannel, soundRawName } from '../content/soundLibrary'
import { HISN_AUDIO } from '../content/hisnAudio'
import { DEFAULT_AUDIO_STUDIO, DEFAULT_SETTINGS } from '../state/settings'
import { buildSchedule } from './reminders'

// المحرك يستورد مشغل القرآن؛ تكفي الدوال النقية هنا
const { looksLikeMp3, tasbihEvent } = await import('./audioStudio')

describe('استوديو الأصوات: المكتبة', () => {
  it('كل صوت مضمّن موجود فعلًا، وكل نغمة إشعار لها ملف في res/raw', () => {
    for (const s of BUNDLED) {
      expect(existsSync(`public/${s.file}`), s.id).toBe(true)
      const head = readFileSync(`public/${s.file}`).subarray(0, 3)
      expect(head[0] === 0x49 || head[0] === 0xff, `${s.id} mp3`).toBe(true)
      if (s.notify) expect(existsSync(`android/app/src/main/res/raw/${soundRawName(s.id)}`), s.id).toBe(true)
    }
  })
  it('تسجيلات الأذكار من حصن المسلم المطابقة فقط، ولا تسجيل لذكر بلا ربط', () => {
    for (const g of ['morning', 'evening', 'sleep'] as const) {
      const r = hisnRecordings(g)
      expect(r.length).toBeGreaterThan(0)
      for (const x of r) { expect(HISN_AUDIO[x.itemId!]).toBeTruthy(); expect(x.url).toBe(`https://www.hisnmuslim.com/audio/ar/${HISN_AUDIO[x.itemId!]}.mp3`) }
    }
    expect(quranItems('morning').length).toBeGreaterThan(0)
  })
})

describe('استوديو الأصوات: السبحة والتحقق من الملفات', () => {
  it('نقرة، وتمام 33 و100، وإكمال العدد، وإيقاف النقر مع بقاء التمام', () => {
    const s = DEFAULT_AUDIO_STUDIO
    expect(tasbihEvent(1, 0, s)).toBe('k_click')
    expect(tasbihEvent(33, 0, s)).toBe('k_33')
    expect(tasbihEvent(100, 0, s)).toBe('k_100')
    expect(tasbihEvent(99, 99, s)).toBe('k_done')
    const quiet = { ...s, tasbih: { ...s.tasbih, clickOn: false } }
    expect(tasbihEvent(5, 0, quiet)).toBeNull()
    expect(tasbihEvent(33, 0, quiet)).toBe('k_33')
  })
  it('يرفض الملف غير الصوتي أو الصغير', () => {
    expect(looksLikeMp3(new Uint8Array([0x3c, 0x68, 0x74, ...new Array(3000).fill(0)]))).toBe(false)
    expect(looksLikeMp3(new Uint8Array([0x49, 0x44, 0x33, 1]))).toBe(false)
    expect(looksLikeMp3(new Uint8Array([0x49, 0x44, 0x33, ...new Array(3000).fill(0)]))).toBe(true)
  })
})

describe('استوديو الأصوات: الإشعارات', () => {
  const loc = { name: 'Nablus', nameAr: 'نابلس', country: 'PS', lat: 32.22, lng: 35.25, tz: 'Asia/Hebron' }
  const from = new Date('2026-11-07T03:00:00Z')
  it('نغمة الاستوديو لتذكير الصباح، والنغمة الافتراضية للتذكيرات الأخرى', () => {
    const settings = { ...DEFAULT_SETTINGS, location: loc as never, audioStudio: { ...DEFAULT_AUDIO_STUDIO, defaultTone: 't_gold' },
      notifications: { ...DEFAULT_SETTINGS.notifications, enabled: true, morningAdhkar: '07:00', ayahOfDay: '09:00', voices: { morning: 'snd:t_morning' as const } } }
    const list = buildSchedule(settings as never, from, 1)
    const m = list.find((r) => r.kind === 'morning')!
    expect(m.channelId).toBe(soundChannel('t_morning', 'v1'))
    expect(list.find((r) => r.kind === 'ayah')!.channelId).toBe(soundChannel('t_gold', 'v1'))
    expect(list.filter((r) => r.kind === 'prayer').every((r) => !r.channelId?.startsWith('rafiq-snd-'))).toBe(true)
  })
})
