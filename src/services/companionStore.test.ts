// «آخر قراءة فعلية» والأذكار المكتملة: تُحفظ على الجهاز وتبقى بعد إعادة الفتح، ولا تمس «أكمل قراءتك».
import { beforeEach, describe, expect, it } from 'vitest'
import { kv } from '../db/repos'
import { clearAll } from '../db/backup'
import { exportAll, importAll } from '../db/backup'
import { ACTUAL_KEY, loadActualDays, loadDoneToday, loadPosition, markDhikrDone, restoreActualFromLast, saveActual } from './companionStore'

beforeEach(async () => { await clearAll() })

describe('آخر قراءة فعلية', () => {
  it('بلا قراءة فعلية يُستخدم آخر موضع مفتوح للإشعار', async () => {
    expect(await loadPosition()).toBeNull()
    await kv.set('quran:last', { surah: 2, ayah: 30, at: 5, page: 5 })
    expect(await loadPosition()).toMatchObject({ surah: 2, ayah: 30, page: 5 })
  })
  it('القراءة الفعلية مقدَّمة، و«أكمل قراءتك» لا يتغير بها', async () => {
    await kv.set('quran:last', { surah: 2, ayah: 30, at: 5, page: 5 })
    await saveActual({ surah: 18, ayah: 10, page: 294, juz: 15, surahName: 'الكهف', at: Date.now() })
    expect(await loadPosition()).toMatchObject({ surah: 18, page: 294, juz: 15 })
    expect(await kv.get('quran:last', null)).toMatchObject({ surah: 2, ayah: 30 })
  })
  it('أيام القراءة: الصفحات المختلفة في اليوم بلا تكرار', async () => {
    const at = Date.now()
    await saveActual({ surah: 1, ayah: 1, page: 1, at })
    await saveActual({ surah: 2, ayah: 1, page: 2, at })
    await saveActual({ surah: 2, ayah: 1, page: 2, at })
    const days = await loadActualDays()
    expect(Object.values(days)[0].sort()).toEqual([1, 2])
  })
  it('الاستعادة اليدوية تعتمد آخر موضع مفتوح', async () => {
    expect(await restoreActualFromLast()).toBeNull()
    await kv.set('quran:last', { surah: 36, ayah: 1, at: 5, page: 440 })
    await restoreActualFromLast()
    expect(await kv.get(ACTUAL_KEY, null)).toMatchObject({ surah: 36, page: 440 })
  })
  it('يبقى الموضع بعد النسخ الاحتياطي والاستعادة (تحديث التطبيق أو نقل الجهاز)', async () => {
    await saveActual({ surah: 18, ayah: 10, page: 294, at: Date.now() })
    const backup = await exportAll()
    await clearAll()
    expect(await kv.get(ACTUAL_KEY, null)).toBeNull()
    await importAll(backup)
    expect(await kv.get(ACTUAL_KEY, null)).toMatchObject({ surah: 18, page: 294 })
  })
})

describe('الأذكار المكتملة اليوم', () => {
  it('تُسجل مرة واحدة لكل ذكر', async () => {
    await markDhikrDone('s-short')
    await markDhikrDone('s-short')
    await markDhikrDone('s-istighfar')
    expect((await loadDoneToday()).ids).toEqual(['s-short', 's-istighfar'])
  })
  it('سجل يوم سابق لا يُحتسب اليوم', async () => {
    await kv.set('companion:done', { date: '2000-01-01', ids: ['s-short'] })
    expect((await loadDoneToday()).ids).toEqual([])
  })
})

describe('ملخص القراءة الفعلية والأذكار', () => {
  it('أسبوعي وشهري، بلا تكرار للصفحة في اليوم نفسه، ودون أيام خارج المدى', async () => {
    const { companionSummary } = await import('./companionStore')
    const s = companionSummary(
      { '2026-10-29': [1, 2], '2026-10-20': [5], '2026-08-01': [9] },
      { '2026-10-29': [2, 3] },
      { '2026-10-29': 3, '2026-10-10': 2 },
      '2026-10-29',
    )
    expect(s.week).toEqual({ readingDays: 1, pages: 3, adhkar: 3 })
    expect(s.month).toEqual({ readingDays: 2, pages: 4, adhkar: 5 })
  })
  it('إتمام ذكر يُسجَّل في السجل اليومي مرة واحدة', async () => {
    const { loadDoneDays } = await import('./companionStore')
    await markDhikrDone('s-short')
    await markDhikrDone('s-short')
    expect(Object.values(await loadDoneDays())).toEqual([1])
  })
})
