import { describe, expect, it } from 'vitest'
import { referenceText, versesText, wrap } from './studio'
import { GAP, frameAt, pickVideoMime, timeline, extFor } from './studioVideo'

describe('الاستوديو', () => {
  it('نص الآيات كما هو مع رقم كل آية', () => {
    const t = versesText([{ surah: 112, ayah: 1, text: 'نص١' }, { surah: 112, ayah: 2, text: 'نص٢' }])
    expect(t).toBe('نص١ ۝١ نص٢ ۝٢')
  })
  it('المرجع: آية واحدة أو نطاق', () => {
    expect(referenceText('الإخلاص', [{ surah: 112, ayah: 2, text: '' }])).toBe('سورة الإخلاص • الآية ٢')
    expect(referenceText('الكهف', [{ surah: 18, ayah: 1, text: '' }, { surah: 18, ayah: 4, text: '' }])).toBe('سورة الكهف • الآيات ١–٤')
  })
  it('تقسيم الأسطر لا يقطع الكلمات ولا يفقد أي كلمة', () => {
    const ctx = { measureText: (s: string) => ({ width: s.length * 10 }) as TextMetrics }
    const text = 'كلمة أخرى ثالثة رابعة خامسة سادسة'
    const lines = wrap(ctx, text, 120)
    expect(lines.join(' ')).toBe(text)
    expect(lines.every((l) => l.length * 10 <= 120 || !l.includes(' '))).toBe(true)
  })
})

describe('فيديو الآيات', () => {
  it('جدول التوقيت بفواصل بين الآيات', () => {
    const tl = timeline([2, 3])
    expect(tl[0]).toEqual({ start: 0, end: 2 })
    expect(tl[1].start).toBeCloseTo(2 + GAP)
    expect(tl[1].end).toBeCloseTo(5 + GAP)
  })
  it('الآية المعروضة تتبع التلاوة مع ظهور واختفاء تدريجي', () => {
    const tl = timeline([2, 3])
    expect(frameAt(tl, 0)).toEqual({ index: 0, alpha: 0 })
    expect(frameAt(tl, 1).index).toBe(0)
    expect(frameAt(tl, 1).alpha).toBe(1)
    expect(frameAt(tl, 2 + GAP + 0.5).index).toBe(1)
    expect(frameAt(tl, 100).index).toBe(1)
  })
  it('اختيار صيغة الفيديو: MP4 أولًا ثم WebM', () => {
    expect(pickVideoMime((t) => t.startsWith('video/webm'))).toMatch(/^video\/webm/)
    expect(pickVideoMime(() => true)).toMatch(/^video\/mp4/)
    expect(pickVideoMime(() => false)).toBeNull()
    expect(extFor('video/mp4;codecs=avc1')).toBe('mp4')
    expect(extFor('video/webm')).toBe('webm')
  })
})
