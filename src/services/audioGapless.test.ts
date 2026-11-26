// الآية التالية تُحمَّل مسبقًا أثناء تلاوة الحالية، فتبدأ فور انتهائها دون انتظار التحميل.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { player } from './audio'
import { ayahAudioSources, reciterById } from '../content/reciters'

beforeEach(() => {
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(function (this: HTMLMediaElement) { this.dispatchEvent(new Event('playing')); return Promise.resolve() })
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {})
  vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => {})
})
afterEach(() => { player.stop(); vi.restoreAllMocks() })

const p = player as unknown as { el: HTMLAudioElement; nextEl: HTMLAudioElement | null }
const src = (s: number, a: number) => ayahAudioSources(reciterById('alafasy'), s, a)[0]

describe('تلاوة متصلة بلا توقف بين الآيات', () => {
  it('يحمّل الآية التالية مسبقًا ويبدّل إليها عند الانتهاء', () => {
    player.setRepeat(1, false, 0)
    player.play({ reciterId: 'alafasy', surah: 2, surahName: 'البقرة', from: 2, to: 4, repeatEach: 1, repeatRange: false })
    const first = p.el
    expect(first.src).toBe(src(2, 2))
    expect(p.nextEl?.src).toBe(src(2, 3)) // حُمّلت الآية 3 أثناء تلاوة 2
    const preloaded = p.nextEl
    first.dispatchEvent(new Event('ended'))
    expect(p.el).toBe(preloaded) // بُدّل إلى العنصر المحمَّل
    expect(player.getSnapshot().ayah).toBe(3)
    expect(p.nextEl?.src).toBe(src(2, 4)) // والآن تُحمَّل 4
  })

  it('أحداث العنصر المحمَّل مسبقًا لا تؤثر في التشغيل', () => {
    player.play({ reciterId: 'alafasy', surah: 2, surahName: 'البقرة', from: 2, to: 4, repeatEach: 1, repeatRange: false })
    p.nextEl!.dispatchEvent(new Event('ended'))
    expect(player.getSnapshot().ayah).toBe(2)
    p.nextEl!.dispatchEvent(new Event('error')) // فشل التحميل المسبق: تُحمَّل الآية عاديًا عند الوصول إليها
    p.el.dispatchEvent(new Event('ended'))
    expect(player.getSnapshot().ayah).toBe(3)
    expect(p.el.src).toBe(src(2, 3))
  })

  it('بعد البسملة تأتي الآية الأولى من العنصر المحمَّل', () => {
    player.play({ reciterId: 'alafasy', surah: 112, surahName: 'الإخلاص', from: 1, to: 4, repeatEach: 1, repeatRange: false })
    expect(player.getSnapshot().playingBasmala).toBe(true)
    expect(p.nextEl?.src).toBe(src(112, 1))
    p.el.dispatchEvent(new Event('ended'))
    expect(player.getSnapshot().playingBasmala).toBe(false)
    expect(p.el.src).toBe(src(112, 1))
  })
})
