import { describe, expect, it } from 'vitest'
import { addSaved, MAX_SAVED, portableStyle } from './studioSaved'
import type { StudioStyle } from './studio'

const style: StudioStyle = { format: 'square', bg: 'emerald', textScale: 1, showRef: true, showBrand: true }

describe('تصاميمي', () => {
  it('لا تُحفظ صورة المستخدم أو فيديوه', () => {
    expect(portableStyle({ ...style, bg: 'photo' }).bg).toBe('scene-sunset')
    expect(portableStyle({ ...style, bg: 'video' }).bg).toBe('scene-sunset')
    expect(portableStyle(style).bg).toBe('emerald')
  })
  it('الأحدث أولًا دون تكرار وبحد أقصى', () => {
    let l = addSaved([], { title: 'أ', source: 'ayah', surah: 1, from: 1, to: 7, style }, 1)
    l = addSaved(l, { title: 'ب', source: 'hadith', category: 'jawami', item: 'h-niyyah', style }, 2)
    l = addSaved(l, { title: 'أ', source: 'ayah', surah: 1, from: 1, to: 7, style }, 3)
    expect(l.map((x) => x.title)).toEqual(['أ', 'ب'])
    for (let i = 0; i < MAX_SAVED + 5; i++) l = addSaved(l, { title: String(i), source: 'ayah', surah: 2, from: i + 1, to: i + 1, style }, 10 + i)
    expect(l).toHaveLength(MAX_SAVED)
  })
  it('لا يُخزَّن النص نفسه', () => {
    const [d] = addSaved([], { title: 'x', source: 'ayah', surah: 1, from: 1, to: 1, style }, 1)
    expect(Object.keys(d)).not.toContain('text')
  })
})
