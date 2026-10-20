// تكرار الآية مع فاصل صامت بين التكرارات (للحفظ).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { player } from './audio'

let plays = 0
beforeEach(() => {
  plays = 0
  vi.useFakeTimers()
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(function (this: HTMLMediaElement) { plays++; return Promise.resolve() })
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {})
  vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => {})
})
afterEach(() => { player.stop(); vi.useRealTimers(); vi.restoreAllMocks() })

const el = () => (player as unknown as { el: HTMLAudioElement }).el
const ended = () => el().dispatchEvent(new Event('ended'))

describe('تكرار الآية بفاصل', () => {
  it('ينتظر الفاصل قبل إعادة الآية، ثم ينتقل للتالية بعد اكتمال التكرار', () => {
    player.setRepeat(2, false, 3)
    player.play({ reciterId: 'alafasy', surah: 112, surahName: 'الإخلاص', from: 1, to: 2, repeatEach: 2, repeatRange: false })
    // سورة الإخلاص تبدأ بالبسملة
    ended()
    expect(player.getSnapshot().ayah).toBe(1)
    const before = plays
    ended() // انتهت الآية 1 للمرة الأولى
    expect(player.getSnapshot().status).toBe('paused')
    vi.advanceTimersByTime(2900)
    expect(plays).toBe(before)
    vi.advanceTimersByTime(200)
    expect(plays).toBe(before + 1) // أُعيدت الآية 1
    expect(player.getSnapshot().ayah).toBe(1)
    ended() // اكتمل التكرار
    expect(player.getSnapshot().ayah).toBe(2)
  })

  it('بلا فاصل تُعاد الآية فورًا، والتشغيل أثناء الفاصل يتخطاه', () => {
    player.setRepeat(3, false, 0)
    player.play({ reciterId: 'alafasy', surah: 1, surahName: 'الفاتحة', from: 2, to: 2, repeatEach: 3, repeatRange: false })
    const before = plays
    ended()
    expect(plays).toBe(before + 1)
    player.setRepeat(3, false, 5)
    ended()
    expect(player.getSnapshot().status).toBe('paused')
    player.toggle() // يتخطى الفاصل
    expect(plays).toBe(before + 2)
    vi.advanceTimersByTime(6000)
    expect(plays).toBe(before + 2) // لا إعادة مزدوجة
  })

  it('الفاصل محصور بين 0 و30 ثانية', () => {
    player.setRepeat(2, false, 99)
    expect(player.getSnapshot().repeatGap).toBe(30)
    player.setRepeat(2, false, -4)
    expect(player.getSnapshot().repeatGap).toBe(0)
  })
})
