import { describe, expect, it } from 'vitest'
import { isAppleMobile, webGeoMessage } from '../platform'
import { pickAudioMime } from '../components/MicRecorder'
import { HISN_AUDIO, hisnAudioUrl } from '../content/hisnAudio'
import { DECEASED_DUAS } from '../content/deceased'

describe('الموقع في الآيفون', () => {
  it('يتعرف على الآيفون والآيباد', () => {
    expect(isAppleMobile('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)', 5)).toBe(true)
    expect(isAppleMobile('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 5)).toBe(true)
    expect(isAppleMobile('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 0)).toBe(false)
    expect(isAppleMobile('Mozilla/5.0 (Linux; Android 14)', 5)).toBe(false)
  })
  it('رسالة الرفض في الآيفون تذكر خطوات الإعدادات', () => {
    expect(webGeoMessage('denied', true)).toContain('مواقع Safari')
    expect(webGeoMessage('denied', false)).not.toContain('Safari')
    expect(webGeoMessage('insecure', true)).toContain('hamadakhm.github.io')
    for (const k of ['insecure', 'denied', 'unsupported', 'fail'] as const) expect(webGeoMessage(k, true)).toContain('اختر مدينتك')
  })
})

describe('صوت فيديو دعاء المتوفى', () => {
  it('الآيفون يسجّل MP4، وغيره WebM', () => {
    expect(pickAudioMime((t) => t === 'audio/mp4')).toBe('audio/mp4')
    expect(pickAudioMime((t) => t.startsWith('audio/webm'))).toBe('audio/webm;codecs=opus')
    expect(pickAudioMime(() => false)).toBe('')
  })
  it('دعاء «اللهم اغفر لحينا وميتنا» مربوط بتسجيله المطابق فقط', () => {
    expect(DECEASED_DUAS.some((d) => d.id === 'all')).toBe(true)
    expect(hisnAudioUrl('all')).toBe('https://www.hisnmuslim.com/audio/ar/157.mp3')
    expect(HISN_AUDIO.janaza).toBeUndefined()
    expect(HISN_AUDIO.burial).toBeUndefined()
  })
})
