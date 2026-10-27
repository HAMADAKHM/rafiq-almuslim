import { describe, expect, it } from 'vitest'
import { HISN_AUDIO, hisnAudioUrl } from './hisnAudio'
import { ADHKAR } from './adhkar'
import { DUAS } from './duas'

const items = new Map([...ADHKAR, ...DUAS].flatMap((c) => c.items).map((x) => [x.id, x]))

describe('تسجيلات حصن المسلم', () => {
  it('كل ذكر مربوط موجود في التطبيق وله نص، وأرقام الملفات صحيحة', () => {
    expect(Object.keys(HISN_AUDIO).length).toBeGreaterThanOrEqual(50)
    for (const [id, n] of Object.entries(HISN_AUDIO)) {
      expect(items.get(id)?.text, id).toBeTruthy()
      expect(Number.isInteger(n) && n > 0).toBe(true)
    }
  })
  it('الأذكار المختلفة لفظًا عن التسجيل غير مربوطة (لا يختلف المسموع عن المكتوب)', () => {
    for (const id of ['m-afiya', 'e-afiya', 'e-bika', 'e-amsayna', 's-aslamtu', 'ds-1']) expect(hisnAudioUrl(id), id).toBeNull()
  })
  it('رابط آمن (https)', () => {
    expect(hisnAudioUrl('m-sayyid')).toBe('https://www.hisnmuslim.com/audio/ar/79.mp3')
  })
})
