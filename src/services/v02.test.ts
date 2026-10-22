// اختبارات ميزات الإصدار 0.2: الختمة، المسبحة، التذكيرات، التقويم، المحتوى اليومي، البطاقات، ترحيل الإعدادات.
import { describe, expect, it, beforeEach } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { kv, reading } from '../db/repos'
import { clearAll } from '../db/backup'
import { activePlan, completedCount, createPlan, dailyTarget, loadKhatmas, progress, recordPages, saveKhatmas } from './khatma'
import { DEFAULT_TASBIH, increment, todayTotal } from './tasbih'
import { atLocalTime, buildSchedule, dueReminders, inQuietHours, MAX_SCHEDULED } from './reminders'
import { monthDays, occasionsFor, toHijri, upcomingOccasions } from './calendar'
import { adhkarForNow, ayahOfDay, dhikrOfDay, greeting } from './daily'
import { wrapLines } from './shareCard'
import { DEFAULT_HOME_CARDS, DEFAULT_SETTINGS, mergeSettings, normalizeHomeCards, type Settings } from '../state/settings'
import { AYAH_OF_DAY_REFS } from '../content/ayahOfDay'
import * as hafs from 'quran-meta/hafs'
import type { QuranMeta } from './quran'

const meta: QuranMeta = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../public/data/quran/meta.json'), 'utf8'))

beforeEach(async () => { await clearAll() })

describe('خطط الختمة', () => {
  it('ترحيل «الورد اليومي» من الإصدار 0.1 دون فقد الموضع أو عدد الختمات', async () => {
    await kv.set('wird', { pagesPerDay: 5, nextPage: 120, startedAt: '2026-09-01', khatmas: 2, lastDone: '2026-10-18' })
    const s = await loadKhatmas()
    expect(s.plans).toHaveLength(1)
    expect(s.plans[0]).toMatchObject({ mode: 'pages', pagesPerDay: 5, nextPage: 120, status: 'active' })
    expect(completedCount(s)).toBe(2)
    // الترحيل يحدث مرة واحدة فقط
    expect((await loadKhatmas()).plans[0].id).toBe(s.plans[0].id)
  })

  it('خطة 30 يومًا: الورد اليومي ≈ 21 صفحة، ويُعاد حسابه حسب التقدم والمدة المتبقية', () => {
    const p = createPlan({ mode: 'days', targetDays: 30, today: '2026-10-01' })
    expect(dailyTarget(p, '2026-10-01')).toMatchObject({ pages: 21, from: 1, to: 21, daysLeft: 30 })
    // بعد 10 أيام دون قراءة: 604 صفحة على 20 يومًا
    expect(dailyTarget(p, '2026-10-11').pages).toBe(31)
    // بعد انتهاء المدة يبقى الهدف كل المتبقي على يوم واحد (بلا أرقام سالبة)
    expect(dailyTarget(p, '2026-12-01')).toMatchObject({ pages: 604, daysLeft: 1 })
  })

  it('الهدف لا يتغير خلال اليوم بعد تسجيل القراءة', async () => {
    let s = await loadKhatmas()
    s = { ...s, plans: [createPlan({ mode: 'pages', pagesPerDay: 4, today: '2026-10-20' })] }
    await saveKhatmas(s)
    const before = dailyTarget(s.plans[0], '2026-10-20')
    s = await recordPages(s, s.plans[0].id, 2, meta, '2026-10-20')
    const after = dailyTarget(s.plans[0], '2026-10-20')
    expect(after).toMatchObject({ from: before.from, to: before.to, pages: 4, doneToday: 2 })
    expect(s.plans[0].nextPage).toBe(3)
    // سجل القراءة العام: الفاتحة (7) + البقرة 1–5
    expect((await reading.all()).reduce((n, r) => n + r.ayahs, 0)).toBe(12)
  })

  it('بلوغ الصفحة 604 يكمل الختمة ويحتسبها', async () => {
    let s = await loadKhatmas()
    const p = { ...createPlan({ mode: 'pages', pagesPerDay: 10, today: '2026-10-20', startPage: 600 }) }
    s = { ...s, plans: [p] }
    s = await recordPages(s, p.id, 604, meta, '2026-10-20')
    expect(s.plans[0].status).toBe('done')
    expect(progress(s.plans[0])).toBe(1)
    expect(completedCount(s)).toBe(1)
    expect(activePlan(s)).toBeUndefined()
  })
})

describe('المسبحة', () => {
  it('العد والهدف والسجل اليومي', () => {
    let s = { ...DEFAULT_TASBIH, target: 3 }
    const hits: boolean[] = []
    for (let i = 0; i < 7; i++) { const r = increment(s, '2026-10-20'); s = r.state; hits.push(r.reachedTarget) }
    expect(s.count).toBe(7)
    expect(hits).toEqual([false, false, true, false, false, true, false])
    expect(todayTotal(s, '2026-10-20')).toBe(7)
  })
  it('السجل اختياري', () => {
    const r = increment({ ...DEFAULT_TASBIH, keepLog: false }, '2026-10-20')
    expect(todayTotal(r.state, '2026-10-20')).toBe(0)
    expect(r.state.count).toBe(1)
  })
})

describe('جدولة التذكيرات', () => {
  const loc = { name: 'Nablus', nameAr: 'نابلس', country: 'PS', lat: 32.2211, lng: 35.2544, tz: 'Asia/Hebron', source: 'city' as const }
  const base: Settings = mergeSettings({ location: loc, notifications: { ...DEFAULT_SETTINGS.notifications, enabled: true } })
  const from = new Date('2026-10-20T00:30:00Z')

  it('معطلة أو بلا مدينة: لا شيء', () => {
    expect(buildSchedule({ ...base, notifications: { ...base.notifications, enabled: false } }, from)).toEqual([])
    expect(buildSchedule({ ...base, location: null }, from)).toEqual([])
  })
  it('خمس صلوات يوميًا، مرتبة، بمعرّفات فريدة صالحة لـ Android', () => {
    const s = buildSchedule(base, from, 3)
    expect(s.filter((r) => r.kind === 'prayer')).toHaveLength(15)
    expect(new Set(s.map((r) => r.id)).size).toBe(s.length)
    s.forEach((r, i) => { if (i) expect(r.at.getTime()).toBeGreaterThanOrEqual(s[i - 1].at.getTime()) })
    s.forEach((r) => expect(r.id).toBeLessThan(2 ** 31))
  })
  it('التنبيه قبل الأذان، وتعطيل صلاة بعينها', () => {
    const s = buildSchedule({ ...base, notifications: { ...base.notifications, minutesBefore: 10, perPrayer: { ...base.notifications.perPrayer, dhuhr: false } } }, from, 1)
    const before = s.filter((r) => r.kind === 'prayer-before')
    expect(before).toHaveLength(4)
    expect(s.some((r) => r.title.includes('الظهر'))).toBe(false)
    const fajr = s.find((r) => r.kind === 'prayer' && r.title.includes('الفجر'))!
    const fajrBefore = before.find((r) => r.title.includes('الفجر'))!
    expect((fajr.at.getTime() - fajrBefore.at.getTime()) / 60_000).toBe(10)
  })
  it('التذكيرات اليومية في الوقت المحلي للمدينة، وفترة الهدوء تمنعها دون الصلاة', () => {
    const n = { ...base.notifications, morningAdhkar: '06:30', sleepAdhkar: '23:30', quiet: { enabled: true, start: '23:00', end: '05:00' } }
    const s = buildSchedule({ ...base, notifications: n }, from, 1)
    const morning = s.find((r) => r.kind === 'morning')!
    expect(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Hebron', hour: '2-digit', minute: '2-digit', hour12: false }).format(morning.at)).toBe('06:30')
    expect(s.some((r) => r.kind === 'sleep')).toBe(false)
    expect(inQuietHours(new Date('2026-10-20T21:00:00Z'), 'Asia/Hebron', n.quiet)).toBe(true) // 00:00 محليًا
  })
  it('وضع تقليل الإشعارات: الصلاة عند الأذان والورد فقط', () => {
    const n = { ...base.notifications, reduce: true, minutesBefore: 10, morningAdhkar: '06:30', wird: '20:00' }
    const kinds = new Set(buildSchedule({ ...base, notifications: n }, from, 2).map((r) => r.kind))
    expect([...kinds].sort()).toEqual(['prayer', 'wird'])
  })
  it('لا يتجاوز حد iOS للإشعارات المجدولة', () => {
    const n = { ...base.notifications, minutesBefore: 10, morningAdhkar: '06:30', eveningAdhkar: '17:00', ayahOfDay: '08:00', wird: '20:00' }
    expect(buildSchedule({ ...base, notifications: n }, from, 14).length).toBe(MAX_SCHEDULED)
  })
  it('لا تكرار للتذكير المستحق', () => {
    const s = buildSchedule(base, from, 1)
    const fired = new Set<number>()
    const at = new Date(s[0].at.getTime() + 5000)
    const first = dueReminders(base, at, fired)
    expect(first).toHaveLength(1)
    first.forEach((r) => fired.add(r.id))
    expect(dueReminders(base, new Date(at.getTime() + 20_000), fired)).toEqual([])
  })
  it('الوقت المحلي صحيح عبر تغيّر التوقيت الصيفي (نيويورك 1 نوفمبر 2026)', () => {
    const d = atLocalTime({ y: 2026, m: 11, d: 1 }, '08:00', 'America/New_York')
    expect(d.toISOString()).toBe('2026-11-01T13:00:00.000Z')
    expect(atLocalTime({ y: 2026, m: 10, d: 31 }, '08:00', 'America/New_York').toISOString()).toBe('2026-10-31T12:00:00.000Z')
  })
  it('الرسائل لا تنسب فضائل ولا تلوم المستخدم', () => {
    const n = { ...base.notifications, morningAdhkar: '06:30', eveningAdhkar: '17:00', sleepAdhkar: '22:00', ayahOfDay: '08:00', dhikrOfDay: '13:00', wird: '20:00', memorize: '19:00', dailySummary: '21:30' }
    const text = buildSchedule({ ...base, notifications: n }, from, 7).map((r) => r.title + ' ' + r.body).join(' ')
    expect(text).not.toMatch(/قال رسول|ثواب|أجر|حسنات|فاتك|قصّرت|تأخرت/)
  })
})

describe('التقويم الهجري', () => {
  it('تحويل تاريخ معروف (أم القرى): 1 رمضان 1447 = 18 فبراير 2026', () => {
    expect(toHijri(new Date(Date.UTC(2026, 1, 18, 12)), 'UTC')).toEqual({ day: 1, month: 9, year: 1447 })
    expect(toHijri(new Date(Date.UTC(2026, 1, 18, 12)), 'UTC', -1)).toMatchObject({ month: 8 })
  })
  it('المناسبات: عرفة والعيد وأيام التشريق والبيض', () => {
    expect(occasionsFor({ day: 9, month: 12, year: 1447 }, 3).map((o) => o.title)).toContain('يوم عرفة')
    const eid = occasionsFor({ day: 10, month: 12, year: 1447 }, 1)
    expect(eid.map((o) => o.title)).toEqual(['عيد الأضحى']) // لا يُقترح صيام الاثنين يوم العيد
    const t13 = occasionsFor({ day: 13, month: 12, year: 1447 }, 2).map((o) => o.title)
    expect(t13).toContain('من أيام التشريق')
    expect(t13).not.toContain('من الأيام البيض')
    expect(occasionsFor({ day: 14, month: 5, year: 1448 }, 2).map((o) => o.title)).toEqual(['من الأيام البيض'])
  })
  it('كل مناسبة فيها حكم تذكر مصدرها', () => {
    for (let m = 1; m <= 12; m++) for (let d = 1; d <= 30; d++) for (const o of occasionsFor({ day: d, month: m, year: 1448 }, d % 7)) {
      if (o.kind === 'fast' || o.kind === 'forbidden-fast' || o.kind === 'eid') expect(o.source, o.title).toBeTruthy()
    }
  })
  it('شهر كامل وأقرب المناسبات', () => {
    expect(monthDays(2026, 2, 0)).toHaveLength(28)
    const up = upcomingOccasions(new Date(Date.UTC(2026, 9, 20, 12)), 0, 3)
    expect(up).toHaveLength(3)
    expect(up[0].date.getTime()).toBeLessThanOrEqual(up[1].date.getTime())
  })
})

describe('المحتوى اليومي', () => {
  it('آية اليوم ثابتة لليوم نفسه ومراجعها صحيحة', () => {
    expect(ayahOfDay('2026-10-20')).toEqual(ayahOfDay('2026-10-20'))
    expect(ayahOfDay('2026-10-20')).not.toEqual(ayahOfDay('2026-10-21'))
    for (const [s, a] of AYAH_OF_DAY_REFS) expect(a).toBeLessThanOrEqual(hafs.getAyahCountInSurah(s as never))
  })
  it('ذكر اليوم من الأحاديث الموثقة فقط', () => {
    for (let i = 0; i < 40; i++) {
      const d = dhikrOfDay(`2026-11-${String((i % 28) + 1).padStart(2, '0')}`)
      expect(d.item.kind).toBe('hadith')
      expect(d.item.source.length).toBeGreaterThan(3)
    }
  })
  it('التحية وأذكار الوقت', () => {
    expect(adhkarForNow(7).id).toBe('morning')
    expect(adhkarForNow(17).id).toBe('evening')
    expect(adhkarForNow(23).id).toBe('sleep')
    expect(greeting(7, '2026-10-20')).toMatch(/صباح/)
  })
})

describe('بطاقات المشاركة', () => {
  it('تقسيم الأسطر لا يقطع الكلمات ولا يفقد شيئًا من النص', () => {
    const ctx = { measureText: (t: string) => ({ width: t.length * 10 }) as TextMetrics }
    const text = 'اللَّهُمَّ إِنِّي أَسْأَلُكَ الْهُدَى وَالتُّقَى وَالْعَفَافَ وَالْغِنَى'
    const lines = wrapLines(ctx, text, 120)
    expect(lines.length).toBeGreaterThan(1)
    expect(lines.join(' ')).toBe(text)
  })
})

describe('ترحيل الإعدادات من 0.1', () => {
  it('الإعدادات القديمة تحتفظ بقيمها وتكتسب الحقول الجديدة', () => {
    const old = { theme: 'dark', notifications: { enabled: true, perPrayer: { fajr: false }, minutesBefore: 10, morningAdhkar: '06:00', eveningAdhkar: null } } as never
    const s = mergeSettings(old)
    expect(s.theme).toBe('dark')
    expect(s.notifications.minutesBefore).toBe(10)
    expect(s.notifications.morningAdhkar).toBe('06:00')
    expect(s.notifications.perPrayer).toMatchObject({ fajr: false, dhuhr: true })
    expect(s.notifications.atAdhan).toBe(true)
    expect(s.notifications.quiet.enabled).toBe(false)
    expect(s.readerBg).toBe('cream')
    expect(s.homeCards.map((c) => c.id)).toContain('dedication')
  })
  it('بطاقة الإهداء لا يمكن إخفاؤها', () => {
    const cards = normalizeHomeCards([{ id: 'dedication', visible: false }, { id: 'ayah', visible: false }])
    expect(cards.find((c) => c.id === 'dedication')!.visible).toBe(true)
    expect(cards.find((c) => c.id === 'ayah')!.visible).toBe(false)
    expect(cards).toHaveLength(DEFAULT_HOME_CARDS.length)
    expect(cards.map((c) => c.id)).toContain('suggest')
  })
})

describe('مصادر التلاوة البديلة', async () => {
  const { ayahAudioSources, reciterById } = await import('../content/reciters')
  it('مصدر أساسي ثم بدائل بالرقم المتسلسل الصحيح للآية', () => {
    const s = ayahAudioSources(reciterById('alafasy'), 2, 255)
    expect(s[0]).toBe('https://everyayah.com/data/Alafasy_128kbps/002255.mp3')
    expect(s[1]).toBe('https://cdn.islamic.network/quran/audio/128/ar.alafasy/262.mp3')
    expect(s).toHaveLength(6)
    expect(ayahAudioSources(reciterById('alafasy'), 114, 6)[1]).toMatch(/\/6236\.mp3$/)
  })
  it('القرّاء الجدد: مصدر بديل مؤكد لمن له إصدار، ومصدر واحد لغيره', () => {
    expect(ayahAudioSources(reciterById('ajamy'), 1, 1)[1]).toBe('https://cdn.islamic.network/quran/audio/128/ar.ahmedajamy/1.mp3')
    expect(ayahAudioSources(reciterById('dossary'), 1, 1)).toEqual(['https://everyayah.com/data/Yasser_Ad-Dussary_128kbps/001001.mp3'])
  })
  it('القارئ الذي ليس له مصدر بديل يبقى بمصدر واحد', () => {
    expect(ayahAudioSources(reciterById('husary-muallim'), 1, 1)).toHaveLength(1)
  })
})
