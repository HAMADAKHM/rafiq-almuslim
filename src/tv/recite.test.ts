import { describe, expect, it } from 'vitest'
import { nextSurah, reciteQueue } from './recite'
import { ayahOfDay } from '../services/daily'

const meta = { surahs: Array.from({ length: 114 }, (_, i) => ({ n: i + 1, name: String(i + 1), count: i === 0 ? 7 : i === 111 ? 4 : 10 })) } as never

describe('تلاوة شاشة التلفاز', () => {
  it('آية اليوم آية واحدة هي آية اليوم نفسها', () => {
    expect(reciteQueue('ayah', meta, { day: '2026-10-22', hour: 9, surah: 1 })).toEqual([ayahOfDay('2026-10-22')])
  })
  it('التلاوة المتواصلة من الموضع المحفوظ إلى آخر السورة، ثم السورة التالية', () => {
    const q = reciteQueue('surah', meta, { day: '2026-10-22', hour: 9, surah: 112, from: 3 })
    expect(q).toEqual([{ surah: 112, ayah: 3 }, { surah: 112, ayah: 4 }])
    expect(nextSurah(112)).toBe(113)
    // من أول السورة: البسملة أولًا (عدا الفاتحة والتوبة)
    expect(reciteQueue('surah', meta, { day: '2026-10-22', hour: 9, surah: 112 })[0]).toEqual({ surah: 112, ayah: 0 })
    expect(reciteQueue('surah', meta, { day: '2026-10-22', hour: 9, surah: 9 })[0]).toEqual({ surah: 9, ayah: 1 })
    expect(reciteQueue('surah', meta, { day: '2026-10-22', hour: 9, surah: 1 })[0]).toEqual({ surah: 1, ayah: 1 })
    expect(nextSurah(114)).toBe(1)
  })
  it('آيات الأذكار من المصحف فقط، بحسب وقت اليوم (الصباح فيه آية الكرسي)', () => {
    const q = reciteQueue('adhkar', meta, { day: '2026-10-22', hour: 7, surah: 1 })
    expect(q.length).toBeGreaterThan(0)
    expect(q).toContainEqual({ surah: 2, ayah: 255 })
  })
})

describe('خيارات الاستماع', () => {
  it('من سورة وما بعدها: التالية بالترتيب، وبعد الناس الفاتحة', async () => {
    const { followingSurah } = await import('./recite')
    expect(followingSurah('surah', 18, [])).toBe(19)
    expect(followingSurah('surah', 114, [])).toBe(1)
  })
  it('سورة واحدة تتكرر', async () => {
    const { followingSurah } = await import('./recite')
    expect(followingSurah('one', 67, [])).toBe(67)
  })
  it('سور مختارة: بالترتيب ثم تعود لأولها', async () => {
    const { followingSurah } = await import('./recite')
    expect(followingSurah('list', 18, [18, 36, 67])).toBe(36)
    expect(followingSurah('list', 67, [18, 36, 67])).toBe(18)
  })
})
