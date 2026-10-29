// الأذكار المسموعة في الإشعارات: جملة كل تذكير من النص كما هو، والمقاطع تطابق التسجيل والذكر، والقنوات صحيحة
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { sig } from './timedVoice'
import { channelFlags, heardText, hisnClipChannel, SLOT_DEFS, slotSpeech, VOICE_SLOTS, voiceFor } from './voiceSlots'
import { HISN_AUDIO, HISN_CLIPS } from '../content/hisnAudio'
import { ADHKAR } from '../content/adhkar'
import { HISN_SOUND_NAME_RE } from './companion'

const plain = (s: string) => s.replace(/[ً-ْٰ]/g, '')

describe('ما ينطقه صوت الهاتف', () => {
  it('جمل من نص الذكر نفسه، لكل وقت ذكره', () => {
    expect(plain(slotSpeech('morning'))).toBe('أصبحنا وأصبح الملك لله، والحمد لله')
    expect(plain(slotSpeech('evening'))).toBe('أمسينا وأمسى الملك لله، والحمد لله')
    expect(plain(slotSpeech('sleep'))).toBe('باسمك ربي وضعت جنبي')
    expect(plain(slotSpeech('wake'))).toBe('الحمد لله الذي أحيانا بعد ما أماتنا وإليه النشور')
    // بلا تعليمات مثل «(ثلاثًا)»
    expect(plain(slotSpeech('afterPrayer'))).toBe('اللهم أنت السلام ومنك السلام، تباركت يا ذا الجلال والإكرام')
  })
  it('كل جملة موجودة حرفيًا في نص الذكر بالمكتبة', () => {
    for (const s of VOICE_SLOTS) {
      const d = SLOT_DEFS[s]
      const item = ADHKAR.find((c) => c.id === d.category)!.items.find((x) => x.id === d.itemId)!
      expect(item.text!.includes(slotSpeech(s))).toBe(true)
    }
  })
})

describe('المقاطع القصيرة من حصن المسلم', () => {
  it('كل مقطع من تسجيل ذكره نفسه، وقصير (ثوانٍ)، والمساء لا يستعمل تسجيل الصباح', () => {
    for (const s of VOICE_SLOTS) {
      const c = HISN_CLIPS[SLOT_DEFS[s].hisn]
      expect(c, s).toBeTruthy()
      expect(HISN_AUDIO[c.itemId]).toBe(c.src)
      expect(c.to - c.from).toBeGreaterThan(2)
      expect(c.to - c.from).toBeLessThan(10)
    }
    expect(HISN_CLIPS[SLOT_DEFS.evening.hisn].src).not.toBe(HISN_AUDIO['m-asbahna'])
    expect(HISN_AUDIO['e-amsayna']).toBeUndefined()
  })
  it('سكربت البناء يقرأ المقاطع من الملف نفسه بالصيغة التي يفهمها', () => {
    const src = readFileSync('src/content/hisnAudio.ts', 'utf8')
    const lines = src.split('\n').filter((l) => /^ {2}[a-z][a-z0-9]*: \{ src: \d+, from: [\d.]+, to: [\d.]+,/.test(l))
    expect(lines.length).toBe(Object.keys(HISN_CLIPS).length)
    expect(readFileSync('scripts/fetch-hisn-sounds.sh', 'utf8')).toMatch(/HISN_CLIPS/)
  })
})

describe('الاختيارات والقنوات', () => {
  it('الافتراضيات وترحيل الإعدادات السابقة', () => {
    expect(voiceFor({}, 'morning')).toBe('hisn')
    expect(voiceFor({}, 'evening')).toBe('device')
    expect(voiceFor({ eveningVoice: 'mine' }, 'evening')).toBe('mine')
    expect(voiceFor({ eveningVoice: 'mine', voices: { evening: 'tone' } }, 'evening')).toBe('tone')
  })
  it('ما يُسمع يطابق الاختيار', () => {
    expect(heardText('evening', 'hisn', false)).toMatch(/بسم الله الذي لا يضر/)
    expect(heardText('evening', 'device', true)).toMatch(/أمسينا/)
    expect(heardText('evening', 'device', false)).toMatch(/بسم الله/) // تعذر صوت الهاتف: تسجيل حصن المسلم
    expect(heardText('morning', 'tone', false)).toBe('')
  })
  it('لاحقة القناة للاهتزاز وشاشة القفل، وتطابق نمط إنشاء القنوات', () => {
    expect(channelFlags({})).toBe('v1')
    expect(channelFlags({ vibrate: false, lockText: false })).toBe('np')
    for (const f of ['v1', 'n1', 'vp', 'np']) expect(HISN_SOUND_NAME_RE.test(hisnClipChannel('m77s', f))).toBe(true)
    expect(HISN_SOUND_NAME_RE.test('rafiq-hisn-86-v1')).toBe(true)
    expect(sig('a')).not.toBe(sig('b'))
    expect(sig('device|x')).toMatch(/^[a-z0-9]{1,16}$/)
  })
})
