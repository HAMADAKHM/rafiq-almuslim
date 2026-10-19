import { describe, expect, it, vi } from 'vitest'
import { searchSkeleton, toArabicDigits } from './arabic'
import { dayKey, formatCountdown, formatHijri, shiftDayKey } from './dates'
import { groupEntries, getTafsirSurah } from '../services/tafsir'
import { checkReminders } from '../services/notifications'
import { DEFAULT_SETTINGS } from '../state/settings'
import { prayerTimesFor } from '../services/prayer'

describe('تطبيع النص العربي للبحث', () => {
  it('يتجاهل التشكيل وصور الهمزة والتاء المربوطة', () => {
    expect(searchSkeleton('الصَّلَاة')).toBe(searchSkeleton('الصلاه'))
    expect(searchSkeleton('أحمد')).toBe(searchSkeleton('احمد'))
    expect(searchSkeleton('إيمان')).toBe(searchSkeleton('ايمان'))
    expect(searchSkeleton('مسئول')).toBe(searchSkeleton('مسيول'))
  })
  it('أرقام عربية مشرقية', () => {
    expect(toArabicDigits(255)).toBe('٢٥٥')
  })
})

describe('التواريخ', () => {
  it('مفتاح اليوم حسب المنطقة الزمنية', () => {
    const d = new Date(Date.UTC(2026, 9, 19, 22, 30)) // 22:30 UTC
    expect(dayKey(d, 'UTC')).toBe('2026-10-19')
    expect(dayKey(d, 'Asia/Hebron')).toBe('2026-10-20')
    expect(dayKey(d, 'America/New_York')).toBe('2026-10-19')
  })
  it('التاريخ الهجري (أم القرى) مع إمكانية التعديل', () => {
    const d = new Date(Date.UTC(2026, 1, 18, 12)) // قرابة بداية رمضان 1447
    const h = formatHijri(d, 'Asia/Riyadh', 0, 'en')
    expect(h).toMatch(/1447/)
    expect(formatHijri(d, 'Asia/Riyadh', 1, 'en')).not.toBe(h)
  })
  it('العد التنازلي وإزاحة الأيام', () => {
    expect(formatCountdown(3_723_000)).toBe('01:02:03')
    expect(formatCountdown(-5)).toBe('00:00:00')
    expect(shiftDayKey('2026-12-31', 1)).toBe('2027-01-01')
  })
})

describe('التفسير', () => {
  it('يجمع النصوص المتكررة لعدة آيات في مقطع واحد', () => {
    expect(groupEntries([{ surah: 1, ayah: 1, text: 'أ' }, { surah: 1, ayah: 2, text: 'ب' }, { surah: 1, ayah: 3, text: 'ب' }]))
      .toEqual([{ from: 1, to: 1, text: 'أ' }, { from: 2, to: 3, text: 'ب' }])
  })
  it('يجرب المصدر البديل عند فشل الأول، ثم يحفظ النتيجة للقراءة دون اتصال', async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(new Response('x', { status: 503 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([{ surah: 112, ayah: 1, text: 'ت' }]), { status: 200 }))
    const r1 = await getTafsirSurah('test-ed', 112, fetcher as unknown as typeof fetch)
    expect(r1.fromCache).toBe(false)
    expect(fetcher).toHaveBeenCalledTimes(2)
    const r2 = await getTafsirSurah('test-ed', 112, vi.fn() as unknown as typeof fetch)
    expect(r2.fromCache).toBe(true)
    expect(r2.entries[0].text).toBe('ت')
  })
  it('رسالة خطأ مفهومة عند انقطاع الاتصال', async () => {
    const fetcher = vi.fn().mockRejectedValue(new TypeError('offline'))
    await expect(getTafsirSurah('other-ed', 2, fetcher as unknown as typeof fetch)).rejects.toThrow(/الاتصال/)
  })
})

describe('تنبيهات الصلاة', () => {
  const loc = { name: 'Nablus', nameAr: 'نابلس', country: 'PS', lat: 32.2211, lng: 35.2544, tz: 'Asia/Hebron', source: 'city' as const }
  const settings = { ...DEFAULT_SETTINGS, location: loc, notifications: { ...DEFAULT_SETTINGS.notifications, enabled: true } }
  it('ينبه عند دخول الوقت مرة واحدة فقط', () => {
    const t = prayerTimesFor(loc, { y: 2026, m: 10, d: 19 }, settings.prayer)
    const at = new Date(t.asr.getTime() + 10_000)
    const r = checkReminders(settings, at)
    expect(r.map((x) => x.title)).toEqual(['حان الآن وقت صلاة العصر'])
    expect(checkReminders(settings, new Date(at.getTime() + 20_000))).toEqual([])
  })
  it('لا تنبيه إن كانت التنبيهات معطلة أو الصلاة مستثناة', () => {
    const t = prayerTimesFor(loc, { y: 2026, m: 10, d: 20 }, settings.prayer)
    expect(checkReminders({ ...settings, notifications: { ...settings.notifications, enabled: false } }, new Date(t.dhuhr.getTime() + 5000))).toEqual([])
    const off = { ...settings, notifications: { ...settings.notifications, perPrayer: { ...settings.notifications.perPrayer, dhuhr: false } } }
    expect(checkReminders(off, new Date(t.dhuhr.getTime() + 5000))).toEqual([])
  })
})
