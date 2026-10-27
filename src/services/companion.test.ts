// «رفيقي يذكّرني» (رفيق بلس): الذكر الدوري، وموعدي مع القرآن، وقرب خروج وقت الصلاة.
import { afterEach, describe, expect, it } from 'vitest'
import { buildSchedule, MAX_SCHEDULED, type Reminder } from './reminders'
import { mergeSettings, type CompanionSettings, type Settings } from '../state/settings'
import { setPlusActive } from '../billing/active'
import { buildResumeWidgetData, companionPool, intervalMinutes, isSnoozeId, pickForSlot, positionRoute, positionText, prayerEnds, snoozeId } from './companion'
import { prayerTimesFor } from './prayer'

const TZ = 'Asia/Hebron'
const loc = { name: 'Nablus', nameAr: 'نابلس', country: 'PS', lat: 32.2211, lng: 35.2544, tz: TZ, source: 'city' as const }
const hm = (d: Date) => new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(d)
const wd = (d: Date) => new Intl.DateTimeFormat('en-GB', { timeZone: TZ, weekday: 'long' }).format(d)

function withCompanion(p: { adhkar?: Partial<CompanionSettings['adhkar']>; quran?: Partial<CompanionSettings['quran']>; prayerEnd?: Partial<CompanionSettings['prayerEnd']> }, extra: Partial<Settings> = {}): Settings {
  const d = mergeSettings(null)
  return mergeSettings({
    ...extra,
    location: loc,
    notifications: { ...d.notifications, enabled: true, ...extra.notifications },
    companion: { adhkar: { ...d.companion.adhkar, ...p.adhkar }, quran: { ...d.companion.quran, ...p.quran }, prayerEnd: { ...d.companion.prayerEnd, ...p.prayerEnd } },
  })
}
// الخميس 2026-10-29 الساعة 08:00 بتوقيت نابلس
const from = new Date('2026-10-29T06:00:00Z')
const of = (list: Reminder[], kind: Reminder['kind']) => list.filter((r) => r.kind === kind)

afterEach(() => setPlusActive(false))

describe('الإعدادات', () => {
  it('الإعدادات القديمة بلا companion تُدمج بالقيم الافتراضية دون فقدان شيء', () => {
    const s = mergeSettings({ customReminders: [{ id: 'x', title: 't', time: '10:00', days: [1], route: '/', enabled: true }] } as never)
    expect(s.companion.adhkar.enabled).toBe(false)
    expect(s.companion.quran.times).toEqual(['21:00'])
    expect(s.customReminders).toHaveLength(1)
  })
  it('حقل ناقص داخل companion يُكمل من الافتراضي', () => {
    const s = mergeSettings({ companion: { adhkar: { enabled: true } } } as never)
    expect(s.companion.adhkar.interval).toBe(60)
    expect(s.companion.prayerEnd.perPrayer.isha).toBe(true)
  })
})

describe('الذكر الدوري', () => {
  it('دون اشتراك لا يُجدول شيء من «رفيقي يذكّرني»', () => {
    const s = withCompanion({ adhkar: { enabled: true }, quran: { enabled: true }, prayerEnd: { enabled: true } })
    const list = buildSchedule(s, from, 7)
    expect(list.filter((r) => ['dhikr-interval', 'quran-time', 'prayer-end'].includes(r.kind))).toHaveLength(0)
  })

  it('كل ساعة من 9 إلى 12: أربعة تذكيرات اليوم، داخل الساعات المحددة فقط', () => {
    setPlusActive(true)
    const s = withCompanion({ adhkar: { enabled: true, interval: 60, start: '09:00', end: '12:00' } })
    const iv = of(buildSchedule(s, from, 1), 'dhikr-interval')
    expect(iv.map((r) => hm(r.at))).toEqual(['09:00', '10:00', '11:00', '12:00'])
    expect(iv.every((r) => r.route.startsWith('/companion/dhikr/') && r.actions === 'dhikr')).toBe(true)
  })

  it('تغيير الفترة يستبدل المواعيد القديمة كلها (لا يبقى منها شيء)', () => {
    setPlusActive(true)
    const a = of(buildSchedule(withCompanion({ adhkar: { enabled: true, interval: 60, start: '09:00', end: '12:00' } }), from, 1), 'dhikr-interval')
    const b = of(buildSchedule(withCompanion({ adhkar: { enabled: true, interval: 30, start: '09:00', end: '12:00' } }), from, 1), 'dhikr-interval')
    expect(b.map((r) => hm(r.at))).toEqual(['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00'])
    // الجدول يُبنى من الإعدادات فقط؛ والجدولة على الهاتف تلغي كل المعلّق قبل وضع الجديد
    expect(new Set(b.map((r) => r.id)).size).toBe(b.length)
    expect(a.length).toBe(4)
  })

  it('لا يتكرر الذكر نفسه في تذكيرين متتاليين', () => {
    setPlusActive(true)
    const iv = of(buildSchedule(withCompanion({ adhkar: { enabled: true, interval: 15, start: '09:00', end: '20:00' } }), from, 1), 'dhikr-interval')
    expect(iv.length).toBeGreaterThan(10)
    for (let i = 1; i < iv.length; i++) expect(iv[i].itemId).not.toBe(iv[i - 1].itemId)
  })

  it('الذكر الذي أكمله المستخدم اليوم لا يُعاد عليه اليوم', () => {
    setPlusActive(true)
    const s = withCompanion({ adhkar: { enabled: true, interval: 30, start: '09:00', end: '20:00', groups: ['salawat'] } })
    const first = of(buildSchedule(s, from, 1), 'dhikr-interval')[0].itemId!
    const after = of(buildSchedule(s, from, 1, { doneToday: { date: '2026-10-29', ids: [first] } }), 'dhikr-interval')
    expect(after.some((r) => r.itemId === first)).toBe(false)
    // سجل يوم سابق لا يؤثر
    const stale = of(buildSchedule(s, from, 1, { doneToday: { date: '2026-10-28', ids: [first] } }), 'dhikr-interval')
    expect(stale.some((r) => r.itemId === first)).toBe(true)
  })

  it('الأيام المختارة فقط', () => {
    setPlusActive(true)
    const iv = of(buildSchedule(withCompanion({ adhkar: { enabled: true, interval: 120, start: '09:00', end: '13:00', days: [5] } }), from, 3), 'dhikr-interval')
    expect(iv.length).toBeGreaterThan(0)
    expect(iv.every((r) => wd(r.at) === 'Friday')).toBe(true)
  })

  it('الإيقاف المؤقت ساعة يحذف ما قبلها فقط، والاستئناف يعيدها', () => {
    setPlusActive(true)
    const pausedUntil = new Date('2026-10-29T08:30:00Z').getTime() // 10:30 بتوقيت نابلس
    const iv = of(buildSchedule(withCompanion({ adhkar: { enabled: true, interval: 60, start: '09:00', end: '12:00', pausedUntil } }), from, 1), 'dhikr-interval')
    expect(iv.map((r) => hm(r.at))).toEqual(['11:00', '12:00'])
    const resumed = of(buildSchedule(withCompanion({ adhkar: { enabled: true, interval: 60, start: '09:00', end: '12:00', pausedUntil: null } }), from, 1), 'dhikr-interval')
    expect(resumed).toHaveLength(4)
  })

  it('فترة الهدوء العامة تمنع الذكر الدوري، ووضع التقليل يوقفه', () => {
    setPlusActive(true)
    const d = mergeSettings(null).notifications
    const quiet = withCompanion({ adhkar: { enabled: true, interval: 60, start: '09:00', end: '12:00' } }, { notifications: { ...d, enabled: true, quiet: { enabled: true, start: '10:30', end: '11:30' } } })
    expect(of(buildSchedule(quiet, from, 1), 'dhikr-interval').map((r) => hm(r.at))).toEqual(['09:00', '10:00', '12:00'])
    const reduce = withCompanion({ adhkar: { enabled: true } }, { notifications: { ...d, enabled: true, reduce: true } })
    expect(of(buildSchedule(reduce, from, 1), 'dhikr-interval')).toHaveLength(0)
  })

  it('الذكر الدوري لا يتجاوز 48 ساعة، ولا يُخرج تذكيرات الصلاة من حد الإشعارات', () => {
    setPlusActive(true)
    const s = withCompanion({ adhkar: { enabled: true, interval: 15, start: '05:00', end: '23:00' } })
    const list = buildSchedule(s, from, 7)
    expect(list.length).toBeLessThanOrEqual(MAX_SCHEDULED)
    const iv = of(list, 'dhikr-interval')
    expect(iv.every((r) => r.at.getTime() <= from.getTime() + 48 * 3600_000)).toBe(true)
    // صلوات الـ48 ساعة القادمة كلها موجودة
    const prayers48 = of(list, 'prayer').filter((r) => r.at.getTime() <= from.getTime() + 48 * 3600_000)
    expect(prayers48.length).toBeGreaterThanOrEqual(9)
    expect(new Set(list.map((r) => r.id)).size).toBe(list.length)
  })

  it('بلا ذكر دوري يبقى الجدول كما كان تمامًا', () => {
    setPlusActive(true)
    const before = buildSchedule(withCompanion({}), from, 7)
    setPlusActive(false)
    const free = buildSchedule(withCompanion({}), from, 7)
    expect(before.map((r) => r.id)).toEqual(free.map((r) => r.id))
  })

  it('مجموعات الأذكار: نصوص من محتوى التطبيق بمصادرها، بلا آيات وبلا أذكار المناسبات', () => {
    const pool = companionPool(['salawat', 'istighfar', 'sunnah'])
    expect(pool.length).toBeGreaterThan(5)
    expect(pool.every((p) => p.item.text && p.item.source && p.item.kind !== 'quran')).toBe(true)
    expect(pool.some((p) => p.item.id === 'x-rain')).toBe(false)
    expect(pickForSlot([], 3, new Set())).toBeNull()
  })

  it('نهاية بعد البداية فقط', () => {
    expect(intervalMinutes('12:00', '09:00', 60)).toEqual([])
    expect(intervalMinutes('09:00', '09:00', 60)).toEqual([])
  })
})

describe('موعدي مع القرآن', () => {
  it('في المواعيد المختارة، بنص الموضع المحفوظ، ويفتح المصحف عنده', () => {
    setPlusActive(true)
    const s = withCompanion({ quran: { enabled: true, times: ['18:00', '21:00'], amount: { unit: 'pages', value: 4 } } })
    const position = { surah: 18, ayah: 10, page: 294, surahName: 'الكهف', at: 1 }
    const q = of(buildSchedule(s, from, 1, { position }), 'quran-time')
    expect(q.map((r) => hm(r.at))).toEqual(['18:00', '21:00'])
    expect(q[0].title).toBe('حان موعدك مع القرآن')
    expect(q[0].body).toContain('سورة الكهف، صفحة 294، الآية 10')
    expect(q[0].body).toContain('4 صفحات')
    expect(q[0].route).toBe('/mushaf/294?s=18&a=10')
    expect(q[0].actions).toBe('quran')
  })
  it('بلا موضع محفوظ: يفتح فهرس القرآن', () => {
    expect(positionRoute(null)).toBe('/quran')
    expect(positionText(null)).toBe('ابدأ وردك من حيث تحب')
    expect(positionRoute({ surah: 2, ayah: 5, at: 1 })).toBe('/quran/2?ayah=5')
  })
  it('الأيام المختارة فقط، والموقوف لا يُجدول', () => {
    setPlusActive(true)
    const q = of(buildSchedule(withCompanion({ quran: { enabled: true, days: [5] } }), from, 7), 'quran-time')
    expect(q.length).toBe(1)
    expect(wd(q[0].at)).toBe('Friday')
    expect(of(buildSchedule(withCompanion({ quran: { enabled: false } }), from, 7), 'quran-time')).toHaveLength(0)
  })
  it('معرّف «ذكّرني لاحقًا» في نطاق لا تلغيه إعادة الجدولة ولا يصطدم بالمعرّفات الأخرى', () => {
    setPlusActive(true)
    const id = snoozeId(new Date())
    expect(isSnoozeId(id)).toBe(true)
    expect(id).toBeLessThan(2 ** 31)
    const list = buildSchedule(withCompanion({ adhkar: { enabled: true, interval: 15, start: '05:00', end: '23:00' }, quran: { enabled: true } }), from, 7)
    expect(list.every((r) => !isSnoozeId(r.id) && r.id < 2 ** 31)).toBe(true)
  })
})

describe('قرب خروج وقت الصلاة', () => {
  it('قبل نهاية الوقت بالدقائق المختارة: الفجر بالشروق، والعشاء بمنتصف الليل', () => {
    setPlusActive(true)
    const s = withCompanion({ prayerEnd: { enabled: true, minutesBefore: 20 } })
    const list = of(buildSchedule(s, new Date('2026-10-28T22:00:00Z'), 1), 'prayer-end')
    const day = { y: 2026, m: 10, d: 29 }
    const t = prayerTimesFor(loc, day, s.prayer)
    const ends = prayerEnds(t, prayerTimesFor(loc, { y: 2026, m: 10, d: 30 }, s.prayer).fajr)
    const fajr = list.find((r) => r.prayer === 'fajr')!
    expect(fajr.at.getTime()).toBe(t.sunrise.getTime() - 20 * 60_000)
    expect(list.find((r) => r.prayer === 'dhuhr')!.at.getTime()).toBe(t.asr.getTime() - 20 * 60_000)
    expect(list.find((r) => r.prayer === 'isha')!.at.getTime()).toBe(ends.isha.getTime() - 20 * 60_000)
    expect(ends.isha.getTime()).toBeGreaterThan(t.isha.getTime())
    expect(fajr.title).toBe('اقترب خروج وقت صلاة الفجر')
  })
  it('لا يُجدول للصلوات غير المختارة، ولا يتجاوز فترة الهدوء (مثل الصلاة)', () => {
    setPlusActive(true)
    const d = mergeSettings(null).notifications
    const s = withCompanion({ prayerEnd: { enabled: true, perPrayer: { fajr: false, dhuhr: true, asr: false, maghrib: false, isha: false } } }, { notifications: { ...d, enabled: true, quiet: { enabled: true, start: '00:00', end: '23:59' } } })
    const list = of(buildSchedule(s, new Date('2026-10-28T22:00:00Z'), 1), 'prayer-end')
    expect(list.map((r) => r.prayer)).toEqual(['dhuhr'])
  })
  it('مدة أطول من الوقت نفسه لا تنتج تذكيرًا قبل دخول الصلاة', () => {
    setPlusActive(true)
    const s = withCompanion({ prayerEnd: { enabled: true, minutesBefore: 600 } })
    const day = { y: 2026, m: 10, d: 29 }
    const t = prayerTimesFor(loc, day, s.prayer)
    const list = of(buildSchedule(s, new Date('2026-10-28T22:00:00Z'), 1), 'prayer-end')
    for (const r of list) expect(r.at.getTime()).toBeGreaterThan(t[r.prayer!].getTime())
  })
})

describe('ودجت «أكمل من حيث وصلت»', () => {
  it('دون اشتراك: بطاقة القفل فقط بلا بيانات قراءة', () => {
    expect(buildResumeWidgetData({ surah: 18, ayah: 10, page: 294, at: 1 }, 40, false)).toEqual({ entitled: false })
  })
  it('بلا موضع: يدعو للقراءة ويفتح الفهرس', () => {
    expect(buildResumeWidgetData(null, null, true)).toEqual({ entitled: true, surah: null, route: '/quran' })
  })
  it('يعرض السورة والصفحة والجزء والآية وتاريخ القراءة وتقدم الختمة، ويفتح الموضع نفسه', () => {
    const now = new Date('2026-10-29T12:00:00Z')
    const d = buildResumeWidgetData({ surah: 18, ayah: 10, page: 294, juz: 15, surahName: 'الكهف', at: now.getTime() - 3600_000 }, 42.4, true, TZ, now) as Record<string, unknown>
    expect(d.surah).toBe('سورة الكهف')
    expect(d.where).toBe('صفحة ٢٩٤ • الجزء ١٥ • الآية ١٠')
    expect(d.date).toBe('آخر قراءة: اليوم')
    expect(d.percent).toBe(42)
    expect(d.route).toBe('/mushaf/294?s=18&a=10')
    const y = buildResumeWidgetData({ surah: 1, ayah: 1, page: 1, at: now.getTime() - 86_400_000 }, null, true, TZ, now) as Record<string, unknown>
    expect(y.date).toBe('آخر قراءة: أمس')
    expect(y.percent).toBeNull()
  })
})

describe('الهدف الصغير ووضع السفر وتقدير الختمة', () => {
  it('الهدف: صفحات مختلفة وأذكار، بنسبة لا تتجاوز 100٪', async () => {
    const { goalProgress } = await import('./companion')
    expect(goalProgress({ pages: 2, adhkar: 4 }, { pages: [5, 5, 6, 7], adhkar: 2 })).toMatchObject({ pagesDone: 3, adhkarDone: 2, percent: 0.75 })
    expect(goalProgress({ pages: 0, adhkar: 0 }, { pages: [], adhkar: 0 }).percent).toBe(0)
  })
  it('وضع السفر يوقف الذكر الدوري وموعد القرآن ويُبقي تذكيرات الصلاة', () => {
    setPlusActive(true)
    const s = withCompanion({ adhkar: { enabled: true, interval: 60, start: '09:00', end: '12:00' }, quran: { enabled: true } })
    const on = { ...s, companion: { ...s.companion, travel: { enabled: true, until: null } } }
    const list = buildSchedule(on, from, 2)
    expect(of(list, 'dhikr-interval')).toHaveLength(0)
    expect(of(list, 'quran-time')).toHaveLength(0)
    expect(of(list, 'prayer').length).toBeGreaterThan(0)
    // ينتهي تلقائيًا في التاريخ المحدد
    const until = { ...s, companion: { ...s.companion, travel: { enabled: true, until: new Date('2026-10-29T08:30:00Z').getTime() } } }
    expect(of(buildSchedule(until, from, 1), 'dhikr-interval').map((r) => hm(r.at))).toEqual(['11:00', '12:00'])
  })
  it('تقدير الختمة بالمعدل الفعلي: من السجل فقط، ولا تقدير بلا قراءة', async () => {
    const { actualPaceEta } = await import('./khatma')
    const plan = { id: 'a', name: 'x', mode: 'pages' as const, targetDays: 30, pagesPerDay: 20, nextPage: 305, startedAt: '2026-10-01', status: 'active' as const, log: [{ date: '2026-10-28', from: 277, to: 304 }] }
    expect(actualPaceEta(plan, '2026-10-29')).toEqual({ pagesPerDay: 2, days: 150 })
    expect(actualPaceEta({ ...plan, log: [{ date: '2026-09-01', from: 1, to: 304 }] }, '2026-10-29')).toBeNull()
  })
  it('بطاقة «رفيقي اليومي» تُضاف في الأعلى لمن لديه ترتيب سابق دون تغيير ترتيب بطاقاته', () => {
    const s = mergeSettings({ homeCards: [{ id: 'khatma', visible: true }, { id: 'ayah', visible: false }] } as never)
    expect(s.homeCards.slice(0, 3).map((c) => c.id)).toEqual(['companion', 'khatma', 'ayah'])
    expect(s.homeCards.find((c) => c.id === 'ayah')!.visible).toBe(false)
  })
})
