// اختبارات التخزين المحلي: الحفظ والاسترجاع، النسخ الاحتياطي والاستعادة، خطة الورد والإحصائيات.
import { describe, expect, it, beforeEach } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { adhkarLog, bookmarks, kv, memo, notes, reading, favorites } from './repos'
import { exportAll, importAll, clearAll, validateBackup } from './backup'
import { resetDbForTests } from './db'
import { completeWird, DEFAULT_WIRD, getWird, saveWird, suggestPlan } from '../services/plans'
import { computeStats, dailySeries } from '../services/stats'
import { initialSrs } from '../services/srs'
import type { QuranMeta } from '../services/quran'
import { mergeSettings, DEFAULT_SETTINGS } from '../state/settings'

const meta: QuranMeta = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../public/data/quran/meta.json'), 'utf8'))

beforeEach(async () => {
  await clearAll()
})

describe('المستودعات', () => {
  it('العلامات المرجعية: إضافة وإزالة', async () => {
    expect(await bookmarks.toggle(2, 255)).toBe(true)
    expect((await bookmarks.all()).map((b) => b.id)).toEqual(['2:255'])
    expect(await bookmarks.toggle(2, 255)).toBe(false)
    expect(await bookmarks.all()).toEqual([])
  })
  it('الملاحظات: حفظ وتعديل وحذف', async () => {
    await notes.save({ surah: 1, ayah: 1, text: 'تأمل' })
    const [n] = await notes.forAyah(1, 1)
    await notes.save({ ...n, text: 'تأمل معدل' })
    expect((await notes.all()).map((x) => x.text)).toEqual(['تأمل معدل'])
    await notes.remove(n.id!)
    expect(await notes.all()).toEqual([])
  })
  it('البيانات تبقى بعد إغلاق قاعدة البيانات وإعادة فتحها', async () => {
    await kv.set('quran:last', { surah: 18, ayah: 10, at: 1 })
    await favorites.toggle('dhikr', 'm-kursi')
    await resetDbForTests()
    expect(await kv.get('quran:last', null)).toEqual({ surah: 18, ayah: 10, at: 1 })
    expect((await favorites.all()).map((f) => f.id)).toEqual(['dhikr:m-kursi'])
  })
})

describe('النسخ الاحتياطي والاستعادة', () => {
  it('تصدير ثم حذف ثم استعادة يعيد كل البيانات', async () => {
    await kv.set('settings', { theme: 'dark' })
    await bookmarks.toggle(36, 1)
    await memo.add([{ surah: 114, from: 1, to: 3, createdAt: 1, ...initialSrs('2026-10-19') }])
    await reading.log({ date: '2026-10-19', surah: 1, from: 1, to: 7, ayahs: 7, pages: [1] })
    const b = JSON.parse(JSON.stringify(await exportAll()))
    expect(validateBackup(b)).toBe(true)
    await clearAll()
    expect(await bookmarks.all()).toEqual([])
    await importAll(b)
    expect((await bookmarks.all())[0].id).toBe('36:1')
    expect(await kv.get('settings', null)).toEqual({ theme: 'dark' })
    expect(await memo.all()).toHaveLength(1)
    expect(await reading.all()).toHaveLength(1)
  })
  it('يرفض الملفات غير الصالحة', async () => {
    await expect(importAll({ hello: 1 })).rejects.toThrow()
    await expect(importAll({ format: 'islamic-companion-backup', version: 99, data: {}, kvKeys: [] })).rejects.toThrow()
  })
})

describe('ورد اليوم', () => {
  it('إتمام الورد يسجل الصفحات ويتقدم بالمؤشر', async () => {
    await saveWird({ ...DEFAULT_WIRD, pagesPerDay: 2, startedAt: '2026-10-19' })
    const p = await completeWird((await getWird())!, meta, '2026-10-19')
    expect(p.nextPage).toBe(3)
    expect(p.lastDone).toBe('2026-10-19')
    const logs = await reading.all()
    expect(logs.flatMap((l) => l.pages).sort()).toEqual([1, 2])
    // الصفحة 1 = الفاتحة (7 آيات) والصفحة 2 = البقرة 1–5
    expect(logs.reduce((n, l) => n + l.ayahs, 0)).toBe(12)
  })
  it('إكمال الصفحة 604 يحتسب ختمة ويعود للبداية', async () => {
    const p = await completeWird({ ...DEFAULT_WIRD, nextPage: 603, pagesPerDay: 5 }, meta, '2026-10-19')
    expect(p.khatmas).toBe(1)
    expect(p.nextPage).toBe(1)
  })
  it('اقتراح البرامج حسب الوقت', () => {
    expect(suggestPlan('regular-reading', 25).pagesPerDay).toBe(10)
    expect(suggestPlan('return', 5).pagesPerDay).toBe(1)
    expect(suggestPlan('memorize', 30).memorizeAyahs).toBe(5)
  })
})

describe('الإحصائيات مبنية على السجل الفعلي فقط', () => {
  it('بلا بيانات: كل القيم صفر', () => {
    const s = computeStats([], [], [], [], '2026-10-19')
    expect([s.readingDays, s.ayahsRead, s.pagesRead, s.reviewsDone, s.adhkarDone, s.streak]).toEqual([0, 0, 0, 0, 0, 0])
  })
  it('لا تُحسب الآية نفسها مرتين في اليوم نفسه، والأيام المتتالية صحيحة', async () => {
    await reading.log({ date: '2026-10-18', surah: 1, from: 1, to: 7, ayahs: 7, pages: [1] })
    await reading.log({ date: '2026-10-19', surah: 1, from: 1, to: 7, ayahs: 7, pages: [1] })
    await reading.log({ date: '2026-10-19', surah: 1, from: 5, to: 7, ayahs: 3, pages: [1] })
    await adhkarLog.complete('2026-10-19', 'morning')
    const s = computeStats(await reading.all(), [], [], await adhkarLog.all(), '2026-10-19')
    expect(s.ayahsRead).toBe(14)
    expect(s.readingDays).toBe(2)
    expect(s.pagesRead).toBe(1)
    expect(s.streak).toBe(2)
    const series = dailySeries(await reading.all(), [], await adhkarLog.all(), '2026-10-19', 7)
    expect(series.at(-1)).toMatchObject({ date: '2026-10-19', ayahs: 7, adhkar: 1 })
  })
})

describe('الإعدادات', () => {
  it('الدمج مع القيم الافتراضية للإعدادات القديمة', () => {
    const s = mergeSettings({ theme: 'dark', prayer: { method: 'Egyptian' } as never })
    expect(s.theme).toBe('dark')
    expect(s.prayer.method).toBe('Egyptian')
    expect(s.prayer.adjustments).toEqual(DEFAULT_SETTINGS.prayer.adjustments)
    expect(s.notifications.perPrayer.fajr).toBe(true)
  })
})
