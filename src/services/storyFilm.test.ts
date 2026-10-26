import { describe, expect, it } from 'vitest'
import { cueAt, filmTimeline, meaningSeconds, sceneTheme } from './storyFilm'

describe('وضع الفيلم', () => {
  const scenes = [{ from: 1, to: 2, text: 'معنى قصير' }, { from: 3, to: 3, text: 'معنى آخر أطول قليلًا من الأول' }]
  it('جدول الفيلم: كل آية بمدة تلاوتها ثم المعنى', () => {
    const tl = filmTimeline(scenes, (a) => a)
    expect(tl.map((c) => (c.kind === 'ayah' ? `a${c.ayah}` : `m${c.scene}`))).toEqual(['a1', 'a2', 'm0', 'a3', 'm1'])
    expect(tl[0].end - tl[0].start).toBe(1)
    expect(tl[2].end - tl[2].start).toBeCloseTo(meaningSeconds('معنى قصير'))
    expect(tl.every((c, i) => i === 0 || c.start >= tl[i - 1].end)).toBe(true)
  })
  it('المقطع الظاهر في لحظة ما', () => {
    const tl = filmTimeline(scenes, () => 3)
    expect(cueAt(tl, 0.1).cue).toMatchObject({ kind: 'ayah', ayah: 1 })
    expect(cueAt(tl, tl[2].start + 1).cue).toMatchObject({ kind: 'meaning', scene: 0 })
    expect(cueAt(tl, 1e6).cue).toMatchObject({ kind: 'meaning', scene: 1 })
  })
  it('خلفية المشهد من كلماته، وإلا من لون القصة', () => {
    expect(sceneTheme('فَالْتَقَمَهُ الْحُوتُ في البحر', 'night')).toBe('sea')
    expect(sceneTheme('نص بلا كلمات حسية', 'day')).toBe('garden')
  })
})

describe('صوت المعنى في الفيديو', () => {
  it('مدة المعنى = مدة صوته عند توفره، وإلا بحسب طول النص', () => {
    const scenes = [{ from: 1, to: 1, text: 'نص' }, { from: 2, to: 2, text: 'نص آخر' }]
    const tl = filmTimeline(scenes, () => 2, (i) => (i === 0 ? 9 : null))
    const m0 = tl.find((c) => c.kind === 'meaning' && c.scene === 0)!
    const m1 = tl.find((c) => c.kind === 'meaning' && c.scene === 1)!
    expect(m0.end - m0.start).toBeCloseTo(9.8)
    expect(m1.end - m1.start).toBeCloseTo(meaningSeconds('نص آخر'))
  })
})
