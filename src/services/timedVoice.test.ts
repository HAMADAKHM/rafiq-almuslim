// الذكر المسموع في إشعار الصباح والمساء: النص الصحيح لكل وقت، وتطابق مقاطع حصن المسلم مع سكربت البناء
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { firstSentence, sig, slotText, voiceChoice, voiceLabel } from './timedVoice'
import { HISN_AUDIO, HISN_CLIPS } from '../content/hisnAudio'

const plain = (s: string) => s.replace(/[ً-ْٰ]/g, '')

describe('نص الذكر الذي يُنطق', () => {
  it('الصباح «أصبحنا…» والمساء «أمسينا…» من المكتبة كما هي، حتى «قدير»', () => {
    const m = plain(slotText('morning')), e = plain(slotText('evening'))
    expect(m.startsWith('أصبحنا وأصبح الملك لله، والحمد لله')).toBe(true)
    expect(e.startsWith('أمسينا وأمسى الملك لله، والحمد لله')).toBe(true)
    expect(m.endsWith('قدير')).toBe(true)
    expect(e.endsWith('قدير')).toBe(true)
    expect(e).not.toMatch(/أصبح/)
    expect(m).not.toMatch(/أمسى|أمسينا/)
  })
  it('أول جملة فقط، ودون تعديل الألفاظ', () => {
    expect(firstSentence('أ ب قدير، رب أسألك')).toBe('أ ب قدير')
    expect(firstSentence('بلا نهاية معروفة')).toBe('بلا نهاية معروفة')
  })
  it('الاختيارات والأوصاف', () => {
    expect(voiceChoice({}, 'morning')).toBe('hisn')
    expect(voiceChoice({}, 'evening')).toBe('device')
    expect(voiceChoice({ eveningVoice: 'mine' }, 'evening')).toBe('mine')
    expect(voiceLabel('evening', 'hisn')).toMatch(/بسم الله الذي لا يضر/)
    expect(voiceLabel('evening', 'device')).toMatch(/أمسينا/)
    expect(sig('a')).not.toBe(sig('b'))
    expect(sig('device|x')).toMatch(/^[a-z0-9]{1,16}$/)
  })
})

describe('مقاطع حصن المسلم لصوت الإشعار', () => {
  it('مقطع الصباح من تسجيل «أصبحنا» نفسه، وسكربت البناء يقصه بالحدود نفسها', () => {
    const c = HISN_CLIPS.m77
    expect(c.src).toBe(HISN_AUDIO[c.itemId])
    expect(c.itemId).toBe('m-asbahna')
    const script = readFileSync('scripts/fetch-hisn-sounds.sh', 'utf8')
    expect(script).toMatch(/HISN_CLIPS/)
    const src = readFileSync('src/content/hisnAudio.ts', 'utf8')
    expect(src).toMatch(/^ {2}m77: \{ src: 77, from: 0, to: 17\.5,/m)
    // لا يوجد تسجيل «أمسينا» في حصن المسلم: لا يُربط ذكر المساء بتسجيل الصباح
    expect(HISN_AUDIO['e-amsayna']).toBeUndefined()
  })
})
